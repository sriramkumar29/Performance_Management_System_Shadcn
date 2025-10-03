#!/usr/bin/env python3
"""
Script to fix @log_execution_time decorator usage.
Changes @log_execution_time to @log_execution_time() in service files.
"""

import os
import glob

def fix_decorators_in_file(filepath):
    """Fix decorator usage in a single file."""
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Replace the problematic decorator usage
        original_content = content
        content = content.replace('    @log_execution_time\n', '    @log_execution_time()\n')
        
        if content != original_content:
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(content)
            print(f"Fixed decorators in: {filepath}")
            return True
        else:
            print(f"No changes needed in: {filepath}")
            return False
    except Exception as e:
        print(f"Error processing {filepath}: {e}")
        return False

def main():
    """Main function to fix all service files."""
    # Find all service files
    service_files = glob.glob('app/services/*.py')
    
    fixed_count = 0
    total_count = len(service_files)
    
    print(f"Found {total_count} service files to check...")
    
    for service_file in service_files:
        if fix_decorators_in_file(service_file):
            fixed_count += 1
    
    print(f"\nCompleted! Fixed {fixed_count} out of {total_count} files.")

if __name__ == "__main__":
    main()