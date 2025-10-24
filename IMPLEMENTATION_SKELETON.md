# 🎯 FORGE PLATFORM - COMPLETE IMPLEMENTATION SKELETON

## 📋 OVERVIEW
Implementing exact UI from reference screenshot with full browser automation capabilities.

---

## 🏗️ PHASE 1: CORE LAYOUT & STATE MANAGEMENT

### State Variables (React useState)
```javascript
// Task & Execution
- task: string                           // User's input task
- isRunning: boolean                     // Execution state
- isPaused: boolean                      // Pause state
- phase: 'IDLE' | 'STARTING' | 'RUNNING' | 'PAUSED' | 'COMPLETE'

// Timing
- startTime: number | null               // Task start timestamp
- elapsedTime: number                    // Total elapsed seconds
- modelName: string                      // Claude model being used

// Steps & Progress
- steps: Array<{
    id: number,
    label: string,
    status: 'pending' | 'running' | 'completed' | 'failed',
    startTime: number,
    duration?: number
  }>

// Thinking & Messages
- thinking: string                       // Agent's current thought
- agentMessage: string                   // Message to send to agent
- error: string | null                   // Error messages

// Browser State
- currentUrl: string                     // Current page URL
- elements: Array<{                      // Detected interactive elements
    id: string,
    type: string,
    bounds: { x, y, width, height },
    label: string
  }>
- highlightedElement: string | null      // Currently highlighted element ID

// Canvas
- canvasRef: useRef(null)
- wsRef: useRef(null)
```

### Layout Structure
```
┌─────────────────────────────────────────────────────────┐
│ FORGE Header (64px fixed)                               │
│ [Logo] [Task Input........................] [Start/Stop]│
└─────────────────────────────────────────────────────────┘
┌──────────────────┬──────────────────────────────────────┐
│ Left Panel       │ Right Panel                          │
│ (350px fixed)    │ (flex: 1)                            │
│                  │                                      │
│ ┌──────────────┐ │ ┌──────────────────────────────────┐│
│ │ Header Info  │ │ │                                  ││
│ │ - Live       │ │ │                                  ││
│ │ - Time       │ │ │        BROWSER CANVAS            ││
│ │ - Model      │ │ │        (100% fill)               ││
│ └──────────────┘ │ │                                  ││
│                  │ │                                  ││
│ ┌──────────────┐ │ │                                  ││
│ │ Task Display │ │ │  [Element Overlays]              ││
│ │ (scrollable) │ │ │  [Highlight Boxes]               ││
│ │              │ │ │  [Take Control Buttons]          ││
│ └──────────────┘ │ └──────────────────────────────────┘│
│                  │                                      │
│ ┌──────────────┐ │                                      │
│ │ Timeline     │ │                                      │
│ │ ✓ Step 1     │ │                                      │
│ │ ● Step 2     │ │                                      │
│ │ ○ Step 3     │ │                                      │
│ └──────────────┘ │                                      │
│                  │                                      │
│ ┌──────────────┐ │                                      │
│ │ Controls     │ │                                      │
│ │ [Input]      │ │                                      │
│ │ [Stop][Pause]│ │                                      │
│ │ Warning Text │ │                                      │
│ └──────────────┘ │                                      │
└──────────────────┴──────────────────────────────────────┘
```

---

## 🎨 PHASE 2: LEFT PANEL IMPLEMENTATION

### 2.1 Header Information Section
```javascript
<div className="left-panel-header">
  <div className="status-badge">● LIVE BROWSER</div>
  <div className="time-display">Total time: {formatTime(elapsedTime)}</div>
  <div className="model-display">Using {modelName}</div>
</div>
```

### 2.2 Task Display Section
```javascript
<div className="task-display-section">
  <div className="task-scroll-container">
    <p className="task-text">{task}</p>
  </div>
</div>
```

### 2.3 Steps Timeline Section
```javascript
<div className="timeline-section">
  {steps.map((step, idx) => (
    <div key={step.id} className={`step-item ${step.status}`}>
      <div className="step-icon">
        {step.status === 'completed' ? '✓' :
         step.status === 'running' ? '●' : '○'}
      </div>
      <div className="step-label">{step.label}</div>
      {step.duration && (
        <div className="step-duration">{step.duration}s</div>
      )}
    </div>
  ))}
</div>
```

