#!/bin/bash

# ============================================================================
# FORGE Platform Startup Script
# ============================================================================

clear

echo "╔══════════════════════════════════════════════════════════════════╗"
echo "║                   🚀 FORGE PLATFORM STARTUP                      ║"
echo "╚══════════════════════════════════════════════════════════════════╝"
echo ""

# Navigate to project directory
cd /home/user/intel_V2

# ============================================================================
# Step 1: Check for API Key
# ============================================================================

if [ -f ".env" ]; then
    echo "✅ Found .env file - loading environment variables..."
    export $(cat .env | grep -v '^#' | xargs)
else
    echo "⚠️  No .env file found"
    echo ""
fi

if [ -z "$ANTHROPIC_API_KEY" ]; then
    echo "╔══════════════════════════════════════════════════════════════════╗"
    echo "║                    ⚠️  API KEY NOT SET                           ║"
    echo "╚══════════════════════════════════════════════════════════════════╝"
    echo ""
    echo "Please set your ANTHROPIC_API_KEY:"
    echo ""
    echo "Option 1 - Create .env file (recommended):"
    echo "   cp .env.example .env"
    echo "   nano .env"
    echo "   # Add your key: ANTHROPIC_API_KEY=sk-ant-api-..."
    echo ""
    echo "Option 2 - Set environment variable:"
    echo "   export ANTHROPIC_API_KEY='sk-ant-api-...'"
    echo "   ./start.sh"
    echo ""
    echo "Option 3 - Enter key now:"
    read -p "Enter your ANTHROPIC_API_KEY: " api_key

    if [ -z "$api_key" ]; then
        echo ""
        echo "❌ No API key provided. Exiting..."
        exit 1
    fi

    export ANTHROPIC_API_KEY="$api_key"

    # Offer to save it
    read -p "Save this key to .env file for next time? (y/n): " save_key
    if [ "$save_key" = "y" ] || [ "$save_key" = "Y" ]; then
        echo "ANTHROPIC_API_KEY=$api_key" > .env
        echo "✅ Saved to .env file"
    fi
fi

echo ""
echo "✅ API Key detected: ${ANTHROPIC_API_KEY:0:15}..."
echo ""

# ============================================================================
# Step 2: Check Python Dependencies
# ============================================================================

echo "🔍 Checking Python dependencies..."

if ! python -c "import uvicorn" 2>/dev/null; then
    echo "⚠️  Missing dependencies detected"
    echo "📦 Installing from requirements.txt..."
    pip install -q -r requirements.txt
    echo "✅ Dependencies installed"
else
    echo "✅ Dependencies OK"
fi

echo ""

# ============================================================================
# Step 3: Start Backend Server
# ============================================================================

echo "╔══════════════════════════════════════════════════════════════════╗"
echo "║                 🚀 STARTING BACKEND SERVER                       ║"
echo "╚══════════════════════════════════════════════════════════════════╝"
echo ""
echo "Backend will start on: http://localhost:8000"
echo ""
echo "📊 Available Endpoints:"
echo "   • Main UI:        http://localhost:8000"
echo "   • Health Check:   http://localhost:8000/health"
echo "   • API Docs:       http://localhost:8000/docs"
echo "   • WebSocket:      ws://localhost:8000/ws"
echo ""
echo "📝 For Development Mode (Hot Reload):"
echo "   • Frontend:       http://localhost:5173 (run 'npm run dev' in frontend/)"
echo ""
echo "Press Ctrl+C to stop the server"
echo "═════════════════════════════════════════════════════════════════"
echo ""

# Start uvicorn server
python -m uvicorn backend.server:app --reload --host 0.0.0.0 --port 8000
