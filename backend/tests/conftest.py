"""
Test configuration and fixtures for integration testing.
Uses a dedicated test database with real SQLAlchemy operations.
"""
import asyncio
import pytest
import pytest_asyncio
from fastapi.testclient import TestClient
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from typing import AsyncGenerator

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from main import app
from app.db.database import Base, get_db
from app.core.config import settings
from app.models.employee import Employee
from app.models.appraisal import Appraisal
from app.models.goal import Goal, GoalTemplate, Category
from app.models.appraisal_type import AppraisalType, AppraisalRange
import bcrypt

def hash_password(password: str) -> str:
    """Hash password using bcrypt."""
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

# Test database engine - uses the test DB from .env.test
test_engine = create_async_engine(
    settings.DATABASE_URL,
    echo=False
)

TestSessionLocal = sessionmaker(
    test_engine, 
    class_=AsyncSession, 
    expire_on_commit=False
)

@pytest_asyncio.fixture(scope="session")
async def setup_test_db():
    """Create test database schema once per test session."""
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await test_engine.dispose()

@pytest_asyncio.fixture
async def db_session(setup_test_db) -> AsyncGenerator[AsyncSession, None]:
    """Provide a clean database session for each test."""
    async with TestSessionLocal() as session:
        # Clean up before each test to ensure fresh state
        await reset_db_tables(session)
        yield session
        # Clean up after each test
        await reset_db_tables(session)

async def reset_db_tables(session: AsyncSession):
    """Helper to clear all tables between tests."""
    try:
        # Delete in reverse dependency order to avoid FK constraints
        for table in reversed(Base.metadata.sorted_tables):
            await session.execute(table.delete())
        await session.commit()
    except Exception as e:
        await session.rollback()
        raise e

@pytest_asyncio.fixture
async def override_get_db(db_session: AsyncSession):
    """Override the get_db dependency to use test database."""
    async def _override_get_db():
        yield db_session
    
    app.dependency_overrides[get_db] = _override_get_db
    yield
    app.dependency_overrides.clear()

@pytest.fixture
def client(override_get_db):
    """FastAPI test client with test database."""
    return TestClient(app)

@pytest_asyncio.fixture
async def test_employee(db_session: AsyncSession) -> Employee:
    """Create a test employee for authentication."""
    hashed_password = hash_password("password123")
    employee = Employee(
        emp_name="John CEO",
        emp_email="john.ceo@example.com",
        emp_department="Executive",
        emp_roles="CEO",
        emp_roles_level=9,
        emp_reporting_manager_id=None,
        emp_status=True,
        emp_password=hashed_password
    )
    db_session.add(employee)
    await db_session.commit()
    await db_session.refresh(employee)
    return employee

@pytest_asyncio.fixture
async def test_appraisal_type(db_session: AsyncSession) -> AppraisalType:
    """Create a test appraisal type."""
    appraisal_type = AppraisalType(
        name="Annual",
        has_range=False
    )
    db_session.add(appraisal_type)
    await db_session.commit()
    await db_session.refresh(appraisal_type)
    return appraisal_type

@pytest.fixture
def auth_headers(client: TestClient, test_employee: Employee) -> dict:
    """Get authentication headers for API requests."""
    login_data = {
        "email": test_employee.emp_email,
        "password": "password123"
    }
    response = client.post("/api/employees/login", json=login_data)
    assert response.status_code == 200
    token_data = response.json()
    return {"Authorization": f"Bearer {token_data['access_token']}"}

# Event loop fixture for pytest-asyncio
@pytest.fixture(scope="session")
def event_loop():
    """Create an instance of the default event loop for the test session."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()
