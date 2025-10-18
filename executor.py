"""
Action Executor - The Hands
Executes actions with proper waits and element safety
FIXES: Page load waits, element existence checks, proper timeouts
"""

from playwright.sync_api import Page, TimeoutError as PlaywrightTimeout
import time
import random
from typing import Dict, List, Tuple

from src.core.memory import AgentMemory, extract_domain
from src.core.config import (
    MIN_CONFIDENCE_TO_ACT,
    MAX_CONSECUTIVE_REJECTIONS,
    MIN_ACTION_DELAY,
    MAX_ACTION_DELAY,
    PAGE_LOAD_TIMEOUT,
    NETWORK_IDLE_TIMEOUT,
    ELEMENT_WAIT_TIMEOUT
)


class HumanBehavior:
    """Simulates realistic human interactions"""
    
    @staticmethod
    def delay(min_sec: float = None, max_sec: float = None):
        """Random delay between actions"""
        min_sec = min_sec or MIN_ACTION_DELAY
        max_sec = max_sec or MAX_ACTION_DELAY
        time.sleep(random.uniform(min_sec, max_sec))
    
    @staticmethod
    def typing_delays(text: str) -> List[float]:
        """Generate realistic typing delays"""
        delays = []
        for i, char in enumerate(text):
            base_delay = random.uniform(0.08, 0.15)
            if char == ' ':
                base_delay += random.uniform(0.1, 0.3)
            delays.append(base_delay)
        return delays


