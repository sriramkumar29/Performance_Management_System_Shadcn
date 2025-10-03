from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import declarative_base, sessionmaker
from app.core.config import settings
from app.utils.logger import get_database_logger, log_exception

logger = get_database_logger()

# Create async engine
engine = create_async_engine(
    settings.DATABASE_URL,
    echo=True,  # Set to False in production
)

@log_exception(logger)
async def init_db():
    """Initialize the database and create tables."""
    logger.info("Initializing database...")
    
    try:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        logger.info("Database initialization completed successfully")
    except Exception as e:
        logger.error(f"Database initialization failed: {str(e)}")
        raise

@log_exception(logger)
async def close_db():
    """Close database connections."""
    logger.info("Closing database connections...")
    
    try:
        await engine.dispose()
        logger.info("Database connections closed successfully")
    except Exception as e:
        logger.error(f"Error closing database connections: {str(e)}")
        raise
    
# Create async session factory
async_session = sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
)

# Create base class for models
Base = declarative_base()


async def get_db():
    """Dependency for getting async DB session."""
    session_logger = get_database_logger()
    session_logger.debug("Creating new database session")
    
    async with async_session() as session:
        try:
            yield session
            await session.commit()
            session_logger.debug("Database session committed successfully")
        except Exception as e:
            session_logger.error(f"Database session error, rolling back: {str(e)}")
            await session.rollback()
            raise
        finally:
            await session.close()
            session_logger.debug("Database session closed")
