"""
Vision - See and Understand Web Pages
Clean, intelligent element detection
"""

from playwright.sync_api import Page
from PIL import Image, ImageDraw, ImageFont
import io
import base64
from typing import List, Dict, Tuple
from pathlib import Path


class Vision:
    """Sees and understands web pages"""
    
    def __init__(self, debug: bool = True):
        self.debug = debug
        self.screenshots_dir = Path("results/screenshots")
        self.screenshots_dir.mkdir(parents=True, exist_ok=True)
    
    def see(self, page: Page) -> Tuple[List[Dict], str]:
        """
        Look at page and return elements + screenshot
        
        Returns:
            (elements, screenshot_base64)
        """
        # Detect all interactive elements
        elements = self._detect_elements(page)
        
        # Create labeled screenshot
        screenshot_b64 = self._create_screenshot(page, elements)
        
        if self.debug:
            print(f"   👁️  Detected {len(elements)} elements")
        
        return elements, screenshot_b64
    
    def _detect_elements(self, page: Page) -> List[Dict]:
        """Detect all clickable/typeable elements"""
        
        js = """
        () => {
            const elements = [];
            let id = 1;
            
            // Find all interactive elements
            const selector = 'a, button, input, textarea, select, [role="button"], [onclick]';
            const all = document.querySelectorAll(selector);
            
            all.forEach(el => {
                const rect = el.getBoundingClientRect();
                const style = window.getComputedStyle(el);
                
                // Must be visible
                if (rect.width === 0 || rect.height === 0) return;
                if (style.display === 'none' || style.visibility === 'hidden') return;
                if (parseFloat(style.opacity) < 0.1) return;
                
                // In viewport (with buffer)
                const inView = rect.top < window.innerHeight + 300 && 
                              rect.bottom > -300;
                
                if (!inView) return;
                
                // Get text
                const text = (el.innerText || el.value || el.placeholder || 
                             el.getAttribute('aria-label') || '').trim().substring(0, 100);
                
                elements.push({
                    id: id++,
                    tag: el.tagName.toLowerCase(),
                    type: el.type || '',
                    text: text,
                    x: Math.round(rect.left + rect.width / 2),
                    y: Math.round(rect.top + rect.height / 2),
                    width: Math.round(rect.width),
                    height: Math.round(rect.height)
                });
            });
            
            return elements;
        }
        """
        
        try:
            elements = page.evaluate(js)
            
            # Add visual labels to page
            if elements:
                self._highlight_elements(page, elements)
            
            return elements
        except:
            return []
    
    def _highlight_elements(self, page: Page, elements: List[Dict]):
        """Draw green boxes on page"""
        
        js = """
        (elements) => {
            // Remove old
            document.querySelectorAll('.forge-box, .forge-label').forEach(e => e.remove());
            
            // Add style
            if (!document.getElementById('forge-style')) {
                const style = document.createElement('style');
                style.id = 'forge-style';
                style.textContent = `
                    .forge-box {
                        position: absolute !important;
                        border: 2px solid #00ff00 !important;
                        background: rgba(0,255,0,0.1) !important;
                        pointer-events: none !important;
                        z-index: 999999 !important;
                    }
                    .forge-label {
                        position: absolute !important;
                        background: #00ff00 !important;
                        color: #000 !important;
                        padding: 2px 6px !important;
                        font-size: 12px !important;
                        font-weight: bold !important;
                        font-family: monospace !important;
                        pointer-events: none !important;
                        z-index: 999999 !important;
                    }
                `;
                document.head.appendChild(style);
            }
            
            // Draw boxes
            elements.forEach(e => {
                if (e.id > 30) return;
                
                const box = document.createElement('div');
                box.className = 'forge-box';
                box.style.left = (e.x - e.width/2) + 'px';
                box.style.top = (e.y - e.height/2) + 'px';
                box.style.width = e.width + 'px';
                box.style.height = e.height + 'px';
                
                const label = document.createElement('div');
                label.className = 'forge-label';
                label.textContent = '[' + e.id + ']';
                label.style.left = (e.x - e.width/2) + 'px';
                label.style.top = Math.max(0, (e.y - e.height/2 - 18)) + 'px';
                
                document.body.appendChild(box);
                document.body.appendChild(label);
            });
        }
        """
        
        try:
            page.evaluate(js, elements[:30])
        except:
            pass
    
    def _create_screenshot(self, page: Page, elements: List[Dict]) -> str:
        """Take screenshot and return base64"""
        
        try:
            screenshot_bytes = page.screenshot(full_page=False)
            return base64.b64encode(screenshot_bytes).decode('utf-8')
        except:
            return ""