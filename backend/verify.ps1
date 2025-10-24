# Quick verification script for /ws/control endpoint
Write-Host "`n=== Verification Script for /ws/control ===" -ForegroundColor Cyan

# Check 1: Git commit
Write-Host "`n[1/5] Checking git commit..." -ForegroundColor Yellow
$commit = git log -1 --oneline
Write-Host "Current commit: $commit" -ForegroundColor $(if ($commit -like "d630cdb*") { "Green" } else { "Red" })

# Check 2: Code presence
Write-Host "`n[2/5] Checking code..." -ForegroundColor Yellow
$count = (Select-String -Path server.py -Pattern '/ws/control').Count
Write-Host "'/ws/control' found $count times in server.py" -ForegroundColor $(if ($count -eq 3) { "Green" } else { "Red" })
if ($count -ne 3) {
    Write-Host "  Expected: 3 (decorator, health endpoint, docstring)" -ForegroundColor Red
}

# Check 3: CONTROL_STATE
Write-Host "`n[3/5] Checking CONTROL_STATE..." -ForegroundColor Yellow
$state = Select-String -Path server.py -Pattern 'CONTROL_STATE = defaultdict' | Select-Object -First 1
if ($state) {
    Write-Host "  ✅ CONTROL_STATE found" -ForegroundColor Green
    Write-Host "  $($state.Line.Trim())" -ForegroundColor Gray
} else {
    Write-Host "  ❌ CONTROL_STATE not found!" -ForegroundColor Red
}

# Check 4: Backend running
Write-Host "`n[4/5] Checking if backend is running..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "http://localhost:8000/health" -ErrorAction Stop
    Write-Host "  ✅ Backend is running" -ForegroundColor Green
    if ($response.endpoints.control_ws -eq "/ws/control") {
        Write-Host "  ✅ /ws/control listed in health endpoint" -ForegroundColor Green
    } else {
        Write-Host "  ❌ /ws/control NOT in health endpoint!" -ForegroundColor Red
        Write-Host "  Health response:" -ForegroundColor Red
        $response | ConvertTo-Json -Depth 3 | Write-Host
    }
} catch {
    Write-Host "  ❌ Backend not responding on port 8000" -ForegroundColor Red
    Write-Host "  Error: $($_.Exception.Message)" -ForegroundColor Red
}

# Check 5: WebSocket test
Write-Host "`n[5/5] Testing WebSocket connection..." -ForegroundColor Yellow
try {
    $test = python test_control_ws.py 2>&1
    if ($test -like "*All tests passed*") {
        Write-Host "  ✅ WebSocket test PASSED" -ForegroundColor Green
    } else {
        Write-Host "  ❌ WebSocket test FAILED" -ForegroundColor Red
        Write-Host "  Output:" -ForegroundColor Red
        $test | Write-Host
    }
} catch {
    Write-Host "  ❌ Could not run test_control_ws.py" -ForegroundColor Red
    Write-Host "  Make sure backend is running first" -ForegroundColor Yellow
}

Write-Host "`n=== Summary ===" -ForegroundColor Cyan
Write-Host "If all checks passed, /ws/control is working correctly." -ForegroundColor Green
Write-Host "If any failed, see DIAGNOSTIC_STEPS.md for detailed troubleshooting." -ForegroundColor Yellow
Write-Host ""
