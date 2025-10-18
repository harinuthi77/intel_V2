# vision_fixed.py
# =============================================================================
# ENHANCED VISION SYSTEM - Real element detection + visual highlighting
# =============================================================================

from playwright.sync_api import Page
from PIL import Image, ImageDraw, ImageFont
import io
import base64
import json
from typing import Dict, List, Optional, Tuple
from datetime import datetime
from pathlib import Path

from memory import AgentMemory, extract_domain


class Vision:
    """Enhanced vision with actual element detection and visual feedback"""
    
    def __init__(self, memory: AgentMemory = None, debug: bool = False):
        self.memory = memory
        self.debug = debug
        self.last_screenshot = None
        self.last_elements = []
        self.screenshots_dir = Path("results/screenshots")
        self.screenshots_dir.mkdir(parents=True, exist_ok=True)
        
    def detect_all_elements(self, page: Page) -> List[Dict]:
        """FIXED: Detect ALL interactive elements with visual highlighting"""
        
        if self.debug:
            print(f"   🔍 Scanning page for interactive elements...")
        
        # Enhanced JavaScript that actually works
        js_code = """
        () => {
            const elements = [];
            let elementId = 1;
            
            // COMPREHENSIVE selector list
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
                'label',
                '[type="submit"]',
                '[type="checkbox"]',
                '[type="radio"]',
                '[class*="btn"]',
                '[class*="link"]',
                '[class*="click"]'
            ].join(',');
            
            const allElements = document.querySelectorAll(selectors);
            
            allElements.forEach(el => {
                try {
                    const rect = el.getBoundingClientRect();
                    const style = window.getComputedStyle(el);
                    
                    // Check if visible (more lenient)
                    const isVisible = (
                        rect.width > 0 && 
                        rect.height > 0 &&
                        style.display !== 'none' &&
                        style.visibility !== 'hidden' &&
                        parseFloat(style.opacity) > 0.1
                    );
                    
                    if (!isVisible) return;
                    
                    // In viewport check (including 300px buffer)
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
                    
                    // Get all useful attributes
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
                    
                    // Slider specific
                    if (elem.type === 'range') {
                        elem.min = el.min || '0';
                        elem.max = el.max || '100';
                        elem.value = el.value || '0';
                    }
                    
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
            
            # Add visual highlights to the page itself
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
        """Add visual highlighting boxes directly on the page"""
        
        highlight_js = """
        (elements) => {
            // Remove old highlights
            document.querySelectorAll('.agent-highlight').forEach(el => el.remove());
            
            // Add new highlights
            elements.forEach(elem => {
                if (!elem.visible || elem.id > 50) return;
                
                const box = document.createElement('div');
                box.className = 'agent-highlight';
                box.style.cssText = `
                    position: absolute;
                    left: ${elem.left}px;
                    top: ${elem.top}px;
                    width: ${elem.width}px;
                    height: ${elem.height}px;
                    border: 2px solid #00ff00;
                    background: rgba(0, 255, 0, 0.1);
                    pointer-events: none;
                    z-index: 999999;
                    box-sizing: border-box;
                `;
                
                const label = document.createElement('div');
                label.className = 'agent-highlight';
                label.textContent = `[${elem.id}]`;
                label.style.cssText = `
                    position: absolute;
                    left: ${elem.left}px;
                    top: ${Math.max(0, elem.top - 20)}px;
                    background: #00ff00;
                    color: #000;
                    padding: 2px 6px;
                    font-size: 12px;
                    font-weight: bold;
                    pointer-events: none;
                    z-index: 999999;
                    font-family: monospace;
                `;
                
                document.body.appendChild(box);
                document.body.appendChild(label);
            });
        }
        """
        
        try:
            page.evaluate(highlight_js, elements[:50])  # Highlight first 50
        except:
            pass
    
    def create_labeled_screenshot(self, page: Page, elements: List[Dict] = None) -> Tuple[bytes, str]:
        """Create screenshot with numbered boxes"""
        
        if elements is None:
            elements = self.last_elements
        
        try:
            # Take screenshot
            screenshot_bytes = page.screenshot(full_page=False)
            
            # Open with PIL
            image = Image.open(io.BytesIO(screenshot_bytes))
            draw = ImageDraw.Draw(image)
            
            # Load font
            try:
                font = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 16)
            except:
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
                    'input': '#3498db',      # Blue
                    'button': '#2ecc71',     # Green
                    'a': '#9b59b6',          # Purple
                    'range': '#e74c3c'       # Red
                }
                
                color_hex = colors.get(elem['tag'], '#f39c12')
                color = tuple(int(color_hex[i:i+2], 16) for i in (1, 3, 5))
                
                # Draw box
                box = [elem['left'], elem['top'], 
                       elem['left'] + elem['width'], 
                       elem['top'] + elem['height']]
                draw.rectangle(box, outline=color, width=3)
                
                # Draw label
                label = f"[{elem['id']}]"
                label_pos = (elem['left'] + 5, max(5, elem['top'] - 20))
                
                # Background for label
                bbox = draw.textbbox((0, 0), label, font=font)
                bg_box = [label_pos[0] - 2, label_pos[1] - 2,
                         label_pos[0] + (bbox[2] - bbox[0]) + 2,
                         label_pos[1] + (bbox[3] - bbox[1]) + 2]
                draw.rectangle(bg_box, fill=color)
                
                # Label text
                draw.text(label_pos, label, fill='white', font=font)
                
                labeled += 1
            
            # Add timestamp
            timestamp = datetime.now().strftime("%H:%M:%S")
            draw.text((10, 10), f"🤖 Agent Vision - {timestamp}", fill='white', font=font)
            
            # Save to results folder
            filename = self.screenshots_dir / f"screenshot_{datetime.now().strftime('%H%M%S')}.png"
            image.save(filename)
            
            # Convert to base64
            output = io.BytesIO()
            image.save(output, format='PNG')
            labeled_bytes = output.getvalue()
            base64_str = base64.b64encode(labeled_bytes).decode('utf-8')
            
            self.last_screenshot = labeled_bytes
            
            if self.debug:
                print(f"   📸 Created labeled screenshot: {filename}")
            
            return labeled_bytes, base64_str
            
        except Exception as e:
            print(f"   ⚠️ Screenshot error: {e}")
            return None, None
    
    def extract_page_content(self, page: Page) -> Dict:
        """Extract structured data from page"""
        
        js_code = """
        () => {
            const data = {products: [], forms: [], metadata: {}};
            
            // Extract products
            const productSelectors = [
                '[data-testid*="product"]',
                '.product-card',
                'article',
                '[class*="ProductCard"]'
            ].join(',');
            
            document.querySelectorAll(productSelectors).forEach((card, i) => {
                if (i > 30) return;
                
                const text = card.innerText || '';
                const link = card.querySelector('a[href]');
                
                const priceMatch = text.match(/\\$([\\d,]+(?:\\.\\d{2})?)/);
                const ratingMatch = text.match(/([\\d.]+)\\s*(?:stars?|⭐)/i);
                
                if (link && priceMatch) {
                    const title = (card.querySelector('h1,h2,h3,h4')?.innerText || 
                                  link.getAttribute('aria-label') || 
                                  link.innerText).trim();
                    
                    data.products.push({
                        title: title.substring(0, 200),
                        url: link.href,
                        price: parseFloat(priceMatch[1].replace(',', '')),
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
            
            // Metadata
            data.metadata = {
                title: document.title,
                url: location.href,
                hasSearch: !!document.querySelector('input[type="search"]'),
                hasCaptcha: document.body.innerText.toLowerCase().includes('captcha')
            };
            
            return data;
        }
        """
        
        try:
            return page.evaluate(js_code)
        except:
            return {products: [], forms: [], metadata: {}}
    
    def analyze_page_structure(self, page: Page) -> Dict:
        """Analyze page type and structure"""
        
        js_code = """
        () => {
            const text = document.body.innerText.toLowerCase();
            return {
                pageType: text.includes('captcha') ? 'captcha' :
                          document.querySelectorAll('[class*="product"]').length > 3 ? 'product_listing' :
                          document.querySelector('input[type="search"]') ? 'search' : 'content',
                hasCaptcha: text.includes('captcha') || text.includes('verify'),
                hasSearch: !!document.querySelector('input[type="search"]'),
                needsScroll: document.body.scrollHeight > window.innerHeight * 1.5
            };
        }
        """
        
        try:
            return page.evaluate(js_code)
        except:
            return {pageType: 'unknown', hasCaptcha: False}