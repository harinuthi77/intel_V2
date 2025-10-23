# 🎯 FORGE AI AGENT - MASTER EXECUTION PLAN
## Step-by-Step Implementation Guide with Validation

---

## 📊 CURRENT STATE ANALYSIS (From Your Logs)

✅ **Working:**
- Backend running and responding
- Screenshots being captured (751492 bytes)
- Claude API calls successful
- SSE streaming active ("✅ Screenshot sent to frontend")
- Element detection (63-216 elements)

❌ **Broken:**
- Infinite scroll loop (Steps 8-24 identical)
- Ctrl+C doesn't stop process
- Chrome opens separately (not in UI)
- Viewport unstable (zoom in/out)

---

## 🚀 IMPLEMENTATION SEQUENCE

### **PHASE 1: CORE FIXES (Day 1 - 1 hour)**
Do these first - they fix the most critical issues

#### **STEP 1.1: Fix Infinite Loop Detection** ⭐ Priority 1
**File:** `src/agents/adaptive_agent.py`
**Time:** 30 minutes
**Risk:** 🟢 LOW

**Actions:**
1. Open `src/agents/adaptive_agent.py`
2. Copy entire `LoopDetectionMixin` class from `FIX_1_LOOP_DETECTION.py`
3. Add `LoopDetectionMixin` to your agent's parent classes:
   ```python
   class AdaptiveAgent(LoopDetectionMixin):
       def __init__(self):
           super().__init__()  # Must call this!
           # ... your existing init
   ```
4. In your `run_task` method, after capturing screenshot:
   ```python
   screenshot = await self.vision.capture()

   # ADD THIS:
   if self.detect_visual_loop(screenshot):
       alternative = await self.break_loop(self.last_action)
       # Execute alternative action
       if alternative == "click_random":
           elements = await self.vision.detect_elements(screenshot)
           if elements:
               await self.executor.click(random.choice(elements[:5]))
               continue
       elif alternative == "go_back":
           await self.executor.go_back()
           continue
   ```

**Validation Test:**
```bash
python main.py "find queen bed frame under $100"

# Expected logs:
# Step 1: scroll down
# Step 2: scroll down
# Step 3: scroll down
# 🔄 VISUAL LOOP DETECTED: Same screenshot 3x
# 💡 BREAKING LOOP - Trying alternative strategy...
# → Was scrolling, will try clicking random element
# Step 4: click [element]

# SUCCESS: Loop breaks at step 3-4 instead of 24
```

**If test fails:**
- Check `super().__init__()` is called
- Verify `self.last_action` is being set after each action
- Print screenshot hash to confirm they're different: `print(f"Hash: {self._hash_screenshot(screenshot)}")`

---

#### **STEP 1.2: Fix Ctrl+C Shutdown** ⭐ Priority 2
**Files:** `src/agents/adaptive_agent.py` + `main.py`
**Time:** 15 minutes
**Risk:** 🟢 LOW

**Actions:**
1. Copy `GracefulShutdownMixin` from `FIX_2_GRACEFUL_SHUTDOWN.py`
2. Add to your agent's parent classes:
   ```python
   class AdaptiveAgent(LoopDetectionMixin, GracefulShutdownMixin):
       def __init__(self):
           super().__init__()  # Initializes both mixins
   ```
3. In your `run_task` loop, at the START of each iteration:
   ```python
   for step in range(1, max_steps + 1):
       # ADD THIS FIRST:
       if self.check_shutdown():
           print("✅ Stopping gracefully...")
           break

       # ... rest of your step logic
   ```
4. Wrap entire `run_task` in try/finally:
   ```python
   try:
       for step in range(max_steps):
           # ... step logic
   except Exception as e:
       print(f"❌ Error: {e}")
   finally:
       await self.cleanup()  # Always cleanup
   ```

