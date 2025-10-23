#!/usr/bin/env python3
"""
Quick test script for Loop Detection functionality (STEP 1.1)

Tests:
1. Screenshot hash generation
2. Loop detection after 3 identical screenshots
3. Alternative action suggestion based on last action
4. Action recording
"""

import hashlib


class LoopDetector:
    """Detects and breaks infinite loops by tracking visual state and actions."""

    def __init__(self):
        self.screenshot_hashes = []
        self.last_action = None
        self.loop_break_attempts = 0
        self.max_history = 5
        self.loop_threshold = 3

    def _hash_screenshot(self, screenshot_bytes: bytes) -> str:
        """Create hash of screenshot for comparison."""
        return hashlib.md5(screenshot_bytes).hexdigest()[:16]

    def detect_visual_loop(self, screenshot_bytes: bytes) -> bool:
        """Detect if we're in a visual loop (same screenshot repeating)."""
        current_hash = self._hash_screenshot(screenshot_bytes)
        self.screenshot_hashes.append(current_hash)

        if len(self.screenshot_hashes) > self.max_history:
            self.screenshot_hashes.pop(0)

        if len(self.screenshot_hashes) < 3:
            return False

        count = self.screenshot_hashes.count(current_hash)
        return count >= self.loop_threshold

    def get_alternative_action(self) -> str:
        """Suggest an alternative action to break the loop."""
        self.loop_break_attempts += 1
        alternatives = []

        if self.last_action and 'scroll' in self.last_action.lower():
            alternatives.append("click_random")
            alternatives.append("go_back")
        elif self.last_action and 'click' in self.last_action.lower():
            alternatives.append("scroll_down")
            alternatives.append("go_back")
        elif self.last_action and 'type' in self.last_action.lower():
            alternatives.append("click_random")
            alternatives.append("scroll_down")

        if not alternatives:
            alternatives = ["click_random", "scroll_down", "go_back"]

        chosen = alternatives[self.loop_break_attempts % len(alternatives)]
        return chosen

    def record_action(self, action: str):
        """Record the last action taken."""
        self.last_action = action


def test_loop_detection():
    """Test loop detection functionality."""
    print("🧪 Testing Loop Detection (STEP 1.1)")
    print("=" * 70)

    detector = LoopDetector()

    # Test 1: Hash generation
    print("\n✅ TEST 1: Screenshot hash generation")
    screenshot1 = b"fake screenshot data 1"
    screenshot2 = b"fake screenshot data 2"
    screenshot3 = b"fake screenshot data 1"  # Same as screenshot1

    hash1 = detector._hash_screenshot(screenshot1)
    hash2 = detector._hash_screenshot(screenshot2)
    hash3 = detector._hash_screenshot(screenshot3)

    assert hash1 == hash3, "Identical screenshots should have same hash"
    assert hash1 != hash2, "Different screenshots should have different hash"
    print(f"   ✓ Hash 1: {hash1}")
    print(f"   ✓ Hash 2: {hash2}")
    print(f"   ✓ Hash 3: {hash3}")
    print("   ✓ Hash generation working correctly")

    # Test 2: Loop detection
    print("\n✅ TEST 2: Loop detection after 3 identical screenshots")
    detector2 = LoopDetector()

    # First screenshot - no loop
    is_loop = detector2.detect_visual_loop(screenshot1)
    assert not is_loop, "First screenshot shouldn't trigger loop"
    print(f"   ✓ Screenshot 1: No loop (hashes: {detector2.screenshot_hashes})")

    # Second identical screenshot - no loop yet
    is_loop = detector2.detect_visual_loop(screenshot1)
    assert not is_loop, "Two identical screenshots shouldn't trigger loop"
    print(f"   ✓ Screenshot 2: No loop (hashes: {detector2.screenshot_hashes})")

    # Third identical screenshot - LOOP!
    is_loop = detector2.detect_visual_loop(screenshot1)
    assert is_loop, "Three identical screenshots should trigger loop"
    print(f"   ✓ Screenshot 3: LOOP DETECTED! (hashes: {detector2.screenshot_hashes})")

    # Test 3: Alternative action suggestion
    print("\n✅ TEST 3: Alternative action suggestion")
    detector3 = LoopDetector()

    # Test scroll action → should suggest click or back
    detector3.record_action("scroll down")
    alt = detector3.get_alternative_action()
    assert alt in ["click_random", "go_back"], f"Expected click_random or go_back, got {alt}"
    print(f"   ✓ After 'scroll down' → Suggested: {alt}")

    # Test click action → should suggest scroll or back
    detector3.record_action("click 5")
    alt = detector3.get_alternative_action()
    assert alt in ["scroll_down", "go_back"], f"Expected scroll_down or go_back, got {alt}"
    print(f"   ✓ After 'click 5' → Suggested: {alt}")

    # Test type action → should suggest click or scroll
    detector3.record_action("type search query")
    alt = detector3.get_alternative_action()
    assert alt in ["click_random", "scroll_down"], f"Expected click_random or scroll_down, got {alt}"
    print(f"   ✓ After 'type search query' → Suggested: {alt}")

    # Test 4: Action recording
    print("\n✅ TEST 4: Action recording")
    detector4 = LoopDetector()
    detector4.record_action("goto https://example.com")
    assert detector4.last_action == "goto https://example.com"
    print(f"   ✓ Recorded action: {detector4.last_action}")

    # Test 5: Full loop scenario
    print("\n✅ TEST 5: Full loop scenario simulation")
    detector5 = LoopDetector()

    print("   Step 1: scroll down")
    detector5.record_action("scroll down")
    is_loop = detector5.detect_visual_loop(b"page1")
    print(f"      → Loop: {is_loop} (hashes: {detector5.screenshot_hashes})")

    print("   Step 2: scroll down (same page)")
    detector5.record_action("scroll down")
    is_loop = detector5.detect_visual_loop(b"page1")
    print(f"      → Loop: {is_loop} (hashes: {detector5.screenshot_hashes})")

    print("   Step 3: scroll down (same page)")
    detector5.record_action("scroll down")
    is_loop = detector5.detect_visual_loop(b"page1")
    print(f"      → Loop: {is_loop} (hashes: {detector5.screenshot_hashes})")

    if is_loop:
        alt = detector5.get_alternative_action()
        print(f"      → 🔄 LOOP DETECTED! Breaking with: {alt}")
        assert alt in ["click_random", "go_back"]

    print("\n" + "=" * 70)
    print("✅ ALL TESTS PASSED!")
    print("=" * 70)
    print("\n📋 STEP 1.1 Validation:")
    print("   ✓ Screenshot hashing works correctly")
    print("   ✓ Loop detection triggers after 3 identical screenshots")
    print("   ✓ Alternative actions suggested based on last action")
    print("   ✓ Action recording works correctly")
    print("   ✓ Full loop scenario handled properly")
    print("\n🎉 STEP 1.1: Loop Detection - COMPLETE!")


if __name__ == "__main__":
    test_loop_detection()
