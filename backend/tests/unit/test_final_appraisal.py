#!/usr/bin/env python3
"""
Final test to verify all appraisal tests pass
"""
import subprocess
import sys

def run_all_tests():
    """Run all appraisal tests"""
    try:
        result = subprocess.run([
            sys.executable, '-m', 'pytest', 'test_appraisals.py', '-v', '--tb=short'
        ], capture_output=True, text=True, timeout=60)
        
        print("STDOUT:")
        print(result.stdout)
        if result.stderr:
            print("\nSTDERR:")
            print(result.stderr)
        print(f"\nReturn code: {result.returncode}")
        
        # Count passed/failed
        lines = result.stdout.split('\n')
        for line in lines:
            if 'failed' in line and 'passed' in line:
                print(f"\nSUMMARY: {line}")
                break
        
        return result.returncode == 0
        
    except Exception as e:
        print(f"Error: {e}")
        return False

if __name__ == "__main__":
    success = run_all_tests()
    if success:
        print("\n🎉 ALL APPRAISAL TESTS PASSED!")
    else:
        print("\n❌ Some tests still failing.")