**Validation Test:**
```bash
python main.py "test task"

# Wait 5 seconds, then press Ctrl+C

# Expected output:
# Step 3: doing something...
# ^C
# ======================================================================
# 🛑 SHUTDOWN SIGNAL RECEIVED
# ======================================================================
# ⏳ Finishing current step gracefully...
#    (Press Ctrl+C again to force quit)
# ✅ Stopping gracefully...
#
# 🧹 CLEANING UP...
#    → Closing browser...
#    ✅ Browser closed
#    → Stopping Playwright...
#    ✅ Playwright stopped
# ✅ CLEANUP COMPLETE
# 👋 Agent stopped: User interrupt (Ctrl+C)
#
# C:\path\to\project>  ← Back to prompt!

# SUCCESS: Clean shutdown in <2 seconds
```

**If test fails:**
- On Windows, might need `signal.SIGBREAK` (already in code)
- Check `self.shutdown_requested` is being checked at loop start
- Verify `cleanup()` method exists and handles missing attributes gracefully

---

### **PHASE 1 CHECKPOINT** ✅
After Step 1.1 and 1.2, run full integration test:

```bash
python main.py "find bed frame under $100 on walmart"

# Let it run for 30 seconds, then press Ctrl+C

# Expected:
✅ No infinite loops (breaks out automatically)
✅ Ctrl+C stops immediately
✅ Terminal returns to prompt
✅ Browser closes

# If all pass → Proceed to Phase 2
# If any fail → Debug before continuing
```

---

### **PHASE 2: UI INTEGRATION (Day 1 - 1 hour)**
Do these together - they work as a pair

#### **STEP 2.1: Fix Stable Viewport** ⭐ Priority 3
**File:** `src/core/executor.py` (or wherever you init browser)
**Time:** 20 minutes
**Risk:** 🟢 LOW

**Actions:**
1. Find your browser initialization code (search for `playwright.chromium.launch`)
2. Replace with this:
   ```python
   self.playwright = await async_playwright().start()

   self.browser = await self.playwright.chromium.launch(
       headless=False,
       args=[
           '--disable-blink-features=AutomationControlled',
           '--force-device-scale-factor=1',  # NEW
       ]
   )

   # CRITICAL: Fixed viewport
   self.context = await self.browser.new_context(
       viewport={'width': 1280, 'height': 720},  # NEW
       device_scale_factor=1.0,  # NEW
       user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
   )

   self.page = await self.context.new_page()

   # NEW: Lock zoom
   await self.page.add_init_script("""
       Object.defineProperty(window, 'devicePixelRatio', {
           get: () => 1,
           configurable: false
       });
   """)
   ```
3. Update your `scroll_down` method:
   ```python
   async def scroll_down(self):
       viewport_height = 720  # Match viewport above
       scroll_distance = int(viewport_height * 0.8)  # 80% overlap

       await self.page.evaluate(f"""
           window.scrollBy({{
               top: {scroll_distance},
               behavior: 'smooth'
           }});
       """)

       await asyncio.sleep(0.5)  # Wait for animation
   ```

**Validation Test:**
```bash
python main.py "scroll test on walmart"

# Watch browser window:
✅ Opens at exactly 1280x720
✅ Stays same size (no zoom in/out)
✅ Scrolling is smooth and visible
✅ Each scroll moves ~576px (80% of 720)

# Check logs:
# ⬇️  Scrolling down 576px (current: 0px)
# → Scrolled 576px (now at 576px)
```

**If test fails:**
- Browser still zooming: Check `device_scale_factor=1.0` is set
- Scroll not smooth: Check `behavior: 'smooth'` in evaluate
- Wrong scroll distance: Verify viewport_height = 720

---

#### **STEP 2.2: Fix Browser Embedding in UI** ⭐ Priority 4
**Files:** `frontend/src/components/AgentView.jsx` + FastAPI endpoint
**Time:** 45 minutes
**Risk:** 🟡 MEDIUM

**Part A: Update React Component (10 min)**
1. Replace `frontend/src/components/AgentView.jsx` with code from `FIX_3_UI_EMBEDDING.jsx`
2. Update SSE endpoint URL if not `http://localhost:8000`:
   ```jsx
   const eventSource = new EventSource('http://localhost:YOUR_PORT/api/events');
   ```

