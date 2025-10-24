#!/usr/bin/env python3
"""
SESSION 1: Loop Detection Validation

Tests that LoopDetector properly detects loops after 3 identical screenshots.
This test validates STEP 1.1 implementation.
"""

import sys
import os
sys.path.insert(0, '/home/user/intel_V2')

# Set dummy API key for import (not used in this test)
os.environ['ANTHROPIC_API_KEY'] = 'sk-ant-test-dummy-key-for-validation'

# Import the LoopDetector class from adaptive_agent.py
from adaptive_agent import LoopDetector

# Create instance
agent = LoopDetector()

# Test: First screenshot should NOT trigger loop
ss = b'test'
result1 = agent.detect_visual_loop(ss)
assert not result1, f"First screenshot should NOT trigger loop, got {result1}"

# Test: Second identical screenshot should NOT trigger loop
result2 = agent.detect_visual_loop(ss)
assert not result2, f"Second screenshot should NOT trigger loop, got {result2}"

# Test: Third identical screenshot SHOULD trigger loop
result3 = agent.detect_visual_loop(ss)
assert result3, f"Third screenshot SHOULD trigger loop, got {result3}"

print("PASS")
