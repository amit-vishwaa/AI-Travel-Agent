"""
Database configuration and connection management.
Uses Motor (async MongoDB driver) for non-blocking operations.
Supports local MongoDB and MongoDB Atlas (cloud).
"""
from __future__ import annotations

import logging
import certifi
from motor.motor_asyncio import AsyncIOMotorClient
from app.config.settings import settings

logger = logging.getLogger("uvicorn.error")

client: AsyncIOMotorClient | None = None


def get_client() -> AsyncIOMotorClient:
    """Lazily initialize or return the Motor client."""
    global client
    if client is None:
        client_kwargs = {
            "serverSelectionTimeoutMS": 5000,
            "connectTimeoutMS": 5000,
        }
        # MongoDB Atlas clusters use TLS/SSL - certifi ensures root certificates resolve on all platforms
        if "mongodb+srv" in settings.MONGODB_URL or "mongodb.net" in settings.MONGODB_URL or "tls=true" in settings.MONGODB_URL.lower():
            try:
                client_kwargs["tlsCAFile"] = certifi.where()
            except Exception as e:
                logger.warning(f"Failed to set tlsCAFile from certifi: {e}")

        client = AsyncIOMotorClient(
            settings.MONGODB_URL,
            **client_kwargs
        )
    return client


async def connect_to_mongo():
    """Create database connection and ensure indices on startup."""
    global client
    try:
        client = get_client()
        db = client[settings.DATABASE_NAME]
        # Ping with timeout to verify connectivity
        await client.admin.command("ping")
        await db["trips"].create_index([("user_id", 1), ("created_at", -1)])
        await db["users"].create_index([("email", 1)], unique=True)
        logger.info(f"Connected to MongoDB: {settings.DATABASE_NAME}")
    except Exception as exc:
        logger.warning(
            f"MongoDB connection notice: {exc}. Server will start and retry connections on demand."
        )


async def close_mongo_connection():
    """Close database connection on shutdown."""
    global client
    if client:
        client.close()
        client = None
        logger.info("MongoDB connection closed")


def get_database():
    """Return the database instance."""
    motor_client = get_client()
    return motor_client[settings.DATABASE_NAME]
