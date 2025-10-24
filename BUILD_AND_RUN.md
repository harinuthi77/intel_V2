# Build and Run - Simple Guide

## ONE PORT ONLY: 8000

This application runs on **port 8000** only. No dual servers, no confusion.

---

## First Time Setup

### 1. Install Dependencies

```powershell
# Backend dependencies
cd backend
pip install -r requirements.txt

# Frontend dependencies
cd ../frontend
npm install
```

### 2. Build Frontend

```powershell
cd frontend
npm run build
```

This compiles the React app and puts it in `backend/static/`.

---

## Running the Application

### Start the Backend (Serves Everything)

```powershell
cd backend
python server.py
```

The backend will:
- ✅ Serve the frontend at http://localhost:8000
- ✅ Handle API requests at http://localhost:8000/execute
- ✅ Provide WebSocket endpoints at ws://localhost:8000/ws/*

### Open the Application

Open your browser to: **http://localhost:8000**

That's it! Everything runs on port 8000.

---

## Development Mode (Optional)

If you're actively developing the frontend and want hot reload:

### Terminal 1: Backend
```powershell
cd backend
python server.py
```

### Terminal 2: Frontend Dev Server
```powershell
cd frontend
npm run dev
```

Then open: **http://localhost:5173**

The dev server at 5173 will proxy API requests to backend at 8000.

**When done developing**: Run `npm run build` to update the production build.

---

## Quick Commands Reference

```powershell
# First time setup
cd frontend && npm install && npm run build && cd ../backend && pip install -r requirements.txt

# Run the app (production mode - ONE PORT)
cd backend && python server.py
# Open http://localhost:8000

# Rebuild frontend after changes
cd frontend && npm run build

# Dev mode (two terminals)
# Terminal 1: cd backend && python server.py
# Terminal 2: cd frontend && npm run dev
# Open http://localhost:5173
```

---

## Ports Explained

| Mode | Port | What | When to Use |
|------|------|------|-------------|
| **Production** | **8000** | **Backend serves everything** | **Default - use this** |
| Development | 5173 | Frontend dev server with hot reload | Only when editing React code |
| Development | 8000 | Backend API server | Always running |

**Recommendation**: Use production mode (port 8000 only) unless you're actively editing frontend code.

---

## Testing the Setup

```powershell
# After starting backend
Invoke-RestMethod -Uri "http://localhost:8000/health"
```

**Expected**:
```json
{
  "status": "healthy",
  "endpoints": {
    "execute": "/execute",
    "control_ws": "/ws/control",
    "live_browser_ws": "/ws/browser"
  }
}
```

---

## Troubleshooting

### Frontend not loading at localhost:8000
```powershell
# Check if frontend was built
ls backend/static/index.html

# If not found, build it
cd frontend
npm run build
```

### Port 8000 already in use
```powershell
# Find process using port 8000
netstat -ano | findstr :8000

# Kill it
Stop-Process -Id <PID> -Force
```

### Changes not appearing
```powershell
# Rebuild frontend
cd frontend
npm run build

# Restart backend
# Press Ctrl+C in backend terminal, then:
python server.py
```

---

## Summary

**Simple Mode (Recommended)**:
1. `cd frontend && npm run build`
2. `cd ../backend && python server.py`
3. Open http://localhost:8000

**Development Mode**:
1. Terminal 1: `cd backend && python server.py`
2. Terminal 2: `cd frontend && npm run dev`
3. Open http://localhost:5173

**Always use port 8000 for production/testing!**
