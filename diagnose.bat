@echo off
REM Diagnostic script to verify Adaptive Agent Platform setup

echo ========================================
echo   ADAPTIVE AGENT PLATFORM DIAGNOSTICS
echo ========================================
echo.

REM Check 1: Virtual environment
echo [1/6] Checking virtual environment...
if exist ".venv\Scripts\python.exe" (
    echo    ✓ Virtual environment exists
) else (
    echo    ✗ Virtual environment NOT found
    echo    → Run: python -m venv .venv
)
echo.

REM Check 2: Frontend built
echo [2/6] Checking if frontend is built...
if exist "backend\static\index.html" (
    echo    ✓ Frontend built and copied to backend\static\
) else (
    echo    ✗ Frontend NOT built
    echo    → Run: build.bat
)
echo.

REM Check 3: Python dependencies
echo [3/6] Checking Python dependencies...
call .venv\Scripts\activate.bat 2>nul
pip show fastapi uvicorn anthropic playwright >nul 2>&1
if %ERRORLEVEL%==0 (
    echo    ✓ Python dependencies installed
) else (
    echo    ✗ Some Python dependencies missing
    echo    → Run: pip install -r requirements.txt
)
echo.

REM Check 4: API Key
echo [4/6] Checking ANTHROPIC_API_KEY...
if defined ANTHROPIC_API_KEY (
    echo    ✓ ANTHROPIC_API_KEY is set
) else (
    echo    ✗ ANTHROPIC_API_KEY is NOT set
    echo    → Run: $env:ANTHROPIC_API_KEY = "your-key-here"
)
echo.

REM Check 5: Port 8000 availability
echo [5/6] Checking if port 8000 is available...
netstat -ano | findstr :8000 >nul
if %ERRORLEVEL%==0 (
    echo    ⚠ Port 8000 is IN USE
    echo    → This is OK if backend is running
    echo    → If stuck, kill it: taskkill /PID [PID] /F
) else (
    echo    ✓ Port 8000 is available
)
echo.

REM Check 6: Port 5173 (Vite dev server - should NOT be running)
echo [6/6] Checking if Vite dev server is running...
netstat -ano | findstr :5173 >nul
if %ERRORLEVEL%==0 (
    echo    ✗ Vite dev server IS RUNNING on port 5173
    echo    → STOP IT! You should use port 8000, not 5173
    echo    → Kill Vite: Get-Process *node* ^| Stop-Process -Force
) else (
    echo    ✓ Vite dev server NOT running (good!)
)
echo.

echo ========================================
echo   RECOMMENDED NEXT STEPS
echo ========================================
echo.
echo 1. If frontend not built: run "build.bat"
echo 2. If ANTHROPIC_API_KEY not set:
echo    $env:ANTHROPIC_API_KEY = "your-key"
echo 3. Start backend: "start.bat"
echo 4. Open browser to: http://localhost:8000
echo    ⚠ DO NOT USE http://localhost:5173
echo.
echo ========================================
echo   VERIFICATION
echo ========================================
echo.
echo After starting backend, test health:
echo    curl http://localhost:8000/health
echo.
echo You should see JSON with "status": "healthy"
echo.
pause
