# 🎯 COMPLETE SETUP GUIDE - FORGE Platform

## 🔍 ROOT CAUSE ANALYSIS

### Why Backend Was Crashing

Your backend was closing immediately because of **MISSING requirements**:

1. ❌ **Python packages not installed** (`uvicorn`, `fastapi`, `playwright`, etc.)
2. ❌ **ANTHROPIC_API_KEY not set** (required by adaptive_agent.py)
3. ❌ **Playwright browser not installed** (optional, but needed for automation)

### ✅ What I Fixed

1. ✅ Installed all Python dependencies from `requirements.txt`
2. ✅ Created `.env.example` for API key configuration
3. ✅ Created `start.sh` - Smart startup script that handles everything
4. ✅ Integration between adaptive_agent.py and backend server verified

---

## 🚀 QUICK START (3 Steps)

### Step 1: Set Your API Key

**Option A: Create .env file (Recommended)**
```bash
cd /home/user/intel_V2
cp .env.example .env
nano .env
```

Edit the file and add your key:
```
ANTHROPIC_API_KEY=sk-ant-api-your-actual-key-here
```

Save and exit (Ctrl+X, Y, Enter)

**Option B: Export temporarily**
```bash
export ANTHROPIC_API_KEY='sk-ant-api-your-key-here'
```

**Option C: Script will prompt you**
```bash
./start.sh
# Enter key when prompted
```

### Step 2: Start Backend

```bash
cd /home/user/intel_V2
./start.sh
```

**You should see:**
```
╔══════════════════════════════════════════════════════════════════╗
║                   🚀 FORGE PLATFORM STARTUP                      ║
╚══════════════════════════════════════════════════════════════════╝

✅ API Key detected: sk-ant-api...
✅ Dependencies OK

╔══════════════════════════════════════════════════════════════════╗
║                 🚀 STARTING BACKEND SERVER                       ║
╚══════════════════════════════════════════════════════════════════╝

Backend will start on: http://localhost:8000

INFO:     Uvicorn running on http://0.0.0.0:8000 (Press CTRL+C to quit)
INFO:     Started reloader process
INFO:     Started server process
✅ ANTHROPIC_API_KEY is set
🚀 Initializing live browser manager...
✅ Live browser ready for streaming
INFO:     Application startup complete.
```

**Keep this terminal open!**

### Step 3: Access the UI

**Production Mode (Single Server):**
```
Visit: http://localhost:8000
```

**Development Mode (With Hot Reload):**

Open a **second terminal**:
```bash
cd /home/user/intel_V2/frontend
npm run dev
```

Then visit: `http://localhost:5173`

---

## 📊 ARCHITECTURE OVERVIEW

```
┌─────────────────────────────────────────────────────────────────┐
│                     FORGE PLATFORM                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  FRONTEND (React + Vite)                                        │
│  ├── Source: frontend/src/ForgePlatform.jsx                     │
│  ├── Built: backend/static/                                     │
│  ├── Dev Server: Port 5173 (hot reload)                         │
│  └── Production: Served from port 8000                          │
│                                                                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  BACKEND (FastAPI + WebSocket)                                  │
│  ├── server.py: HTTP/WebSocket server                           │
│  ├── adaptive_agent.py: Claude AI + Playwright automation       │
│  ├── Port: 8000                                                 │
│  └── APIs: /execute/stream, /execute/pause, /execute/resume     │
│                                                                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  BROWSER AUTOMATION                                             │
│  ├── Playwright: Chromium browser control                       │
│  ├── Claude AI: Intelligent decision making                     │
│  ├── Screenshots: Real-time streaming to frontend               │
│  └── WebSocket: Bi-directional communication                    │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔄 HOW IT WORKS

### 1. User Enters Task (Port 5173 or 8000)

```
User types: "go to amazon and find queen bed frame under 100"
```

### 2. Frontend Sends to Backend

```javascript
// ForgePlatform.jsx
fetch('http://localhost:8000/execute/stream', {
  method: 'POST',
  body: JSON.stringify({ task, headless: false, max_steps: 40 })
})
```

### 3. Backend Starts Agent

```python
# server.py receives request
# Calls run_adaptive_agent() from adaptive_agent.py

# adaptive_agent.py starts Playwright browser
browser = playwright.chromium.launch(headless=False)

# Takes screenshots, sends to Claude AI
screenshot = page.screenshot()
response = client.messages.create(
    model="claude-sonnet-4-5-20250929",
    messages=[{
        "role": "user",
        "content": [
            {"type": "image", "source": {"data": screenshot_b64}},
            {"type": "text", "text": "What should I do next?"}
        ]
    }]
)

