"""
Application settings loaded from environment variables.
"""
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


BACKEND_DIR = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    MONGODB_URL: str = "mongodb://localhost:27017"
    DATABASE_NAME: str = "ai_travel_agent"
    SECRET_KEY: str = "change-this-secret-key"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60

    OPENWEATHER_API_KEY: str = ""
    OPENROUTESERVICE_API_KEY: str = ""
    SERPAPI_API_KEY: str = ""
    GEMINI_API_KEY: str = ""
    GEMINI_MODEL: str = "models/gemini-2.0-flash-lite-001"
    OLLAMA_URL: str = ""
    OLLAMA_BASE_URL: str = "http://localhost:11434"
    OLLAMA_MODEL: str = "qwen2.5-coder:7b"
    AI_TIMEOUT_SECONDS: int = 18
    SERPAPI_TIMEOUT_SECONDS: int = 30
    CACHE_TTL_SECONDS: int = 900
    FRONTEND_ORIGINS: str = "http://localhost:5173,http://localhost:3000"

    model_config = SettingsConfigDict(
        env_file=str(BACKEND_DIR / ".env"),
        extra="ignore",
    )


settings = Settings()
