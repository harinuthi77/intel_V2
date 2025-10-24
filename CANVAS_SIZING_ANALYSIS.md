# FORGE CANVAS SIZING - COMPLETE ANALYSIS

## PHASE 1.2: ForgePlatform.jsx COMPLETE STRUCTURE ANALYSIS

### A. ROOT CONTAINER STRUCTURE (Lines 165-173)

```jsx
<div style={{
  width: '100vw',           ✅ CORRECT - Full viewport width
  height: '100vh',          ✅ CORRECT - Full viewport height
  display: 'flex',          ✅ CORRECT - Flexbox layout
  flexDirection: 'column',  ✅ CORRECT - Vertical stacking
  backgroundColor: '#0a0a0a',
  color: '#fff',
  fontFamily: 'system-ui, -apple-system, sans-serif'
}}>
```

**Status:** ✅ ROOT CONTAINER IS CORRECT
- Takes full viewport (100vw × 100vh)
- Uses flexbox column layout
- No problematic margins or padding

---

### B. LAYOUT HIERARCHY - COMPLETE DOM TREE

```
Level 0: Root Container (100vw × 100vh, flex column)
│
├─ Level 1: Header (Lines 175-240)
│  └─ Height: ~60px (16px top padding + 16px bottom padding + content)
│     Properties:
│       - padding: '16px 24px'
│       - borderBottom: '1px solid #222'
│       - display: 'flex'
│       - No fixed height ✅
│
└─ Level 2: Main Content (Lines 243-420)
   └─ Properties:
      - flex: 1                ✅ CORRECT - Takes remaining space
      - display: 'flex'        ✅ CORRECT - Horizontal flexbox
      - minHeight: 0           ✅ CORRECT - Allows flex shrinking
   │
   ├─ Level 3a: Left Panel (Lines 249-341)
   │  └─ Properties:
   │     - width: '400px'              ✅ FIXED WIDTH
   │     - borderRight: '1px solid #222'
   │     - display: 'flex'
   │     - flexDirection: 'column'
   │     - gap: '16px'
   │     - padding: '16px'
   │     - overflowY: 'auto'
   │
   └─ Level 3b: Right Panel (Lines 344-419) ⚠️ CANVAS CONTAINER
      └─ Properties:
         - flex: 1                    ✅ CORRECT - Takes remaining width
         - display: 'flex'            ✅ CORRECT
         - alignItems: 'center'       ⚠️ Centers vertically
         - justifyContent: 'center'   ⚠️ Centers horizontally
         - position: 'relative'       ✅ For absolute LIVE badge
         - padding: '12px'            ⚠️ 24px total padding per axis
         - minHeight: 0               ✅ CORRECT
      │
      └─ Level 4: Canvas Element (Lines 401-416) ⚠️ THE CANVAS
         └─ Attributes:
            - width={1920}             ✅ Internal resolution
            - height={1080}            ✅ Internal resolution
            - ref={canvasRef}          ✅ Correctly attached
         └─ Style Properties:
            - width: '100%'            ⚠️ SUSPECT - Forces 100% of parent
            - height: '100%'           ⚠️ SUSPECT - Forces 100% of parent
            - maxWidth: '100%'         ⚠️ Redundant with width: 100%
            - maxHeight: '100%'        ⚠️ Redundant with height: 100%
            - objectFit: 'contain'     ⚠️ May cause canvas to not fill space
            - backgroundColor: '#1a1a1a'
            - borderRadius: '8px'
            - boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)'
            - border: '1px solid #333'
```

---

### C. LEFT PANEL ANALYSIS (400px Fixed Width)

**Location:** Lines 249-341
**Width:** `400px` (fixed)
**Purpose:** Task input, thinking display, execution timeline
**Impact on canvas:** Reduces available right panel width by 401px (400px + 1px border)

---

### D. RIGHT PANEL (Canvas Container) - CRITICAL ANALYSIS

**Location:** Lines 344-419
**Available Width Calculation:**
```
Right Panel Width = 100vw - 400px (left) - 1px (border)
                  = 1920px - 401px
                  = 1519px (on 1920px screen)
```

**Available Height Calculation:**
```
Right Panel Height = 100vh - Header Height
                   = 1080px - 60px
                   = 1020px (on 1080px screen)
```

