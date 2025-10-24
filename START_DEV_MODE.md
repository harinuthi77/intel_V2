# 🔥 START DEVELOPMENT MODE (Two Servers)

## Your Current Situation

You're running:
- ✅ Frontend on **port 5173** (`npm run dev` in frontend/)
- ❌ Backend NOT RUNNING on **port 8000**

That's why you get **"Failed to fetch"** error!

---

## ⚡ QUICK START (2 Commands)

### Terminal 1 - Start Backend

```bash
cd /home/user/intel_V2
./start_backend.sh
```

**OR manually:**
```bash
cd /home/user/intel_V2
python -m uvicorn backend.server:app --reload --host 0.0.0.0 --port 8000
```

**Wait until you see:**
```
✅ ANTHROPIC_API_KEY is set
✅ Live browser ready for streaming
INFO:     Uvicorn running on http://0.0.0.0:8000
```

### Terminal 2 - Start Frontend (already running if you see port 5173)

```bash
cd /home/user/intel_V2/frontend
npm run dev
```

**Should show:**
```
VITE v5.4.21  ready in 423 ms
➜  Local:   http://localhost:5173/
```

---

## ✅ Test Connection

**1. Test Backend Health:**
```bash
curl http://localhost:8000/health
```

**Should return:**
```json
{
  "status": "healthy",
  "version": "2.0.0",
  ...
}
```

**2. Open Frontend:**

Visit: **http://localhost:5173**

**3. Test in Browser Console (F12):**
```javascript
// Should work if backend is running
fetch('http://localhost:8000/health')
  .then(r => r.json())
  .then(d => console.log('✅ Backend connected:', d))
  .catch(e => console.log('❌ Backend NOT connected:', e))
```

---

## 🔧 Troubleshooting

### Error: "Failed to fetch"

**Cause:** Backend not running or wrong port

**Fix:**
1. Open new terminal
2. Run: `./start_backend.sh`
3. Wait for "Uvicorn running" message
4. Refresh browser (http://localhost:5173)

---

### Error: "ANTHROPIC_API_KEY not set"

**Fix:**
```bash
export ANTHROPIC_API_KEY='sk-ant-your-key-here'
```

Then restart backend.

---

### Error: "Port 8000 already in use"

**Check what's using it:**
```bash
lsof -i :8000
```

**Kill it:**
```bash
kill -9 <PID>
```

---

### Error: WebSocket connection failed

**Cause:** Backend not running or CORS issue

**Check:**
1. Is backend running? Check http://localhost:8000/health
2. Check browser console (F12) for errors
3. Backend logs should show: "WebSocket connected (/ws)"

---

## 🎯 Complete Startup Checklist

- [ ] Terminal 1: Backend running on port 8000
- [ ] Terminal 2: Frontend running on port 5173
- [ ] Browser: Visit http://localhost:5173
- [ ] Test: Click Start button
- [ ] Verify: Canvas shows browser, steps appear in timeline

---

## 📝 Architecture in Dev Mode

```
┌─────────────────────────────────────────────────────┐
│                                                      │
│  Browser (http://localhost:5173)                    │
│  ├── Shows React UI with hot reload                 │
│  ├── Makes API calls to localhost:8000              │
│  └── WebSocket: ws://localhost:8000/ws              │
│                                                      │
└──────────────────┬───────────────────────────────────┘
                   │
                   ↓
┌─────────────────────────────────────────────────────┐
│                                                      │
│  Vite Dev Server (port 5173)                        │
│  ├── Serves frontend with hot reload                │
│  ├── Source: frontend/src/                          │
│  └── Updates instantly when you edit .jsx files     │
│                                                      │
└──────────────────┬───────────────────────────────────┘
                   │
                   │ API Calls & WebSocket
                   ↓
┌─────────────────────────────────────────────────────┐
│                                                      │
│  FastAPI Backend (port 8000)                        │
│  ├── Handles browser automation                     │
│  ├── Streams screenshots via WebSocket              │
│  ├── APIs: /execute/stream, /execute/pause, etc.    │
│  └── CORS enabled for localhost:5173                │
│                                                      │
└─────────────────────────────────────────────────────┘
```

---

## 🔁 When to Use Dev Mode

**Use TWO servers (dev mode) when:**
- ✅ You're modifying React components (.jsx files)
- ✅ You want instant hot reload
- ✅ You need React DevTools
- ✅ You're debugging frontend issues

**Use ONE server (production mode) when:**
- ✅ Just running the app (not developing)
- ✅ Testing final build
- ✅ Deploying to production

**Production Mode:** See `HOW_TO_RUN.md`

---

## 🚀 Your Next Steps

1. **Open NEW terminal**
2. **Run:** `cd /home/user/intel_V2 && ./start_backend.sh`
3. **Wait** for "Uvicorn running on http://0.0.0.0:8000"
4. **Keep terminal open** (don't close it!)
5. **Go back** to your browser at http://localhost:5173
6. **Click Start** - Should work now!

---

**Still having issues?** Check backend terminal for error messages.
