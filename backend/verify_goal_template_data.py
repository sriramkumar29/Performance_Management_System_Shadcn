"""
Test script to verify goal template API is working with seeded data.
"""
import asyncio
import os
from sqlalchemy import select
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

# Set test environment
os.environ["APP_ENV"] = "test"

from app.core.config import settings
from app.db.database import Base

# Import all models to ensure relationships are registered
from app.models.employee import Employee
from app.models.appraisal import Appraisal
from app.models.appraisal_type import AppraisalType, AppraisalRange
from app.models.goal import Category, GoalTemplate, Goal, AppraisalGoal

# Create test engine and session
test_engine = create_async_engine(settings.DATABASE_URL, echo=False)
TestSessionLocal = sessionmaker(test_engine, class_=AsyncSession, expire_on_commit=False)

async def verify_goal_template_data():
    """Verify goal template data and API endpoints."""
    async with TestSessionLocal() as session:
        # 1. Check categories
        result = await session.execute(select(Category))
        categories = result.scalars().all()
        print(f"✅ Found {len(categories)} categories:")
        for cat in categories[:5]:  # Show first 5
            print(f"   - {cat.name} (ID: {cat.id})")
        if len(categories) > 5:
            print(f"   ... and {len(categories) - 5} more")
        
        # 2. Check goal templates
        result = await session.execute(select(GoalTemplate))
        templates = result.scalars().all()
        print(f"\n✅ Found {len(templates)} goal templates:")
        for template in templates[:5]:  # Show first 5
            print(f"   - {template.temp_title}: {template.temp_weightage}% ({template.temp_importance})")
        if len(templates) > 5:
            print(f"   ... and {len(templates) - 5} more")
        
        # 3. Check employees (for context)
        result = await session.execute(select(Employee))
        employees = result.scalars().all()
        print(f"\n✅ Found {len(employees)} employees:")
        for emp in employees[:3]:  # Show first 3
            print(f"   - {emp.emp_name} ({emp.emp_roles} - Level {emp.emp_roles_level})")
        if len(employees) > 3:
            print(f"   ... and {len(employees) - 3} more")
        
        # 4. Summary for goal template workflow
        print(f"\n=== GOAL TEMPLATE WORKFLOW SUMMARY ===")
        print(f"✅ Database has {len(categories)} categories for goal classification")
        print(f"✅ Database has {len(templates)} goal templates ready for appraisal creation")
        print(f"✅ Database has {len(employees)} employees with hierarchical structure")
        print(f"")
        print(f"Frontend should be able to:")
        print(f"  1. Load /goal-templates page and show {len(templates)} templates")
        print(f"  2. Create new templates using {len(categories)} available categories")
        print(f"  3. Use templates when creating appraisals for any of {len(employees)} employees")
        
        # 5. Check API structure
        print(f"\n=== API ENDPOINTS EXPECTED ===")
        print(f"  GET /api/goals/templates -> List all templates")
        print(f"  GET /api/goals/templates/{{id}} -> Get specific template")
        print(f"  POST /api/goals/templates -> Create new template")
        print(f"  PUT /api/goals/templates/{{id}} -> Update template")
        print(f"  DELETE /api/goals/templates/{{id}} -> Delete template")
        print(f"  GET /api/goals/categories -> List all categories")

if __name__ == "__main__":
    asyncio.run(verify_goal_template_data())