### 2.4 Bottom Controls Section
```javascript
<div className="bottom-controls">
  <input
    className="agent-message-input"
    placeholder="Message Browser Use"
    value={agentMessage}
    onChange={(e) => setAgentMessage(e.target.value)}
  />
  <div className="control-buttons">
    <button onClick={handleStop} className="stop-btn">
      <Square size={16} /> Stop
    </button>
    <button onClick={handlePause} className="pause-btn">
      <Pause size={16} /> Pause
    </button>
  </div>
  <div className="warning-text">
    Browser Use can make mistakes. Please monitor its work.
  </div>
</div>
```

---

## 🖼️ PHASE 3: RIGHT PANEL IMPLEMENTATION

### 3.1 Canvas Container
```javascript
<div className="canvas-container">
  {/* Browser Window Chrome */}
  <div className="browser-chrome">
    <div className="chrome-title">Live Browser</div>
    <div className="chrome-controls">
      <button>−</button>
      <button>□</button>
      <button>✕</button>
    </div>
  </div>

  {/* Main Canvas */}
  <canvas
    ref={canvasRef}
    width={1920}
    height={1080}
    style={{
      position: 'absolute',
      width: '100%',
      height: '100%',
      objectFit: 'contain'
    }}
  />

  {/* Element Overlays */}
  {elements.map(el => (
    <div
      key={el.id}
      className={`element-overlay ${highlightedElement === el.id ? 'highlighted' : ''}`}
      style={{
        position: 'absolute',
        left: `${el.bounds.x}px`,
        top: `${el.bounds.y}px`,
        width: `${el.bounds.width}px`,
        height: `${el.bounds.height}px`,
        border: '2px solid #22c55e',
        backgroundColor: 'rgba(34, 197, 94, 0.1)'
      }}
    >
      {el.label && (
        <div className="element-label">{el.label}</div>
      )}
      <button className="take-control-btn">Take control</button>
    </div>
  ))}
</div>
```

### 3.2 Live URL Display
```javascript
{currentUrl && (
  <div className="live-url-badge">
    <span className="pulse-dot"></span>
    LIVE → {currentUrl}
  </div>
)}
```

---

## ⚙️ PHASE 4: BACKEND API & WEBSOCKET

### 4.1 New WebSocket Message Types
```javascript
// Incoming from backend
{
  type: 'frame',              // Browser screenshot
  data: 'base64...',
  url: 'https://...',
  timestamp: 1234567890
}

{
  type: 'elements',           // Interactive elements detected
  elements: [
    { id, type, bounds, label }
  ]
}

{
  type: 'element_highlight',  // Highlight specific element
  elementId: '...'
}

{
  type: 'step_started',
  step: { id, label }
}

{
  type: 'step_completed',
  step: { id, duration }
}

{
  type: 'thinking',
  content: '...'
}

{
  type: 'model_info',
  modelName: 'claude-sonnet-4-5-20250929'
}

{
  type: 'error',
  message: '...'
}

// Outgoing to backend
{
  type: 'pause'
}

{
  type: 'resume'
}

{
  type: 'stop'
}

{
  type: 'message',
  content: '...'
}
```

### 4.2 Backend Enhancements (adaptive_agent.py)

**Add Pause/Resume:**
```python
# Global state
execution_paused = False

def pause_execution():
    global execution_paused
    execution_paused = True
    _emit("Execution paused", level="info")

def resume_execution():
    global execution_paused
    execution_paused = False
    _emit("Execution resumed", level="info")

# In action loop
if execution_paused:
    await asyncio.sleep(0.5)
    continue
```

**Add Element Detection:**
```python
def detect_interactive_elements(page):
    """Detect clickable/interactive elements on page"""
    elements = []

    # Find all interactive elements
    selectors = [
        'a', 'button', 'input', 'select', 'textarea',
        '[onclick]', '[role="button"]'
    ]

    for selector in selectors:
        els = page.query_selector_all(selector)
        for i, el in enumerate(els):
            bounds = el.bounding_box()
            if bounds:
                elements.append({
                    'id': f'{selector}-{i}',
                    'type': selector,
                    'bounds': bounds,
                    'label': el.text_content()[:50] if el.text_content() else ''
                })

    return elements

# Send elements after each screenshot
elements = detect_interactive_elements(page)
_emit("Interactive elements detected", payload={
    'type': 'elements',
    'elements': elements
})
```

**Add Timer:**
```python
import time

start_time = time.time()

# Send elapsed time periodically
def send_timing_update():
    elapsed = time.time() - start_time
    _emit("Timing update", payload={
        'type': 'timing',
        'elapsed': elapsed
    })
```

