"""
Hands - Execute Actions on Web Pages
Clean, reliable actions
"""

from playwright.sync_api import Page
import time
import random
from typing import List, Dict, Tuple


class Hands:
    """Executes actions on web pages"""
    
    def __init__(self, page: Page):
        self.page = page
    
    def do(self, action: str, target: str, elements: List[Dict]) -> Tuple[bool, str]:
        """
        Execute an action
        
        Returns: (success, message)
        """
        
        print(f"\n   🤚 EXECUTING: {action.upper()} → {target}")
        
        # Human-like delay
        time.sleep(random.uniform(1.0, 2.0))
        
        try:
            if action == "goto":
                return self._goto(target)
            elif action == "type":
                return self._type(target, elements)
            elif action == "click":
                return self._click(target, elements)
            elif action == "done":
                return True, "✅ Task complete"
            else:
                return False, "Unknown action"
        except Exception as e:
            return False, f"❌ Error: {str(e)[:50]}"
    
    def _goto(self, url: str) -> Tuple[bool, str]:
        """Navigate to URL"""
        
        if not url.startswith('http'):
            url = 'https://' + url
        
        try:
            self.page.goto(url, wait_until='domcontentloaded', timeout=30000)
            time.sleep(2)
            return True, f"✅ Navigated to {url}"
        except:
            return False, f"❌ Failed to load {url}"
    
    def _type(self, text: str, elements: List[Dict]) -> Tuple[bool, str]:
        """Type text into input"""
        
        # Find input field
        inputs = [e for e in elements if e['tag'] == 'input']
        
        if not inputs:
            return False, "❌ No input field found"
        
        target = inputs[0]
        
        try:
            # Click input
            self.page.mouse.click(target['x'], target['y'])
            time.sleep(0.5)
            
            # Clear and type
            self.page.keyboard.press('Control+A')
            self.page.keyboard.press('Backspace')
            time.sleep(0.2)
            
            # Type with delays
            for char in text:
                self.page.keyboard.type(char)
                time.sleep(random.uniform(0.05, 0.15))
            
            time.sleep(0.5)
            self.page.keyboard.press('Enter')
            time.sleep(2)
            
            return True, f"✅ Typed: {text}"
        except:
            return False, "❌ Failed to type"
    
    def _click(self, target: str, elements: List[Dict]) -> Tuple[bool, str]:
        """Click element by ID"""
        
        try:
            elem_id = int(target.strip())
        except:
            return False, f"❌ Invalid element ID: {target}"
        
        # Find element
        element = next((e for e in elements if e['id'] == elem_id), None)
        
        if not element:
            return False, f"❌ Element {elem_id} not found"
        
        try:
            # Click
            self.page.mouse.click(element['x'], element['y'])
            time.sleep(2)
            
            return True, f"✅ Clicked: {element.get('text', 'element')[:40]}"
        except:
            return False, f"❌ Failed to click element {elem_id}"