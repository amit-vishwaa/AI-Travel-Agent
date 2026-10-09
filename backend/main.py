"""
AI Travel Agent - FastAPI Application Entry Point
Modular architecture with MongoDB, JWT auth, AI integrations, and zero-cost cloud deployment readiness.
"""
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware

from app.config.database import connect_to_mongo, close_mongo_connection, get_database
from app.config.settings import settings
from app.routes import auth, trips, weather, ai, routing

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage application startup and shutdown events."""
    await connect_to_mongo()
    yield
    await close_mongo_connection()

app = FastAPI(
    title="AI Travel Agent API",
    description="Production-grade AI travel assistant with multi-model routing, calendar export, and real-time planning",
    version="2.1.0",
    lifespan=lifespan
)

# GZip compression middleware for faster network responses (payloads > 1KB)
app.add_middleware(GZipMiddleware, minimum_size=1000)

# CORS configuration - supports local development and cloud deployments (Vercel, Netlify, Render)
frontend_origins = [origin.strip() for origin in settings.FRONTEND_ORIGINS.split(",") if origin.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=frontend_origins if "*" not in frontend_origins else ["*"],
    allow_origin_regex=r"^https://.*\.vercel\.app$|^https://.*\.netlify\.app$|^https://.*\.onrender\.com$|^http://localhost(:\d+)?$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register all route modules
app.include_router(auth.router, prefix="/api")
app.include_router(trips.router, prefix="/api")
app.include_router(weather.router, prefix="/api")
app.include_router(ai.router, prefix="/api")
app.include_router(routing.router, prefix="/api")

@app.get("/")
async def root():
    """Health check endpoint."""
    return {
        "message": "AI Travel Agent API is running!",
        "version": "2.1.0",
        "status": "healthy",
        "docs": "/docs"
    }

@app.get("/api/health")
async def health_check():
    """Detailed health check endpoint for monitoring uptime."""
    mongo_ok = False
    try:
        db = get_database()
        await db.command("ping")
        mongo_ok = True
    except Exception:
        mongo_ok = False

    return {
        "status": "ok" if mongo_ok else "degraded",
        "api": "AI Travel Agent API",
        "version": "2.1.0",
        "mongodb": mongo_ok,
        "features": {
            "calendar_export": True,
            "pdf_export": True,
            "public_sharing": True,
            "weather_forecast": bool(settings.OPENWEATHER_API_KEY),
            "gemini_ai": bool(settings.GEMINI_API_KEY),
        }
    }
