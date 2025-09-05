#!/usr/bin/env python3

import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

try:
    from fastapi.testclient import TestClient
    from main import app
    
    client = TestClient(app)
    
    # Test without any mocking first
    response = client.get("/")
    print(f"Root endpoint status: {response.status_code}")
    print(f"Root response: {response.text}")
    
    # Test goals endpoint without auth (should fail)
    response = client.get("/api/goals/templates")
    print(f"Goals templates status: {response.status_code}")
    print(f"Goals templates response: {response.text}")
    
except Exception as e:
    print(f"Error: {e}")
    import traceback
    traceback.print_exc()