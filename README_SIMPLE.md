# Intel V2 - Live Browser Agent

**Simple Setup - ONE PORT: 8000**

## Quick Start (3 Steps)

```powershell
# 1. Build frontend
.\build.ps1

# 2. Run server
.\run.ps1

# 3. Open browser
# http://localhost:8000
```

Done! Everything runs on **port 8000**.

---

## What You Get

- **Frontend UI**: http://localhost:8000
- **API Endpoints**: http://localhost:8000/execute, /health, /navigate
- **WebSocket Control**: ws://localhost:8000/ws/control
- **WebSocket Browser**: ws://localhost:8000/ws/browser

All on **ONE port: 8000**.

---

## Features

✅ Live browser streaming at ~20 FPS
✅ Pause/Resume/Stop controls
✅ Real-time step timeline
✅ Agent's Playwright browser visible in UI
✅ Thread-safe control state
✅ Single port deployment

---

## First Time Setup

### Prerequisites
- Python 3.8+ with pip
- Node.js 16+ with npm
- Anthropic API key

### Install

```powershell
# Set API key
$env:ANTHROPIC_API_KEY = "sk-ant-api..."

# Install backend
cd backend
pip install -r requirements.txt

# Install frontend
cd ../frontend
npm install

# Build frontend
cd ..
.\build.ps1
```

---

## Running

### Production Mode (Recommended)

```powershell
.\run.ps1
```

Opens at: **http://localhost:8000**

### Development Mode (For Frontend Editing)

**Terminal 1** (Backend - always needed):
```powershell
cd backend
python server.py
```

**Terminal 2** (Frontend dev server with hot reload):
```powershell
cd frontend
npm run dev
```

Opens at: **http://localhost:5173** (dev server proxies to backend at 8000)

**After editing**: Run `.\build.ps1` to rebuild for production.

---

## Usage

1. Open http://localhost:8000
2. Enter a task (e.g., "Search Google for best laptops under $1000")
3. Click "Build"
4. Watch the agent:
   - **Left panel**: Step-by-step execution timeline
   - **Center**: Live browser streaming (~20 FPS)
   - **Top**: Control buttons (Pause/Resume/Stop)

---

## Port Reference

| Mode | Port | What | Command |
|------|------|------|---------|
| **Production** | **8000** | **Everything** | **`.\run.ps1`** |
| Development | 5173 | Frontend dev server | `cd frontend && npm run dev` |
| Development | 8000 | Backend API | `cd backend && python server.py` |

**Use production mode (port 8000) for normal usage.**

---

## Troubleshooting

### "Port 8000 already in use"
```powershell
# Find and kill process
netstat -ano | findstr :8000
Stop-Process -Id <PID> -Force

# Or use run.ps1 which handles this automatically
.\run.ps1
```

### Frontend not loading
```powershell
# Rebuild frontend
.\build.ps1

# Verify
ls backend/static/index.html
```

### WebSocket "Pending"
```powershell
# Restart backend
cd backend
python server.py

# Test control endpoint
python test_control_ws.py
```

### API key not set
```powershell
# PowerShell
$env:ANTHROPIC_API_KEY = "sk-ant-api..."

# Or set permanently
[System.Environment]::SetEnvironmentVariable('ANTHROPIC_API_KEY', 'sk-ant-api...', 'User')
```

---

## File Structure

```
intel_V2/
├── build.ps1              # Build frontend → backend/static/
├── run.ps1                # Start server on port 8000
├── backend/
│   ├── server.py          # FastAPI server (port 8000)
│   ├── adaptive_agent.py  # Agent with live streaming
│   ├── static/            # Built frontend (auto-generated)
│   └── test_control_ws.py # WebSocket test
└── frontend/
    ├── src/               # React source
    └── vite.config.js     # Builds to ../backend/static/
```

---

## Scripts

| Script | Purpose | Output |
|--------|---------|--------|
| `.\build.ps1` | Build frontend | `backend/static/` |
| `.\run.ps1` | Run on port 8000 | http://localhost:8000 |
| `backend\verify.ps1` | Verify setup | Diagnostic info |
| `backend\test_control_ws.py` | Test WebSocket | Pass/fail |

---

## Documentation

- **BUILD_AND_RUN.md** - Detailed build and run guide
- **BROWSER_STREAMING_COMPLETE.md** - Implementation details
- **DIAGNOSTIC_STEPS.md** - Troubleshooting guide
- **VERIFY_CONTROL_ENDPOINT.md** - WebSocket verification

---

## Summary

**ONE PORT: 8000**

```powershell
.\build.ps1  # First time
.\run.ps1    # Every time
```

Open: **http://localhost:8000**

Simple!
