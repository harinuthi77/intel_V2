# Diagnostic Steps for /ws/control "Pending" Issue

## What SHOULD be happening

The code has:
1. ✅ `CONTROL_STATE` globals defined (line 42 in server.py)
2. ✅ `/ws/control` endpoint registered (line 521 in server.py)
3. ✅ Health endpoint lists it (line 635: `"control_ws": "/ws/control"`)
4. ✅ Handles ping/pong, pause/resume/stop (lines 555-565)
5. ✅ Frontend connects with `useRun(sessionId)` hook

## Step-by-step diagnosis

### Step 1: Verify you have the latest code

```powershell
cd C:\Users\prasa\source\repos\intel_V2
git log -1 --oneline
```

**Expected**: Should show commit starting with `d630cdb`

**If not**:
```powershell
git fetch origin
git checkout claude/implement-live-browser-stream-011CURJJLv4ZNHS9EJFb5oPV
git pull
```

### Step 2: Stop ALL Python processes

```powershell
# Find all Python processes
Get-Process python

# Kill them all
Get-Process python | Stop-Process -Force
```

This ensures no old server is running.

### Step 3: Clear Python cache

```powershell
cd backend
Remove-Item -Recurse -Force __pycache__ -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force ..\__pycache__ -ErrorAction SilentlyContinue
```

### Step 4: Restart backend with verbose logging

```powershell
cd backend
python server.py
```

Watch for:
- ✅ "✅ Captured main event loop for thread-safe operations"
- ✅ "INFO: Application startup complete"
- ❌ Any errors or warnings

### Step 5: Test the endpoint directly

In a NEW PowerShell window:

```powershell
cd backend
python test_control_ws.py
```

**Expected output**:
```
🔌 Connecting to ws://localhost:8000/ws/control?session_id=test123
✅ Connected successfully!

📤 Sending ping...
📥 Received: {"type":"command_ack","command":"ping"}

📤 Sending pause...
📥 Received: {"type":"command_ack","command":"pause"}

📤 Sending resume...
📥 Received: {"type":"command_ack","command":"resume"}

✅ All tests passed! /ws/control is working correctly.
```

**If you get "❌ Connection failed with status 404"**:
- The endpoint is NOT registered (despite being in the code)
- Likely cause: old server still running OR import error

**If you get "❌ Connection refused"**:
- Backend is not running on port 8000
- Check: `netstat -ano | findstr :8000`

**If you get "✅ Connected" but timeout on response**:
- Connected but handler is broken
- Check backend logs for errors

### Step 6: Check the health endpoint

```powershell
Invoke-RestMethod -Uri "http://localhost:8000/health" | ConvertTo-Json -Depth 3
```

Look for:
```json
{
  "endpoints": {
    "control_ws": "/ws/control",  ← Should be present
    "live_browser_ws": "/ws/browser"
  }
}
```

### Step 7: Test from frontend

1. Open http://localhost:5173
2. Open DevTools (F12) → Network → WS tab
3. Enter task: "test"
4. Click "Build"
5. Look for `/ws/control?session_id=...` in WS tab

**Expected**: Status 101 (Switching Protocols) - NOT "Pending"

**If Pending**:
- Frontend is connecting but backend isn't accepting
- Check backend logs for connection attempt
- Should see: "🔵 Control WS connected (session: ...)"

## What to report back

Please run Steps 1-6 and paste:

1. **Git commit hash** (Step 1)
2. **Python processes before/after killing** (Step 2)
3. **Backend startup logs** (Step 4) - first 20 lines
4. **test_control_ws.py output** (Step 5) - FULL output
5. **Health endpoint JSON** (Step 6)

This will definitively show whether:
- A) The endpoint exists and works (test_control_ws.py succeeds)
- B) The endpoint is missing (404 error)
- C) Something else is wrong

## Quick sanity check

Run this in the backend directory:

```powershell
# Count how many times /ws/control appears in server.py
(Select-String -Path server.py -Pattern '/ws/control').Count

# Should output: 3
# (1 for @app.websocket, 1 for health endpoint, 1 for docstring)
```

If it outputs 3, the code is correct. If less, you have an old version.
