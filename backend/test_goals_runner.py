#!/usr/bin/env python3
"""
Test runner for goals tests
"""
import subprocess
import sys

def run_goals_tests():
    """Run goals tests and show results"""
    try:
        result = subprocess.run([
            sys.executable, '-m', 'pytest', 'test_goals.py', '-v', '--tb=short'
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
    success = run_goals_tests()
    if success:
        print("\n🎉 ALL GOALS TESTS PASSED!")
    else:
        print("\n❌ Some goals tests failed.")