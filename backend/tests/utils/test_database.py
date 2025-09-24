import pytest
from unittest.mock import Mock, AsyncMock, patch, MagicMock
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from sqlalchemy.pool import StaticPool

from app.db.database import engine, async_session, Base, get_db
from app.core.config import settings


class TestDatabaseConfiguration:
    """Test database configuration and setup."""

    def test_engine_configuration(self):
        """Should create async engine with correct configuration."""
        # Test that engine is configured correctly
        assert engine is not None
        assert str(engine.url) == settings.DATABASE_URL.replace('+asyncpg', '+psycopg')
        
        # Test that echo is enabled (for development)
        assert engine.echo is True

    def test_async_session_factory_configuration(self):
        """Should configure async session factory correctly."""
        # Test session factory configuration
        assert async_session is not None
        assert issubclass(async_session.class_, AsyncSession)
        assert async_session.expire_on_commit is False
        assert async_session.bind == engine

    def test_base_declarative_class(self):
        """Should have proper declarative base class."""
        # Test Base class
        assert Base is not None
        assert hasattr(Base, 'metadata')
        assert hasattr(Base, '__tablename__')


class TestGetDbDependency:
    """Test the get_db dependency function."""

    @pytest.mark.asyncio
    async def test_get_db_successful_session(self):
        """Should yield database session and commit on success."""
        # Mock async session
        mock_session = AsyncMock(spec=AsyncSession)
        mock_session.commit = AsyncMock()
        mock_session.rollback = AsyncMock()
        mock_session.close = AsyncMock()
        
        # Mock the actual session creation process
        with patch('app.db.database.async_session') as mock_session_factory:
            # Configure the mock to return an async context manager
            mock_context = AsyncMock()
            mock_context.__aenter__ = AsyncMock(return_value=mock_session)
            mock_context.__aexit__ = AsyncMock(return_value=None)
            mock_session_factory.return_value = mock_context
            
            # Get the generator
            db_gen = get_db()
            
            # Get the session
            session = await db_gen.__anext__()
            
            # Verify we got the mocked session
            assert session == mock_session
            
            # Verify session factory was called
            mock_session_factory.assert_called_once()
            
            # Close the generator (simulating successful completion)
            try:
                await db_gen.__anext__()
            except StopAsyncIteration:
                pass
            
            # Verify commit was called
            mock_session.commit.assert_called_once()
            mock_session.close.assert_called_once()
            mock_session.rollback.assert_not_called()

    @pytest.mark.asyncio
    async def test_get_db_exception_rollback(self):
        """Should rollback database session on exception."""
        # Mock async session
        mock_session = AsyncMock(spec=AsyncSession)
        mock_session.commit = AsyncMock(side_effect=Exception("Database error"))
        mock_session.rollback = AsyncMock()
        mock_session.close = AsyncMock()
        
        # Mock the session creation process
        with patch('app.db.database.async_session') as mock_session_factory:
            mock_context = AsyncMock()
            mock_context.__aenter__ = AsyncMock(return_value=mock_session)
            mock_context.__aexit__ = AsyncMock(return_value=None)
            mock_session_factory.return_value = mock_context
            
            db_gen = get_db()
            
            # Get the session
            session = await db_gen.__anext__()
            assert session == mock_session
            
            # Simulate an exception during operation
            with pytest.raises(Exception, match="Database error"):
                try:
                    await db_gen.__anext__()
                except StopAsyncIteration:
                    pass
            
            # Verify rollback was called
            mock_session.rollback.assert_called_once()
            mock_session.close.assert_called_once()

    @pytest.mark.asyncio
    async def test_get_db_context_manager_behavior(self):
        """Should properly handle async context manager lifecycle."""
        # Mock the entire session context manager
        mock_session = AsyncMock(spec=AsyncSession)
        mock_context_manager = AsyncMock()
        mock_context_manager.__aenter__.return_value = mock_session
        mock_context_manager.__aexit__.return_value = None
        
        mock_session_factory = Mock(return_value=mock_context_manager)
        
        with patch('app.db.database.async_session', mock_session_factory):
            db_gen = get_db()
            
            # Get session from generator
            session = await db_gen.__anext__()
            
            # Verify session is the mocked one
            assert session == mock_session
            
            # Verify context manager was entered
            mock_context_manager.__aenter__.assert_called_once()
            
            # Close generator
            try:
                await db_gen.__anext__()
            except StopAsyncIteration:
                pass
            
            # Verify context manager was exited
            mock_context_manager.__aexit__.assert_called_once()

    @pytest.mark.asyncio
    async def test_get_db_multiple_sessions(self):
        """Should create separate sessions for multiple calls."""
        mock_sessions = [AsyncMock(spec=AsyncSession) for _ in range(3)]
        call_count = 0
        
        def create_mock_session():
            nonlocal call_count
            mock_session = mock_sessions[call_count]
            call_count += 1
            
            mock_context = AsyncMock()
            mock_context.__aenter__.return_value = mock_session
            mock_context.__aexit__.return_value = None
            return mock_context
        
        with patch('app.db.database.async_session', side_effect=create_mock_session):
            # Create multiple generators
            generators = [get_db() for _ in range(3)]
            
            # Get sessions from each generator
            sessions = []
            for gen in generators:
                session = await gen.__anext__()
                sessions.append(session)
            
            # Verify we got different session objects
            assert len(set(id(s) for s in sessions)) == 3
            assert sessions == mock_sessions


