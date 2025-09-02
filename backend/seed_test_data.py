"""
Seed test database with minimal data for integration testing.
Run this after creating the test database schema.
"""
import asyncio
import os
from datetime import date, timedelta
from sqlalchemy import select
from app.db.database import async_session
from app.models.employee import Employee
from app.models.appraisal_type import AppraisalType
from app.models.goal import Category, GoalTemplate
from passlib.context import CryptContext

# Set test environment
os.environ["APP_ENV"] = "test"

# Password hashing context
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

async def seed_test_data():
    """Seed the test database with minimal data for integration tests."""
    async with async_session() as session:
        async with session.begin():
            print("Seeding test database...")
            
            # Create test employee (CEO for full permissions)
            print("Creating test employee...")
            test_password = pwd_context.hash("password123")
            
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
            templates = [
                GoalTemplate(
                    temp_title="Code Quality",
                    temp_description="Maintain high code quality standards",
                    temp_performance_factor="Technical Excellence",
                    temp_category="Technical Skills",
                    temp_importance="High",
                    temp_weightage=30
                ),
                GoalTemplate(
                    temp_title="Team Collaboration",
                    temp_description="Effective collaboration with team members",
                    temp_performance_factor="Teamwork",
                    temp_category="Communication",
                    temp_importance="Medium",
                    temp_weightage=25
                )
            ]
            session.add_all(templates)
            await session.flush()
            print(f"Created {len(templates)} goal templates")
            
            print("✅ Test data seeding completed!")

if __name__ == "__main__":
    asyncio.run(seed_test_data())
