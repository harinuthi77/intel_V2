"""FastAPI server exposing the adaptive agent as a web service."""

from __future__ import annotations

import asyncio
import json
import logging
from typing import Any, Dict, List
from queue import Queue

from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

from adaptive_agent import AgentConfig, AgentResult, run_adaptive_agent

# Global browser session management (TODO: implement proper session handling)
active_sessions = {}

logger = logging.getLogger("adaptive_agent.backend")
logging.basicConfig(level=logging.INFO)

app = FastAPI(title="Adaptive Agent Backend", version="1.0.0")

# Allow local development with the React UI
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve frontend static files if available (Spring Boot style integration)
STATIC_DIR = Path(__file__).parent / "static"
if STATIC_DIR.exists():
    app.mount("/assets", StaticFiles(directory=STATIC_DIR / "assets"), name="assets")
    logger.info(f"Serving frontend static files from {STATIC_DIR}")


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

        # Start agent execution in background
        agent_task = loop.run_in_executor(
            None, lambda: run_adaptive_agent(config, progress_callback=progress_handler)
        )

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


@app.get("/health")
async def health_check():
    """Health check endpoint to verify backend is running."""
    return {
        "status": "healthy",
        "version": "1.0.0",
        "endpoints": {
            "execute": "/execute",
            "execute_stream": "/execute/stream",
            "navigate": "/navigate",
            "health": "/health",
            "docs": "/docs"
        },
        "features": {
            "screenshot_streaming": True,
            "manual_control": True,
            "integrated_frontend": STATIC_DIR.exists()
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
