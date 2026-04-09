"""
AI Travel Agent - FastAPI Application Entry Point
Modular architecture with MongoDB, JWT auth, and AI integrations.
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from app.config.database import connect_to_mongo, close_mongo_connection
from app.routes import auth, trips, weather, ai, routing

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage application startup and shutdown events."""
    await connect_to_mongo()
    yield
    await close_mongo_connection()

app = FastAPI(
    title="AI Travel Agent API",
    description="Production-grade AI travel assistant with multi-model routing",
    version="2.0.0",
    lifespan=lifespan
)

# CORS configuration - allow frontend origin
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000", "https://your-frontend-domain.com"],
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
    return {"message": "AI Travel Agent API is running!", "version": "2.0.0", "status": "healthy"}

@app.get("/api/health")
async def health_check():
    """Detailed health check."""
    return {"status": "ok", "api": "AI Travel Agent", "version": "2.0.0"}
