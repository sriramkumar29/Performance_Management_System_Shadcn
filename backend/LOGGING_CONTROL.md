# Logging Control Guide

## Overview

The application's logging system can be controlled via environment variables, allowing you to enable/disable logging and adjust log levels without changing code.

## Environment Variables

### LOGGING_ENABLED

Controls whether logging is active or disabled.

**Values:**

- `true`, `1`, `yes` - Logging is enabled
- `false`, `0`, `no` - Logging is disabled (all logs suppressed)

**Default:** `true`

**Example:**

```bash
LOGGING_ENABLED=true  # Enable logging
LOGGING_ENABLED=false # Disable logging
```

### LOG_LEVEL

Sets the minimum log level for the application.

**Values:**

- `DEBUG` - Most verbose (all logs)
- `INFO` - General information
- `WARNING` - Warnings only
- `ERROR` - Errors only
- `CRITICAL` - Critical errors only

**Default:** `INFO`

**Example:**

```bash
LOG_LEVEL=DEBUG    # Show all logs
LOG_LEVEL=INFO     # Show info and above
LOG_LEVEL=ERROR    # Show only errors
```

## Configuration Files

The logging settings are configured in your environment files:

### `.env.development` (Development)

```bash
LOGGING_ENABLED=true
LOG_LEVEL=INFO
```

### `.env.test` (Testing)

```bash
LOGGING_ENABLED=false  # Disable logs during tests
LOG_LEVEL=ERROR        # Only critical errors
```

### `.env.production` (Production)

```bash
LOGGING_ENABLED=true
LOG_LEVEL=WARNING      # Production typically uses WARNING or ERROR
```

## How to Enable/Disable Logging

### Method 1: Edit Environment File

1. Open the appropriate `.env` file (`.env.development`, `.env.test`, etc.)
2. Change `LOGGING_ENABLED` value:
   ```bash
   LOGGING_ENABLED=false  # To disable
   LOGGING_ENABLED=true   # To enable
   ```
3. Restart the application

### Method 2: Set Environment Variable

**PowerShell:**

```powershell
# Disable logging
$env:LOGGING_ENABLED = "false"
python -m uvicorn main:app --reload --port 7000

# Enable logging
$env:LOGGING_ENABLED = "true"
python -m uvicorn main:app --reload --port 7000
```

**Bash/Linux:**

```bash
# Disable logging
export LOGGING_ENABLED=false
python -m uvicorn main:app --reload --port 7000

# Enable logging
export LOGGING_ENABLED=true
python -m uvicorn main:app --reload --port 7000
```

### Method 3: Inline Environment Variable

**PowerShell:**

```powershell
$env:LOGGING_ENABLED="false"; $env:LOG_LEVEL="ERROR"; python -m uvicorn main:app --reload --port 7000
```

**Bash/Linux:**

```bash
LOGGING_ENABLED=false LOG_LEVEL=ERROR python -m uvicorn main:app --reload --port 7000
```

## Log Files

When logging is enabled, logs are written to:

| File                | Purpose                  | Level  |
| ------------------- | ------------------------ | ------ |
| `logs/app.log`      | General application logs | DEBUG+ |
| `logs/database.log` | Database operations      | DEBUG+ |
| `logs/errors.log`   | Error logs only          | ERROR+ |
| `logs/requests.log` | HTTP request logs        | INFO+  |

**Note:** Log files are overwritten on each application restart (no rotation).

## Status Messages

When the application starts, you'll see:

**Logging Enabled:**

```
✅ Logging ENABLED successfully. Log level: INFO
```

**Logging Disabled:**

```
⚠️  Logging is DISABLED via environment variable
```

## Common Use Cases

### Development

```bash
LOGGING_ENABLED=true
LOG_LEVEL=DEBUG
```

See all logs for debugging.

### Testing

```bash
LOGGING_ENABLED=false
LOG_LEVEL=ERROR
```

Suppress logs during test runs for cleaner output.

### Production

```bash
LOGGING_ENABLED=true
LOG_LEVEL=WARNING
```

Only log warnings and errors in production.

### Debugging Production Issues

```bash
LOGGING_ENABLED=true
LOG_LEVEL=DEBUG
```

Temporarily enable verbose logging (restart required).

## Troubleshooting

### Logs Still Appearing When Disabled

1. Check environment variable is set correctly:

   ```powershell
   echo $env:LOGGING_ENABLED
   ```

2. Ensure you restarted the application after changing `.env` file

3. Verify the correct `.env` file is being loaded based on `APP_ENV`

### Log Level Not Working

1. Check `LOG_LEVEL` is uppercase: `INFO`, not `info`

2. Valid values: `DEBUG`, `INFO`, `WARNING`, `ERROR`, `CRITICAL`

3. Restart application after changes

### No Log Files Created

1. Ensure `LOGGING_ENABLED=true`

2. Check `logs/` directory exists (created automatically)

3. Verify file permissions

## Best Practices

✅ **DO:**

- Use `LOGGING_ENABLED=false` during tests
- Use `LOG_LEVEL=DEBUG` for local development
- Use `LOG_LEVEL=WARNING` or `ERROR` in production
- Document any logging changes

❌ **DON'T:**

- Leave `LOG_LEVEL=DEBUG` in production (performance impact)
- Disable logging in production (unless temporarily debugging)
- Commit `.env` files with sensitive data

## Quick Reference

```bash
# Development: Full logging
LOGGING_ENABLED=true
LOG_LEVEL=DEBUG

# Production: Warnings and errors only
LOGGING_ENABLED=true
LOG_LEVEL=WARNING

# Testing: No logs
LOGGING_ENABLED=false
LOG_LEVEL=ERROR

# Debugging: Everything
LOGGING_ENABLED=true
LOG_LEVEL=DEBUG
```

---

**Updated:** October 8, 2025
