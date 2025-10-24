# PHASE 1.4: COMPLETE RENDER PATH TRACE

## Component Tree (Root to Canvas)

```
index.html (#root div)
    ↓
main.jsx (ReactDOM.createRoot)
    ↓  <React.StrictMode>
    ↓
App.jsx
    ↓  return <ForgePlatform />
    ↓
ForgePlatform.jsx
    ↓
    ├─ Root div (100vw × 100vh, flex column)
    │   ├─ Header div (~60px height)
    │   └─ Main Content div (flex: 1, display: flex, minHeight: 0)
    │       ├─ Left Panel div (400px width)
    │       └─ Right Panel div (flex: 1, padding: 12px, centered)
    │           └─ <canvas> (width: 100%, height: 100%, objectFit: contain)
```

## Render Flow Analysis

### 1. Entry Point: `index.html`
```html
<div id="root"></div>
```
- No special styling
- React mounts here

### 2. React Bootstrap: `main.jsx`
```jsx
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
```
- Uses React.StrictMode (safe, only dev warnings)
- Imports index.css globally

### 3. App Component: `App.jsx`
```jsx
function App() {
  return <ForgePlatform />
}
```
- Direct passthrough
- No wrappers, no routers, no providers
- Clean render path

### 4. ForgePlatform: Active Component
- Currently mounted and rendering
- All state management here (useState)
- WebSocket connection managed here
- Canvas ref created here

## Wrapper Analysis

**React Router:** ❌ Not used
**Context Providers:** ❌ None
**Layout Components:** ❌ None
**Conditional Rendering:** ✅ Canvas only shown when phase !== 'IDLE'

```jsx
{phase === 'IDLE' ? (
  <div>Enter a task...</div>
) : (
  <>
    {/* LIVE Badge */}
    <canvas ref={canvasRef} ... />
  </>
)}
```

**Impact:** Canvas only renders AFTER task starts
**Condition:** `phase` must be 'STARTING', 'RUNNING', or 'COMPLETE'

## Unused Components Detected

### LiveBrowserView.jsx
- ❌ NOT imported anywhere
- ❌ NOT rendered
- Has its own canvas implementation
- Uses different WebSocket endpoint (`/ws/browser`)
- **No impact on current issue**

### useRun.js Hook
- ❌ NOT imported in ForgePlatform.jsx
- ❌ NOT used
- **No impact on current issue**

### useStream.js Hook
- ❌ NOT imported in ForgePlatform.jsx
- ❌ NOT used
- **No impact on current issue**

## State Management

All state is local to ForgePlatform.jsx:
- `task` - User input
- `phase` - Execution phase
- `steps` - Timeline steps
- `thinking` - Agent thinking
- `currentUrl` - Browser URL
- `isRunning` - Boolean flag
- `canvasRef` - Canvas DOM reference
- `wsRef` - WebSocket reference

**No external state management** (no Redux, Zustand, Context API)

## Render Path Conclusion

✅ **Clean, simple render path**
- No intermediate wrappers
- No routers or providers
- Direct mounting from App → ForgePlatform → Canvas
- Canvas conditional on phase !== 'IDLE'

**ROOT CAUSE IS ISOLATED TO:**
- ForgePlatform.jsx lines 344-419 (Right Panel + Canvas)
- Specifically the canvas inline styles (lines 405-415)

