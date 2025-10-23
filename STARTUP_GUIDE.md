# Adaptive Agent Platform - Startup Guide

## 🚀 Quick Start (5 Minutes)

### Prerequisites Check

```powershell
# 1. Check Python version (need 3.10+)
python --version

# 2. Check Node.js version (need 18+)
node --version

# 3. Verify virtual environment exists
ls .venv
```

### One-Time Setup

```powershell
# 1. Activate virtual environment
.venv\Scripts\activate

# 2. Install Python dependencies
pip install -r requirements.txt

# 3. Install Playwright browsers
playwright install

# 4. Set your API key (REQUIRED!)
$env:ANTHROPIC_API_KEY = "sk-ant-your-key-here"

# 5. Build the frontend
.\build.bat
```

### Start the Application

```powershell
# Start the integrated app (frontend + backend on port 8000)
.\start.bat
```

### Access the Application

Open your browser to: **http://localhost:8000**

---

## ✅ Verification Steps

### Step 1: Check Backend is Running

```powershell
# Test health endpoint
curl http://localhost:8000/health
```

**Expected Response:**
```json
{
  "status": "healthy",
  "version": "1.0.0",
  "endpoints": {...},
  "features": {
    "screenshot_streaming": true,
    "manual_control": true,
    "integrated_frontend": true
  }
}
```

### Step 2: Check Frontend is Served

Open browser to `http://localhost:8000` and verify:
- ✅ ForgePlatform UI loads
- ✅ Sidebar with tool icons visible
- ✅ Task input area present
- ✅ No console errors (Press F12 to check)

### Step 3: Test End-to-End

1. Enter test prompt: `"Go to google.com"`
2. Click **Send** button
3. Verify:
   - ✅ "Initializing agent" status appears
   - ✅ Backend terminal shows logs
   - ✅ Browser console shows: `📡 Event: ...`
   - ✅ Browser screenshot appears in UI

---

## 🔧 Troubleshooting

### Issue 1: "CONNECTION_REFUSED" Error

**Symptoms:**
- Browser shows: `ERR_CONNECTION_REFUSED`
- Network tab shows 404 on `/execute/stream`

**Cause:** Backend not running or wrong URL

**Fix:**
```powershell
# 1. Check if backend is running
netstat -ano | findstr :8000

# 2. If not running, start it
.\start.bat

# 3. Verify you're accessing http://localhost:8000 (NOT 5173)
```

### Issue 2: Port 8000 Already in Use

**Symptoms:**
- Error: "Address already in use"

**Fix:**
```powershell
# Find process using port 8000
netstat -ano | findstr :8000

# Kill the process (replace PID with actual number)
taskkill /PID <PID> /F

# Start again
.\start.bat
```

### Issue 3: Missing ANTHROPIC_API_KEY

**Symptoms:**
- Backend error: "ANTHROPIC_API_KEY not found"
- Agent fails to start

**Fix:**
```powershell
# Set the environment variable
$env:ANTHROPIC_API_KEY = "sk-ant-your-key-here"

# Restart the backend
.\start.bat
```

### Issue 4: Frontend Not Updated

**Symptoms:**
- Old UI appears
- Features missing
- Console errors

**Fix:**
```powershell
# Stop backend (Ctrl+C)

# Rebuild frontend
.\build.bat

# Restart backend
.\start.bat

# Hard refresh browser (Ctrl+Shift+R)
```

### Issue 5: "Frontend not built yet" Error

**Symptoms:**
- `.\start.bat` says "Frontend not built yet!"

**Fix:**
```powershell
# Build the frontend first
.\build.bat

# Then start
.\start.bat
```

---

## 📋 Architecture Overview

### Integrated Mode (Production)

```
┌─────────────────────────────────────────┐
│    Browser: http://localhost:8000       │
│                                          │
│  ┌────────────────────────────────────┐ │
│  │     ForgePlatform UI (React)       │ │
│  │  - Task input                      │ │
│  │  - Tool selection                  │ │
│  │  - Live browser view               │ │
│  │  - Manual control                  │ │
│  └─────────────┬──────────────────────┘ │
│                │ fetch()                 │
│                ▼                         │
│  ┌────────────────────────────────────┐ │
│  │    FastAPI Backend (Python)        │ │
│  │  - /execute/stream (SSE)           │ │
│  │  - /navigate                       │ │
│  │  - /health                         │ │
│  │  - Static file serving             │ │
│  └─────────────┬──────────────────────┘ │
│                │                         │
│                ▼                         │
│  ┌────────────────────────────────────┐ │
│  │   Adaptive Agent (Playwright)      │ │
│  │  - Claude API integration          │ │
│  │  - Browser automation              │ │
│  │  - Screenshot streaming            │ │
│  │  - Learning database               │ │
│  └────────────────────────────────────┘ │
└─────────────────────────────────────────┘

Single port: 8000
No CORS issues
Production ready
```

