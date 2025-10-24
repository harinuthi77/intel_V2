#!/bin/bash
# FORGE Quick Start Script

set -e

echo "🚀 FORGE - Quick Start Script"
echo "================================"
echo ""

# Check if ANTHROPIC_API_KEY is set
if [ -z "$ANTHROPIC_API_KEY" ]; then
    echo "⚠️  Warning: ANTHROPIC_API_KEY not set!"
    echo "Please set it with: export ANTHROPIC_API_KEY='your_key_here'"
    echo "Or create a .env file with: ANTHROPIC_API_KEY=your_key_here"
    echo ""
    read -p "Continue anyway? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Check Python version
echo "📋 Checking Python version..."
python_version=$(python --version 2>&1 | awk '{print $2}')
echo "   Python version: $python_version"

# Check if virtual environment exists
if [ -d "venv" ]; then
    echo "✅ Virtual environment found"
    source venv/bin/activate
else
    echo "ℹ️  No virtual environment found. Install dependencies globally? (y/n)"
    read -p "   " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "📦 Installing Python dependencies..."
        pip install -r requirements.txt
    else
        echo "❌ Aborted. Create a virtual environment first:"
        echo "   python -m venv venv"
        echo "   source venv/bin/activate"
        echo "   pip install -r requirements.txt"
        exit 1
    fi
fi

# Check if frontend is built
if [ ! -d "frontend/dist" ]; then
    echo "⚠️  Frontend not built yet!"
    echo "Building frontend..."
    cd frontend
    npm install --legacy-peer-deps
    npm run build
    cd ..
    echo "✅ Frontend built successfully"
else
    echo "✅ Frontend already built"
fi

echo ""
echo "🎮 Starting FORGE Server..."
echo "================================"
echo ""
echo "📍 Server will be available at: http://localhost:8000"
echo "🛑 Press CTRL+C to stop the server"
echo ""

# Start the server
python backend/server.py
