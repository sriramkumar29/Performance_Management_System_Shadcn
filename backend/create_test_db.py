"""
Script to create the test database for integration testing.
Run this once before running integration tests.
"""
import asyncio
import asyncpg
from sqlalchemy.ext.asyncio import create_async_engine
from app.core.config import settings
from app.db.database import Base

# Parse connection details from DATABASE_URL
def parse_db_url(url: str):
    """Parse PostgreSQL URL to extract connection details."""
    # Example: postgresql+asyncpg://postgres:sri%40123@localhost:5432/performance_management_test
    url = url.replace('postgresql+asyncpg://', '')
    user_pass, host_db = url.split('@')
    user, password = user_pass.split(':')
    host_port, db_name = host_db.split('/')
    host, port = host_port.split(':')
    
    # URL decode password
    password = password.replace('%40', '@')
    
    return {
        'user': user,
        'password': password,
        'host': host,
        'port': int(port),
        'database': db_name
    }

async def create_test_database():
    """Create the test database if it doesn't exist."""
    db_config = parse_db_url(settings.DATABASE_URL)
    
    # Connect to postgres database to create test database
    try:
        conn = await asyncpg.connect(
            user=db_config['user'],
            password=db_config['password'],
            host=db_config['host'],
            port=db_config['port'],
            database='postgres'  # Connect to default postgres DB
        )
        
        # Check if test database exists
        result = await conn.fetchval(
            "SELECT 1 FROM pg_database WHERE datname = $1",
            db_config['database']
        )
        
        if not result:
            print(f"Creating test database: {db_config['database']}")
            await conn.execute(f'CREATE DATABASE "{db_config["database"]}"')
            print("✅ Test database created successfully")
        else:
            print(f"✅ Test database {db_config['database']} already exists")
            
        await conn.close()
        
    except Exception as e:
        print(f"❌ Error creating test database: {e}")
        print("\nManual creation command:")
        print(f'createdb "{db_config["database"]}"')
        print(f'# Or using psql:')
        print(f'psql -U {db_config["user"]} -c "CREATE DATABASE \\"{db_config["database"]}\\""')
        raise

async def setup_test_schema():
    """Create all tables in the test database."""
    try:
        # Create engine for test database
        engine = create_async_engine(settings.DATABASE_URL, echo=True)
        
        print("Creating database schema...")
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        
        print("✅ Database schema created successfully")
        await engine.dispose()
        
    except Exception as e:
        print(f"❌ Error creating schema: {e}")
        raise

async def main():
    """Main setup function."""
    print("🔧 Setting up test database for integration testing...")
    print(f"Database URL: {settings.DATABASE_URL}")
    
    await create_test_database()
    await setup_test_schema()
    
    print("\n✅ Test database setup complete!")
    print("\nNext steps:")
    print("1. Seed test data: python seed_test_data.py")
    print("2. Run backend tests: pytest -m integration")
    print("3. Start backend: uvicorn main:app --host 0.0.0.0 --port 7001")
    print("4. Run frontend integration tests: npm run test:integration")

if __name__ == "__main__":
    asyncio.run(main())