### Development Mode (Optional)

```
Browser: http://localhost:5173     Browser: http://localhost:8000/docs
         (Vite dev server)                  (API docs)
                │                                  │
                ▼                                  ▼
    ┌───────────────────────┐        ┌───────────────────────┐
    │  Frontend (React)     │───────▶│  Backend (FastAPI)    │
    │  Port: 5173          │  CORS   │  Port: 8000          │
    │  Hot reload enabled   │         │  Auto-reload enabled │
    └───────────────────────┘        └───────────────────────┘

For development with hot reload on both sides
```

---

## 🎯 Feature Checklist

### ✅ Implemented Features

- [x] **Screenshot Streaming** - Real-time browser view via SSE
- [x] **Manual Control Mode** - Take Control button for human intervention
- [x] **Single App Integration** - Spring Boot style deployment
- [x] **Intelligent Reasoning** - Claude filters and analyzes data
- [x] **Memory System** - Learns from past successes/failures
- [x] **Tool Selection** - Web, Code, Image, Data, API tools
- [x] **Progress Tracking** - Step-by-step execution display
- [x] **Error Handling** - Graceful failure with error messages
- [x] **Clean Repository** - No unnecessary files, comprehensive .gitignore

### 🚧 Partial/TODO Features

- [ ] **Pause/Resume Controls** - UI ready, backend needs implementation
- [ ] **Browser Session Management** - Required for live manual navigation
- [ ] **PDF Reading** - Vision-based text extraction needed
- [ ] **Headless Mode Toggle** - UI control for headless browser

---

## 🐛 Debug Mode

To enable detailed logging:

```powershell
# Set environment variable for debug mode
$env:LOG_LEVEL = "DEBUG"

# Start with verbose logging
uvicorn backend.server:app --host 0.0.0.0 --port 8000 --reload --log-level debug
```

Check logs in:
- **Backend:** PowerShell terminal where uvicorn is running
- **Frontend:** Browser Developer Tools Console (F12)
- **Network:** Browser Developer Tools Network tab (F12)

---

## 📞 Quick Reference

| Command | Purpose |
|---------|---------|
| `.\build.bat` | Build frontend and integrate with backend |
| `.\start.bat` | Start the integrated application |
| `curl http://localhost:8000/health` | Check backend health |
| `netstat -ano \| findstr :8000` | Check if port 8000 is in use |
| `taskkill /PID <PID> /F` | Kill process on port 8000 |
| `$env:ANTHROPIC_API_KEY = "..."` | Set API key |
| `.venv\Scripts\activate` | Activate virtual environment |

---

## 🎓 Usage Examples

### Example 1: Simple Search
```
Prompt: "Go to walmart.com and find bed frames under $300"

Expected behavior:
1. Browser opens walmart.com
2. Searches for bed frames
3. Filters by price
4. Extracts relevant items
5. Claude analyzes and recommends best options
6. Shows live screenshots in UI
```

### Example 2: Manual Intervention
```
Prompt: "Go to amazon.com and find laptops"

During execution:
1. Click "Take Control" button
2. Manually navigate or adjust filters
3. Click "Resume Automation"
4. Agent continues with updated context
```

### Example 3: Multi-step Task
```
Prompt: "Compare prices for iPhone 15 on walmart.com and target.com"

Expected behavior:
1. Navigates to walmart.com
2. Searches and extracts prices
3. Navigates to target.com
4. Searches and extracts prices
5. Claude compares and provides recommendation
```

---

## 🔒 Security Notes

- **API Keys:** Never commit `.env` files or API keys to git
- **Database:** `agent_learning.db` is gitignored (contains session data)
- **Static Files:** `backend/static/` is gitignored (generated by build)
- **Dependencies:** Regularly update with `pip install --upgrade -r requirements.txt`

---

**Last Updated:** 2025-10-23
**Version:** 1.0.0
**Support:** Check README.md for detailed documentation
