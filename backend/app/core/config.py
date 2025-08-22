import os
from pydantic_settings import BaseSettings


def get_env_file() -> str:
    """Determine which .env file to load based on APP_ENV."""
    app_env = os.getenv("APP_ENV", "development").lower()

    env_files = {
        "development": ".env.development",
        "staging": ".env.staging",
        "production": ".env.production",
        "test": ".env.test",
    }

    return env_files.get(app_env, ".env")  # fallback to default .env


class Settings(BaseSettings):
    """Application settings."""

    # Database settings
    DATABASE_URL: str = "postgresql+asyncpg://postgres:sri%40123@localhost:5432/Performance_Management"

    # Security settings
    SECRET_KEY: str = "60b2c32eac0fe0b3b026b112ab8f7d6c996b88a9d20467bd1c7a5681d46e0e09"  # Change in production
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # Server settings
    HOST: str = "0.0.0.0"
    PORT: int = 7000
    BASE_PATH: str = "/"

    # CORS settings
    CORS_ORIGINS: list[str] = ["http://localhost:5173"]

    # Extra env variables
    APP_ENV: str = "development"
    DEBUG: bool = True

    class Config:
        env_file = get_env_file()
        case_sensitive = True


# Instantiate settings
settings = Settings()