class ActionExecutor:
    """Executes actions with safety checks and proper waits"""
    
    def __init__(self, page: Page, memory: AgentMemory):
        self.page = page
        self.memory = memory
        self.behavior = HumanBehavior()
        self.rejection_count = 0
        
    def execute(self, decision: Dict, elements: List[Dict]) -> Tuple[bool, str]:
        """Execute action with comprehensive safety checks"""
        
        action = decision['action']
        details = decision['details']
        confidence = decision.get('confidence', 5)
        
        url = self.page.url
        domain = extract_domain(url)
        
        print(f"\n⚡ EXECUTING ACTION")
        print(f"   {'─' * 60}")
        print(f"   Action: {action.upper()}")
        print(f"   Details: {details}")
        print(f"   Confidence: {confidence}/10")
        
        # Confidence gate (lowered from 9 to 7)
        if confidence < MIN_CONFIDENCE_TO_ACT:
            self.rejection_count += 1
            
            if self.rejection_count >= MAX_CONSECUTIVE_REJECTIONS:
                print(f"   🔄 Max rejections reached - forcing action anyway")
                self.rejection_count = 0
            else:
                print(f"   ⛔ CONFIDENCE TOO LOW: {confidence}/10 (need {MIN_CONFIDENCE_TO_ACT}+)")
                self.memory.record_failure(domain, action, f"Confidence {confidence}/10 too low")
                return False, f"⛔ Confidence {confidence}/10 insufficient"
        
        # Reset rejection counter on high confidence
        if confidence >= MIN_CONFIDENCE_TO_ACT:
            self.rejection_count = 0
        
        # Pre-action delay
        self.behavior.delay(1.0, 2.0)
        
        try:
            # Route to handler
            if action == "done":
                return self._handle_done()
            elif action == "goto":
                return self._handle_goto(details, domain)
            elif action == "type":
                return self._handle_type(details, elements, domain)
            elif action == "click":
                return self._handle_click(details, elements, domain)
            elif action == "scroll":
                return self._handle_scroll(details, domain)
            elif action == "extract":
                return self._handle_extract(domain)
            elif action == "wait":
                return self._handle_wait(details)
            else:
                return False, f"Unknown action: {action}"
                
        except Exception as e:
            error_msg = str(e)[:100]
            self.memory.record_failure(domain, action, error_msg, page_url=url)
            return False, f"❌ Error: {error_msg}"
    
    def _wait_for_page_load(self):
        """Proper page load wait - CRITICAL FIX"""
        try:
            self.page.wait_for_load_state("domcontentloaded", timeout=PAGE_LOAD_TIMEOUT)
            # Try networkidle but don't fail if not achievable
            try:
                self.page.wait_for_load_state("networkidle", timeout=NETWORK_IDLE_TIMEOUT)
            except PlaywrightTimeout:
                pass  # Many pages never reach networkidle - that's OK
        except PlaywrightTimeout:
            print("   ⚠️ Page load timeout - continuing anyway")
    
    def _handle_done(self) -> Tuple[bool, str]:
        """Task completion"""
        print("   ✅ Task marked as complete")
        return True, "Task completed"
    
    def _handle_goto(self, url: str, domain: str) -> Tuple[bool, str]:
        """Navigate with proper waits - CRITICAL FIX"""
        
        if not url.startswith('http'):
            url = 'https://' + url
        
        print(f"   🌐 Navigating to {url}...")
        
        try:
            self.page.goto(url, wait_until='domcontentloaded', timeout=PAGE_LOAD_TIMEOUT)
            self._wait_for_page_load()  # ADDED
            self.behavior.delay(2.0, 3.5)
            
            self.memory.record_success(domain, 'goto', url, confidence=8.0)
            return True, f"✅ Loaded {url}"
            
        except PlaywrightTimeout:
            self.memory.record_failure(domain, 'goto', 'Timeout', page_url=url)
            return False, "⏱️ Page load timeout"
            
        except Exception as e:
            error = str(e)[:50]
            self.memory.record_failure(domain, 'goto', error, page_url=url)
            return False, f"❌ {error}"
    
    def _handle_type(self, text: str, elements: List[Dict], domain: str) -> Tuple[bool, str]:
        """Type with proper element checks - CRITICAL FIX"""
        
        inputs = [e for e in elements if e['tag'] == 'input' and 
                 e.get('type') in ['text', 'search', 'email', 'tel', 'url', '']]
        
        if not inputs:
            self.memory.record_failure(domain, 'type', 'No input field found')
            return False, "❌ No input field found"
        
        target = inputs[0]
        
        print(f"   ⌨️ Typing into input field...")
        
        try:
            # Create locator
            locator = self.page.locator(f'{target["tag"]}').nth(0)
            
            # CRITICAL FIX: Check existence and wait for visibility
            if locator.count() == 0:
                return False, "❌ Input field not found in DOM"
            
            locator.wait_for(state='visible', timeout=ELEMENT_WAIT_TIMEOUT)
            locator.scroll_into_view_if_needed(timeout=ELEMENT_WAIT_TIMEOUT)
            
            # Click to focus
            locator.click(timeout=ELEMENT_WAIT_TIMEOUT)
            self.behavior.delay(0.3, 0.6)
            
            # Clear and type
            locator.fill('')
            self.behavior.delay(0.2, 0.4)
            
            # Type with realistic delays
            delays = self.behavior.typing_delays(text)
            for i, char in enumerate(text):
                self.page.keyboard.type(char)
                time.sleep(delays[i])
            
            self.behavior.delay(0.3, 0.7)
            self.page.keyboard.press('Enter')
            
            # Wait for navigation
            self._wait_for_page_load()  # ADDED
            self.behavior.delay(2.0, 3.5)
            
            self.memory.record_success(domain, 'type', 'input', confidence=8.0)
            return True, f"✅ Typed: {text}"
            
        except PlaywrightTimeout:
            return False, "⏱️ Input field interaction timeout"
        except Exception as e:
            return False, f"❌ Type error: {str(e)[:50]}"
    
    def _handle_click(self, identifier: str, elements: List[Dict], domain: str) -> Tuple[bool, str]:
        """Click with proper safety checks - CRITICAL FIX"""
        
        # Find target element
        target = None
        
        try:
            elem_id = int(identifier.strip())
            target = next((e for e in elements if e['id'] == elem_id), None)
        except:
            search_text = identifier.lower().strip()
            for e in elements:
                elem_text = (e.get('text') or '').lower()
                if search_text in elem_text:
                    target = e
                    break
        
        if not target:
            self.memory.record_failure(domain, 'click', f'Element not found: {identifier}')
            return False, f"❌ Element not found: {identifier}"
        
        print(f"   🖱️ Clicking element [{target['id']}]: {target.get('text', '')[:40]}...")
        
        try:
            # Build selector
            selector = target['tag']
            if target.get('elementId'):
                selector = f"#{target['elementId']}"
            elif target.get('className'):
                classes = target['className'].split()
                if classes:
                    selector = f"{target['tag']}.{classes[0]}"
            
            # Create locator
            locator = self.page.locator(selector)
            
            # CRITICAL FIX: Check existence
            if locator.count() == 0:
                return False, f"❌ Element selector not found: {selector}"
            
            # Use first match
            locator = locator.first
            
            # CRITICAL FIX: Wait for visibility
            locator.wait_for(state='visible', timeout=ELEMENT_WAIT_TIMEOUT)
            
            # Scroll into view if needed
            locator.scroll_into_view_if_needed(timeout=ELEMENT_WAIT_TIMEOUT)
            self.behavior.delay(0.3, 0.8)
            
            # Click with timeout
            locator.click(timeout=ELEMENT_WAIT_TIMEOUT)
            
            # Wait for potential navigation
            self._wait_for_page_load()  # ADDED
            self.behavior.delay(1.5, 2.5)
            
            self.memory.record_success(domain, 'click', selector, 
                                      context=target.get('text', '')[:30],
                                      confidence=8.0)
            
            return True, f"✅ Clicked: {target.get('text', 'element')[:40]}"
            
        except PlaywrightTimeout:
            return False, f"⏱️ Click timeout on element {identifier}"
        except Exception as e:
            return False, f"❌ Click error: {str(e)[:50]}"
    
    def _handle_scroll(self, details: str, domain: str) -> Tuple[bool, str]:
        """Scroll the page"""
        
        pixels = 600
        try:
            pixels = int(details) if details else 600
        except:
            pass
        
        print(f"   📜 Scrolling {pixels}px...")
        
        self.page.evaluate(f"window.scrollBy({{top: {pixels}, behavior: 'smooth'}})")
        self.behavior.delay(1.2, 2.0)
        
        self.memory.record_success(domain, 'scroll', 'page', confidence=9.0)
        return True, f"✅ Scrolled {pixels}px"
    
    def _handle_extract(self, domain: str) -> Tuple[bool, str]:
        """Extract data"""
        print(f"   📊 Extracting data...")
        return True, "✅ Data extraction requested"
    
    def _handle_wait(self, details: str) -> Tuple[bool, str]:
        """Wait/pause"""
        print(f"   ⏸️ Waiting...")
        self.behavior.delay(3.0, 5.0)
        return True, "⏸️ Waited"