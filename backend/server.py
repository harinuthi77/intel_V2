"""FastAPI server exposing the adaptive agent as a web service."""

from __future__ import annotations

# IMPORTANT: Add parent directory to Python path FIRST (before any other imports)
import sys
import os
from pathlib import Path

# Get absolute path to parent directory (where adaptive_agent.py lives)
BACKEND_DIR = Path(__file__).resolve().parent
PARENT_DIR = BACKEND_DIR.parent

# Add parent directory to Python path if not already there
if str(PARENT_DIR) not in sys.path:
    sys.path.insert(0, str(PARENT_DIR))

# Now we can import from parent directory
import asyncio
import json
import logging
from typing import Any, Dict, List
from queue import Queue
from datetime import datetime

from fastapi import FastAPI, HTTPException, Request, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

from adaptive_agent import AgentConfig, AgentResult, run_adaptive_agent
from live_browser_manager import get_live_browser, close_live_browser

# Global browser session management
active_sessions = {}
connected_websocket_clients = []

logger = logging.getLogger("adaptive_agent.backend")
logging.basicConfig(level=logging.INFO)

# =============================================================================
# CRITICAL: Validate API key on startup
# =============================================================================
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY")
if not ANTHROPIC_API_KEY:
    logger.error("=" * 70)
    logger.error("🚨 CRITICAL: ANTHROPIC_API_KEY environment variable not set!")
    logger.error("=" * 70)
    logger.error("Set it with:")
    logger.error("  Windows PowerShell: $env:ANTHROPIC_API_KEY = 'sk-ant-...'")
    logger.error("  Windows CMD: set ANTHROPIC_API_KEY=sk-ant-...")
    logger.error("  Linux/Mac: export ANTHROPIC_API_KEY='sk-ant-...'")
    logger.error("=" * 70)
    logger.error("Get your API key from: https://console.anthropic.com/settings/keys")
    logger.error("=" * 70)
    raise RuntimeError("ANTHROPIC_API_KEY not set - cannot start server")

logger.info(f"✅ ANTHROPIC_API_KEY is set (starts with {ANTHROPIC_API_KEY[:10]}...)")
# =============================================================================

app = FastAPI(title="Adaptive Agent Backend", version="1.0.0")


# =============================================================================
# Startup and Shutdown Events for Live Browser
# =============================================================================
@app.on_event("startup")
async def startup_event():
    """Initialize live browser on server startup."""
    try:
        logger.info("🚀 Initializing live browser manager...")
        browser = await get_live_browser()
        logger.info("✅ Live browser ready for streaming")
    except Exception as e:
        logger.error(f"❌ Failed to initialize live browser: {e}")
        logger.warning("⚠️  Live streaming will not be available")


@app.on_event("shutdown")
async def shutdown_event():
    """Close live browser on server shutdown."""
    try:
        logger.info("🔴 Shutting down live browser...")
        await close_live_browser()
        logger.info("✅ Live browser closed")
    except Exception as e:
        logger.error(f"❌ Error closing live browser: {e}")


# Request logging middleware - LOG EVERY REQUEST
@app.middleware("http")
async def log_requests(request: Request, call_next):
    """Log every incoming HTTP request for debugging."""
    logger.info(f"🔵 REQUEST: {request.method} {request.url.path} from {request.client.host}")
    response = await call_next(request)
    logger.info(f"✅ RESPONSE: {request.method} {request.url.path} → Status {response.status_code}")
    return response


# Allow local development with the React UI
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve frontend static files if available (Spring Boot style integration)
STATIC_DIR = BACKEND_DIR / "static"
if STATIC_DIR.exists():
    app.mount("/assets", StaticFiles(directory=STATIC_DIR / "assets"), name="assets")
    logger.info(f"✅ Serving frontend static files from {STATIC_DIR}")
else:
    logger.warning(f"⚠️  Static directory not found: {STATIC_DIR}")


class ExecuteRequest(BaseModel):
    """Payload expected from the frontend."""

    task: str = Field(..., description="Task instruction for the agent")
    model: str = Field("claude", description="Model identifier to use")
    tools: List[str] = Field(default_factory=list, description="Enabled tool identifiers")
    headless: bool = Field(False, description="Run browser headlessly")
    max_steps: int = Field(40, description="Maximum steps before aborting")


class ExecuteResponse(BaseModel):
    """Structured response returned by the backend."""

    success: bool
    status: str
    message: str
    mode: str
    session_id: str
    data: List[Dict[str, Any]]
    progress_summary: str
    logs: List[Dict[str, Any]]
    errors: List[str]
    metadata: Dict[str, Any]


class NavigateRequest(BaseModel):
    """Payload for manual navigation during Take Control mode."""

    url: str = Field(..., description="URL to navigate to")
    session_id: str = Field(default="", description="Session ID (optional)")


