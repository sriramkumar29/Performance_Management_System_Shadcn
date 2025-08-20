from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    """Application settings."""
    
    # Database settings
    DATABASE_URL: str = "postgresql+asyncpg://postgres:sri%40123@localhost:5432/Performance_Management"
    
    # Security settings
    SECRET_KEY: str = "your-secret-key-here"  # Change in production
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    
    # CORS settings
    CORS_ORIGINS: list[str] = ["http://localhost:5173"]  # Frontend URL
    
    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
