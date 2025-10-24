"""
Quick test to verify /ws/control endpoint is working.
Run this while the backend is running.
"""
import asyncio
import websockets
import json

async def test_control_websocket():
    uri = "ws://localhost:8000/ws/control?session_id=test123"

    print(f"🔌 Connecting to {uri}")

    try:
        async with websockets.connect(uri) as websocket:
            print("✅ Connected successfully!")

            # Test 1: Send ping
            print("\n📤 Sending ping...")
            await websocket.send(json.dumps({"type": "ping"}))

            response = await asyncio.wait_for(websocket.recv(), timeout=2.0)
            print(f"📥 Received: {response}")

            # Test 2: Send pause
            print("\n📤 Sending pause...")
            await websocket.send(json.dumps({"type": "pause"}))

            response = await asyncio.wait_for(websocket.recv(), timeout=2.0)
            print(f"📥 Received: {response}")

            # Test 3: Send resume
            print("\n📤 Sending resume...")
            await websocket.send(json.dumps({"type": "resume"}))

            response = await asyncio.wait_for(websocket.recv(), timeout=2.0)
            print(f"📥 Received: {response}")

            print("\n✅ All tests passed! /ws/control is working correctly.")

    except websockets.exceptions.InvalidStatusCode as e:
        print(f"❌ Connection failed with status {e.status_code}")
        print(f"   This means the endpoint returned HTTP {e.status_code} instead of 101")
        if e.status_code == 404:
            print("   → /ws/control endpoint NOT FOUND")
        elif e.status_code == 500:
            print("   → Server error - check backend logs")
    except ConnectionRefusedError:
        print("❌ Connection refused - is the backend running on port 8000?")
    except asyncio.TimeoutError:
        print("❌ Timeout - connected but no response received")
    except Exception as e:
        print(f"❌ Error: {type(e).__name__}: {e}")

if __name__ == "__main__":
    asyncio.run(test_control_websocket())
