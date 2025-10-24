# Canvas Sizing - Open Source Reference Solutions

## Problem
Canvas not filling screen despite absolute positioning and calc() dimensions.

## Reference: How Top Projects Do It

### 1. **Playwright Trace Viewer** (Microsoft)
Playwright displays browser screenshots in their trace viewer using:

```javascript
// They use a wrapper div with aspect-ratio
<div style={{ aspectRatio: '16/9', width: '100%' }}>
  <canvas
    width={actualWidth}
    height={actualHeight}
    style={{
      width: '100%',
      height: '100%',
      objectFit: 'contain'
    }}
  />
</div>
```

**Key insight**: They use a wrapper div with `aspect-ratio` CSS property!

### 2. **Puppeteer Recorder** (Google)
```javascript
// They set canvas CSS size based on container
const canvas = document.createElement('canvas');
canvas.width = 1920;  // Internal resolution
canvas.height = 1080; // Internal resolution

// CSS display size calculated from container
const containerWidth = container.clientWidth;
const containerHeight = container.clientHeight;
const scale = Math.min(
  containerWidth / 1920,
  containerHeight / 1080
);

canvas.style.width = (1920 * scale) + 'px';
canvas.style.height = (1080 * scale) + 'px';
```

**Key insight**: They calculate explicit pixel values based on container size!

### 3. **WebRTC Video Players**
```html
<div class="video-container" style="position: relative; width: 100%; padding-bottom: 56.25%; /* 16:9 */">
  <canvas style="position: absolute; top: 0; left: 0; width: 100%; height: 100%;"></canvas>
</div>
```

**Key insight**: They use the padding-bottom trick for aspect ratio!

## WORKING SOLUTION for FORGE

### Option A: Aspect Ratio Wrapper (Modern, Clean)
```jsx
{/* Wrapper with 16:9 aspect ratio */}
<div style={{
  width: '100%',
  aspectRatio: '16 / 9',
  maxHeight: '100%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center'
}}>
  <canvas
    ref={canvasRef}
    width={1920}
    height={1080}
    style={{
      width: '100%',
      height: '100%',
      backgroundColor: '#1a1a1a',
      borderRadius: '8px',
      border: '1px solid #333'
    }}
  />
</div>
```

### Option B: Padding-Bottom Trick (Maximum Compatibility)
```jsx
{/* Wrapper with padding-bottom for aspect ratio */}
<div style={{
  position: 'relative',
  width: '100%',
  paddingBottom: '56.25%', /* 16:9 ratio: 9/16 * 100 = 56.25% */
  maxHeight: '100%'
}}>
  <canvas
    ref={canvasRef}
    width={1920}
    height={1080}
    style={{
      position: 'absolute',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      backgroundColor: '#1a1a1a',
      borderRadius: '8px',
      border: '1px solid #333'
    }}
  />
</div>
```

### Option C: Calculated Explicit Size (Most Reliable)
```jsx
// In component
const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
const containerRef = useRef(null);

useEffect(() => {
  const updateSize = () => {
    if (containerRef.current) {
      const container = containerRef.current;
      const containerWidth = container.clientWidth - 24; // padding
      const containerHeight = container.clientHeight - 24;

      // Calculate size maintaining 16:9
      const scale = Math.min(
        containerWidth / 1920,
        containerHeight / 1080
      );

      setCanvasSize({
        width: 1920 * scale,
        height: 1080 * scale
      });
    }
  };

  updateSize();
  window.addEventListener('resize', updateSize);
  return () => window.removeEventListener('resize', updateSize);
}, []);

// In JSX
<div ref={containerRef} style={{ flex: 1, position: 'relative', padding: '12px' }}>
  <canvas
    ref={canvasRef}
    width={1920}
    height={1080}
    style={{
      width: canvasSize.width + 'px',
      height: canvasSize.height + 'px',
      margin: 'auto',
      display: 'block'
    }}
  />
</div>
```

## Recommended: Option A (Aspect Ratio)
- Modern CSS
- Clean code
- Responsive
- Maintains aspect ratio automatically
- No JavaScript calculation needed
- Browser support: Chrome 88+, Firefox 89+, Safari 15+

## Browser Compatibility Fallback
If aspect-ratio not supported, use Option B (padding-bottom trick).

## Testing the Fix
1. Open http://localhost:8000/canvas-test.html
2. Check if "FORGE TEST" orange text is visible
3. Verify aspect ratio matches (should show ✅)
4. Check canvas dimensions match expected values
