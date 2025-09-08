"""
Simple integration test to verify the database setup and basic functionality.
"""
import asyncio
import os
import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
import bcrypt

# Set test environment
os.environ["APP_ENV"] = "test"

from app.core.config import settings
from app.db.database import Base
from app.models.employee import Employee
from app.models.appraisal_type import AppraisalType

def hash_password(password: str) -> str:
    """Hash password using bcrypt."""
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

@pytest.mark.asyncio
async def test_database_connection_and_basic_operations():
    """Test that we can connect to the test database and perform basic operations."""
    # Create test engine
    test_engine = create_async_engine(settings.DATABASE_URL, echo=False)
    TestSessionLocal = sessionmaker(test_engine, class_=AsyncSession, expire_on_commit=False)
    
    try:
        # Ensure schema exists
        async with test_engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        
        # Test basic database operations
        async with TestSessionLocal() as session:
            # Clear any existing data in correct order (handle foreign keys)
            # Clear dependent tables first, then parent tables
            from app.models.appraisal import Appraisal
            from app.models.goal import Goal
            await session.execute(Appraisal.__table__.delete())
            await session.execute(Goal.__table__.delete())
            await session.execute(Employee.__table__.delete())
            await session.execute(AppraisalType.__table__.delete())
            await session.commit()
            
            # Create test employee
            test_employee = Employee(
                emp_name="Test Employee",
                emp_email="test@example.com",
                emp_department="IT",
                emp_roles="Developer",
                emp_roles_level=3,
                emp_reporting_manager_id=None,
                emp_status=True,
                emp_password=hash_password("testpass123")
            )
            session.add(test_employee)
            await session.commit()
            await session.refresh(test_employee)
            
            # Verify employee was created
            result = await session.execute(
                select(Employee).where(Employee.emp_email == "test@example.com")
            )
            retrieved_employee = result.scalar_one_or_none()
            
            assert retrieved_employee is not None
            assert retrieved_employee.emp_name == "Test Employee"
            assert retrieved_employee.emp_department == "IT"
            
            # Create test appraisal type
            test_appraisal_type = AppraisalType(
                name="Test Annual",
                has_range=False
            )
            session.add(test_appraisal_type)
            await session.commit()
            await session.refresh(test_appraisal_type)
            
            # Verify appraisal type was created
            result = await session.execute(
                select(AppraisalType).where(AppraisalType.name == "Test Annual")
            )
            retrieved_appraisal_type = result.scalar_one_or_none()
            
            assert retrieved_appraisal_type is not None
            assert retrieved_appraisal_type.name == "Test Annual"
            assert retrieved_appraisal_type.has_range is False
            
            print("✅ Database connection and basic operations test passed!")
            
    finally:
        await test_engine.dispose()

if __name__ == "__main__":
    asyncio.run(test_database_connection_and_basic_operations())
