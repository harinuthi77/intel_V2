#!/usr/bin/env pwsh
# Simple run script - runs the application on port 8000

Write-Host "`n=== Starting Application on Port 8000 ===" -ForegroundColor Cyan

# Check if backend/static exists
if (-not (Test-Path "backend/static/index.html")) {
    Write-Host "⚠️  Frontend not built yet!" -ForegroundColor Yellow
    Write-Host "Building frontend first..." -ForegroundColor Yellow
    & .\build.ps1
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Build failed. Cannot start server." -ForegroundColor Red
        exit 1
    }
}

# Check if port 8000 is already in use
$port8000 = Get-NetTCPConnection -LocalPort 8000 -ErrorAction SilentlyContinue
if ($port8000) {
    Write-Host "⚠️  Port 8000 is already in use!" -ForegroundColor Yellow
    Write-Host "Processes using port 8000:" -ForegroundColor Yellow
    Get-Process -Id $port8000.OwningProcess | Format-Table Id, ProcessName, Path -AutoSize

    $response = Read-Host "Kill these processes and continue? (y/n)"
    if ($response -eq 'y') {
        Get-Process -Id $port8000.OwningProcess | Stop-Process -Force
        Write-Host "✓ Processes killed" -ForegroundColor Green
        Start-Sleep -Seconds 1
    } else {
        Write-Host "❌ Cannot start server on port 8000" -ForegroundColor Red
        exit 1
    }
}

# Start backend
Write-Host "`n🚀 Starting backend server..." -ForegroundColor Green
Write-Host "Backend will serve:" -ForegroundColor Gray
Write-Host "  - Frontend UI at http://localhost:8000" -ForegroundColor Gray
Write-Host "  - API at http://localhost:8000/execute" -ForegroundColor Gray
Write-Host "  - WebSockets at ws://localhost:8000/ws/*" -ForegroundColor Gray
Write-Host "`nPress Ctrl+C to stop the server`n" -ForegroundColor Yellow

Push-Location backend

try {
    # Check Python environment
    if (-not (Get-Command python -ErrorAction SilentlyContinue)) {
        throw "Python not found in PATH"
    }

    # Check if virtual environment is activated
    if (-not $env:VIRTUAL_ENV) {
        Write-Host "⚠️  Virtual environment not activated" -ForegroundColor Yellow
        if (Test-Path ".venv/Scripts/Activate.ps1") {
            Write-Host "Activating .venv..." -ForegroundColor Yellow
            & .venv/Scripts/Activate.ps1
        }
    }

    # Run server
    python server.py

} catch {
    Write-Host "`n❌ Server error: $_" -ForegroundColor Red
    exit 1
} finally {
    Pop-Location
}
