@echo off
REM Quick start script for FORGE on Windows

echo ============================================
echo   FORGE - Quick Start Script (Windows)
echo ============================================
echo.

REM Check if API key is set
if "%ANTHROPIC_API_KEY%"=="" (
    echo [WARNING] ANTHROPIC_API_KEY not set!
    echo.
    echo Please set it with:
    echo   set ANTHROPIC_API_KEY=your_key_here
    echo.
    echo Or create a .env file with:
    echo   ANTHROPIC_API_KEY=your_key_here
    echo.
    set /p continue="Continue anyway? (y/n): "
    if /i not "%continue%"=="y" exit /b 1
)

REM Check Python version
echo [Step 1/4] Checking Python version...
python --version
if errorlevel 1 (
    echo [ERROR] Python not found!
    pause
    exit /b 1
)
echo.

REM Check if virtual environment is active
echo [Step 2/4] Checking virtual environment...
if "%VIRTUAL_ENV%"=="" (
    echo [INFO] No virtual environment detected
    echo Recommended: Activate your venv first with:
    echo   .venv\Scripts\activate
    echo.
) else (
    echo [OK] Virtual environment active: %VIRTUAL_ENV%
)
echo.

REM Check if frontend is built
echo [Step 3/4] Checking frontend build...
if not exist "frontend\dist\index.html" (
    echo [WARNING] Frontend not built yet!
    echo Building frontend...
    cd frontend
    call npm install --legacy-peer-deps
    call npm run build
    cd ..
    echo [OK] Frontend built successfully
) else (
    echo [OK] Frontend already built
)
echo.

REM Copy frontend to backend/static
echo [Step 4/4] Setting up static files...
if not exist "backend\static" mkdir backend\static
xcopy /E /Y /I frontend\dist\* backend\static\
echo [OK] Static files ready
echo.

echo ============================================
echo   Starting FORGE Server...
echo ============================================
echo.
echo Server will be available at: http://localhost:8000
echo Press CTRL+C to stop the server
echo.

REM Start the server
python backend\server.py
