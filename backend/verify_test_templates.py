#!/usr/bin/env python3
"""
Quick script to verify test database has goal templates
"""
import os
import sys

# Set test environment
os.environ["APP_ENV"] = "test"

# Add current directory to Python path
sys.path.insert(0, os.getcwd())

try:
    from app.database import SessionLocal
    from app.models.goals import GoalTemplate
    
    print("🔍 Connecting to test database...")
    db = SessionLocal()
    
    try:
        templates = db.query(GoalTemplate).all()
        print(f"📊 Found {len(templates)} goal templates in test database")
        
        if templates:
            print("\n📋 First 5 templates:")
            for i, template in enumerate(templates[:5], 1):
                print(f"  {i}. {template.temp_name} ({template.temp_weightage}%)")
        else:
            print("❌ No templates found in test database!")
            
    finally:
        db.close()
        
except Exception as e:
    print(f"❌ Error: {e}")
    sys.exit(1)
