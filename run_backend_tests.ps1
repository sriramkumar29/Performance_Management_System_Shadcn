# Backend Test Runner PowerShell Script
# Usage: .\run_backend_tests.ps1 [unit|integration|utils|all] [-Coverage] [-Verbose]

param(
    [Parameter(Position=0)]
    [ValidateSet("unit", "integration", "utils", "all")]
    [string]$Category = "all",
    
    [switch]$Coverage,
    [switch]$Verbose
)

Write-Host "🧪 Performance Management System - Backend Test Runner" -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan

# Navigate to backend directory
$BackendPath = Join-Path $PSScriptRoot "backend"
if (Test-Path $BackendPath) {
    Set-Location $BackendPath
} else {
    Write-Host "❌ Backend directory not found!" -ForegroundColor Red
    exit 1
}

# Build pytest command
$Command = @("python", "-m", "pytest")

# Add test path based on category
switch ($Category) {
    "unit" { 
        $Command += "tests/unit/"
        $Description = "Unit Tests"
    }
    "integration" { 
        $Command += "tests/integration/"
        $Description = "Integration Tests"
    }
    "utils" { 
        $Command += "tests/utils/"
        $Description = "Utility Tests"
    }
    "all" { 
        $Command += "tests/"
        $Description = "All Tests"
    }
}

# Add options
if ($Verbose) {
    $Command += "-v"
}

if ($Coverage) {
    $Command += @("--cov=app", "--cov-report=html", "--cov-report=term")
}

Write-Host "📂 Running: $Description" -ForegroundColor Yellow
Write-Host "💻 Command: $($Command -join ' ')" -ForegroundColor Gray
Write-Host ""

# Execute the command
try {
    & $Command[0] $Command[1..($Command.Length-1)]
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "✅ $Description completed successfully!" -ForegroundColor Green
    } else {
        Write-Host ""
        Write-Host "❌ $Description failed!" -ForegroundColor Red
        exit $LASTEXITCODE
    }
} catch {
    Write-Host "❌ Error running tests: $_" -ForegroundColor Red
    exit 1
}