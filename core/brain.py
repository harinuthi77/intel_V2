"""
Brain - Intelligent Thinking with ReAct Pattern
Real step-by-step reasoning
"""

import anthropic
import os
import re
from typing import Dict, List


class Brain:
    """Intelligent decision-making brain"""
    
    def __init__(self):
        self.client = anthropic.Anthropic(api_key=os.getenv('ANTHROPIC_API_KEY'))
        self.history = []
    
    def think(self, task: str, url: str, elements: List[Dict], screenshot_b64: str) -> Dict:
        """
        Think about what to do next
        
        Returns decision: {thinking, action, target, confidence}
        """
        
        # Build prompt
        prompt = self._build_prompt(task, url, elements)
        
        # Ask Claude
        messages = self.history[-4:] + [{
            "role": "user",
            "content": [
                {"type": "image", "source": {"type": "base64", "media_type": "image/png", "data": screenshot_b64}},
                {"type": "text", "text": prompt}
            ]
        }]
        
        try:
            response = self.client.messages.create(
                model="claude-sonnet-4-20250514",
                max_tokens=1024,
                temperature=0.3,
                messages=messages
            )
            
            answer = response.content[0].text
            
            # Save to history
            self.history.append({"role": "user", "content": [{"type": "text", "text": f"Task: {task}, URL: {url}"}]})
            self.history.append({"role": "assistant", "content": answer})
            
            # Parse response
            decision = self._parse(answer)
            
            print(f"\n   💭 THINKING: {decision['thinking'][:80]}...")
            print(f"   ⚡ ACTION: {decision['action'].upper()} → {decision['target']}")
            print(f"   🎯 CONFIDENCE: {decision['confidence']}/10")
            
            return decision
            
        except Exception as e:
            print(f"   ❌ Brain error: {e}")
            return {"thinking": str(e), "action": "wait", "target": "", "confidence": 0}
    
    def _build_prompt(self, task: str, url: str, elements: List[Dict]) -> str:
        """Build intelligent ReAct prompt"""
        
        # Describe elements
        elem_list = []
        for e in elements[:20]:
            desc = f"[{e['id']}] {e['tag']}"
            if e.get('text'):
                desc += f" \"{e['text'][:40]}\""
            elem_list.append(desc)
        
        return f"""You are an intelligent web agent. Think step-by-step.

🎯 TASK: {task}
📍 URL: {url}

🔍 ELEMENTS (green boxes on screenshot):
{chr(10).join(elem_list) if elem_list else '(none visible)'}

Think carefully:
1. What do I see?
2. What should I do next to accomplish the task?
3. Which specific element should I interact with?

Respond EXACTLY in this format:

THINKING: [your reasoning - be specific about what you see]
ACTION: [goto OR type OR click OR done]
TARGET: [details - URL for goto, text for type, element ID for click]
CONFIDENCE: [7-10]

Rules:
- For goto: TARGET must be a URL (e.g., "google.com")
- For type: TARGET is the text to type (e.g., "AI agents")  
- For click: TARGET is ONLY the element ID number (e.g., "5")
- For done: TARGET is empty
- Only use actions: goto, type, click, done
- Confidence 7+ means you're ready to act

Think carefully and decide!"""
    
    def _parse(self, response: str) -> Dict:
        """Parse Claude's response"""
        
        decision = {
            "thinking": "",
            "action": "wait",
            "target": "",
            "confidence": 0
        }
        
        lines = response.split('\n')
        
        for line in lines:
            upper = line.strip().upper()
            
            if upper.startswith('THINKING:'):
                decision['thinking'] = line.split(':', 1)[1].strip()
            elif upper.startswith('ACTION:'):
                action = line.split(':', 1)[1].strip().lower()
                # Extract just the action word
                decision['action'] = action.split()[0] if action else "wait"
            elif upper.startswith('TARGET:'):
                decision['target'] = line.split(':', 1)[1].strip()
            elif upper.startswith('CONFIDENCE:'):
                try:
                    conf = re.search(r'(\d+)', line)
                    decision['confidence'] = int(conf.group(1)) if conf else 0
                except:
                    decision['confidence'] = 0
        
        # Validate
        valid_actions = ['goto', 'type', 'click', 'done', 'wait']
        if decision['action'] not in valid_actions:
            decision['action'] = 'wait'
        
        decision['confidence'] = max(0, min(10, decision['confidence']))
        
        return decision