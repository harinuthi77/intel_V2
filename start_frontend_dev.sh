#!/bin/bash

echo "╔══════════════════════════════════════════════════════════════╗"
echo "║       🎨 Starting FORGE Frontend Dev Server (Port 5173)     ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

cd /home/user/intel_V2/frontend

echo "Starting Vite dev server with hot reload..."
echo "Visit: http://localhost:5173"
echo ""
echo "Note: Make sure backend is running on port 8000!"
echo "Press Ctrl+C to stop"
echo ""

npm run dev
