#!/usr/bin/env python3
"""
Check test database configuration and content
"""
import os
import sys

# Set test environment
os.environ["APP_ENV"] = "test"

# Add current directory to Python path
sys.path.insert(0, os.getcwd())

print(f"APP_ENV: {os.environ.get('APP_ENV', 'not set')}")

try:
    from app.database import database_url
    print(f"Database URL: {database_url}")
    
    from app.database import SessionLocal
    from app.models.goals import GoalTemplate
    
    print("\n🔍 Connecting to database...")
    db = SessionLocal()
    
    try:
        templates = db.query(GoalTemplate).all()
        print(f"📊 Found {len(templates)} goal templates")
        
        if templates:
            print("\n📋 Templates found:")
            for i, template in enumerate(templates[:10], 1):
                print(f"  {i}. {template.temp_name} ({template.temp_weightage}%)")
        else:
            print("❌ No templates found!")
            
        # Also check if the table exists
        from sqlalchemy import text
        result = db.execute(text("SELECT COUNT(*) FROM goal_templates"))
        count = result.scalar()
        print(f"\n📊 Direct count from goal_templates table: {count}")
            
    finally:
        db.close()
        
except Exception as e:
    print(f"❌ Error: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)
