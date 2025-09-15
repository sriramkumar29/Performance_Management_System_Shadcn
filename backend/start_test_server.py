#!/usr/bin/env python3
"""
Test server startup script that forces test environment
"""
import os
import subprocess
import sys
from pathlib import Path

# Force test environment
os.environ["APP_ENV"] = "test"

# Print confirmation
print("🧪 Starting server in TEST mode")
print(f"APP_ENV: {os.environ.get('APP_ENV')}")

# Get the backend directory
backend_dir = Path(__file__).parent
print(f"Backend directory: {backend_dir}")

# Get the virtual environment Python
venv_python = backend_dir / ".venv" / "Scripts" / "python.exe"

if not venv_python.exists():
    print(f"❌ Virtual environment Python not found at: {venv_python}")
    sys.exit(1)

# Change to backend directory
os.chdir(backend_dir)
print(f"Changed working directory to: {os.getcwd()}")

# Start uvicorn with venv python
try:
    subprocess.run([
        str(venv_python), "-m", "uvicorn", 
        "main:app", 
        "--reload", 
        "--port", "7001"
    ], check=True)
except KeyboardInterrupt:
    print("\n🛑 Test server stopped")
except Exception as e:
    print(f"❌ Error starting server: {e}")
