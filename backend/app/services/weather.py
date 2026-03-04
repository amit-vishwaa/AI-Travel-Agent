"""
Weather service using OpenWeatherMap API (free tier).
Fetches current weather and 5-day forecast for a destination.
"""
import httpx
from app.config.settings import settings

WEATHER_BASE = "https://api.openweathermap.org/data/2.5"
GEO_BASE = "https://api.openweathermap.org/geo/1.0"

async def get_coordinates(city: str) -> dict | None:
    """Get latitude/longitude for a city name."""
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            f"{GEO_BASE}/direct",
            params={"q": city, "limit": 1, "appid": settings.OPENWEATHER_API_KEY}
        )
        resp.raise_for_status()
        data = resp.json()
        if not data:
            return None
        return {"lat": data[0]["lat"], "lon": data[0]["lon"], "name": data[0]["name"], "country": data[0].get("country", "")}

async def get_current_weather(city: str) -> dict:
    """Get current weather for a city."""
    coords = await get_coordinates(city)
    if not coords:
        return {"error": f"City '{city}' not found"}

    async with httpx.AsyncClient() as client:
        resp = await client.get(
            f"{WEATHER_BASE}/weather",
            params={
                "lat": coords["lat"],
                "lon": coords["lon"],
                "appid": settings.OPENWEATHER_API_KEY,
                "units": "metric"
            }
        )
        resp.raise_for_status()
        data = resp.json()

    return {
        "city": data["name"],
        "country": data["sys"]["country"],
        "temperature": data["main"]["temp"],
        "feels_like": data["main"]["feels_like"],
        "humidity": data["main"]["humidity"],
        "description": data["weather"][0]["description"].title(),
        "icon": data["weather"][0]["icon"],
        "wind_speed": data["wind"]["speed"],
        "visibility": data.get("visibility", 0) / 1000,
        "coordinates": coords
    }

async def get_forecast(city: str) -> dict:
    """Get 5-day / 3-hour weather forecast for a city."""
    coords = await get_coordinates(city)
    if not coords:
        return {"error": f"City '{city}' not found"}

    async with httpx.AsyncClient() as client:
        resp = await client.get(
            f"{WEATHER_BASE}/forecast",
            params={
                "lat": coords["lat"],
                "lon": coords["lon"],
                "appid": settings.OPENWEATHER_API_KEY,
                "units": "metric",
                "cnt": 40  # 5 days × 8 intervals
            }
        )
        resp.raise_for_status()
        data = resp.json()

    # Group forecast by day
    daily = {}
    for item in data["list"]:
        date = item["dt_txt"].split(" ")[0]
        if date not in daily:
            daily[date] = {
                "date": date,
                "temps": [],
                "descriptions": [],
                "humidity": [],
                "icons": []
            }
        daily[date]["temps"].append(item["main"]["temp"])
        daily[date]["descriptions"].append(item["weather"][0]["description"])
        daily[date]["humidity"].append(item["main"]["humidity"])
        daily[date]["icons"].append(item["weather"][0]["icon"])

    # Summarise each day
    forecast = []
    for date, info in list(daily.items())[:5]:
        forecast.append({
            "date": date,
            "min_temp": round(min(info["temps"]), 1),
            "max_temp": round(max(info["temps"]), 1),
            "avg_humidity": round(sum(info["humidity"]) / len(info["humidity"])),
            "description": max(set(info["descriptions"]), key=info["descriptions"].count).title(),
            "icon": info["icons"][len(info["icons"]) // 2]
        })

    return {"city": city, "forecast": forecast, "coordinates": coords}
