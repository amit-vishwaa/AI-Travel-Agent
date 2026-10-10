"""
Database configuration and connection management.
Uses Motor (async MongoDB driver) for non-blocking operations.
Supports local MongoDB and MongoDB Atlas (cloud).
"""
from __future__ import annotations

import logging
import certifi
import re
import urllib.parse
from motor.motor_asyncio import AsyncIOMotorClient
from app.config.settings import settings

logger = logging.getLogger("uvicorn.error")

client: AsyncIOMotorClient | None = None


def sanitize_mongodb_url(raw_url: str) -> str:
    """Ensure username and password in MongoDB URL are RFC 3986 encoded."""
    raw_url = raw_url.strip()
    match = re.match(r'^(mongodb(?:\+srv)?:\/\/)([^:]+):(.+)@([^@\/]+)(.*)$', raw_url)
    if match:
        prefix, user, pwd, host, rest = match.groups()
        encoded_pwd = urllib.parse.quote_plus(urllib.parse.unquote_plus(pwd))
        encoded_user = urllib.parse.quote_plus(urllib.parse.unquote_plus(user))
        return f"{prefix}{encoded_user}:{encoded_pwd}@{host}{rest}"
    return raw_url


def resolve_mongo_url() -> tuple[str, bool]:
    """Resolve the MongoDB connection URL, detecting placeholder passwords."""
    raw_url = settings.MONGODB_URL.strip()
    is_placeholder = (
        "<db_password>" in raw_url
        or "<password>" in raw_url
        or "<user>" in raw_url
        or "<username>" in raw_url
    )
    if is_placeholder:
        logger.warning(
            "MONGODB_URL in backend/.env contains placeholder '<db_password>'. "
            "Please replace it with your real MongoDB Atlas password. "
            "Falling back to local MongoDB mongodb://localhost:27017."
        )
        return "mongodb://localhost:27017", True
    return sanitize_mongodb_url(raw_url), False


def get_client() -> AsyncIOMotorClient:
    """Lazily initialize or return the Motor client."""
    global client
    if client is None:
        url, _ = resolve_mongo_url()
        client_kwargs = {
            "serverSelectionTimeoutMS": 5000,
            "connectTimeoutMS": 5000,
        }
        # MongoDB Atlas clusters use TLS/SSL - certifi ensures root certificates resolve on all platforms
        if "mongodb+srv" in url or "mongodb.net" in url or "tls=true" in url.lower():
            try:
                client_kwargs["tlsCAFile"] = certifi.where()
            except Exception as e:
                logger.warning(f"Failed to set tlsCAFile from certifi: {e}")

        client = AsyncIOMotorClient(
            url,
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
        url, fell_back = resolve_mongo_url()
        if fell_back:
            logger.info("Connected to local MongoDB (ai_travel_agent) as fallback for Atlas placeholder.")
        else:
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
