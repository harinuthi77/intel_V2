"""
Enhanced Vision System - Canonical Version
Real element detection with visual highlighting
FIXES: Better selectors, proper waits, relaxed visibility, green boxes
"""

from playwright.sync_api import Page
from PIL import Image, ImageDraw, ImageFont
import io
import base64
from typing import Dict, List, Tuple
from datetime import datetime
from pathlib import Path

from src.core.memory import AgentMemory, extract_domain


class Vision:
    """Canonical vision system with comprehensive element detection"""
    
    def __init__(self, memory: AgentMemory = None, debug: bool = False):
        self.memory = memory
        self.debug = debug
        self.last_screenshot = None
        self.last_elements = []
        self.screenshots_dir = Path("results/screenshots")
        self.screenshots_dir.mkdir(parents=True, exist_ok=True)
        
    def detect_all_elements(self, page: Page) -> List[Dict]:
        """
        Detect ALL interactive elements with comprehensive selectors
        ENHANCED: More selectors, relaxed visibility, better filtering
        """
        
        if self.debug:
            print(f"   🔍 Scanning page for interactive elements...")
        
        js_code = r"""
        () => {
            const elements = [];
            let elementId = 1;
            
            // Comprehensive selector list
            const selectors = [
                'a[href]',
                'button',
                'input',
                'textarea',
                'select',
                '[role="button"]',
                '[role="link"]',
                '[role="tab"]',
                '[role="menuitem"]',
                '[role="slider"]',
                '[onclick]',
                '[data-testid]',
                '[aria-label]',
                'label',
                '[type="submit"]',
                '[type="checkbox"]',
                '[type="radio"]',
                '[class*="btn"]',
                '[class*="button"]',
                '[class*="link"]',
                '[class*="click"]',
                '[class*="card"]',
                '[data-action]'
            ].join(',');
            
            const allElements = document.querySelectorAll(selectors);
            
            allElements.forEach(el => {
                try {
                    const rect = el.getBoundingClientRect();
                    const style = window.getComputedStyle(el);
                    
                    // Relaxed visibility check
                    const isVisible = (
                        rect.width > 0 && 
                        rect.height > 0 &&
                        style.display !== 'none' &&
                        style.visibility !== 'hidden' &&
                        parseFloat(style.opacity) > 0.1
                    );
                    
                    if (!isVisible) return;
                    
                    // Generous viewport check (±300px buffer)
                    const inViewport = (
                        rect.top < window.innerHeight + 300 &&
                        rect.bottom > -300 &&
                        rect.left < window.innerWidth + 100 &&
                        rect.right > -100
                    );
                    
                    // Extract comprehensive text
                    const text = (
                        el.innerText ||
                        el.textContent ||
                        el.value ||
                        el.placeholder ||
                        el.getAttribute('aria-label') ||
                        el.getAttribute('title') ||
                        el.getAttribute('alt') ||
                        ''
                    ).trim();
                    
                    const elem = {
                        id: elementId++,
                        tag: el.tagName.toLowerCase(),
                        type: el.type || '',
                        role: el.getAttribute('role') || '',
                        text: text.substring(0, 200),
                        href: el.href || '',
                        className: el.className || '',
                        elementId: el.id || '',
                        x: Math.round(rect.left + rect.width / 2),
                        y: Math.round(rect.top + rect.height / 2),
                        top: Math.round(rect.top),
                        left: Math.round(rect.left),
                        width: Math.round(rect.width),
                        height: Math.round(rect.height),
                        visible: inViewport,
                        zIndex: parseInt(style.zIndex) || 0
                    };
                    
                    elements.push(elem);
                    
                } catch (err) {
                    console.error('Element detection error:', err);
                }
            });
            
            // Sort by visibility and position
            return elements.sort((a, b) => {
                if (a.visible !== b.visible) return b.visible ? 1 : -1;
                return a.top - b.top;
            });
        }
        """
        
        try:
            elements = page.evaluate(js_code)
            
            # Add visual highlights to page
            if elements and len(elements) > 0:
                self._add_visual_highlights(page, elements)
            
            # Enrich with memory
            if self.memory:
                domain = extract_domain(page.url)
                for elem in elements:
                    selector = f"{elem['tag']}"
                    if elem.get('className'):
                        selector += f".{elem['className'].split()[0]}"
                    
                    past_success = self.memory.get_best_selectors(domain, 'click', limit=5)
                    if past_success:
                        elem['learned_success'] = True
                        elem['success_count'] = past_success[0]['success_count']
            
            self.last_elements = elements
            
            visible_count = len([e for e in elements if e.get('visible')])
            
            if self.debug:
                print(f"   ✅ Found {len(elements)} elements ({visible_count} in viewport)")
            
            return elements
            
        except Exception as e:
            print(f"   ❌ Element detection error: {e}")
            return []
    
    def _add_visual_highlights(self, page: Page, elements: List[Dict]):
        """Add green highlight boxes directly on page"""
        
        highlight_js = """
        (elements) => {
            // Remove old highlights
            document.querySelectorAll('.agent-highlight, .agent-label').forEach(el => el.remove());
            
            // Add style
            if (!document.getElementById('agent-highlight-style')) {
                const style = document.createElement('style');
                style.id = 'agent-highlight-style';
                style.textContent = `
                    .agent-highlight {
                        position: absolute !important;
                        border: 3px solid #00ff00 !important;
                        background: rgba(0, 255, 0, 0.15) !important;
                        pointer-events: none !important;
                        z-index: 2147483647 !important;
                        box-sizing: border-box !important;
                    }
                    .agent-label {
                        position: absolute !important;
                        background: #00ff00 !important;
                        color: #000 !important;
                        padding: 4px 8px !important;
                        font-size: 14px !important;
                        font-weight: bold !important;
                        font-family: monospace !important;
                        pointer-events: none !important;
                        z-index: 2147483647 !important;
                        border-radius: 3px !important;
                        box-shadow: 0 2px 4px rgba(0,0,0,0.3) !important;
                    }
                `;
                document.head.appendChild(style);
            }
            
            // Add highlights (first 50 visible)
            let count = 0;
            elements.forEach(elem => {
                if (!elem.visible || count >= 50) return;
                
                const box = document.createElement('div');
                box.className = 'agent-highlight';
                box.style.left = elem.left + 'px';
                box.style.top = elem.top + 'px';
                box.style.width = elem.width + 'px';
                box.style.height = elem.height + 'px';
                
                const label = document.createElement('div');
                label.className = 'agent-label';
                label.textContent = '[' + elem.id + ']';
                label.style.left = elem.left + 'px';
                label.style.top = Math.max(0, elem.top - 25) + 'px';
                
                document.body.appendChild(box);
                document.body.appendChild(label);
                count++;
            });
            
            return count;
        }
        """
        
        try:
            count = page.evaluate(highlight_js, elements[:50])
            if self.debug:
                print(f"   ✅ Added {count} green highlight boxes")
            return count
        except Exception as e:
            if self.debug:
                print(f"   ⚠️ Could not add highlights: {e}")
            return 0
    
    def create_labeled_screenshot(self, page: Page, elements: List[Dict] = None) -> Tuple[bytes, str]:
        """Create screenshot with numbered boxes"""
        
        if elements is None:
            elements = self.last_elements
        
        try:
            screenshot_bytes = page.screenshot(full_page=False)
            image = Image.open(io.BytesIO(screenshot_bytes))
            draw = ImageDraw.Draw(image)
            
            try:
                font = ImageFont.truetype("arial.ttf", 16)
            except:
                font = ImageFont.load_default()
            
            # Draw boxes on visible elements
            labeled = 0
            for elem in elements:
                if not elem.get('visible') or labeled >= 50:
                    continue
                
                if elem['width'] < 20 or elem['height'] < 10:
                    continue
                
                # Color by type
                colors = {
                    'input': (52, 152, 219),
                    'button': (46, 204, 113),
                    'a': (155, 89, 182)
                }
                color = colors.get(elem['tag'], (243, 156, 18))
                
                # Draw box
                box = [elem['left'], elem['top'], 
                       elem['left'] + elem['width'], 
                       elem['top'] + elem['height']]
                draw.rectangle(box, outline=color, width=3)
                
                # Draw label
                label = f"[{elem['id']}]"
                label_pos = (elem['left'] + 5, max(5, elem['top'] - 20))
                
                bbox = draw.textbbox((0, 0), label, font=font)
                bg_box = [label_pos[0] - 2, label_pos[1] - 2,
                         label_pos[0] + (bbox[2] - bbox[0]) + 2,
                         label_pos[1] + (bbox[3] - bbox[1]) + 2]
                draw.rectangle(bg_box, fill=color)
                
                draw.text(label_pos, label, fill='white', font=font)
                labeled += 1
            
            # Save
            filename = self.screenshots_dir / f"screenshot_{datetime.now().strftime('%H%M%S')}.png"
            image.save(filename)
            
            # Convert to base64
            output = io.BytesIO()
            image.save(output, format='PNG')
            labeled_bytes = output.getvalue()
            base64_str = base64.b64encode(labeled_bytes).decode('utf-8')
            
            self.last_screenshot = labeled_bytes
            
            if self.debug:
                print(f"   📸 Screenshot with {labeled} labeled elements")
            
            return labeled_bytes, base64_str
            
        except Exception as e:
            print(f"   ⚠️ Screenshot error: {e}")
            return None, None
    
    def extract_page_content(self, page: Page) -> Dict:
        """Extract structured data from page"""
        
        js_code = r"""
        () => {
            const data = {products: [], forms: []};
            
            // Extract products
            const productSelectors = [
                '[data-testid*="product"]',
                '.product-card',
                'article',
                '[class*="ProductCard"]',
                '[class*="product"]'
            ].join(',');
            
            document.querySelectorAll(productSelectors).forEach((card, i) => {
                if (i > 30) return;
                
                const text = card.innerText || '';
                const link = card.querySelector('a[href]');
                
                const priceMatch = text.match(/\$?([\d,]+(?:\.\d{2})?)/);
                const ratingMatch = text.match(/([\d.]+)\s*(?:stars?|★)/i);
                
                if (link) {
                    const title = (card.querySelector('h1,h2,h3,h4')?.innerText || 
                                  link.innerText).trim();
                    
                    data.products.push({
                        title: title.substring(0, 200),
                        url: link.href,
                        price: priceMatch ? parseFloat(priceMatch[1].replace(',', '')) : null,
                        rating: ratingMatch ? parseFloat(ratingMatch[1]) : null
                    });
                }
            });
            
            // Extract forms
            document.querySelectorAll('form').forEach((form, i) => {
                const fields = Array.from(form.querySelectorAll('input, select, textarea')).map(f => ({
                    type: f.type,
                    name: f.name,
                    placeholder: f.placeholder
                }));
                
                if (fields.length > 0) {
                    data.forms.push({id: form.id || `form-${i}`, fields});
                }
            });
            
            return data;
        }
        """