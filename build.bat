@echo off
REM Build script for Adaptive Agent Platform
REM Builds frontend and integrates with backend (Spring Boot style)

echo Building Adaptive Agent Platform...

REM Step 1: Install frontend dependencies if needed
echo.
echo Installing frontend dependencies...
cd frontend
if not exist "node_modules\" (
    call npm install
)

REM Step 2: Build frontend
echo.
echo Building frontend...
call npm run build

REM Step 3: Copy build to backend
echo.
echo Copying build to backend\static...
cd ..
if exist "backend\static\" (
    rmdir /s /q backend\static
)
xcopy /E /I /Y frontend\dist backend\static

echo.
echo Build complete!
echo.
echo Frontend built and copied to backend\static\
echo Run 'start.bat' or 'uvicorn backend.server:app --host 0.0.0.0 --port 8000' to start the integrated app
