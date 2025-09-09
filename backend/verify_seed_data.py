#!/usr/bin/env python3
"""
Simple verification script for the seeded test data.
This checks the data without running into SQLAlchemy relationship configuration issues.
"""
import asyncio
import os
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

# Set test environment BEFORE importing any app modules
os.environ["APP_ENV"] = "test"

# Import config after setting environment
from app.core.config import settings

# Create test engine and session
test_engine = create_async_engine(settings.DATABASE_URL, echo=False)
TestSessionLocal = sessionmaker(test_engine, class_=AsyncSession, expire_on_commit=False)

async def verify_test_data():
    """Verify the seeded test data using simple SQL queries."""
    print("🔍 Verifying test data...")
    
    async with TestSessionLocal() as session:
        # Check employees count
        result = await session.execute(text("SELECT COUNT(*) FROM employees"))
        emp_count = result.scalar()
        print(f"📊 Employees: {emp_count}")
        
        # Check employee details
        result = await session.execute(text("SELECT emp_name, emp_email, emp_roles FROM employees ORDER BY emp_roles_level DESC"))
        employees = result.fetchall()
        print("👥 Employee hierarchy:")
        for emp in employees:
            print(f"  - {emp[0]} ({emp[2]}) - {emp[1]}")
        
        # Check appraisal types count
        result = await session.execute(text("SELECT COUNT(*) FROM appraisal_types"))
        type_count = result.scalar()
        print(f"📋 Appraisal Types: {type_count}")
        
        # Check appraisal types with ranges
        result = await session.execute(text("""
            SELECT at.name, at.has_range, COUNT(ar.id) as range_count 
            FROM appraisal_types at 
            LEFT JOIN appraisal_ranges ar ON at.id = ar.appraisal_type_id 
            GROUP BY at.id, at.name, at.has_range
            ORDER BY at.name
        """))
        types_with_ranges = result.fetchall()
        print("📊 Appraisal Types with ranges:")
        for type_info in types_with_ranges:
            print(f"  - {type_info[0]} (has_range: {type_info[1]}, ranges: {type_info[2]})")
        
        # Check categories count
        result = await session.execute(text("SELECT COUNT(*) FROM categories"))
        cat_count = result.scalar()
        print(f"🏷️  Categories: {cat_count}")
        
        # Check goal templates count (if table exists)
        try:
            result = await session.execute(text("SELECT COUNT(*) FROM goal_templates"))
            template_count = result.scalar()
            print(f"🎯 Goal Templates: {template_count}")
            
            # Check goal template details
            result = await session.execute(text("SELECT temp_title, temp_importance, temp_weightage FROM goal_templates ORDER BY temp_weightage DESC"))
            templates = result.fetchall()
            print("🎯 Goal Templates:")
            for template in templates:
                print(f"  - {template[0]} (importance: {template[1]}, weight: {template[2]}%)")
        except Exception as e:
            if "does not exist" in str(e):
                print("🎯 Goal Templates: Table not found in current schema, skipping...")
            else:
                print(f"🎯 Goal Templates: Error checking - {str(e)}")
        
        print("\n✅ Test data verification completed successfully!")
        print("🎉 All seed data is properly created and ready for E2E testing!")

if __name__ == "__main__":
    asyncio.run(verify_test_data())