class TestDatabaseIntegration:
    """Test database integration scenarios."""

    def test_engine_uses_correct_settings(self):
        """Should use settings from config module."""
        with patch('app.db.database.settings') as mock_settings:
            mock_settings.DATABASE_URL = "postgresql+asyncpg://test:test@localhost/test"
            
            # Import would happen at module level, so we test the current configuration
            # The engine should be using the actual settings
            assert settings.DATABASE_URL in str(engine.url)

    @pytest.mark.asyncio
    async def test_database_connection_error_handling(self):
        """Should handle database connection errors appropriately."""
        # Mock session that raises connection error
        mock_session = AsyncMock(spec=AsyncSession)
        mock_session.commit = AsyncMock(side_effect=ConnectionError("Connection failed"))
        mock_session.rollback = AsyncMock()
        mock_session.close = AsyncMock()
        
        mock_context = AsyncMock()
        mock_context.__aenter__.return_value = mock_session
        mock_context.__aexit__.return_value = None
        
        with patch('app.db.database.async_session', return_value=mock_context):
            db_gen = get_db()
            session = await db_gen.__anext__()
            
            # Simulate connection error
            with pytest.raises(ConnectionError, match="Connection failed"):
                try:
                    await db_gen.__anext__()
                except StopAsyncIteration:
                    pass
            
            # Verify proper cleanup
            mock_session.rollback.assert_called_once()
            mock_session.close.assert_called_once()

    def test_base_model_inheritance(self):
        """Should allow proper model inheritance from Base."""
        from sqlalchemy import Column, Integer, String
        
        # Create a test model
        class TestModel(Base):
            __tablename__ = 'test_table'
            id = Column(Integer, primary_key=True)
            name = Column(String(50))
        
        # Verify model has proper attributes
        assert hasattr(TestModel, '__tablename__')
        assert hasattr(TestModel, 'id')
        assert hasattr(TestModel, 'name')
        assert hasattr(TestModel, 'metadata')
        
        # Verify model is properly registered with Base
        assert 'test_table' in Base.metadata.tables

    @pytest.mark.asyncio
    async def test_session_lifecycle_complete(self):
        """Should handle complete session lifecycle correctly."""
        operations_log = []
        
        # Mock session with logging
        mock_session = AsyncMock(spec=AsyncSession)
        mock_session.commit = AsyncMock(side_effect=lambda: operations_log.append('commit'))
        mock_session.rollback = AsyncMock(side_effect=lambda: operations_log.append('rollback'))
        mock_session.close = AsyncMock(side_effect=lambda: operations_log.append('close'))
        
        mock_context = AsyncMock()
        mock_context.__aenter__.return_value = mock_session
        mock_context.__aexit__.return_value = None
        
        with patch('app.db.database.async_session', return_value=mock_context):
            # Successful case
            db_gen = get_db()
            session = await db_gen.__anext__()
            
            # Perform some mock operations
            operations_log.append('operations')
            
            # Close generator
            try:
                await db_gen.__anext__()
            except StopAsyncIteration:
                pass
            
            # Verify operation order
            assert 'operations' in operations_log
            assert 'commit' in operations_log
            assert 'close' in operations_log
            assert 'rollback' not in operations_log
            
            # Verify commit happens before close
            commit_idx = operations_log.index('commit')
            close_idx = operations_log.index('close')
            assert commit_idx < close_idx


class TestDatabaseConfiguration:
    """Test database configuration edge cases."""

    def test_engine_echo_setting(self):
        """Should have echo enabled for development."""
        # In development, echo should be True for SQL logging
        assert engine.echo is True

    def test_session_expire_on_commit_disabled(self):
        """Should have expire_on_commit disabled for better performance."""
        # Check the session factory configuration
        # The expire_on_commit is passed as kw argument to sessionmaker
        assert hasattr(async_session, 'kw')
        assert async_session.kw.get('expire_on_commit') is False

    def test_database_url_format_validation(self):
        """Should handle proper async database URL format."""
        # The URL should be properly formatted for async operations
        url_str = str(engine.url)
        
        # Should contain async-compatible driver
        assert '+asyncpg' in settings.DATABASE_URL or 'postgresql://' in url_str

    @pytest.mark.asyncio
    async def test_session_isolation(self):
        """Should provide proper session isolation."""
        # Mock to track session creation
        session_instances = []
        
        def track_session_creation():
            mock_session = AsyncMock(spec=AsyncSession)
            session_instances.append(mock_session)
            
            mock_context = AsyncMock()
            mock_context.__aenter__.return_value = mock_session
            mock_context.__aexit__.return_value = None
            return mock_context
        
        with patch('app.db.database.async_session', side_effect=track_session_creation):
            # Create two separate database sessions
            gen1 = get_db()
            gen2 = get_db()
            
            session1 = await gen1.__anext__()
            session2 = await gen2.__anext__()
            
            # Verify sessions are different instances
            assert session1 is not session2
            assert len(session_instances) == 2
            assert session_instances[0] is not session_instances[1]
