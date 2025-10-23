"""
Test if ANTHROPIC_API_KEY is set and working.
Run this before starting the agent to verify your setup.
"""

import os
import sys

def test_api_key():
    """Test if ANTHROPIC_API_KEY environment variable is set and valid."""

    print("=" * 70)
    print("🔍 ANTHROPIC API KEY DIAGNOSTIC")
    print("=" * 70)
    print()

    # Check 1: Is the environment variable set?
    api_key = os.environ.get("ANTHROPIC_API_KEY")

    if not api_key:
        print("❌ ANTHROPIC_API_KEY is NOT set!")
        print()
        print("To fix this, run:")
        print("  PowerShell: $env:ANTHROPIC_API_KEY = \"sk-ant-your-key-here\"")
        print("  Bash/Linux: export ANTHROPIC_API_KEY=\"sk-ant-your-key-here\"")
        print()
        return False

    print(f"✅ ANTHROPIC_API_KEY is set")
    print(f"   Key starts with: {api_key[:10]}...")
    print()

    # Check 2: Can we import anthropic?
    try:
        import anthropic
        print("✅ Anthropic library is installed")
    except ImportError:
        print("❌ Anthropic library NOT installed!")
        print("   Run: pip install anthropic")
        return False

    # Check 3: Can we create a client?
    try:
        client = anthropic.Anthropic()
        print("✅ Anthropic client created successfully")
    except Exception as e:
        print(f"❌ Failed to create Anthropic client: {e}")
        return False

    # Check 4: Can we make a simple API call?
    print()
    print("Testing API connection...")
    try:
        response = client.messages.create(
            model="claude-sonnet-4-5-20250929",
            max_tokens=10,
            messages=[
                {"role": "user", "content": "Say 'hello' in one word"}
            ]
        )
        result = response.content[0].text
        print(f"✅ API call successful! Claude said: {result}")
        print()
        print("=" * 70)
        print("🎉 ALL CHECKS PASSED - Your setup is working!")
        print("=" * 70)
        return True

    except anthropic.AuthenticationError:
        print("❌ API KEY IS INVALID!")
        print("   Your key is set but doesn't work.")
        print("   Get a valid key from: https://console.anthropic.com")
        return False

    except anthropic.RateLimitError:
        print("⚠️  Rate limit reached (but key is valid)")
        print("   Try again in a moment")
        return True

    except Exception as e:
        print(f"❌ API call failed: {e}")
        return False


if __name__ == "__main__":
    success = test_api_key()
    sys.exit(0 if success else 1)
