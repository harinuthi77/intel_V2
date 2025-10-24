# PHASE 2.1: EXPECTED VS ACTUAL DIMENSIONS CALCULATION

## Assumption: Standard Desktop Screen (1920×1080)

### VIEWPORT DIMENSIONS
```
Full Viewport Width:  1920px
Full Viewport Height: 1080px
```

---

## STEP 1: Calculate Header Height

**Header Component** (ForgePlatform.jsx:175-240)
```jsx
<div style={{
  padding: '16px 24px',
  borderBottom: '1px solid #222',
  ...
}}>
```

**Calculation:**
```
Top padding:      16px
Bottom padding:   16px
Content height:   ~32px (input field ~28px + some spacing)
Border bottom:    1px

Total Header Height ≈ 60-65px
Conservative estimate: 60px
```

---

## STEP 2: Calculate Left Panel Dimensions

**Left Panel** (ForgePlatform.jsx:249-341)
```jsx
<div style={{
  width: '400px',
  borderRight: '1px solid #222',
  ...
}}>
```

**Calculation:**
```
Panel width:      400px
Border right:     1px

Total Left Panel Width: 401px
```

---

## STEP 3: Calculate Right Panel Available Space

**Right Panel Container** (ForgePlatform.jsx:344-419)
```jsx
<div style={{
  flex: 1,
  padding: '12px',
  ...
}}>
```

### Horizontal Space:
```
Full viewport width:              1920px
- Left panel width:               -400px
- Left panel border:              -1px
= Right panel width:              1519px

Right panel padding (left):       -12px
Right panel padding (right):      -12px
= Available horizontal space:     1495px
```

### Vertical Space:
```
Full viewport height:             1080px
- Header height:                  -60px
= Main content height:            1020px

Right panel padding (top):        -12px
Right panel padding (bottom):     -12px
= Available vertical space:       996px
```

**AVAILABLE CANVAS SPACE:**
```
Width:  1495px
Height: 996px
```

---

## STEP 4: Calculate Canvas Display Size (16:9 Aspect Ratio)

**Canvas Internal Resolution:** 1920×1080 (aspect ratio = 1.7777...)

### Method 1: Width-Constrained
```
If canvas width = 1495px:
  Canvas height = 1495 ÷ 1.7777 = 841px

Check: 841px < 996px ✅ (fits vertically)
Result: 1495px × 841px (width-constrained)
```

### Method 2: Height-Constrained
```
If canvas height = 996px:
  Canvas width = 996 × 1.7777 = 1771px

Check: 1771px > 1495px ❌ (doesn't fit horizontally)
Result: Cannot use full height
```

**CONCLUSION:** Canvas is **WIDTH-CONSTRAINED**

---

## EXPECTED CANVAS DISPLAY SIZE

```
╔═══════════════════════════════════════════════════════════╗
║  EXPECTED CANVAS SIZE (on 1920×1080 screen)              ║
╠═══════════════════════════════════════════════════════════╣
║  Width:  1495px                                           ║
║  Height: 841px                                            ║
║  Aspect: 16:9 (1.7777:1)                                  ║
║                                                            ║
║  Utilization:                                             ║
║    Horizontal: 1495/1495 = 100% ✅                        ║
║    Vertical:   841/996   = 84.4% ⚠️                       ║
║    Wasted:     155px vertical space                       ║
╚═══════════════════════════════════════════════════════════╝
```

---

## ACTUAL PROBLEM: Canvas Likely Displaying Much Smaller

**User Report:** "approximately 200-400px" (extremely small)

**Discrepancy:**
```
Expected: ~1495px × 841px
Reported: ~200-400px × ???px
Difference: Canvas is 3.7x to 7.5x SMALLER than expected!
```

---

## STEP 5: Identify Why Canvas Is So Small

### Hypothesis 1: `width: '100%'` + `height: '100%'` Problem ❓

**Current Canvas Styles:**
```jsx
<canvas
  style={{
    width: '100%',
    height: '100%',
    maxWidth: '100%',
    maxHeight: '100%',
    objectFit: 'contain',
    ...
  }}
/>
```

**Analysis:**
- `width: '100%'` should make canvas 1495px wide (100% of 1495px parent space)
- `height: '100%'` should make canvas 996px tall (100% of 996px parent space)
- `objectFit: 'contain'` maintains aspect ratio by scaling canvas down

**THE ISSUE:**
When you set BOTH width and height to 100%, the canvas tries to fill the container, but:
1. Container is 1495px × 996px (not 16:9 ratio)
2. Canvas internal res is 1920×1080 (16:9 ratio)
3. `objectFit: 'contain'` scales the canvas down to fit while maintaining aspect ratio
4. This creates the correct size (~1495×841) BUT...

**Wait, this should work correctly!** 🤔

### Hypothesis 2: Parent Container Flex Centering Issue ⚠️

**Right Panel Styles:**
```jsx
<div style={{
  flex: 1,
  display: 'flex',
  alignItems: 'center',       // ⚠️ Centers vertically
  justifyContent: 'center',   // ⚠️ Centers horizontally
  ...
}}>
```

**Analysis:**
- Parent uses `display: flex` with centering
- Child has `width: '100%'` + `height: '100%'`
- **CONFLICT:** Flex children with `alignItems: center` don't automatically fill parent!

**THE REAL PROBLEM:**
In a flex container with `alignItems: center`, child elements default to their intrinsic size, NOT the container size, even with `width: '100%'`!

### Hypothesis 3: Canvas Intrinsic Size ⚠️

**Canvas Element Defaults:**
- Default canvas size (if not styled): 300px × 150px
- With `width` and `height` attributes: 1920px × 1080px (but only internal buffer)
- CSS `width/height` override the display size

**Potential Issue:**
- If flex centering ignores percentage widths...
- Canvas might default to intrinsic size
- Or scale based on content size

---

## ROOT CAUSE HYPOTHESIS

**Most Likely:** 
The flex container with `alignItems: center` + `justifyContent: center` is causing the canvas to use its intrinsic or content-based size instead of filling the available space, even with `width: '100%'` and `height: '100%'`.

**Secondary Issue:**
The combination of `width: '100%'`, `height: '100%'`, AND `objectFit: 'contain'` on a canvas element may have unexpected behavior.

---

## VERIFICATION NEEDED

To confirm, we need to check the canvas's computed styles when rendered:
```javascript
const canvas = document.querySelector('canvas');
console.log('Computed width:', getComputedStyle(canvas).width);
console.log('Computed height:', getComputedStyle(canvas).height);
console.log('Offset width:', canvas.offsetWidth);
console.log('Offset height:', canvas.offsetHeight);
```

Expected: ~1495px × ~841px (or full 996px)
If actual < 500px: Confirms our hypothesis

