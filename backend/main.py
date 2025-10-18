
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List
import asyncio

from playwright.sync_api import sync_playwright
from core import Vision, Brain, Hands

app = FastAPI(title="FORGE Agent")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


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
            "data": result,
            "mode": "autonomous"
        }
        
    except Exception as e:
        print(f"❌ Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


def run_agent(task: str):
    """Execute agent synchronously"""
    
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False)
        page = browser.new_page(viewport={'width': 1920, 'height': 1080})
        
        # Initialize components
        vision = Vision()
        brain = Brain()
        hands = Hands(page)
        
        step = 0
        max_steps = 15
        success = False
        
        while step < max_steps:
            step += 1
            print(f"\n{'─'*80}")
            print(f"STEP {step}/{max_steps}")
            print(f"{'─'*80}")
            
            # SEE - Detect elements
            elements = vision.detect_elements(page)
            screenshot_bytes, screenshot_b64 = vision.take_screenshot(page, elements)
            
            print(f"   👁️ Found {len(elements)} interactive elements")
            
            # THINK - Decide action
            decision = brain.think(
                task=task,
                url=page.url,
                elements=elements,
                screenshot_b64=screenshot_b64
            )
            
            # Check confidence
            if decision['confidence'] < 7:
                print(f"   ⚠️ Low confidence ({decision['confidence']}/10) - continuing anyway")
            
            # ACT - Execute action
            action_success, action_msg = hands.do(
                action=decision['action'],
                target=decision['target'],
                elements=elements
            )
            
            print(f"   {action_msg}")
            
            # Check if done
            if decision['action'] == 'done':
                success = True
                break
            
            if not action_success:
                print(f"   ⚠️ Action failed, continuing...")
        
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
