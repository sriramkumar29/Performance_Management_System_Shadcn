# Logging Control Test Script
# This script demonstrates how to control logging via environment variables

Write-Host "`n=== Logging Control Test ===" -ForegroundColor Cyan
Write-Host "This script will test enabling/disabling logging`n" -ForegroundColor Cyan

# Test 1: Check current environment settings
Write-Host "1. Current Environment Settings:" -ForegroundColor Yellow
Write-Host "   LOGGING_ENABLED: $env:LOGGING_ENABLED"
Write-Host "   LOG_LEVEL: $env:LOG_LEVEL`n"

# Test 2: Enable logging with DEBUG level
Write-Host "2. Testing: Logging ENABLED with DEBUG level" -ForegroundColor Green
Write-Host "   Command: Set LOGGING_ENABLED=true and LOG_LEVEL=DEBUG"
Write-Host "   You should see: '✅ Logging ENABLED successfully. Log level: DEBUG'`n"

# Test 3: Disable logging
Write-Host "3. Testing: Logging DISABLED" -ForegroundColor Red
Write-Host "   Command: Set LOGGING_ENABLED=false"
Write-Host "   You should see: '⚠️  Logging is DISABLED via environment variable'`n"

# Test 4: Enable with WARNING level
Write-Host "4. Testing: Logging ENABLED with WARNING level" -ForegroundColor Yellow
Write-Host "   Command: Set LOGGING_ENABLED=true and LOG_LEVEL=WARNING"
Write-Host "   You should see: '✅ Logging ENABLED successfully. Log level: WARNING'`n"

# Instructions
Write-Host "=== How to Test ===" -ForegroundColor Cyan
Write-Host "
To test different configurations, edit .env.development file:

# Enable logging with INFO level (DEFAULT)
LOGGING_ENABLED=true
LOG_LEVEL=INFO

# Disable all logging
LOGGING_ENABLED=false
LOG_LEVEL=ERROR

# Enable with DEBUG level (most verbose)
LOGGING_ENABLED=true
LOG_LEVEL=DEBUG

# Enable with WARNING level (production mode)
LOGGING_ENABLED=true
LOG_LEVEL=WARNING

After editing, restart the server:
  Ctrl+C to stop
  python -m uvicorn main:app --reload --port 7000

Or use inline environment variables:
  `$env:LOGGING_ENABLED=`"false`"; python -m uvicorn main:app --reload --port 7000
" -ForegroundColor White

Write-Host "=== Quick Commands ===" -ForegroundColor Cyan
Write-Host "
# Disable logging temporarily
`$env:LOGGING_ENABLED=`"false`"; python -m uvicorn main:app --reload --port 7000

# Enable with DEBUG
`$env:LOGGING_ENABLED=`"true`"; `$env:LOG_LEVEL=`"DEBUG`"; python -m uvicorn main:app --reload --port 7000

# Enable with WARNING (production)
`$env:LOGGING_ENABLED=`"true`"; `$env:LOG_LEVEL=`"WARNING`"; python -m uvicorn main:app --reload --port 7000
" -ForegroundColor Green

Write-Host "`nFor full documentation, see: backend/LOGGING_CONTROL.md" -ForegroundColor Cyan
Write-Host "==============================================`n" -ForegroundColor Cyan