**Part B: Add CORS to Backend (5 min)**
1. Open your FastAPI server file (e.g., `server.py` or `main.py`)
2. Add CORS middleware at the TOP (before routes):
   ```python
   from fastapi.middleware.cors import CORSMiddleware

   app.add_middleware(
       CORSMiddleware,
       allow_origins=["http://localhost:5173", "http://localhost:3000"],
       allow_credentials=True,
       allow_methods=["*"],
       allow_headers=["*"],
   )
   ```

**Part C: Update SSE Endpoint (15 min)**
1. Find your `/api/events` endpoint
2. Ensure it sends screenshots in this format:
   ```python
   event_data = {
       "level": "screenshot",  # Frontend looks for this
       "screenshot": base64_screenshot_string,
       "timestamp": time.time()
   }
   yield f"data: {json.dumps(event_data)}\n\n"
   ```

**Part D: Debug Format Mismatch (15 min)**
1. Start both frontend and backend
2. Open browser console (F12)
3. Look for SSE messages
4. If format doesn't match, adjust either frontend or backend to match

**Validation Test:**
```bash
# Terminal 1: Start backend
python main.py

# Terminal 2: Start frontend
cd frontend
npm run dev

# Browser: Open http://localhost:5173

# Expected UI:
✅ Green "🟢 Agent Connected" banner
✅ Live browser screenshots updating every 1-2 seconds
✅ Timestamps updating
✅ NO separate Chrome window

# Browser console (F12):
✅ "✅ SSE Connected"
✅ "📨 Received event: screenshot"
✅ "✅ Screenshot updated"

# Give task in UI:
"find bed frame under $100"

# Should see:
✅ Screenshots update in real-time
✅ Can see agent navigating
✅ Smooth scrolling visible in UI
```

**If test fails:**

**Issue: "🔴 Agent Disconnected"**
- Check backend running: `curl http://localhost:8000/api/events`
- Check CORS: Look for CORS error in console
- Fix: Ensure CORS middleware added

**Issue: Connected but no screenshots**
- Open console (F12), check event format
- Should see: `{"level": "screenshot", "screenshot": "iVBORw0KG..."}`
- If format wrong, update either frontend or backend to match

**Issue: "CORS policy" error**
- Backend CORS middleware not working
- Check `allow_origins` includes your frontend URL
- Try `allow_origins=["*"]` temporarily for debugging

---

### **PHASE 2 CHECKPOINT** ✅
After Step 2.1 and 2.2, run full integration test:

```bash
# Terminal 1
python main.py

# Terminal 2
cd frontend && npm run dev

# Browser: http://localhost:5173
# Give task: "find queen bed frame under $100"

# Expected:
✅ Browser view embedded in React app
✅ Stable 1280x720 viewport
✅ Smooth scrolling visible
✅ No separate Chrome window
✅ No zoom in/out
✅ Live updates every 1-2 seconds
✅ Ctrl+C stops cleanly

# If all pass → SUCCESS! All fixes implemented
# If any fail → Debug specific issue
```

---

## 🧪 MASTER VALIDATION TEST

After all fixes, run this comprehensive test:

```bash
# Start both services
python main.py &
cd frontend && npm run dev &

# Open browser to http://localhost:5173
# Give challenging task:
"search walmart for queen bed frames under $100, scroll through results, and recommend best one"

# During execution:
1. Watch UI - should see live updates
2. Let it run for 30 seconds
3. Press Ctrl+C
4. Verify clean shutdown

# Success Criteria:
□ No infinite loops (breaks out within 5 steps)
□ Browser embedded in UI (no separate window)
□ Viewport stable (no zoom changes)
□ Smooth scrolling visible
□ Ctrl+C stops immediately (<2 seconds)
□ Terminal returns to prompt
□ Browser closes cleanly

# All ✅ → COMPLETE!
```

---

## 📋 TROUBLESHOOTING GUIDE

### Problem: Still seeing infinite loops

