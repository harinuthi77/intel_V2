"""
Agent Memory & Learning System
Persistent database with element-level stuck detection
ENHANCED: Element tracking, URL history, better loop detection
"""

import sqlite3
from datetime import datetime
from collections import deque
from typing import List, Tuple, Optional, Dict
import json


class AgentMemory:
    """
    Persistent memory system that learns from experiences.
    Enhanced with element-level tracking to prevent stuck loops.
    """
    
    def __init__(self, db_path: str = "agent_brain.db"):
        self.db_path = db_path
        self.conn = sqlite3.connect(db_path)
        self._init_database()
        
        # Short-term memory for stuck detection
        self.recent_actions = deque(maxlen=10)
        self.clicked_elements = {}  # {url#element_id: count}
        self.url_history = deque(maxlen=5)  # Track URL changes
        self.session_start = datetime.now()
        
    def _init_database(self):
        """Create database tables"""
        cursor = self.conn.cursor()
        
        # Success patterns
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS success_patterns (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                domain TEXT NOT NULL,
                action_type TEXT NOT NULL,
                selector TEXT NOT NULL,
                context TEXT,
                success_count INTEGER DEFAULT 1,
                last_used TEXT,
                avg_confidence REAL DEFAULT 5.0,
                UNIQUE(domain, action_type, selector, context)
            )
        ''')
        
        # Failure tracking
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS failures (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                domain TEXT NOT NULL,
                action_type TEXT NOT NULL,
                selector TEXT,
                reason TEXT,
                timestamp TEXT,
                page_url TEXT
            )
        ''')
        
        # Task history
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS task_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                task TEXT NOT NULL,
                success INTEGER NOT NULL,
                steps_taken INTEGER,
                duration REAL,
                timestamp TEXT,
                final_url TEXT,
                data_collected TEXT
            )
        ''')
        
        # Domain insights
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS domain_insights (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                domain TEXT NOT NULL UNIQUE,
                total_visits INTEGER DEFAULT 0,
                success_rate REAL DEFAULT 0.0,
                avg_steps REAL DEFAULT 0.0,
                has_bot_detection INTEGER DEFAULT 0,
                best_strategy TEXT,
                last_visit TEXT
            )
        ''')
        
        self.conn.commit()
        
    def record_success(self, domain: str, action_type: str, selector: str, 
                      context: str = "", confidence: float = 5.0):
        """Record successful action"""
        cursor = self.conn.cursor()
        timestamp = datetime.now().isoformat()
        
        try:
            cursor.execute('''
                UPDATE success_patterns 
                SET success_count = success_count + 1,
                    last_used = ?,
                    avg_confidence = (avg_confidence + ?) / 2.0
                WHERE domain = ? AND action_type = ? AND selector = ? AND context = ?
            ''', (timestamp, confidence, domain, action_type, selector, context))
            
            if cursor.rowcount == 0:
                cursor.execute('''
                    INSERT INTO success_patterns 
                    (domain, action_type, selector, context, success_count, last_used, avg_confidence)
                    VALUES (?, ?, ?, ?, 1, ?, ?)
                ''', (domain, action_type, selector, context, timestamp, confidence))
            
            self.conn.commit()
            
        except Exception as e:
            print(f"   ⚠️ Memory error: {e}")
    
    def get_best_selectors(self, domain: str, action_type: str, 
                          context: str = "", limit: int = 5) -> List[Dict]:
        """Get proven selectors for domain/action"""
        cursor = self.conn.cursor()
        
        try:
            cursor.execute('''
                SELECT selector, success_count, avg_confidence, last_used
                FROM success_patterns
                WHERE domain = ? AND action_type = ? AND context LIKE ?
                ORDER BY success_count DESC, avg_confidence DESC, last_used DESC
                LIMIT ?
            ''', (domain, action_type, f"%{context}%", limit))
            
            results = []
            for row in cursor.fetchall():
                results.append({
                    'selector': row[0],
                    'success_count': row[1],
                    'confidence': row[2],
                    'last_used': row[3]
                })
            
            return results
            
        except Exception as e:
            return []
    
    def record_failure(self, domain: str, action_type: str, reason: str,
                      selector: str = "", page_url: str = ""):
        """Record failed action"""
        cursor = self.conn.cursor()
        timestamp = datetime.now().isoformat()
        
        try:
            cursor.execute('''
                INSERT INTO failures (domain, action_type, selector, reason, timestamp, page_url)
                VALUES (?, ?, ?, ?, ?, ?)
            ''', (domain, action_type, selector, reason, timestamp, page_url))
            
            self.conn.commit()
            
        except Exception as e:
            pass
    
    def get_recent_failures(self, domain: str, action_type: str = "", 
                           limit: int = 5) -> List[Dict]:
        """Get recent failures"""
        cursor = self.conn.cursor()
        
        try:
            if action_type:
                cursor.execute('''
                    SELECT action_type, selector, reason, timestamp
                    FROM failures
                    WHERE domain = ? AND action_type = ?
                    ORDER BY timestamp DESC
                    LIMIT ?
                ''', (domain, action_type, limit))
            else:
                cursor.execute('''
                    SELECT action_type, selector, reason, timestamp
                    FROM failures
                    WHERE domain = ?
                    ORDER BY timestamp DESC
                    LIMIT ?
                ''', (domain, limit))
            
            return [
                {
                    'action': row[0],
                    'selector': row[1],
                    'reason': row[2],
                    'timestamp': row[3]
                }
                for row in cursor.fetchall()
            ]
            
        except:
            return []
    
    def record_action(self, action: str, element_id: str = None, url: str = None):
        """
        Record action with enhanced element and URL tracking
        ENHANCED: Track specific elements clicked and URL changes
        """
        self.recent_actions.append(action)
        
        # Track element clicks
        if action == 'click' and element_id and url:
            elem_key = f"{url}#{element_id}"
            self.clicked_elements[elem_key] = self.clicked_elements.get(elem_key, 0) + 1
        
        # Track URL
        if url:
            self.url_history.append(url)
        
        # Clean old element tracking (keep last 10)
        if len(self.clicked_elements) > 10:
            recent_keys = list(self.clicked_elements.keys())[-10:]
            self.clicked_elements = {k: self.clicked_elements[k] for k in recent_keys}
    
    def is_stuck(self) -> Tuple[bool, str]:
        """
        Enhanced stuck detection with element-level tracking
        ENHANCED: Check if clicking same element repeatedly or stuck on same URL
        """
        if len(self.recent_actions) < 3:
            return False, ""
        
        # Check 1: Same element clicked 3+ times
        for elem_key, count in self.clicked_elements.items():
            if count >= 3:
                return True, f"Clicked {elem_key} {count} times"
        
        # Check 2: URL not changing
        if len(self.url_history) >= 3:
            recent_urls = list(self.url_history)[-3:]
            if len(set(recent_urls)) == 1:
                return True, "Stuck on same URL for 3 actions"
        
        # Check 3: Same action type repeated
        recent = list(self.recent_actions)[-5:]
        if len(set(recent)) == 1:
            return True, f"Repeating {recent[0]} 5x"
        
        # Check 4: Same action 3+ times in a row
        last_three = recent[-3:]
        if len(set(last_three)) == 1:
            return True, f"Same action 3x: {last_three[0]}"
        
        return False, ""
    
    def clear_recent_actions(self):
        """Reset short-term memory"""
        self.recent_actions.clear()
        self.clicked_elements.clear()
        self.url_history.clear()
    
    def update_domain_insight(self, domain: str, steps_taken: int, 
                             success: bool, has_bot_detection: bool = False):
        """Update domain statistics"""
        cursor = self.conn.cursor()
        
        try:
            cursor.execute('''
                SELECT total_visits, success_rate, avg_steps
                FROM domain_insights
                WHERE domain = ?
            ''', (domain,))
            
            row = cursor.fetchone()
            
            if row:
                total_visits = row[0] + 1
                old_success_rate = row[1]
                old_avg_steps = row[2]
                
                new_success_rate = (old_success_rate * (total_visits - 1) + (1 if success else 0)) / total_visits
                new_avg_steps = (old_avg_steps * (total_visits - 1) + steps_taken) / total_visits
                
                cursor.execute('''
                    UPDATE domain_insights
                    SET total_visits = ?,
                        success_rate = ?,
                        avg_steps = ?,
                        has_bot_detection = ?,
                        last_visit = ?
                    WHERE domain = ?
                ''', (total_visits, new_success_rate, new_avg_steps, 
                     int(has_bot_detection), datetime.now().isoformat(), domain))
            else:
                cursor.execute('''
                    INSERT INTO domain_insights
                    (domain, total_visits, success_rate, avg_steps, has_bot_detection, last_visit)
                    VALUES (?, 1, ?, ?, ?, ?)
                ''', (domain, 1.0 if success else 0.0, steps_taken, 
                     int(has_bot_detection), datetime.now().isoformat()))
            
            self.conn.commit()
            
        except Exception as e:
            pass
    
    def get_domain_insight(self, domain: str) -> Optional[Dict]:
        """Get statistics for domain"""
        cursor = self.conn.cursor()
        
        try:
            cursor.execute('''
                SELECT total_visits, success_rate, avg_steps, has_bot_detection, best_strategy
                FROM domain_insights
                WHERE domain = ?
            ''', (domain,))
            
            row = cursor.fetchone()
            if row:
                return {
                    'visits': row[0],
                    'success_rate': row[1],
                    'avg_steps': row[2],
                    'has_bot_detection': bool(row[3]),
                    'strategy': row[4]
                }
            return None
            
        except:
            return None
    
    def save_task(self, task: str, success: bool, steps_taken: int,
                 duration: float, final_url: str, data_collected: Dict = None):
        """Save completed task"""
        cursor = self.conn.cursor()
        timestamp = datetime.now().isoformat()
        
        try:
            cursor.execute('''
                INSERT INTO task_history
                (task, success, steps_taken, duration, timestamp, final_url, data_collected)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            ''', (task, int(success), steps_taken, duration, timestamp, 
                 final_url, json.dumps(data_collected) if data_collected else None))
            
            self.conn.commit()
            
        except Exception as e:
            pass
    
    def get_stats(self) -> Dict:
        """Get overall statistics"""
        cursor = self.conn.cursor()
        stats = {}
        
        try:
            cursor.execute('SELECT COUNT(*) FROM success_patterns')
            stats['patterns_learned'] = cursor.fetchone()[0]
            
            cursor.execute('SELECT COUNT(*) FROM failures')
            stats['failures_recorded'] = cursor.fetchone()[0]
            
            cursor.execute('SELECT COUNT(*) FROM task_history')
            stats['tasks_completed'] = cursor.fetchone()[0]
            
            cursor.execute('SELECT AVG(success) FROM task_history')
            result = cursor.fetchone()[0]
            stats['success_rate'] = result if result else 0.0
            
            cursor.execute('SELECT COUNT(*) FROM domain_insights')
            stats['domains_visited'] = cursor.fetchone()[0]
            
        except:
            pass
        
        return stats
    
    def close(self):
        """Close database connection"""
        if self.conn:
            self.conn.close()
    
    def __del__(self):
        """Ensure connection closed"""
        self.close()


def extract_domain(url: str) -> str:
    """Extract domain from URL"""
    if '://' in url:
        domain = url.split('/')[2]
    else:
        domain = url.split('/')[0]
    
    if domain.startswith('www.'):
        domain = domain[4:]
    
    return domain