**Padding Impact:**
```
Canvas Container Internal Space = 1519px - 24px = 1495px (width)
                                 = 1020px - 24px = 996px (height)
```

**⚠️ CRITICAL PROPERTIES:**
- `alignItems: 'center'` - Centers canvas vertically (doesn't force fill)
- `justifyContent: 'center'` - Centers canvas horizontally (doesn't force fill)
- `padding: '12px'` - Creates 24px total padding (12px × 2 sides)

---

### E. CANVAS ELEMENT - ROOT CAUSE IDENTIFIED

**Location:** Lines 401-416
**Internal Resolution:** 1920 × 1080 (correct, matches Playwright)

**❌ PROBLEMATIC STYLES:**

```jsx
style={{
  width: '100%',         // ❌ Forces canvas to 100% of container
  height: '100%',        // ❌ Forces canvas to 100% of container
  maxWidth: '100%',      // ⚠️ Redundant
  maxHeight: '100%',     // ⚠️ Redundant
  objectFit: 'contain',  // ⚠️ Scales down to fit, doesn't fill
  ...
}}
```

**THE PROBLEM:**
1. `width: '100%'` + `height: '100%'` forces canvas to fill container
2. BUT parent container has `alignItems: center` and `justifyContent: center`
3. This causes canvas to be CENTERED, not SIZED to fill
4. `objectFit: 'contain'` maintains aspect ratio but may scale down
5. The container is flex with center alignment, which doesn't force child size

**Expected behavior:** Canvas should display at max size while maintaining 16:9
**Actual behavior:** Canvas likely displaying smaller due to centering without max sizing

---

### F. WEBSOCKET HANDLING ANALYSIS

**Location:** Lines 16-112
**WebSocket URL:** `ws://localhost:8000/ws`
**Connection:** ✅ Correct

**Message Handler (Lines 28-96):**
```jsx
case 'frame':  // ✅ CORRECT - Matches backend
  if (canvasRef.current && data.data) {  // ✅ CORRECT - Uses data.data
    const ctx = canvasRef.current.getContext('2d');
    const img = new Image();

    img.onload = () => {
      ctx.clearRect(0, 0, 1920, 1080);    // ✅ CORRECT
      ctx.drawImage(img, 0, 0, 1920, 1080); // ✅ CORRECT
    };

    img.src = `data:image/png;base64,${data.data}`; // ✅ CORRECT
  }
```

**Status:** ✅ WEBSOCKET FRAME HANDLING IS CORRECT
- Listens for correct message type ('frame')
- Uses correct data field (data.data)
- Draws at correct resolution (1920×1080)
- No issues here

---

### G. CANVAS CLEARING BUG

**Location:** Lines 127-131 (handleStart function)

```jsx
if (canvasRef.current) {
  const ctx = canvasRef.current.getContext('2d');
  ctx.fillStyle = '#1a1a1a';
  ctx.fillRect(0, 0, 1280, 720);  // ❌ WRONG! Should be 1920, 1080
}
```

**BUG FOUND:** Canvas is cleared at 1280×720 but drawn at 1920×1080
**Impact:** Minor - leaves artifacts in corners
**Fix:** Change to `ctx.fillRect(0, 0, 1920, 1080)`

---

## PHASE 1.2 SUMMARY - KEY FINDINGS

### ✅ What's Working:
1. Root container properly sized (100vw × 100vh)
2. Flexbox hierarchy is correct
3. WebSocket frame handling is perfect
4. Canvas internal resolution is correct (1920×1080)
5. Frame drawing logic is correct

### ❌ Problems Identified:

1. **CANVAS STYLING CONFLICT** (Lines 405-410)
   - Using `width: '100%'` + `height: '100%'` with centered flex parent
   - Should use `maxWidth/maxHeight` instead for responsive sizing
   - OR remove centering and use different layout approach

2. **CANVAS CLEARING MISMATCH** (Line 130)
   - Clears at 1280×720 but draws at 1920×1080
   - Causes visual artifacts

3. **POTENTIAL LAYOUT ISSUE**
   - Right panel centers canvas but doesn't force it to max size
   - Canvas may be displaying smaller than available space

---

## NEXT STEPS:

Move to **PHASE 1.3: Identify CSS Conflicts**
Then **PHASE 2: Calculate Expected vs Actual Dimensions**
