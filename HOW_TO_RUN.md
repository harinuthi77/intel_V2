# 🚀 HOW TO RUN FORGE PLATFORM

## 📋 ARCHITECTURE OVERVIEW

```
┌─────────────────────────────────────────────────────────────┐
│                    FORGE APPLICATION                         │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  FRONTEND (React + Vite)           BACKEND (FastAPI)        │
│  ├── Source: frontend/src/         ├── server.py            │
│  ├── Built: backend/static/        ├── adaptive_agent.py    │
│  └── Dev Server: Port 5173         └── Port 8000            │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## ✅ RECOMMENDED: PRODUCTION MODE (Single Server)

**Use this for the full FORGE experience**

### Step 1: Start Backend Server

```bash
cd /home/user/intel_V2
python -m uvicorn backend.server:app --reload --host 0.0.0.0 --port 8000
```

**You should see:**
```
INFO:     Uvicorn running on http://0.0.0.0:8000 (Press CTRL+C to quit)
INFO:     Started reloader process
INFO:     Started server process
INFO:     Waiting for application startup.
✅ ANTHROPIC_API_KEY is set (starts with sk-ant-api...)
🚀 Initializing live browser manager...
✅ Live browser ready for streaming
INFO:     Application startup complete.
✅ Serving frontend static files from /home/user/intel_V2/backend/static
```

### Step 2: Open Browser

Visit: **http://localhost:8000**

**You should see:**
- ✅ FORGE UI with orange branding
- ✅ Task input field at top
- ✅ Left panel (380px) with Live Browser status
- ✅ Right panel with large canvas area
- ✅ "Ready to Browse" message with 🌐 icon

### Step 3: Test the Application

1. **Enter a task**:
   ```
   go to amazon.com and find Logitech MX Master Pro mouse
   ```

2. **Click Start** - You should see:
   - ✅ Left panel shows "LIVE BROWSER" with green pulsing dot
   - ✅ Timer starts: "Total time: 0m 1s" (updates every second)
   - ✅ Model name: "Using claude-sonnet-4-5-20250929"
   - ✅ Steps appear in timeline with icons (● ✓ ✕)
   - ✅ Canvas shows live browser (fills most of screen)
   - ✅ Red "LIVE" badge with current URL

3. **Test Controls**:
   - **Pause** button: Should pause execution (button turns green "Resume")
   - **Stop** button: Should stop and reset to idle
   - **Message input**: Type message, press Enter to send to agent

---

## 🔧 ALTERNATIVE: DEVELOPMENT MODE (Two Servers)

**Use this ONLY if you're modifying the frontend code**

### Terminal 1 - Backend

```bash
cd /home/user/intel_V2
python -m uvicorn backend.server:app --reload --host 0.0.0.0 --port 8000
```

### Terminal 2 - Frontend (separate terminal)

```bash
cd /home/user/intel_V2/frontend
npm run dev
```

**You should see:**
```
VITE v5.4.21  ready in 423 ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
  ➜  press h + enter to show help
```

### Visit Development Server

Visit: **http://localhost:5173**

**Benefits:**
- ✅ Hot reload - Changes to .jsx files update instantly
- ✅ React DevTools work properly
- ✅ Source maps for debugging
- ✅ Faster feedback loop for UI changes

**How it works:**
- Frontend (5173) makes API calls to backend (8000)
- CORS is configured in server.py to allow this
- WebSocket connects to ws://localhost:8000/ws

---

## 🔄 WHEN TO REBUILD FRONTEND

**You need to rebuild when:**
- You make changes to frontend/.jsx files
- You want to test in production mode (port 8000)
- You're ready to deploy

**How to rebuild:**

```bash
cd /home/user/intel_V2/frontend
npm run build
```

**Output:**
```
vite v5.4.21 building for production...
✓ 1498 modules transformed.
✓ built in 2.92s

Files written to: ../backend/static/
```

**What happens:**
1. Vite bundles all React code into optimized JS/CSS
2. Copies output to `backend/static/`
3. Backend serves these files at http://localhost:8000

---

## 🐛 TROUBLESHOOTING

### Issue: "Cannot connect to WebSocket"

**Check:**
```bash
# Is backend running?
curl http://localhost:8000/health

