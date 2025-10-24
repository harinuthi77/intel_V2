#!/bin/bash

echo "╔══════════════════════════════════════════════════════════════╗"
echo "║         🚀 Starting FORGE Backend Server (Port 8000)        ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

cd /home/user/intel_V2

# Check if API key is set
if [ -z "$ANTHROPIC_API_KEY" ]; then
    echo "❌ ERROR: ANTHROPIC_API_KEY not set!"
    echo ""
    echo "Set it with:"
    echo "  export ANTHROPIC_API_KEY='sk-ant-...'"
    echo ""
    exit 1
fi

echo "✅ API Key detected: ${ANTHROPIC_API_KEY:0:10}..."
echo ""
echo "Starting backend server..."
echo "Visit: http://localhost:8000"
echo "Health Check: http://localhost:8000/health"
echo ""
echo "Press Ctrl+C to stop"
echo ""

python -m uvicorn backend.server:app --reload --host 0.0.0.0 --port 8000
