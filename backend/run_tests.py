#!/usr/bin/env python3
"""
Test runner script for organized backend tests.
This script provides convenient commands to run different test categories.
"""

import subprocess
import sys
import argparse
from pathlib import Path

def run_command(command, description):
    """Run a command and print the result."""
    print(f"\n{'='*60}")
    print(f"Running: {description}")
    print(f"Command: {' '.join(command)}")
    print('='*60)
    
    try:
        result = subprocess.run(command, check=True, capture_output=False)
        print(f"\n✅ {description} completed successfully!")
        return True
    except subprocess.CalledProcessError as e:
        print(f"\n❌ {description} failed with exit code {e.returncode}")
        return False

def main():
    parser = argparse.ArgumentParser(description="Run organized backend tests")
    parser.add_argument('category', choices=['all', 'unit', 'integration', 'utils'], 
                       help='Test category to run')
    parser.add_argument('--verbose', '-v', action='store_true', 
                       help='Verbose output')
    parser.add_argument('--coverage', '-c', action='store_true', 
                       help='Run with coverage report')
    
    args = parser.parse_args()
    
    # Base command
    cmd = ['python', '-m', 'pytest']
    
    # Add verbosity
    if args.verbose:
        cmd.append('-v')
    
    # Add coverage
    if args.coverage:
        cmd.extend(['--cov=app', '--cov-report=html', '--cov-report=term'])
    
    # Add test path based on category
    if args.category == 'all':
        cmd.append('tests/')
        description = "All Tests"
    elif args.category == 'unit':
        cmd.append('tests/unit/')
        description = "Unit Tests"
    elif args.category == 'integration':
        cmd.append('tests/integration/')
        description = "Integration Tests"
    elif args.category == 'utils':
        cmd.append('tests/utils/')
        description = "Utility Tests"
    
    # Run the tests
    success = run_command(cmd, description)
    
    if success:
        print(f"\n🎉 All {description.lower()} passed!")
    else:
        print(f"\n💥 Some {description.lower()} failed!")
        sys.exit(1)

if __name__ == "__main__":
    main()