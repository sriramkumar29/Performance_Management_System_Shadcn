#!/usr/bin/env python3
"""
Test runner for auth tests
"""
import subprocess
import sys

def run_auth_tests():
    """Run auth tests and show results"""
    try:
        result = subprocess.run([
            sys.executable, '-m', 'pytest', 'test_auth.py', '-v', '--tb=short'
        ], capture_output=True, text=True, timeout=60)
        
        print("STDOUT:")
        print(result.stdout)
        if result.stderr:
            print("\nSTDERR:")
            print(result.stderr)
        print(f"\nReturn code: {result.returncode}")
        
        # Count results
        lines = result.stdout.split('\n')
        for line in lines:
            if 'failed' in line or 'passed' in line:
                if '=' in line:
                    print(f"\nSUMMARY: {line}")
                    break
        
        return result.returncode == 0
        
    except Exception as e:
        print(f"Error: {e}")
        return False

if __name__ == "__main__":
    success = run_auth_tests()
    if success:
        print("\n🎉 ALL AUTH TESTS PASSED!")
    else:
        print("\n❌ Some auth tests failed.")