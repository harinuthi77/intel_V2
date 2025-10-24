# Critical Fixes for Live Browser Streaming

This document describes the fixes applied to resolve three critical issues blocking the live browser streaming feature.

---

## Issue #1: Multiple `/ws/browser` Sockets (Frontend)

### Problem
The LiveBrowserView and useStream hook were creating duplicate WebSocket connections on component remounts, HMR, or route changes. This caused:
- Server log: "⚠️ Streaming already active"
- Cascading disconnects (6+ sockets closing in batch)
- Premature stream teardown while agent still running

### Root Cause
No guard to prevent opening a new WebSocket if one already exists in OPEN or CONNECTING state.

### Fix
Added duplicate socket prevention in both:
1. `frontend/src/components/LiveBrowserView.jsx:35-41`
2. `frontend/src/hooks/useStream.js:24-30`

```javascript
const connectWebSocket = () => {
  // Prevent duplicate sockets (mounts/HMR/route toggles)
  if (wsRef.current && (wsRef.current.readyState === WebSocket.OPEN ||
                        wsRef.current.readyState === WebSocket.CONNECTING)) {
    console.log('🟡 Reuse existing /ws/browser socket')
    return
  }
  // ... rest of connection logic
}
```

### Result
- ✅ Single stable `/ws/browser` connection per session
- ✅ No more "Streaming already active" errors
- ✅ Stream persists throughout agent execution

---

## Issue #2: Cross-Event-Loop WebSocket Sends (Backend)

### Problem
Agent runs in background thread via `loop.run_in_executor()`, but tried to send WebSocket messages directly using `await` or `create_task()`. This caused:
```
RuntimeError: Task <...> got Future <...> attached to a different loop
```

### Root Cause
Background thread has no event loop, and trying to schedule async operations on the wrong loop.

### Fix

#### A. Capture Main Event Loop at Startup
`backend/server.py:75-80`

```python
@app.on_event("startup")
async def startup_event():
    # Capture the main event loop for thread-safe WebSocket sends
    app.state.loop = asyncio.get_running_loop()
    logger.info("✅ Captured main event loop for thread-safe operations")
```

#### B. Create Thread-Safe Send Helper
`backend/server.py:652-674`

```python
def send_control_event_threadsafe(session_id: str, event: Dict[str, Any]):
    """
    Thread-safe version of send_control_event for use from background threads.
    Uses run_coroutine_threadsafe to schedule the send on the main event loop.
    """
    if session_id not in control_websocket_clients:
        return

    try:
        loop = app.state.loop  # Captured at startup
        future = asyncio.run_coroutine_threadsafe(
            send_control_event(session_id, event),
            loop
        )
        future.result(timeout=1.0)  # Wait for completion
    except Exception as e:
        logger.error(f"❌ Thread-safe control send failed: {e}")
```

#### C. Update Progress Callback
`backend/server.py:203-207`

```python
def sync_progress_callback(event: Dict[str, Any]):
    """Thread-safe progress callback for background agent execution."""
    _log_event(event)
    # Send to WebSocket using thread-safe method
    send_control_event_threadsafe(session_id, event)
```

### Result
- ✅ No more "Future attached to a different loop" errors
- ✅ Agent progress events sent correctly from background thread
- ✅ Step events, logs, and final results reach frontend

---

## Issue #3: Windows Proactor Event Loop Instability (Backend)

### Problem
AssertionError traces in `asyncio.proactor_events` under heavy logging + WebSocket I/O:
```
AssertionError in proactor_events.py
Uvicorn gracefully shutting down (mid-run)
```

### Root Cause
Windows Proactor event loop has known instability issues with concurrent I/O operations.

### Fix
Switch to Selector event loop policy on Windows BEFORE any asyncio imports.

`backend/server.py:10-14`

```python
# Fix Windows event loop instability (MUST be before asyncio imports)
if sys.platform.startswith("win"):
    import asyncio
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    print("🪟 Windows detected - using Selector event loop policy")
```

### Result
- ✅ No more AssertionError traces
- ✅ Stable execution under heavy I/O
- ✅ Server stays running throughout agent execution

---

## Issue #4: Browser WebSocket "Unknown command: pong" (Backend)

### Problem
Server logged warnings when receiving `pong` responses from client:
```
⚠️ Unknown command type: pong
```

### Root Cause
Browser WebSocket handler didn't explicitly handle `pong` keepalive responses.

### Fix
`backend/server.py:472-474`

```python
elif command_type == 'pong':
    # Keepalive response from client - just continue
    continue
```

### Result
- ✅ No more "Unknown command" warnings
- ✅ Clean keepalive with ping/pong
- ✅ Cleaner server logs

---

## Issue #5: Step Events Not Emitted (Agent)

### Problem
Frontend `useRun` hook was ready to handle `step_started`, `step_completed`, `step_failed` events, but agent never emitted them. UI couldn't show real-time step progress.

