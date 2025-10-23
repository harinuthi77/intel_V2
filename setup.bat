@echo off
REM Setup script for FORGE on Windows

echo ============================================
echo   FORGE - Setup Script (Windows)
echo ============================================
echo.

REM Step 1: Install Python dependencies
echo [Step 1/3] Installing Python dependencies...
pip install -r requirements.txt
if errorlevel 1 (
    echo [ERROR] Failed to install Python dependencies
    pause
    exit /b 1
)
echo [OK] Python dependencies installed
echo.

REM Step 2: Install frontend dependencies and build
echo [Step 2/3] Installing frontend dependencies...
cd frontend
call npm install --legacy-peer-deps
if errorlevel 1 (
    echo [ERROR] Failed to install frontend dependencies
    cd ..
    pause
    exit /b 1
)
echo [OK] Frontend dependencies installed
echo.

echo Building frontend...
call npm run build
if errorlevel 1 (
    echo [ERROR] Failed to build frontend
    cd ..
    pause
    exit /b 1
)
echo [OK] Frontend built successfully
cd ..
echo.

REM Step 3: Copy frontend to backend/static
echo [Step 3/3] Setting up static files...
if not exist "backend\static" mkdir backend\static
xcopy /E /Y /I frontend\dist\* backend\static\
echo [OK] Static files ready
echo.

echo ============================================
echo   Setup Complete!
echo ============================================
echo.
echo Next steps:
echo   1. Set your API key:
echo      set ANTHROPIC_API_KEY=your_key_here
echo.
echo   2. Run the server:
echo      run.bat
echo      OR
echo      python backend\server.py
echo.
echo   3. Open your browser:
echo      http://localhost:8000
echo.

pause
