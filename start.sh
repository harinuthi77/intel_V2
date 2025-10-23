#!/bin/bash

# Start script for Adaptive Agent Platform (Spring Boot style)
# Runs the integrated backend + frontend on a single port

set -e  # Exit on error

echo "🚀 Starting Adaptive Agent Platform..."

# Check if backend/static exists
if [ ! -d "backend/static" ]; then
    echo ""
    echo "⚠️  Frontend not built yet!"
    echo "Run './build.sh' first to build and integrate the frontend."
    echo ""
    exit 1
fi

# Activate virtual environment if it exists
if [ -d ".venv" ]; then
    echo "🐍 Activating virtual environment..."
    source .venv/bin/activate
fi

# Start the server
echo ""
echo "🌐 Starting server on http://localhost:8000"
echo "📱 Frontend and API available at the same address"
echo ""
echo "Press Ctrl+C to stop"
echo ""

uvicorn backend.server:app --host 0.0.0.0 --port 8000 --reload
