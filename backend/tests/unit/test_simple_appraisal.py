#!/usr/bin/env python3
"""
Simple test to verify appraisal test fixes
"""
import subprocess
import sys

def run_single_test():
    """Run a single appraisal test to verify fixes"""
    try:
        result = subprocess.run([
            sys.executable, '-m', 'pytest', 
            'test_appraisals.py::TestAppraisalsRouter::test_get_appraisal_by_id_not_found', 
            '-v'
        ], capture_output=True, text=True, timeout=30)
        
        print("STDOUT:")
        print(result.stdout)
        print("\nSTDERR:")
        print(result.stderr)
        print(f"\nReturn code: {result.returncode}")
        
        return result.returncode == 0
        
    except Exception as e:
        print(f"Error: {e}")
        return False

if __name__ == "__main__":
    success = run_single_test()
    if success:
        print("\n✓ Test passed!")
    else:
        print("\n✗ Test failed.")