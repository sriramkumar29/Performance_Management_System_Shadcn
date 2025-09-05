#!/usr/bin/env python3
"""
Verification script for employee test fixes
"""
import subprocess
import sys
import os

def run_tests():
    """Run the employee tests and capture output"""
    try:
        # Change to the backend directory
        os.chdir(r'c:\GitHub\Performance_Management_System\backend')
        
        # Run pytest with verbose output
        result = subprocess.run([
            sys.executable, '-m', 'pytest', 'test_employees.py', '-v', '--tb=short'
        ], capture_output=True, text=True, timeout=60)
        
        print("STDOUT:")
        print(result.stdout)
        print("\nSTDERR:")
        print(result.stderr)
        print(f"\nReturn code: {result.returncode}")
        
        return result.returncode == 0
        
    except subprocess.TimeoutExpired:
        print("Test execution timed out")
        return False
    except Exception as e:
        print(f"Error running tests: {e}")
        return False

if __name__ == "__main__":
    success = run_tests()
    if success:
        print("\n✓ All tests passed!")
    else:
        print("\n✗ Some tests failed.")