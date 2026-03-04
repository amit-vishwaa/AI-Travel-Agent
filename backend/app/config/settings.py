"""
Application settings loaded from environment variables.
"""
from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    MONGODB_URL: str = "mongodb://localhost:27017"
    DATABASE_NAME: str = "ai_travel_agent"
    SECRET_KEY: str = "change-this-secret-key"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60

    OPENWEATHER_API_KEY: str = ""
    OPENROUTESERVICE_API_KEY: str = ""
    GEMINI_API_KEY: str = ""
    GEMINI_MODEL: str = "models/gemini-2.0-flash-lite-001"

    class Config:
        env_file = ".env"

settings = Settings()