**Check:**
- `LoopDetectionMixin` properly inherited?
- `super().__init__()` called?
- `self.detect_visual_loop(screenshot)` added to loop?

**Debug:**
```python
# Add before loop detection:
print(f"Screenshot hash: {self._hash_screenshot(screenshot)}")
print(f"Hash history: {self.screenshot_hashes}")
```

---

### Problem: Ctrl+C still doesn't work

**Check:**
- `GracefulShutdownMixin` inherited?
- `self.check_shutdown()` at START of loop?
- Signal handlers registered? (print in `__init__`)

**Debug:**
```python
# Add at start of loop:
print(f"Shutdown requested: {self.shutdown_requested}")
```

**Windows specific:**
```python
# Try this if regular Ctrl+C doesn't work:
import platform
if platform.system() == "Windows":
    signal.signal(signal.SIGBREAK, self._handle_shutdown)
```

---

### Problem: UI not showing screenshots

**Check browser console (F12):**

**If seeing:** `❌ SSE Connection error`
→ Backend not running or wrong port

**If seeing:** `CORS policy: No 'Access-Control-Allow-Origin'`
→ Add CORS middleware to FastAPI

**If seeing:** `⚠️  Screenshot event but no base64 data`
→ Backend sending wrong format, add logging:
```python
event_data = {
    "level": "screenshot",
    "screenshot": base64_string
}
print(f"Sending: {event_data.keys()}")  # Debug
```

**If seeing:** `Parse error`
→ JSON format issue, validate:
```python
import json
json.dumps(event_data)  # Must not throw error
```

---

### Problem: Browser still zooms in/out

**Check:**
- `device_scale_factor=1.0` in context?
- `add_init_script` called after page creation?
- `viewport` size is fixed dict, not None?

**Debug:**
```python
# After page init, check:
viewport = await self.page.viewport_size()
print(f"Viewport: {viewport}")  # Should be {'width': 1280, 'height': 720}

scale = await self.page.evaluate("window.devicePixelRatio")
print(f"Scale: {scale}")  # Should be 1.0
```

---

## 🎯 SUCCESS METRICS

After all fixes implemented, you should achieve:

| Metric | Before | After |
|--------|--------|-------|
| Infinite loop detection | 20+ steps | 3-5 steps |
| Shutdown time | Stuck forever | <2 seconds |
| Browser location | Separate window | Embedded in UI |
| Viewport stability | Random zoom | Fixed 1280x720 |
| Scrolling visibility | None/erratic | Smooth & visible |
| UI update rate | N/A | 1-2 seconds |

---

## 📞 IMPLEMENTATION ORDER SUMMARY

**Day 1 Morning (1 hour):**
1. Fix 1: Loop detection (30 min)
2. Fix 2: Ctrl+C handler (15 min)
3. Test Phase 1 checkpoint (15 min)

**Day 1 Afternoon (1 hour):**
4. Fix 4: Stable viewport (20 min)
5. Fix 3: UI embedding (40 min)
6. Test Phase 2 checkpoint (10 min)
7. Master validation test (10 min)

**Total time: ~2 hours**
**Risk level: LOW to MEDIUM**
**Expected success rate: 95%**

---

## ✅ FINAL CHECKLIST

Before starting:
- [ ] Backup current code: `git commit -m "backup before fixes"`
- [ ] Have test task ready: "find bed frame under $100"
- [ ] Browser console open (F12) for debugging

Phase 1:
- [ ] Loop detection implemented and tested
- [ ] Ctrl+C handler implemented and tested
- [ ] Phase 1 checkpoint passed

Phase 2:
- [ ] Viewport fixed to 1280x720
- [ ] CORS added to FastAPI
- [ ] React component updated
- [ ] SSE format matches between frontend/backend
- [ ] Phase 2 checkpoint passed

Final:
- [ ] Master validation test passed
- [ ] All 6 success metrics achieved
- [ ] Document any customizations made

---

**Ready to start? Begin with PHASE 1, STEP 1.1!**
