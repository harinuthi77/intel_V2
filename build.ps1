#!/usr/bin/env pwsh
# Simple build script - builds frontend and prepares for running on port 8000

Write-Host "`n=== Building Frontend for Port 8000 ===" -ForegroundColor Cyan

# Check if npm is available
if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
    Write-Host "❌ npm not found! Please install Node.js first." -ForegroundColor Red
    exit 1
}

# Navigate to frontend
Push-Location frontend

try {
    # Install dependencies if needed
    if (-not (Test-Path "node_modules")) {
        Write-Host "`n[1/3] Installing npm dependencies..." -ForegroundColor Yellow
        npm install
        if ($LASTEXITCODE -ne 0) {
            throw "npm install failed"
        }
    } else {
        Write-Host "`n[1/3] Dependencies already installed ✓" -ForegroundColor Green
    }

    # Build frontend
    Write-Host "`n[2/3] Building frontend..." -ForegroundColor Yellow
    npm run build
    if ($LASTEXITCODE -ne 0) {
        throw "npm build failed"
    }
    Write-Host "✓ Build complete" -ForegroundColor Green

    # Verify output
    Write-Host "`n[3/3] Verifying build..." -ForegroundColor Yellow
    if (Test-Path "../backend/static/index.html") {
        Write-Host "✓ Frontend built successfully to backend/static/" -ForegroundColor Green

        # Count files
        $fileCount = (Get-ChildItem -Recurse ../backend/static).Count
        Write-Host "  Files generated: $fileCount" -ForegroundColor Gray
    } else {
        throw "Build output not found at backend/static/index.html"
    }

    Write-Host "`n=== Build Complete ===" -ForegroundColor Cyan
    Write-Host "✅ Frontend is ready!" -ForegroundColor Green
    Write-Host "`nNext steps:" -ForegroundColor Yellow
    Write-Host "  1. cd backend" -ForegroundColor White
    Write-Host "  2. python server.py" -ForegroundColor White
    Write-Host "  3. Open http://localhost:8000" -ForegroundColor White
    Write-Host "`n"

} catch {
    Write-Host "`n❌ Build failed: $_" -ForegroundColor Red
    exit 1
} finally {
    Pop-Location
}
