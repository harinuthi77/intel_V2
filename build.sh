#!/bin/bash

# Build script for Adaptive Agent Platform
# Builds frontend and integrates with backend (Spring Boot style)

set -e  # Exit on error

echo "🔨 Building Adaptive Agent Platform..."

# Step 1: Install frontend dependencies if needed
echo ""
echo "📦 Installing frontend dependencies..."
cd frontend
if [ ! -d "node_modules" ]; then
    npm install
fi

# Step 2: Build frontend
echo ""
echo "🏗️  Building frontend..."
npm run build

# Step 3: Copy build to backend
echo ""
echo "📋 Copying build to backend/static..."
cd ..
rm -rf backend/static
cp -r frontend/dist backend/static

echo ""
echo "✅ Build complete!"
echo ""
echo "📁 Frontend built and copied to backend/static/"
echo "🚀 Run './start.sh' or 'python -m uvicorn backend.server:app --host 0.0.0.0 --port 8000' to start the integrated app"