# Claude decides: click button #5, type "queen bed frame", etc.
```

### 4. Real-time Updates via WebSocket

```
Backend → Frontend (ws://localhost:8000/ws)

• frame: Browser screenshot (base64 PNG)
• step_started: { id: 1, label: "Navigate to amazon.com" }
• step_completed: { id: 1, duration: 2.5 }
• thinking: "I'll search for queen bed frames..."
• error: "Failed to find element"
```

### 5. Frontend Displays Progress

```jsx
// ForgePlatform.jsx updates UI in real-time:

Left Panel:
- ● LIVE BROWSER (pulsing green dot)
- Total time: 0m 45s
- Steps timeline with icons (✓ ● ✕)

Right Panel:
- Canvas displays live browser screenshots
- Updates 10-30 times per second
- Shows what agent is doing in real-time
```

---

## 🎮 USING THE APPLICATION

### Example Task Flow

1. **Enter task**: "go to walmart and find tvs under $500 with 4+ star ratings"
2. **Click Start** (orange button)
3. **Watch agent work**:
   - Left panel shows steps: "Navigating to walmart.com", "Typing search query", etc.
   - Right panel shows live browser doing the work
   - Timer counts up: 0m 1s, 0m 2s, ...
4. **Pause if needed**: Click orange Pause button
5. **Send message**: Type in "Message Browser Use" input, press Enter
6. **Resume**: Pause button turns green, click to resume
7. **Stop**: Click red Stop button to abort

### Controls

| Button/Input | Function |
|--------------|----------|
| Start (orange) | Begin automation |
| Stop (red) | Abort execution |
| Pause (orange) | Pause agent |
| Resume (green) | Resume from pause |
| Message input | Send instruction to agent mid-execution |

---

## 🐛 TROUBLESHOOTING

### Issue: Backend crashes with "ANTHROPIC_API_KEY not found"

**Solution:**
```bash
# Set API key
export ANTHROPIC_API_KEY='sk-ant-api-...'

# Or create .env file
cp .env.example .env
nano .env
# Add: ANTHROPIC_API_KEY=sk-ant-api-...
```

### Issue: "Failed to fetch" error in browser

**Solution:**
```bash
# Backend not running - start it
cd /home/user/intel_V2
./start.sh
```

### Issue: "ModuleNotFoundError: No module named 'uvicorn'"

**Solution:**
```bash
# Install dependencies
pip install -r requirements.txt
```

### Issue: Frontend not updating

**Solution:**
```bash
# Rebuild frontend
cd /home/user/intel_V2/frontend
npm run build

# Hard refresh browser
# Windows/Linux: Ctrl + Shift + R
# Mac: Cmd + Shift + R
```

### Issue: Canvas stays black/doesn't update

**Check:**
1. Is backend running? `curl http://localhost:8000/health`
2. Is WebSocket connected? Check browser console (F12)
3. Did agent start? Check backend terminal for logs
4. Is task valid? Try simple task: "go to google.com"

**Debug:**
```bash
# Backend logs show:
🚀 Starting agent execution for task: ...
INFO:     🔵 WebSocket connected (/ws)
📸 Taking screenshot...
✅ Frame sent to frontend

# Browser console (F12) should show:
✅ WebSocket connected
📨 Message: frame
🖼️ Frame received: 45231 bytes
✅ Frame drawn to canvas (1920x1080)
```

---

## 📁 PROJECT STRUCTURE

```
/home/user/intel_V2/
├── adaptive_agent.py         # Main AI agent logic
├── backend/
│   ├── server.py              # FastAPI server
│   └── static/                # Built frontend (from npm run build)
│       ├── index.html
│       └── assets/
├── frontend/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── components/
│   │       └── ForgePlatform.jsx  # Main UI component
│   ├── package.json
│   └── vite.config.js
├── computational_env.py       # Code execution environment
├── analytics_engine.py        # Data analytics
├── requirements.txt           # Python dependencies
├── .env                       # API keys (create this)
├── .env.example               # Template
├── start.sh                   # Easy startup script
└── README.md                  # Project docs
```

---

## 🎯 INTEGRATION COMPLETE

### What Was Integrated

✅ **adaptive_agent.py** with **backend/server.py**
- Server imports: `from adaptive_agent import AgentConfig, AgentResult, run_adaptive_agent`
- API endpoint `/execute/stream` calls `run_adaptive_agent()`
- WebSocket broadcasts agent progress to frontend

✅ **Backend (8000)** with **Frontend UI (5173)**
- Frontend makes POST to: `http://localhost:8000/execute/stream`
- WebSocket connects to: `ws://localhost:8000/ws`
- Real-time canvas updates via base64 PNG frames
- Pause/Resume/Stop controls via API

✅ **All Dependencies Installed**
- Python: `uvicorn`, `fastapi`, `playwright`, `anthropic`, etc.
- Playwright browsers: Chromium (may need re-download)
- Frontend: React, Vite, Lucide icons

---

## 🚀 NEXT STEPS

1. **Start backend**: `./start.sh`
2. **Test health**: Visit `http://localhost:8000/health`
3. **Open UI**: Visit `http://localhost:8000`
4. **Enter task**: "go to google.com and search for weather"
5. **Click Start**
6. **Watch magic happen!** ✨

---

## 📝 COMMANDS CHEAT SHEET

```bash
# Start backend (production mode)
./start.sh

# Start frontend dev mode (hot reload)
cd frontend && npm run dev

# Rebuild frontend
cd frontend && npm run build

# Test backend health
curl http://localhost:8000/health

# View backend logs
# They appear in terminal where you ran ./start.sh

# Stop backend
# Press Ctrl+C in terminal

# Check API key
echo $ANTHROPIC_API_KEY
```

---

## 🎉 SUCCESS CRITERIA

You'll know it's working when:

1. ✅ Backend starts without crashing
2. ✅ Browser opens: `http://localhost:8000`
3. ✅ UI loads with orange FORGE branding
4. ✅ You enter task and click Start
5. ✅ Left panel shows: "● LIVE BROWSER" with green dot
6. ✅ Right panel shows: Live browser automation
7. ✅ Steps appear in timeline with icons
8. ✅ Timer counts up: 0m 1s, 0m 2s, ...
9. ✅ Canvas updates with browser screenshots
10. ✅ Task completes successfully!

---

**Need help?** Check backend terminal for error messages!
