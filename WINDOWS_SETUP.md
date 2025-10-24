# 🪟 FORGE - Windows Setup Guide

Complete guide to run FORGE on Windows with all common issues resolved.

---

## 🚀 Quick Start (3 Steps)

### Option 1: Automated Setup (Recommended)

```cmd
REM 1. Run the setup script (one-time)
setup.bat

REM 2. Set your API key
set ANTHROPIC_API_KEY=your_key_here

REM 3. Start the server
run.bat
```

### Option 2: Manual Setup

```cmd
REM 1. Install Python dependencies
pip install -r requirements.txt

REM 2. Build frontend
cd frontend
npm install --legacy-peer-deps
npm run build
cd ..

REM 3. Copy frontend to backend
xcopy /E /Y /I frontend\dist\* backend\static\

REM 4. Set API key
set ANTHROPIC_API_KEY=your_key_here

REM 5. Start server
python backend\server.py
```

---

## ✅ Prerequisites

Before you begin, ensure you have:

- ✅ **Python 3.10+** installed
  ```cmd
  python --version
  ```

- ✅ **Node.js 18+** and **npm** installed
  ```cmd
  node --version
  npm --version
  ```

- ✅ **Git** installed
  ```cmd
  git --version
  ```

- ✅ **Anthropic API Key** from https://console.anthropic.com

---

## 🐛 Common Issues & Solutions

### Issue 1: "ModuleNotFoundError: No module named 'adaptive_agent'"

**Symptom:**
```
Traceback (most recent call last):
  File "C:\...\backend\server.py", line 30, in <module>
    from adaptive_agent import AgentConfig, AgentResult, run_adaptive_agent
ModuleNotFoundError: No module named 'adaptive_agent'
```

**Solution:**
This has been FIXED in the latest version. Make sure you have the updated `backend/server.py`.

If you still see this error:

```cmd
REM Pull latest changes
git pull origin claude/ai-capabilities-comparison-011CUPYgdPVvCYT8PEh6KEQQ

REM Or manually verify backend\server.py has this at the top:
REM Lines 5-15 should have the path setup code
```

**Manual Fix (if needed):**
Run from the root directory:
```cmd
cd C:\path\to\intel_V2
python backend\server.py
```

NOT from inside the backend directory!

---

### Issue 2: Virtual Environment Issues

**Symptom:**
```
pip: command not found
```

**Solution:**

```cmd
REM Create virtual environment
python -m venv .venv

REM Activate it (PowerShell)
.venv\Scripts\Activate.ps1

REM OR Activate it (Command Prompt)
.venv\Scripts\activate.bat

REM Install dependencies
pip install -r requirements.txt
```

If you get "execution policy" errors in PowerShell:
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

---

### Issue 3: Frontend Not Loading

**Symptom:**
- You see "404 Not Found" when opening http://localhost:8000
- Or the page loads but shows blank

**Solution:**

```cmd
REM 1. Build the frontend
cd frontend
npm install --legacy-peer-deps
npm run build
cd ..

REM 2. Copy to backend/static
if not exist backend\static mkdir backend\static
xcopy /E /Y /I frontend\dist\* backend\static\

REM 3. Verify files exist
dir backend\static
REM You should see: index.html and assets folder

REM 4. Restart server
python backend\server.py
```

---

### Issue 4: npm install fails

**Symptom:**
```
npm error ERESOLVE could not resolve
```

**Solution:**
Always use `--legacy-peer-deps`:

```cmd
cd frontend
npm install --legacy-peer-deps
```

If that still fails:
```cmd
REM Clean install
del package-lock.json
rd /s /q node_modules
npm install --legacy-peer-deps
```

---

### Issue 5: Port 8000 Already in Use

**Symptom:**
```
ERROR: [Errno 10048] Only one usage of each socket address...
```

**Solution:**

```cmd
REM Find what's using port 8000
netstat -ano | findstr :8000

REM Kill the process (replace XXXX with PID from above)
taskkill /PID XXXX /F

REM Or change the port in backend\server.py
REM Look for: uvicorn.run(app, host="0.0.0.0", port=8000)
REM Change to: uvicorn.run(app, host="0.0.0.0", port=8001)
```

---

### Issue 6: API Key Not Working

**Symptom:**
```
anthropic.AuthenticationError: Invalid API key
```

**Solution:**

```cmd
REM Option 1: Set environment variable (current session)
set ANTHROPIC_API_KEY=sk-ant-your-key-here

REM Option 2: Set permanently (all sessions)
setx ANTHROPIC_API_KEY "sk-ant-your-key-here"
REM Note: Close and reopen terminal after setx

REM Option 3: Create .env file
echo ANTHROPIC_API_KEY=sk-ant-your-key-here > .env

REM Verify it's set
echo %ANTHROPIC_API_KEY%
```

Get your API key from: https://console.anthropic.com/settings/keys

---

### Issue 7: Playwright Browser Not Installing

**Symptom:**
```
Error: Download failed: server returned code 403
```

**Solution:**
This is a known issue. The good news: **the app works without it!**

What works WITHOUT browser:
- ✅ Analytics (statistics, insights, recommendations)
- ✅ Terminal execution
- ✅ Code execution
- ✅ UI and all features

