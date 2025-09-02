# Integration Testing Execution Script
# This script sets up and runs the complete integration testing workflow

Write-Host "🔧 Performance Management System - Integration Testing" -ForegroundColor Cyan
Write-Host "=================================================" -ForegroundColor Cyan

# Check if virtual environment exists
if (-not (Test-Path "backend\.venv\Scripts\Activate.ps1")) {
    Write-Host "❌ Virtual environment not found in backend\.venv\" -ForegroundColor Red
    Write-Host "Please create virtual environment first:" -ForegroundColor Yellow
    Write-Host "cd backend && python -m venv .venv && .\.venv\Scripts\Activate.ps1 && pip install -r requirements.txt" -ForegroundColor Yellow
    exit 1
}

# Step 1: Setup Test Database
Write-Host "`n📊 Step 1: Setting up test database..." -ForegroundColor Green
Set-Location backend
& .\.venv\Scripts\Activate.ps1
$env:APP_ENV = "test"

Write-Host "Creating test database and schema..." -ForegroundColor Yellow
python create_test_db.py

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Test database creation failed" -ForegroundColor Red
    exit 1
}

Write-Host "Seeding test data..." -ForegroundColor Yellow
python seed_test_data.py

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Test data seeding failed" -ForegroundColor Red
    exit 1
}

# Step 2: Run Backend Integration Tests
Write-Host "`n🧪 Step 2: Running backend integration tests..." -ForegroundColor Green
pytest -m integration -v --tb=short

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Backend integration tests failed" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Backend integration tests passed!" -ForegroundColor Green

# Step 3: Frontend Integration Tests
Write-Host "`n🌐 Step 3: Preparing frontend integration tests..." -ForegroundColor Green
Set-Location ..\frontend

# Check if node_modules exists
if (-not (Test-Path "node_modules")) {
    Write-Host "Installing frontend dependencies..." -ForegroundColor Yellow
    npm install
}

Write-Host "`n🚀 Starting test backend server..." -ForegroundColor Yellow
Write-Host "Backend will run on http://localhost:7001" -ForegroundColor Cyan

# Start backend in background
$backendJob = Start-Job -ScriptBlock {
    Set-Location $using:PWD\..\backend
    & .\.venv\Scripts\Activate.ps1
    $env:APP_ENV = "test"
    python run_test_server.py
}

# Wait for backend to be ready
Write-Host "Waiting for backend to start..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

# Test backend connectivity
try {
    $response = Invoke-WebRequest -Uri "http://localhost:7001/" -TimeoutSec 10
    Write-Host "✅ Backend is ready!" -ForegroundColor Green
} catch {
    Write-Host "❌ Backend failed to start" -ForegroundColor Red
    Stop-Job $backendJob
    Remove-Job $backendJob
    exit 1
}

# Run frontend integration tests
Write-Host "`n🧪 Running frontend integration tests..." -ForegroundColor Green
npm run test:integration

$frontendResult = $LASTEXITCODE

# Cleanup: Stop backend server
Write-Host "`n🧹 Cleaning up..." -ForegroundColor Yellow
Stop-Job $backendJob
Remove-Job $backendJob

if ($frontendResult -ne 0) {
    Write-Host "❌ Frontend integration tests failed" -ForegroundColor Red
    exit 1
}

Write-Host "`n✅ All integration tests passed!" -ForegroundColor Green
Write-Host "=================================================" -ForegroundColor Cyan
Write-Host "Integration testing complete! 🎉" -ForegroundColor Cyan
