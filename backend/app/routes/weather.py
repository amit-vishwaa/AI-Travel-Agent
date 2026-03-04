"""
Weather API routes.
"""
from fastapi import APIRouter, HTTPException, Depends
from app.services.weather import get_current_weather, get_forecast
from app.services.auth import get_current_user

router = APIRouter(prefix="/weather", tags=["Weather"])

@router.get("/current/{city}")
async def current_weather(city: str, current_user: dict = Depends(get_current_user)):
    """Get current weather for a city."""
    data = await get_current_weather(city)
    if "error" in data:
        raise HTTPException(status_code=404, detail=data["error"])
    return data

@router.get("/forecast/{city}")
async def weather_forecast(city: str, current_user: dict = Depends(get_current_user)):
    """Get 5-day weather forecast for a city."""
    data = await get_forecast(city)
    if "error" in data:
        raise HTTPException(status_code=404, detail=data["error"])
    return data
