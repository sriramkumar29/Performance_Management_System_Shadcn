"""
Seed test database with minimal data for integration testing.
Run this after creating the test database schema.
"""
import asyncio
import os
from datetime import date, timedelta
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
import bcrypt

# Set test environment BEFORE importing any app modules
os.environ["APP_ENV"] = "test"

# Import config after setting environment
from app.core.config import settings
from app.db.database import Base

# Import all models first to ensure they're registered before any relationships are configured
from app.models.employee import Employee
from app.models.appraisal import Appraisal  # Import Appraisal to register the class
from app.models.appraisal_type import AppraisalType
from app.models.goal import Category, GoalTemplate, Goal, AppraisalGoal

# Create test engine and session
test_engine = create_async_engine(settings.DATABASE_URL, echo=False)
TestSessionLocal = sessionmaker(test_engine, class_=AsyncSession, expire_on_commit=False)

def hash_password(password: str) -> str:
    """Hash password using bcrypt."""
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

async def seed_test_data():
    """Seed the test database with minimal data for integration tests."""
    # First ensure schema exists
    print("Creating database schema if needed...")
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print("✅ Schema ready")
    
    # Handle truncation with separate session to avoid transaction issues
    print("Clearing existing test data...")
    
    # List of tables to truncate in correct order (child tables first, then parent tables)
    tables_to_truncate = [
        "appraisal_goals",
        "goals", 
        "goal_templates",
        "categories",
        "appraisals",
        "appraisal_types",
        "employees"
    ]
    
    # Only truncate tables that exist - handle errors gracefully
    for table_name in tables_to_truncate:
        try:
            async with TestSessionLocal() as truncate_session:
                async with truncate_session.begin():
                    await truncate_session.execute(text(f"TRUNCATE TABLE {table_name} RESTART IDENTITY CASCADE"))
                    print(f"  ✅ Cleared {table_name}")
        except Exception as e:
            if "does not exist" in str(e):
                print(f"  ⚠️  Table {table_name} does not exist, skipping")
            else:
                print(f"  ⚠️  Could not clear {table_name}: {str(e)}")
    
    print("✅ Existing data cleared")
    
    # Use fresh session for seeding
    async with TestSessionLocal() as session:
        async with session.begin():
            print("Seeding test database...")
            
            # Create test employee (CEO for full permissions)
            print("Creating test employee...")
            test_password = hash_password("password123")
            
            ceo = Employee(
                emp_name="John CEO",
                emp_email="john.ceo@example.com",
                emp_department="Executive",
                emp_roles="CEO",
                emp_roles_level=9,
                emp_reporting_manager_id=None,
                emp_status=True,
                emp_password=test_password
            )
            session.add(ceo)
            await session.flush()
            
            # Create a manager for testing hierarchy
            manager = Employee(
                emp_name="Test Manager",
                emp_email="test.manager@example.com",
                emp_department="Engineering",
                emp_roles="Manager",
                emp_roles_level=5,
                emp_reporting_manager_id=ceo.emp_id,
                emp_status=True,
                emp_password=test_password
            )
            session.add(manager)
            await session.flush()
            
            # Create a developer
            developer = Employee(
                emp_name="Test Developer",
                emp_email="test.dev@example.com",
                emp_department="Engineering",
                emp_roles="Developer",
                emp_roles_level=2,
                emp_reporting_manager_id=manager.emp_id,
                emp_status=True,
                emp_password=test_password
            )
            session.add(developer)
            await session.flush()
            
            print(f"Created 3 test employees")
            
            # Create appraisal types
            print("Creating appraisal types...")
            appraisal_types = [
                AppraisalType(name="Annual", has_range=False),
                AppraisalType(name="Half-yearly", has_range=True),
                AppraisalType(name="Quarterly", has_range=True)
            ]
            session.add_all(appraisal_types)
            await session.flush()
            print(f"Created {len(appraisal_types)} appraisal types")
            
            # Create categories
            print("Creating goal categories...")
            categories = [
                Category(name="Technical Skills"),
                Category(name="Communication"),
                Category(name="Leadership"),
                Category(name="Project Management")
            ]
            session.add_all(categories)
            await session.flush()
            print(f"Created {len(categories)} categories")
            
            # Create goal templates
            print("Creating goal templates...")
            goal_templates = [
                GoalTemplate(
                    temp_title="Code Quality",
                    temp_description="Write clean, maintainable code with proper documentation",
                    temp_performance_factor="Technical Excellence",
                    temp_importance="High",
                    temp_weightage=30
                ),
                GoalTemplate(
                    temp_title="Team Collaboration",
                    temp_description="Work effectively with team members and contribute to team goals",
                    temp_performance_factor="Teamwork",
                    temp_importance="High",
                    temp_weightage=25
                ),
                GoalTemplate(
                    temp_title="Project Delivery",
                    temp_description="Deliver projects on time and within scope",
                    temp_performance_factor="Delivery Excellence",
                    temp_importance="High",
                    temp_weightage=35
                ),
                GoalTemplate(
                    temp_title="Innovation",
                    temp_description="Propose and implement innovative solutions",
                    temp_performance_factor="Innovation",
                    temp_importance="Medium",
                    temp_weightage=10
                )
            ]
            
            session.add_all(goal_templates)
            await session.flush()  # Get IDs
            print(f"Created {len(goal_templates)} goal templates")
            
            # Note: Category associations can be added later via API if needed
            # For now, we have the basic data structure ready for testing
            
            print("✅ Test data seeding completed!")

if __name__ == "__main__":
    asyncio.run(seed_test_data())
