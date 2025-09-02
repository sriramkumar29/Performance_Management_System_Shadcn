"""
Database utilities for integration testing.
Provides helpers for resetting DB state between tests.
"""
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.database import Base
from app.models.employee import Employee
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

async def reset_db_tables(session: AsyncSession):
    """
    Clear all tables in reverse dependency order to avoid FK constraints.
    Use this between test runs to ensure clean state.
    """
    try:
        # Delete in reverse dependency order
        for table in reversed(Base.metadata.sorted_tables):
            await session.execute(table.delete())
        await session.commit()
    except Exception as e:
        await session.rollback()
        raise e

async def seed_test_employee(session: AsyncSession, email: str = "test@example.com", password: str = "testpass123") -> Employee:
    """Create a test employee for authentication in tests."""
    hashed_password = pwd_context.hash(password)
    employee = Employee(
        emp_name="Test User",
        emp_email=email,
        emp_department="Engineering",
        emp_roles="Manager",
        emp_roles_level=5,
        emp_reporting_manager_id=None,
        emp_status=True,
        emp_password=hashed_password
    )
    session.add(employee)
    await session.commit()
    await session.refresh(employee)
    return employee
