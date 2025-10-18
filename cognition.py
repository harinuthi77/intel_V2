"""
Cognitive Engine - The Brain
Deep analysis and intelligent decision making
FIXES: Valid model name, better parsing, lowered confidence threshold
"""

import anthropic
from typing import Dict, List, Optional
import json
import re
from datetime import datetime

from src.core.memory import AgentMemory, extract_domain
from src.core.config import (
    ANTHROPIC_MODEL,
    ANTHROPIC_MAX_TOKENS,
    MIN_CONFIDENCE_TO_ACT,
    ANTHROPIC_API_KEY
)


class CognitiveEngine:
    """
    The brain of the autonomous agent.
    Analyzes situations, validates options, and makes intelligent decisions.
    """
    
    def __init__(self, memory: AgentMemory, api_key: str = None):
        self.memory = memory
        key = api_key or ANTHROPIC_API_KEY
        self.client = anthropic.Anthropic(api_key=key)
        self.conversation_history = []
        self.validation_enabled = True
        self.consecutive_rejections = 0
        
    def think(self, 
              page,
              task: str,
              screenshot_b64: str,
              elements: List[Dict],
              page_data: Dict,
              page_analysis: Dict) -> Dict:
        """Main thinking process with enhanced validation"""
        
        url = page.url
        domain = extract_domain(url)
        
        print(f"\n🧠 COGNITIVE ANALYSIS")
        print(f"   {'─' * 60}")
        
        # STEP 1: Understand current state
        state = self._analyze_current_state(
            url, domain, task, elements, page_data, page_analysis
        )
        print(f"   📍 State: {state['summary']}")
        
        # STEP 2: Check memory
        insights = self._get_memory_insights(domain, state)
        if insights:
            print(f"   💾 Memory: {insights['summary']}")
        
        # STEP 3: Detect problems
        problems = self._detect_problems(state, page_analysis)
        if problems:
            print(f"   ⚠️ Issues: {', '.join(problems)}")
        
        # STEP 4: Generate options
        print(f"   🤔 Generating options...")
        options = self._generate_action_options(state, elements, insights, problems)
        print(f"   💭 Considering {len(options)} possible actions")
        
        # STEP 5: Deep thinking with Claude
        print(f"   🧪 Deep analysis...")
        decision = self._deep_think_with_validation(
            task, state, options, screenshot_b64, elements, page_data, insights, problems
        )
        
        # STEP 6: Final validation
        if self.validation_enabled:
            decision = self._validate_decision(decision, state, problems)
        
        print(f"   ✅ Decision: {decision['action'].upper()}")
        print(f"   🎯 Confidence: {decision['confidence']}/10")
        print(f"   💭 Reasoning: {decision['thinking'][:80]}...")
        
        # Track rejections to prevent infinite loops
        if decision['confidence'] < MIN_CONFIDENCE_TO_ACT:
            self.consecutive_rejections += 1
        else:
            self.consecutive_rejections = 0
        
        self.memory.record_action(decision['action'])
        
        return decision
    
    def _analyze_current_state(self, url: str, domain: str, task: str,
                               elements: List[Dict], page_data: Dict,
                               page_analysis: Dict) -> Dict:
        """Analyze current state comprehensively"""
        
        state = {
            'url': url,
            'domain': domain,
            'page_type': page_analysis.get('pageType', 'unknown'),
            'task': task,
            'task_keywords': self._extract_task_keywords(task),
            'visible_elements': len([e for e in elements if e.get('visible', False)]),
            'total_elements': len(elements),
            'has_search': page_analysis.get('hasSearch', False),
            'has_products': page_analysis.get('hasProducts', False),
            'has_forms': page_analysis.get('hasForms', False),
            'needs_scroll': page_analysis.get('needsScroll', False),
            'products_found': len(page_data.get('products', [])),
            'forms_found': len(page_data.get('forms', [])),
            'is_stuck': self.memory.is_stuck()[0],
            'stuck_reason': self.memory.is_stuck()[1]
        }
        
        summary_parts = []
        
        if state['is_stuck']:
            summary_parts.append(f"STUCK: {state['stuck_reason']}")
        
        if state['page_type'] == 'captcha':
            summary_parts.append("CAPTCHA page")
        elif state['page_type'] == 'product_listing':
            summary_parts.append(f"{state['products_found']} products visible")
        elif state['page_type'] == 'search':
            summary_parts.append("Search page")
        else:
            summary_parts.append(f"{state['visible_elements']} interactive elements")
        
        state['summary'] = ', '.join(summary_parts) if summary_parts else "Ready"
        
        return state
    
    def _extract_task_keywords(self, task: str) -> List[str]:
        """Extract important keywords from task"""
        stopwords = {'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 
                     'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'been', 'be',
                     'find', 'search', 'look', 'get', 'go', 'navigate'}
        
        words = re.findall(r'\b\w+\b', task.lower())
        keywords = [w for w in words if w not in stopwords and len(w) > 2]
        
        return keywords[:10]
    
    def _get_memory_insights(self, domain: str, state: Dict) -> Optional[Dict]:
        """Get relevant insights from memory"""
        
        insights = {
            'domain_info': self.memory.get_domain_insight(domain),
            'recent_failures': self.memory.get_recent_failures(domain, limit=3),
            'best_click_selectors': self.memory.get_best_selectors(domain, 'click', limit=3),
        }
        
        summary_parts = []
        
        if insights['domain_info']:
            info = insights['domain_info']
            if info.get('has_bot_detection'):
                summary_parts.append("Has bot detection")
            if info.get('success_rate', 0) > 0.7:
                summary_parts.append(f"{info['success_rate']*100:.0f}% success rate")
        
        if insights['recent_failures']:
            summary_parts.append(f"{len(insights['recent_failures'])} recent failures")
        
        insights['summary'] = ', '.join(summary_parts) if summary_parts else None
        
        return insights if insights['summary'] else None
    
    def _detect_problems(self, state: Dict, page_analysis: Dict) -> List[str]:
        """Detect potential problems"""
        
        problems = []
        
        if page_analysis.get('hasCaptcha', False):
            problems.append("CAPTCHA_DETECTED")
        
        if state['is_stuck']:
            problems.append("STUCK_IN_LOOP")
        
        if state['visible_elements'] < 3:
            problems.append("FEW_ELEMENTS")
        
        return problems
    
    def _generate_action_options(self, state: Dict, elements: List[Dict],
                                 insights: Optional[Dict], problems: List[str]) -> List[Dict]:
        """Generate possible action options"""
        
        options = []
        task_lower = state['task'].lower()
        keywords = state['task_keywords']
        
        # Navigate to website
        if 'http' not in state['url'].lower():
            for keyword in keywords:
                if '.' in keyword or 'www' in keyword:
                    options.append({
                        'action': 'goto',
                        'target': keyword,
                        'reason': f"Navigate to {keyword}",
                        'priority': 10
                    })
        
        # Handle CAPTCHA
        if 'CAPTCHA_DETECTED' in problems:
            options.append({
                'action': 'wait',
                'target': '',
                'reason': "CAPTCHA detected - wait for manual intervention",
                'priority': 1
            })
        
        # Search
        if state['has_search'] and any(kw in task_lower for kw in ['find', 'search']):
            search_query = ' '.join(keywords[:3])
            options.append({
                'action': 'type',
                'target': search_query,
                'reason': f"Search for: {search_query}",
                'priority': 9
            })
        
        # Extract products
        if state['products_found'] > 0:
            options.append({
                'action': 'extract',
                'target': '',
                'reason': f"Extract {state['products_found']} products",
                'priority': 8
            })
        
        # Click relevant elements
        for elem in elements[:30]:
            if not elem.get('visible'):
                continue
            
            elem_text = (elem.get('text') or '').lower()
            matches = sum(1 for kw in keywords if kw in elem_text)
            
            if matches > 0:
                options.append({
                    'action': 'click',
                    'target': str(elem['id']),
                    'reason': f"Element matches {matches} keywords: '{elem['text'][:40]}'",
                    'priority': 5 + matches
                })
        
        options.sort(key=lambda x: x.get('priority', 0), reverse=True)
        
        return options[:10]
    
    def _deep_think_with_validation(self, task: str, state: Dict, options: List[Dict],
                                    screenshot_b64: str, elements: List[Dict],
                                    page_data: Dict, insights: Optional[Dict],
                                    problems: List[str]) -> Dict:
        """Deep thinking with Claude API"""
        
        prompt = self._build_thinking_prompt(
            task, state, options, elements, insights, problems
        )
        
        messages = self.conversation_history[-6:] + [{
            "role": "user",
            "content": [
                {
                    "type": "image",
                    "source": {
                        "type": "base64",
                        "media_type": "image/png",
                        "data": screenshot_b64
                    }
                },
                {
                    "type": "text",
                    "text": prompt
                }
            ]
        }]
        
        try:
            response = self.client.messages.create(
                model=ANTHROPIC_MODEL,
                max_tokens=ANTHROPIC_MAX_TOKENS,
                temperature=0.2,
                messages=messages,
                system=self._get_system_prompt()
            )
            
            answer = response.content[0].text
            
            self.conversation_history.append({
                "role": "user",
                "content": [{"type": "text", "text": f"Task: {task}\nState: {state['summary']}"}]
            })
            self.conversation_history.append({
                "role": "assistant",
                "content": answer
            })
            
            decision = self._parse_claude_response(answer, elements)
            
            return decision
            
        except Exception as e:
            print(f"   ❌ Claude API error: {e}")
            return self._fallback_decision(options)
    
    def _build_thinking_prompt(self, task: str, state: Dict, options: List[Dict],
                               elements: List[Dict], insights: Optional[Dict],
                               problems: List[str]) -> str:
        """Build comprehensive prompt for Claude"""
        
        visible = [e for e in elements if e.get('visible', False)][:25]
        elem_desc = []
        for e in visible:
            desc = f"[{e['id']}] {e['tag']}"
            if e.get('type'):
                desc += f" type={e['type']}"
            if e.get('text'):
                desc += f" text=\"{e['text'][:50]}\""
            elem_desc.append(desc)
        
        options_desc = [f"• {opt['action'].upper()}: {opt['reason']}" for opt in options[:5]]
        
        prompt = f"""You are an autonomous web agent's cognitive system.

🎯 TASK: {task}

📊 CURRENT STATE:
   • URL: {state['url']}
   • Page Type: {state['page_type']}
   • Visible Elements: {state['visible_elements']}
   • Products Found: {state['products_found']}

🔍 VISIBLE ELEMENTS (numbered boxes on screenshot):
{chr(10).join(elem_desc)}

💡 SUGGESTED OPTIONS:
{chr(10).join(options_desc) if options_desc else '   • No specific suggestions'}

RESPONSE FORMAT:

ANALYSIS:
[Brief analysis of what you see]

REASONING:
[Why you chose this action]

ACTION: [goto/type/click/scroll/extract/done/wait]

DETAILS: [Specific details]
- For goto: URL (e.g., "amazon.com")
- For type: exact text (e.g., "wireless headphones")
- For click: ONLY element ID number (e.g., "23")
- For others: relevant info

CONFIDENCE: [7-10]

CRITICAL: For click actions, DETAILS must be ONLY the numeric ID."""
        
        return prompt
    
    def _get_system_prompt(self) -> str:
        """Get system prompt for Claude"""
        return """You are the cognitive engine of an autonomous web agent. Your role is to:

1. Analyze screenshots with numbered element labels
2. Think about the task and current state
3. Make intelligent, confident decisions
4. Provide clear reasoning

Be thorough but decisive. Confidence of 7+ means you're ready to act."""
    
    def _parse_claude_response(self, response: str, elements: List[Dict]) -> Dict:
        """Parse Claude's response into decision dict"""
        
        decision = {
            'analysis': '',
            'thinking': '',
            'action': 'wait',
            'details': '',
            'confidence': 5,
            'raw_response': response
        }
        
        lines = response.split('\n')
        current_section = None
        
        for line in lines:
            line_upper = line.strip().upper()
            
            if line_upper.startswith('ANALYSIS:'):
                current_section = 'analysis'
                decision['analysis'] = line.split(':', 1)[1].strip() if ':' in line else ''
            elif line_upper.startswith('REASONING:'):
                current_section = 'thinking'
                decision['thinking'] = line.split(':', 1)[1].strip() if ':' in line else ''
            elif line_upper.startswith('ACTION:'):
                current_section = 'action'
                action_text = line.split(':', 1)[1].strip().lower() if ':' in line else ''
                decision['action'] = action_text
            elif line_upper.startswith('DETAILS:'):
                current_section = 'details'
                raw_details = line.split(':', 1)[1].strip() if ':' in line else ''
                
                # Extract numeric ID for clicks
                if decision.get('action') == 'click':
                    match = re.search(r'\b(\d+)\b', raw_details)
                    decision['details'] = match.group(1) if match else raw_details
                else:
                    decision['details'] = raw_details
                    
            elif line_upper.startswith('CONFIDENCE:'):
                try:
                    conf_text = line.split(':', 1)[1].strip() if ':' in line else '7'
                    decision['confidence'] = int(re.search(r'\d+', conf_text).group())
                except:
                    decision['confidence'] = 7
            elif current_section and line.strip():
                if current_section in ['analysis', 'thinking']:
                    decision[current_section] += ' ' + line.strip()
                elif current_section == 'details':
                    raw_details = decision['details'] + ' ' + line.strip()
                    if decision.get('action') == 'click':
                        match = re.search(r'\b(\d+)\b', raw_details)
                        decision['details'] = match.group(1) if match else raw_details
                    else:
                        decision['details'] = raw_details
        
        decision['confidence'] = max(0, min(10, decision['confidence']))
        
        return decision
    
    def _validate_decision(self, decision: Dict, state: Dict, problems: List[str]) -> Dict:
        """Final validation before execution"""
        
        if 'CAPTCHA_DETECTED' in problems and decision['action'] not in ['wait', 'done']:
            decision['action'] = 'wait'
            decision['confidence'] = 0
            decision['thinking'] = "CAPTCHA detected - cannot proceed"
        
        return decision
    
    def _fallback_decision(self, options: List[Dict]) -> Dict:
        """Fallback if Claude API fails"""
        
        if not options:
            return {
                'thinking': 'No options available',
                'action': 'wait',
                'details': '',
                'confidence': 2,
                'analysis': 'Fallback mode'
            }
        
        best = options[0]
        
        return {
            'thinking': best['reason'],
            'action': best['action'],
            'details': best.get('target', ''),
            'confidence': 7,
            'analysis': 'Using rule-based decision'
        }
    
    def reset_conversation(self):
        """Reset conversation for new task"""
        self.conversation_history = []
        self.consecutive_rejections = 0