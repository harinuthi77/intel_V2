# Verify /ws/control Endpoint

## Step 1: Check if backend is running

```powershell
# Stop the backend if it's running (Ctrl+C)
# Then restart it:
cd backend
python server.py
```

## Step 2: Verify the health endpoint lists /ws/control

In a NEW PowerShell window:

```powershell
# Check health endpoint
Invoke-RestMethod -Uri "http://localhost:8000/health" | ConvertTo-Json -Depth 3
```

**Expected output should include**:
```json
{
  "endpoints": {
    "control_ws": "/ws/control",
    "live_browser_ws": "/ws/browser",
    ...
  }
}
```

## Step 3: Check WebSocket routes are registered

Look at the backend startup logs. You should see:
```
INFO:     Application startup complete.
INFO:     Uvicorn running on http://0.0.0.0:8000 (Press CTRL+C to quit)
```

No errors about routes failing to register.

## Step 4: Test /ws/control connection directly

```powershell
# Install wscat if not already installed
npm install -g wscat

# Test control WebSocket
wscat -c "ws://localhost:8000/ws/control?session_id=test123"
```

**Expected**: Connection should succeed (not "Pending")

**Once connected, send a ping**:
```json
{"type":"ping"}
```

**Expected response**:
```json
{"type":"command_ack","command":"ping"}
```

## Step 5: Check frontend connection

1. Open http://localhost:5173
2. Open DevTools (F12) → Console
3. Enter a task and click "Build"
4. Check Network → WS tab

**Expected**:
- `/ws/control?session_id=<uuid>` → Status: 101 Switching Protocols
- Should NOT be "Pending"

## If /ws/control is still missing:

### Check the actual code version

```powershell
cd backend
git log -1 --oneline
# Should show: d630cdb feat: Complete browser streaming...

# Check if /ws/control endpoint exists
Select-String -Path server.py -Pattern '@app.websocket\("/ws/control"\)'
# Should show: 521:@app.websocket("/ws/control")
```

### Verify CONTROL_STATE globals

```powershell
Select-String -Path server.py -Pattern 'CONTROL_STATE = defaultdict'
# Should show: 42:CONTROL_STATE = defaultdict(lambda: {"paused": False, "stopped": False, "nudge": None})
```

## Common Issues

### Issue 1: Old server still running
**Solution**: Make sure to Ctrl+C the old server, then restart with `python server.py`

### Issue 2: Cached imports
**Solution**:
```powershell
cd backend
Remove-Item -Recurse -Force __pycache__
python server.py
```

### Issue 3: Port conflict
**Solution**: Check if something else is on port 8000
```powershell
netstat -ano | findstr :8000
# Kill the process if needed
```

### Issue 4: Missing dependencies
**Solution**:
```powershell
pip install -r requirements.txt
```

## What to report back

Please run Steps 1-3 and paste:
1. The health endpoint JSON output
2. Any errors from backend console
3. The wscat connection result

This will tell us exactly what's happening.
