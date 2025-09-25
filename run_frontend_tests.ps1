# Frontend Test Runner PowerShell Script
# Usage: .\run_frontend_tests.ps1 [unit|integration|e2e|all] [-Watch] [-Coverage] [-UI]

param(
    [Parameter(Position=0)]
    [ValidateSet("unit", "integration", "e2e", "all")]
    [string]$Category = "all",
    
    [switch]$Watch,
    [switch]$Coverage,
    [switch]$UI
)

Write-Host "🧪 Performance Management System - Frontend Test Runner" -ForegroundColor Cyan
Write-Host "===============================================" -ForegroundColor Cyan

# Navigate to frontend directory
$FrontendPath = Join-Path $PSScriptRoot "frontend"
if (Test-Path $FrontendPath) {
    Set-Location $FrontendPath
} else {
    Write-Host "❌ Frontend directory not found!" -ForegroundColor Red
    exit 1
}

# Build npm command based on category
switch ($Category) {
    "unit" { 
        $Command = @("npm", "run", "test:unit")
        $Description = "Unit Tests"
    }
    "integration" { 
        $Command = @("npm", "run", "test:integration")
        $Description = "Integration Tests"
    }
    "e2e" { 
        $Command = @("npm", "run", "test:e2e")
        $Description = "E2E Tests"
    }
    "all" { 
        if ($Coverage) {
            $Command = @("npm", "run", "test:coverage")
        } elseif ($UI) {
            $Command = @("npm", "run", "test:ui")
        } elseif ($Watch) {
            $Command = @("npm", "run", "test:watch")
        } else {
            $Command = @("npm", "run", "test")
        }
        $Description = "All Tests"
    }
}

# Add watch mode for unit/integration tests if requested
if ($Watch -and $Category -in @("unit", "integration")) {
    $Command += "--watch"
}

# Add UI mode for unit/integration tests if requested
if ($UI -and $Category -in @("unit", "integration")) {
    $Command += "--ui"
}

Write-Host "📂 Running: $Description" -ForegroundColor Yellow
if ($Watch) { Write-Host "👀 Watch mode enabled" -ForegroundColor Blue }
if ($Coverage) { Write-Host "📊 Coverage report enabled" -ForegroundColor Blue }
if ($UI) { Write-Host "🖥️ UI mode enabled" -ForegroundColor Blue }
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