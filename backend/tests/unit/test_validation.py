"""
Simple test script to verify ID validation.

This script helps test the validation improvements for employee_id and appraisal_id endpoints.
"""

import requests
import json


def test_employee_endpoints():
    """Test employee endpoints with various ID formats."""
    base_url = "http://localhost:8000/api"
    
    # Test cases for employee_id validation
    test_cases = [
        ("1", "Valid integer ID"),
        ("abc", "Invalid string ID"),
        ("0", "Zero ID (should fail)"),
        ("-1", "Negative ID (should fail)"),
        ("1.5", "Float ID (should fail)"),
        ("", "Empty ID (should fail)"),
        ("999999", "Non-existent ID (should return 404)"),
    ]
    
    print("🧪 Testing Employee ID Validation:")
    print("=" * 50)
    
    for test_id, description in test_cases:
        url = f"{base_url}/employees/{test_id}"
        print(f"\n📋 Test: {description}")
        print(f"🔗 URL: {url}")
        
        try:
            # Note: This will fail without proper authentication, but we're testing validation
            response = requests.get(url, timeout=5)
            print(f"📊 Status: {response.status_code}")
            if response.status_code == 422:
                error_data = response.json()
                print(f"❌ Validation Error:")
                print(json.dumps(error_data, indent=2))
            elif response.status_code == 404:
                print(f"❌ Not Found (Expected for non-existent IDs)")
            elif response.status_code == 401:
                print(f"🔒 Unauthorized (Expected - need authentication)")
            else:
                print(f"📄 Response: {response.text[:200]}...")
                
        except requests.exceptions.RequestException as e:
            print(f"🚫 Request failed: {e}")
        
        print("-" * 30)


if __name__ == "__main__":
    print("🚀 Starting validation tests...")
    print("Note: Make sure the FastAPI server is running on localhost:8000")
    print()
    
    try:
        test_employee_endpoints()
    except KeyboardInterrupt:
        print("\n⚠️ Tests interrupted by user")
    except Exception as e:
        print(f"\n❌ Test failed with error: {e}")
    
    print("\n✅ Validation tests completed!")