# Should return:
{
  "status": "healthy",
  "version": "2.0.0",
  ...
}
```

**Fix:** Start backend server first

---

### Issue: "Port 8000 already in use"

**Check:**
```bash
# Linux/Mac
lsof -i :8000

# Windows
netstat -ano | findstr :8000
```

**Fix:** Kill existing process or use different port:
```bash
python -m uvicorn backend.server:app --reload --port 8001
```

---

### Issue: Canvas not updating / stays black

**Checklist:**
1. ✓ Is WebSocket connected? (Check browser console: F12)
2. ✓ Did you click "Start" button?
3. ✓ Is task field filled in?
4. ✓ Check backend logs for errors

**Debug:**
```javascript
// Open browser console (F12) and check:
// Should see:
✅ WebSocket connected
📨 Message: frame
🖼️ Frame received: 12345 bytes
✅ Frame drawn to canvas (1920x1080)
```

---

### Issue: UI looks old / changes not showing

**Fix:** Hard refresh browser
- **Windows/Linux**: Ctrl + Shift + R
- **Mac**: Cmd + Shift + R

**Or:** Rebuild frontend
```bash
cd /home/user/intel_V2/frontend
npm run build
```

Then refresh browser normally

---

## 📊 CURRENT BUILD STATUS

✅ **Frontend Built**: Oct 24, 2025 08:19 AM
- `index.html` (512 bytes)
- `assets/index-B0Edd6Md.js` (158 KB)
- `assets/index-CO3a17Gr.css` (215 bytes)

✅ **Backend Configured**:
- Serves static files from `backend/static/`
- WebSocket endpoint: `/ws`
- API endpoints: `/execute/stream`, `/execute/pause`, `/execute/resume`, `/execute/message`

---

## 🎯 QUICK START COMMAND

**Just want to run it? Copy-paste this:**

```bash
cd /home/user/intel_V2 && python -m uvicorn backend.server:app --reload --host 0.0.0.0 --port 8000
```

Then open: **http://localhost:8000**

---

## 📝 ARCHITECTURE NOTES

### How Frontend Build Works

```
┌────────────────────────────────────────────────────────┐
│  frontend/src/                                         │
│  ├── App.jsx                 ┐                         │
│  ├── main.jsx                │  npm run build          │
│  └── components/             │  (Vite bundler)         │
│      └── ForgePlatform.jsx   │                         │
│                              ↓                         │
│  backend/static/                                       │
│  ├── index.html              ← Entry point            │
│  └── assets/                                           │
│      ├── index-[hash].js     ← Bundled React code     │
│      └── index-[hash].css    ← Bundled styles         │
└────────────────────────────────────────────────────────┘
```

### How Backend Serves Frontend

```python
# backend/server.py

# Serve static assets
app.mount("/assets", StaticFiles(directory=STATIC_DIR / "assets"))

# Serve index.html at root
@app.get("/")
async def serve_frontend():
    return FileResponse(STATIC_DIR / "index.html")
```

### How WebSocket Works

```
Frontend (Browser)          Backend (FastAPI)
       |                           |
       |------- connect ---------->|  ws://localhost:8000/ws
       |                           |
       |<------ frame data --------|  Browser screenshots
       |<------ step_started ------|  Agent progress
       |<------ thinking ----------|  Agent thoughts
       |                           |
       |------- stop ------------->|  User controls
       |------- pause ------------>|
```

---

## 🚀 PRODUCTION DEPLOYMENT (Future)

When deploying to production server:

```bash
# 1. Build frontend
cd frontend && npm run build

# 2. Copy static files (already done by build)
# Files are in backend/static/

# 3. Run backend with production settings
cd ..
uvicorn backend.server:app --host 0.0.0.0 --port 8000 --workers 4

# 4. Point domain to server:8000
# Example: https://forge.yourdomain.com → server_ip:8000
```

---

**Need help? Check:**
- Backend logs: Look for errors when starting uvicorn
- Browser console (F12): Check for WebSocket/API errors
- Network tab: Verify API calls are reaching backend