def _log_event(event: Dict[str, Any]) -> None:
    """Log progress events emitted by the agent."""

    level = event.get("level", "info").lower()
    message = event.get("message", "")
    log_fn = getattr(logger, level, logger.info)
    log_fn(message)


@app.post("/execute", response_model=ExecuteResponse)
async def execute(request: ExecuteRequest) -> ExecuteResponse:
    """Execute the adaptive agent and return structured results."""

    config = AgentConfig(
        task=request.task,
        model=request.model,
        tools=request.tools,
        max_steps=request.max_steps,
        headless=request.headless,
    )

    loop = asyncio.get_running_loop()

    try:
        result: AgentResult = await loop.run_in_executor(
            None, lambda: run_adaptive_agent(config, progress_callback=_log_event)
        )
    except Exception as exc:  # pragma: no cover - defensive
        logger.exception("Agent execution failed")
        raise HTTPException(status_code=500, detail=str(exc)) from exc

    return ExecuteResponse(**result.to_dict())


@app.post("/execute/stream")
async def execute_stream(request: ExecuteRequest):
    """Execute the adaptive agent with real-time streaming updates including screenshots."""

    # CRITICAL: Close any existing LiveBrowserManager to avoid browser conflicts
    # The agent will create its own sync Playwright browser
    logger.info("🔄 Closing LiveBrowserManager to prevent browser conflicts...")
    try:
        await close_live_browser()
        logger.info("✅ LiveBrowserManager closed successfully")
        # Wait for browser to fully close before starting agent
        await asyncio.sleep(2)
        logger.info("⏱️  Waited 2s for browser cleanup")
    except Exception as e:
        logger.warning(f"⚠️  LiveBrowserManager close failed (may not be running): {e}")

    event_queue = Queue()

    def progress_handler(event: Dict[str, Any]) -> None:
        """Capture progress events and screenshots for streaming."""
        event_queue.put(event)

    config = AgentConfig(
        task=request.task,
        model=request.model,
        tools=request.tools,
        max_steps=request.max_steps,
        headless=request.headless,
    )

    async def event_generator():
        """Stream events to the frontend in real-time."""
        loop = asyncio.get_running_loop()

        logger.info(f"🚀 Starting agent execution for task: {config.task[:50]}...")
        logger.info(f"   Config: headless={config.headless}, max_steps={config.max_steps}")

        # Start agent execution in background
        try:
            agent_task = loop.run_in_executor(
                None, lambda: run_adaptive_agent(config, progress_callback=progress_handler)
            )
            logger.info(f"✅ Agent task started in executor")
        except Exception as e:
            logger.error(f"❌ Failed to start agent task: {e}")
            yield f"data: {json.dumps({'type': 'error', 'message': f'Failed to start agent: {str(e)}'})}\n\n"
            return

        # Stream events as they arrive
        while True:
            # Check if agent is done
            if agent_task.done():
                # Send final result
                try:
                    result = agent_task.result()
                    yield f"data: {json.dumps({'type': 'final', 'result': result.to_dict()})}\n\n"
                except Exception as exc:
                    yield f"data: {json.dumps({'type': 'error', 'message': str(exc)})}\n\n"
                break

            # Send queued events
            while not event_queue.empty():
                event = event_queue.get()
                yield f"data: {json.dumps({'type': 'event', 'event': event})}\n\n"

            # Small delay to avoid busy waiting
            await asyncio.sleep(0.1)

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
        }
    )


@app.post("/navigate")
async def navigate(request: NavigateRequest):
    """Navigate browser to specified URL during manual control mode.

    Note: This is a placeholder implementation. Full functionality requires
    persistent browser sessions with proper session management.

    TODO: Implement proper browser session handling to enable real-time navigation.
    """
    logger.info(f"Navigation request received: {request.url}")

    # TODO: Implement actual browser navigation
    # For now, just acknowledge the request
    # Future implementation will:
    # 1. Look up active browser session by session_id
    # 2. Navigate the browser to the requested URL
    # 3. Capture and return screenshot

    return {
        "success": True,
        "message": f"Navigation request acknowledged for: {request.url}",
        "note": "Full navigation support requires browser session management (coming soon)"
    }