### 4.3 New API Endpoints

**POST /execute/pause**
```python
@app.post("/execute/pause")
async def pause_execution():
    pause_execution()
    return {"status": "paused"}
```

**POST /execute/resume**
```python
@app.post("/execute/resume")
async def resume_execution():
    resume_execution()
    return {"status": "resumed"}
```

**POST /execute/message**
```python
@app.post("/execute/message")
async def send_message(message: str):
    # Add message to agent's context
    agent_context.add_user_message(message)
    return {"status": "message_sent"}
```

---

## 🎭 PHASE 5: ANIMATIONS & POLISH

### 5.1 CSS Animations
```css
/* Pulse animation for LIVE indicator */
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

/* Fade in for steps */
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(-10px); }
  to { opacity: 1; transform: translateY(0); }
}

/* Element highlight glow */
@keyframes highlightGlow {
  0%, 100% { box-shadow: 0 0 10px rgba(34, 197, 94, 0.5); }
  50% { box-shadow: 0 0 20px rgba(34, 197, 94, 0.8); }
}

/* Smooth transitions */
.step-item {
  transition: all 0.3s ease;
  animation: fadeIn 0.3s ease;
}

.element-overlay.highlighted {
  animation: highlightGlow 2s infinite;
}
```

### 5.2 Smooth State Transitions
- Steps fade in as they're added
- Canvas fades in when execution starts
- Smooth opacity changes for status updates
- Hover effects on all interactive elements

### 5.3 Loading States
- Skeleton loaders for pending content
- Spinner for "Starting..." phase
- Progress indicators for long-running steps

---

## 📦 COMPONENT STRUCTURE

```
ForgePlatform.jsx (Main component - 800+ lines)
├── State Management (50 lines)
├── WebSocket Setup (100 lines)
├── Timer Effect (30 lines)
├── Event Handlers (80 lines)
│   ├── handleStart()
│   ├── handleStop()
│   ├── handlePause()
│   ├── handleResume()
│   └── handleSendMessage()
├── Layout (500 lines)
│   ├── Header (60 lines)
│   ├── Left Panel (250 lines)
│   │   ├── InfoHeader (50 lines)
│   │   ├── TaskDisplay (40 lines)
│   │   ├── Timeline (100 lines)
│   │   └── Controls (60 lines)
│   └── Right Panel (190 lines)
│       ├── Canvas (60 lines)
│       ├── Overlays (80 lines)
│       └── Chrome (50 lines)
└── Helper Functions (40 lines)
    ├── formatTime()
    ├── scaleCoordinates()
    └── calculateCanvasScale()
```

---

## 🚀 IMPLEMENTATION ORDER

### Step 1: State & Layout (30 min)
- Set up all state variables
- Create basic layout structure
- Add all sections with placeholders

### Step 2: Left Panel (45 min)
- Header info section with timer
- Task display with scrolling
- Timeline with proper icons
- Bottom controls with input

### Step 3: Right Panel (30 min)
- Canvas with absolute positioning
- Browser chrome mockup
- URL badge overlay

### Step 4: Backend Integration (60 min)
- Pause/resume API endpoints
- Element detection in Playwright
- Enhanced WebSocket messages
- Timer tracking

### Step 5: Element Overlays (45 min)
- Parse element data from backend
- Calculate scaled positions
- Render highlight boxes
- Add "Take control" buttons

### Step 6: Polish (30 min)
- Add all animations
- Smooth transitions
- Hover effects
- Loading states

**Total Estimated Time: 4 hours**

---

## ✅ SUCCESS CRITERIA

1. **Visual Match**: UI looks identical to reference screenshot
2. **Functional**: All buttons, inputs, and controls work
3. **Real-time**: Canvas updates live, steps progress smoothly
4. **Interactive**: Element highlighting works, pause/resume functional
5. **Polished**: Smooth animations, no jank, professional feel

---

## 🎯 FINAL DELIVERABLES

- ✅ Complete ForgePlatform.jsx (800+ lines)
- ✅ Enhanced adaptive_agent.py with new features
- ✅ All backend API endpoints
- ✅ CSS animations and transitions
- ✅ Fully functional pause/resume
- ✅ Element detection and highlighting
- ✅ Timer tracking
- ✅ Message sending capability
- ✅ Built and tested
- ✅ Committed and pushed

---

**LET'S BUILD THIS! 🚀**
