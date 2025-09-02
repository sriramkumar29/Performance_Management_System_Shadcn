"""
Script to run FastAPI backend in test mode for integration testing.
Sets APP_ENV=test to use test database and port 7001.
"""
import os
import uvicorn

# Set test environment
os.environ["APP_ENV"] = "test"

if __name__ == "__main__":
    print("🚀 Starting FastAPI backend in TEST mode...")
    print("Database: performance_management_test")
    print("Port: 7001")
    print("Environment: test")
    print("\nPress Ctrl+C to stop the server")
    
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=7001,
        reload=True,
        log_level="info"
    )