@app.websocket("/ws/browser")
async def websocket_browser_stream(websocket: WebSocket):
    """
    WebSocket endpoint for live browser streaming via CDP.

    This endpoint:
    1. Accepts WebSocket connections from frontend
    2. Streams real-time browser frames via CDP
    3. Handles interactive commands (click, type, navigate, scroll)
    4. Provides <100ms latency for live view
    """
    await websocket.accept()
    connected_websocket_clients.append(websocket)
    client_id = f"{websocket.client.host}:{websocket.client.port}"

    logger.info(f"🔵 WebSocket connected: {client_id} (total: {len(connected_websocket_clients)})")

    try:
        # Get the live browser instance
        browser_manager = await get_live_browser()

        # Define frame callback to send frames to this client
        async def send_frame_to_client(frame_data: str, url: str):
            """Send frame to this specific WebSocket client."""
            try:
                await websocket.send_json({
                    'type': 'frame',
                    'data': frame_data,  # Base64 JPEG
                    'url': url,
                    'timestamp': datetime.now().isoformat()
                })
            except Exception as e:
                logger.error(f"❌ Failed to send frame to {client_id}: {e}")

        # Start streaming to this client
        logger.info(f"🎬 Starting stream for {client_id}")
        await browser_manager.start_streaming(send_frame_to_client, fps=20)

        # Send initial connection confirmation
        await websocket.send_json({
            'type': 'connected',
            'message': 'Live browser streaming started',
            'fps': 20
        })

        # Listen for commands from client
        while True:
            try:
                message = await asyncio.wait_for(websocket.receive_json(), timeout=30.0)

                command_type = message.get('type')
                logger.info(f"🎮 Command from {client_id}: {command_type}")

                if command_type == 'navigate':
                    url = message.get('url')
                    if url:
                        await browser_manager.navigate(url)
                        await websocket.send_json({
                            'type': 'command_ack',
                            'command': 'navigate',
                            'url': url
                        })

                elif command_type == 'click':
                    x = message.get('x')
                    y = message.get('y')
                    if x is not None and y is not None:
                        await browser_manager.click(int(x), int(y))
                        await websocket.send_json({
                            'type': 'command_ack',
                            'command': 'click',
                            'x': x,
                            'y': y
                        })

                elif command_type == 'type':
                    text = message.get('text')
                    if text:
                        await browser_manager.type_text(text)
                        await websocket.send_json({
                            'type': 'command_ack',
                            'command': 'type',
                            'length': len(text)
                        })

                elif command_type == 'scroll':
                    delta = message.get('delta', 0)
                    await browser_manager.scroll(int(delta))
                    await websocket.send_json({
                        'type': 'command_ack',
                        'command': 'scroll',
                        'delta': delta
                    })

                elif command_type == 'key':
                    key = message.get('key')
                    if key:
                        await browser_manager.press_key(key)
                        await websocket.send_json({
                            'type': 'command_ack',
                            'command': 'key',
                            'key': key
                        })

                elif command_type == 'ping':
                    # Heartbeat/keepalive
                    await websocket.send_json({
                        'type': 'pong',
                        'timestamp': datetime.now().isoformat()
                    })

                elif command_type == 'pong':
                    # Ignore pong, it's keepalive response
                    pass

                else:
                    logger.warning(f"⚠️  Unknown command type: {command_type}")

            except asyncio.TimeoutError:
                # Send keepalive ping
                try:
                    await websocket.send_json({'type': 'ping'})
                except:
                    break
            except WebSocketDisconnect:
                break
            except Exception as e:
                logger.error(f"❌ Error processing command from {client_id}: {e}")
                break

    except WebSocketDisconnect:
        logger.info(f"🔴 WebSocket disconnected (client): {client_id}")

    except Exception as e:
        logger.error(f"❌ WebSocket error for {client_id}: {e}")

    finally:
        # Clean up
        if websocket in connected_websocket_clients:
            connected_websocket_clients.remove(websocket)

        logger.info(f"🔴 WebSocket closed: {client_id} (remaining: {len(connected_websocket_clients)})")

        # Stop streaming if no more clients
        if len(connected_websocket_clients) == 0:
            try:
                browser_manager = await get_live_browser()
                await browser_manager.stop_streaming()
                logger.info("⏹️  Stopped streaming (no active clients)")
            except:
                pass


@app.get("/health")
async def health_check():
    """Health check endpoint to verify backend is running."""
    return {
        "status": "healthy",
        "version": "2.0.0",
        "endpoints": {
            "execute": "/execute",
            "execute_stream": "/execute/stream",
            "navigate": "/navigate",
            "live_browser_ws": "/ws/browser",
            "health": "/health",
            "docs": "/docs"
        },
        "features": {
            "screenshot_streaming": True,
            "live_browser_streaming": True,
            "manual_control": True,
            "interactive_browser": True,
            "integrated_frontend": STATIC_DIR.exists()
        },
        "websocket": {
            "active_connections": len(connected_websocket_clients)
        }
    }


@app.get("/")
async def serve_frontend():
    """Serve the frontend index.html (Spring Boot style single app)."""
    index_path = STATIC_DIR / "index.html"
    if index_path.exists():
        return FileResponse(index_path)
    else:
        return {
            "message": "Adaptive Agent Backend API",
            "version": "1.0.0",
            "note": "Frontend not built. Run 'npm run build' in frontend directory and copy dist/ to backend/static/",
            "api_docs": "/docs"
        }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("backend.server:app", host="0.0.0.0", port=8000, reload=False)
