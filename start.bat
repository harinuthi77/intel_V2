@echo off
REM Start script for Adaptive Agent Platform (Spring Boot style)
REM Runs the integrated backend + frontend on a single port

echo Starting Adaptive Agent Platform...

REM Check if backend\static exists
if not exist "backend\static\" (
    echo.
    echo Frontend not built yet!
    echo Run 'build.bat' first to build and integrate the frontend.
    echo.
    exit /b 1
)

REM Activate virtual environment if it exists
if exist ".venv\Scripts\activate.bat" (
    echo Activating virtual environment...
    call .venv\Scripts\activate.bat
)

REM Start the server
echo.
echo Starting server on http://localhost:8000
echo Frontend and API available at the same address
echo.
echo Press Ctrl+C to stop
echo.

uvicorn backend.server:app --host 0.0.0.0 --port 8000 --reload
