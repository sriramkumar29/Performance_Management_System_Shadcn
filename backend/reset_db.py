import asyncio
from app.db.database import Base, engine, async_session
# Ensure all models are registered so Base.metadata includes every table
import app.models.appraisal  # noqa: F401
import app.models.appraisal_type  # noqa: F401
import app.models.employee  # noqa: F401
import app.models.goal  # noqa: F401

async def reset_database():
    """Drop and recreate all database tables."""
    async with engine.begin() as conn:
        print("Dropping all tables...")
        await conn.run_sync(Base.metadata.drop_all)
        print("Creating all tables...")
        await conn.run_sync(Base.metadata.create_all)
    print("Database reset complete!")

if __name__ == "__main__":
    asyncio.run(reset_database())