What NEEDS browser:
- ❌ Web automation (goto, click, type, extract)

To try installing Playwright:
```cmd
REM Try with dependencies
playwright install chromium --with-deps

REM Or just continue without it - analytics still works!
```

---

## 📁 Project Structure (Windows Paths)

```
C:\Users\YourName\intel_V2\
├── adaptive_agent.py          # Main agent
├── analytics_engine.py        # Analytics (beats Manus!)
├── computational_env.py       # Terminal & code execution
├── requirements.txt
├── setup.bat                  # ⭐ Run this first
├── run.bat                    # ⭐ Run this to start
├── backend\
│   ├── server.py             # FastAPI server (FIXED imports)
│   └── static\               # Frontend files (auto-created)
│       ├── index.html
│       └── assets\
└── frontend\
    ├── dist\                 # Built frontend
    ├── src\
    └── package.json
```

---

## 🎯 Step-by-Step First Time Setup

### 1. Clone Repository

```cmd
git clone https://github.com/harinuthi77/intel_V2.git
cd intel_V2
git checkout claude/ai-capabilities-comparison-011CUPYgdPVvCYT8PEh6KEQQ
```

### 2. Create Virtual Environment

```cmd
python -m venv .venv
.venv\Scripts\activate
```

### 3. Run Setup

```cmd
setup.bat
```

This will:
- ✅ Install Python dependencies
- ✅ Install Node.js dependencies
- ✅ Build frontend
- ✅ Copy files to backend/static

### 4. Set API Key

```cmd
set ANTHROPIC_API_KEY=sk-ant-your-key-here
```

### 5. Start Server

```cmd
run.bat
```

### 6. Open Browser

Navigate to: **http://localhost:8000**

---

## 🧪 Testing

### Test 1: Server Health

```cmd
curl http://localhost:8000/health
```

Expected: JSON response with `"status": "healthy"`

### Test 2: Frontend Loads

Open: http://localhost:8000

Expected: See the FORGE interface with sidebar and main panel

### Test 3: Simple Task

In the UI, enter:
```
go to google.com
```

Click "Build" and watch the execution!

---

## 🔄 Updating to Latest Version

```cmd
REM 1. Pull latest changes
git pull origin claude/ai-capabilities-comparison-011CUPYgdPVvCYT8PEh6KEQQ

REM 2. Update dependencies
pip install -r requirements.txt
cd frontend
npm install --legacy-peer-deps
npm run build
cd ..

REM 3. Copy frontend
xcopy /E /Y /I frontend\dist\* backend\static\

REM 4. Restart server
python backend\server.py
```

---

## 💡 Pro Tips for Windows

### Use PowerShell (Recommended)

PowerShell has better features than Command Prompt:
```powershell
# Check if in virtual environment
if ($env:VIRTUAL_ENV) { "✅ venv active" } else { "❌ venv not active" }

# Pretty print JSON
curl http://localhost:8000/health | ConvertFrom-Json | Format-List
```

### Keep Terminal Open

Don't close the terminal running the server! It needs to stay open.

To run in background, use Task Scheduler or a separate terminal window.

### Path Issues

Always use backslashes `\` on Windows for paths:
```cmd
REM Good
cd backend\static

REM Also works (PowerShell)
cd backend/static
```

---

## 🚨 Emergency Reset

If everything is broken:

```cmd
REM 1. Delete node_modules and venv
rd /s /q frontend\node_modules
rd /s /q .venv
rd /s /q backend\static
rd /s /q backend\__pycache__
rd /s /q __pycache__

REM 2. Re-create venv
python -m venv .venv
.venv\Scripts\activate

REM 3. Run setup again
setup.bat

REM 4. Set API key
set ANTHROPIC_API_KEY=your_key_here

REM 5. Start fresh
run.bat
```

---

## 📞 Still Having Issues?

1. **Check Requirements:**
   - Python 3.10+ ✅
   - Node.js 18+ ✅
   - Git ✅

2. **Verify Files:**
   ```cmd
   REM Should exist:
   dir backend\server.py
   dir adaptive_agent.py
   dir frontend\dist\index.html
   dir backend\static\index.html
   ```

3. **Check Logs:**
   The server prints helpful messages:
   ```
   ✅ Serving frontend static files from ...
   INFO: Uvicorn running on http://0.0.0.0:8000
   ```

4. **Test Imports:**
   ```cmd
   python -c "import sys; sys.path.insert(0, '.'); import adaptive_agent; print('✅ Import works!')"
   ```

---

## 🎉 Success Checklist

- [ ] `setup.bat` completed without errors
- [ ] API key is set (`echo %ANTHROPIC_API_KEY%`)
- [ ] Server starts with `run.bat`
- [ ] Can access http://localhost:8000
- [ ] Frontend loads (see FORGE interface)
- [ ] Can submit a task

**All checked?** Congratulations! 🎊 FORGE is running!

---

**Windows-specific fixes implemented:** ✅
- Fixed module import paths for Windows
- Created Windows batch scripts
- Added Windows troubleshooting guide
- Tested on Windows PowerShell and CMD

**You're all set!** 🚀
