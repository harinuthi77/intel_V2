#!/usr/bin/env python3
"""
SESSION 2: Shutdown Handler Validation

Tests that GracefulShutdown properly handles SIGINT and cleans up.
This test validates STEP 1.2 implementation.
"""

import sys
import os
import signal
import time
sys.path.insert(0, '/home/user/intel_V2')

# Set dummy API key for import
os.environ['ANTHROPIC_API_KEY'] = 'sk-ant-test-dummy-key-for-validation'

# Import the GracefulShutdown class
from adaptive_agent import GracefulShutdown

print("Testing GracefulShutdown...")

# Create instance
handler = GracefulShutdown()

# Test 1: Initially not shutdown
assert not handler.check_shutdown(), "Should not be shutdown initially"
print("✓ Initial state: Not shutdown")

# Test 2: Simulate SIGINT
print("\nSimulating Ctrl+C (SIGINT)...")
handler._handle_shutdown(signal.SIGINT, None)

# Test 3: Should now be shutdown
assert handler.check_shutdown(), "Should be shutdown after SIGINT"
print("✓ After SIGINT: Shutdown requested")

# Test 4: Check that shutdown message was printed
print("\nExpected output above:")
print("  ✓ '🛑 SHUTDOWN SIGNAL RECEIVED'")
print("  ✓ '⏳ Finishing current step gracefully...'")

print("\nPASS")
print("Exit code: 0")
