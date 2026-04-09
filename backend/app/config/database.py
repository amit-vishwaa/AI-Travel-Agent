"""
Database configuration and connection management.
Uses Motor (async MongoDB driver) for non-blocking operations.
"""
from __future__ import annotations

from motor.motor_asyncio import AsyncIOMotorClient

from app.config.settings import settings

client: AsyncIOMotorClient = None


async def connect_to_mongo():
    """Create database connection on startup."""
    global client
    client = AsyncIOMotorClient(settings.MONGODB_URL)
    db = client[settings.DATABASE_NAME]
    await db["trips"].create_index([("user_id", 1), ("created_at", -1)])
    print(f"Connected to MongoDB: {settings.DATABASE_NAME}")


async def close_mongo_connection():
    """Close database connection on shutdown."""
    global client
    if client:
        client.close()
        print("MongoDB connection closed")


def get_database():
    """Return the database instance."""
    return client[settings.DATABASE_NAME]
