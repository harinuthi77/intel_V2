"""FastAPI server exposing the adaptive agent as a web service."""

from __future__ import annotations

import asyncio
import logging
from typing import Any, Dict, List

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from adaptive_agent import AgentConfig, AgentResult, run_adaptive_agent

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


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("backend.server:app", host="0.0.0.0", port=8000, reload=False)
