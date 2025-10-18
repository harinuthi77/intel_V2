"""
FORGE Backend - Simple FastAPI Server
Real-time intelligent agent execution
"""

import sys
from pathlib import Path

# Add parent to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List
import asyncio
from datetime import datetime

from playwright.sync_api import sync_playwright
from core import Vision, CognitiveEngine, ActionExecutor, AgentMemory

app = FastAPI(title="FORGE Agent")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# WebSocket connections
active_connections: List[WebSocket] = []

class TaskRequest(BaseModel):
    task: str
    model: str = "claude"
    tools: List[str] = ["web"]

@app.get("/")
async def root():
    return {
        "message": "🔨 FORGE Backend Running",
        "status": "healthy"
    }

@app.websocket("/ws/progress")
async def websocket_endpoint(websocket: WebSocket):
    """Real-time progress updates"""
    await websocket.accept()
    active_connections.append(websocket)
    
    try:
        await websocket.send_json({
            "type": "connected",
            "message": "WebSocket connected"
        })
        
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        active_connections.remove(websocket)

async def broadcast(message: dict):
    """Send to all connected clients"""
    for connection in active_connections:
        try:
            await connection.send_json(message)
        except:
            pass

@app.post("/execute")
async def execute_task(request: TaskRequest):
    """Execute agent task"""
    
    print("\n" + "="*80)
    print("🔨 FORGE Task:")
    print(f"   {request.task}")
    print("="*80 + "\n")
    
    try:
        # Run agent in thread pool
        loop = asyncio.get_event_loop()
        result = await loop.run_in_executor(
            None,
            run_agent,
            request.task
        )
        
        return {
            "status": "success" if result["success"] else "failed",
            "message": f"Completed in {result['steps']} steps",
            "data": result
        }
        
    except Exception as e:
        print(f"❌ Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

def run_agent(task: str):
    """Execute agent synchronously"""
    
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False)
        page = browser.new_page(viewport={'width': 1920, 'height': 1080})
        
        # Initialize
        memory = AgentMemory()
        vision = Vision(memory=memory, debug=True)
        cognition = CognitiveEngine(memory=memory)
        executor = ActionExecutor(page=page, memory=memory)
        
        step = 0
        max_steps = 20
        success = False
        
        while step < max_steps:
            step += 1
            print(f"\n{'─'*80}")
            print(f"STEP {step}/{max_steps}")
            print(f"{'─'*80}")
            
            # SEE
            elements = vision.detect_all_elements(page)
            screenshot_bytes, screenshot_b64 = vision.create_labeled_screenshot(page, elements)
            page_data = vision.extract_page_content(page)
            page_analysis = vision.analyze_page_structure(page)
            
            # THINK
            decision = cognition.think(
                page=page,
                task=task,
                screenshot_b64=screenshot_b64,
                elements=elements,
                page_data=page_data,
                page_analysis=page_analysis
            )
            
            # ACT
            action_success, action_msg = executor.execute(decision, elements)
            
            print(f"Result: {action_msg}")
            
            if decision['action'] == 'done':
                success = True
                break
            
            if memory.is_stuck()[0]:
                print("\n⚠️ Stuck detected")
                break
        
        browser.close()
        
        return {
            "success": success,
            "steps": step,
            "final_url": page.url if page else None
        }

if __name__ == "__main__":
    import uvicorn
    print("\n🚀 Starting FORGE Backend\n")
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)