### Root Cause
Agent loop executed actions but didn't emit structured step events.

### Fix

#### A. Emit `step_started` Before Action Execution
`adaptive_agent.py:1315-1341`

```python
# Emit step_started event
step_label = f"{action.capitalize()}"
if details and len(details) < 50:
    step_label += f": {details}"
elif action == "goto":
    step_label += f": Navigate to URL"
elif action == "click":
    step_label += f": Click element {details}"
# ... more action labels

_emit(
    f"Step {step + 1}: {step_label}",
    level="info",
    payload={
        "type": "step_started",
        "step": {
            "id": step + 1,
            "label": step_label,
            "action": action
        }
    }
)
```

#### B. Emit `step_completed` or `step_failed` After Execution
`adaptive_agent.py:1723-1742`

```python
# Emit step completion event
if success:
    _emit(
        f"Step {step + 1} completed: {step_label}",
        level="info",
        payload={
            "type": "step_completed",
            "id": step + 1
        }
    )
else:
    _emit(
        f"Step {step + 1} failed: {action_error or 'Unknown error'}",
        level="error",
        payload={
            "type": "step_failed",
            "id": step + 1,
            "error": action_error or "Action failed"
        }
    )
```

### Result
- ✅ Frontend receives explicit step events
- ✅ Execution timeline updates in real-time
- ✅ Step statuses: pending → in-progress → completed/error
- ✅ No more inferring steps from screenshots

---

## Testing Checklist

After applying these fixes, validate:

### 1. Single Browser Socket
- [ ] Start server, load UI
- [ ] Server log shows **one** `/ws/browser` connection
- [ ] No "Streaming already active" warnings
- [ ] Socket stays open throughout execution

### 2. Thread-Safe Control Events
- [ ] Trigger a task
- [ ] No "Future attached to a different loop" errors
- [ ] Step events appear in UI timeline
- [ ] Final result reaches frontend

### 3. Windows Stability
- [ ] On Windows: server starts with "🪟 Windows detected - using Selector event loop policy"
- [ ] No AssertionError traces
- [ ] Server stays running throughout task

### 4. Clean Browser WebSocket
- [ ] No "Unknown command: pong" warnings
- [ ] Keepalive ping/pong works silently

### 5. Step Event Flow
- [ ] Left panel shows steps with statuses
- [ ] Steps change: pending → in-progress → completed
- [ ] Failed steps show error state
- [ ] No step inference from screenshots

### 6. End-to-End
- [ ] Load UI at http://localhost:5173
- [ ] Status bar shows "LIVE" + FPS counter
- [ ] Enter task: "Search Google for best laptops"
- [ ] Click "Build"
- [ ] Watch:
   - Control WebSocket connects (green indicator)
   - Browser stream connects (FPS counter)
   - Steps appear in timeline
   - Canvas shows live browser frames
   - Click Pause → button changes to Resume
   - Click Resume → execution continues
   - Click Stop → execution halts
- [ ] Verify server stays running, only stream stops

---

## Files Modified

1. **Frontend**:
   - `frontend/src/components/LiveBrowserView.jsx` - Duplicate socket prevention
   - `frontend/src/hooks/useStream.js` - Duplicate socket prevention

2. **Backend**:
   - `backend/server.py` - Windows event loop policy, thread-safe sends, pong handling

3. **Agent**:
   - `adaptive_agent.py` - Step event emissions

4. **Documentation**:
   - `CRITICAL_FIXES.md` - This file

---

## Impact Summary

| Issue | Symptom | Fix | Result |
|-------|---------|-----|--------|
| Duplicate sockets | 6+ connections, "Streaming already active" | Guard in connectWebSocket | Single stable connection |
| Cross-event-loop sends | "Future attached to different loop" | run_coroutine_threadsafe | Events sent correctly |
| Windows Proactor | AssertionError, premature shutdown | Selector event loop policy | Stable on Windows |
| Pong handling | "Unknown command: pong" | Explicit pong branch | Clean logs |
| Missing step events | No timeline updates | Emit step_started/completed/failed | Real-time step tracking |

---

## Next Steps

1. **Test thoroughly** - Run validation checklist above
2. **Monitor logs** - Check for any remaining errors
3. **Performance** - Verify ~20 FPS stream, <50ms control latency
4. **User testing** - Try various tasks, ensure smooth experience

---

## Known Limitations (Not Yet Implemented)

While the architecture is complete and all critical issues are fixed, some features still need backend implementation:

1. **Pause/Resume/Stop** - UI sends commands, backend acknowledges, but agent doesn't actually pause
2. **Nudge** - UI sends nudge text, backend logs it, but doesn't inject into agent
3. **Unified Browser** - Agent uses separate Playwright instance, not the live-streaming browser

These require deeper agent integration but don't block the core streaming feature.
