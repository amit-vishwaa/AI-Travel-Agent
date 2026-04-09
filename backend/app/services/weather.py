"""
Weather service using geocoding plus Open-Meteo forecasts.
"""
from __future__ import annotations

from collections import defaultdict

import httpx

from app.config.settings import settings
from app.services.routing import geocode_place

OPEN_METEO_BASE = "https://api.open-meteo.com/v1/forecast"
OPEN_METEO_GEOCODING_BASE = "https://geocoding-api.open-meteo.com/v1/search"
OPENWEATHER_CURRENT_BASE = "https://api.openweathermap.org/data/2.5/weather"
OPENWEATHER_FORECAST_BASE = "https://api.openweathermap.org/data/2.5/forecast"


async def _open_meteo_geocode(city: str) -> dict | None:
    query = str(city or "").strip()
    if len(query) < 2:
        return None

    async with httpx.AsyncClient() as client:
        resp = await client.get(
            OPEN_METEO_GEOCODING_BASE,
            params={
                "name": query,
                "count": 1,
                "language": "en",
                "format": "json",
            },
            timeout=15,
        )
        resp.raise_for_status()
        data = resp.json()

    results = data.get("results") or []
    if not results:
        return None

    match = results[0]
    parts = [
        str(match.get("name") or "").strip(),
        str(match.get("admin1") or "").strip(),
        str(match.get("country") or "").strip(),
    ]
    label = ", ".join(part for part in parts if part)

    return {
        "name": label or query,
        "country": match.get("country") or match.get("country_code") or "",
        "lon": match.get("longitude"),
        "lat": match.get("latitude"),
        "timezone": match.get("timezone"),
    }


async def get_coordinates(city: str) -> dict | None:
    try:
        coords = await geocode_place(city)
        if coords:
            return coords
    except Exception:
        pass

    try:
        return await _open_meteo_geocode(city)
    except Exception:
        return None


def _describe_weather(code: int) -> str:
    mapping = {
        0: "Clear",
        1: "Mostly Clear",
        2: "Partly Cloudy",
        3: "Overcast",
        45: "Fog",
        48: "Freezing Fog",
        51: "Light Drizzle",
        53: "Drizzle",
        55: "Dense Drizzle",
        61: "Light Rain",
        63: "Rain",
        65: "Heavy Rain",
        71: "Light Snow",
        73: "Snow",
        75: "Heavy Snow",
        80: "Rain Showers",
        81: "Showers",
        82: "Heavy Showers",
        95: "Thunderstorm",
    }
    return mapping.get(code, "Variable Conditions")


def _describe_openweather(code: int) -> str:
    mapping = {
        200: "Thunderstorm",
        201: "Thunderstorm",
        202: "Heavy Thunderstorm",
        230: "Thunderstorm",
        300: "Light Drizzle",
        301: "Drizzle",
        302: "Heavy Drizzle",
        500: "Light Rain",
        501: "Rain",
        502: "Heavy Rain",
        511: "Freezing Rain",
        520: "Rain Showers",
        521: "Showers",
        522: "Heavy Showers",
        600: "Light Snow",
        601: "Snow",
        602: "Heavy Snow",
        701: "Mist",
        711: "Smoke",
        721: "Haze",
        741: "Fog",
        800: "Clear",
        801: "Mostly Clear",
        802: "Partly Cloudy",
        803: "Cloudy",
        804: "Overcast",
    }
    return mapping.get(code, "Variable Conditions")


async def _forecast_for_coordinates(coords: dict, city_label: str) -> dict:
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            OPEN_METEO_BASE,
            params={
                "latitude": coords["lat"],
                "longitude": coords["lon"],
                "daily": "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max",
                "timezone": "auto",
                "forecast_days": 5,
            },
            timeout=15,
        )
        resp.raise_for_status()
        data = resp.json()

    daily = data.get("daily", {})
    forecast = []
    for idx, date in enumerate(daily.get("time", [])[:5]):
        forecast.append({
            "date": date,
            "min_temp": daily.get("temperature_2m_min", [None])[idx],
            "max_temp": daily.get("temperature_2m_max", [None])[idx],
            "description": _describe_weather(int(daily.get("weather_code", [0])[idx])),
            "precipitation_probability": daily.get("precipitation_probability_max", [0])[idx],
        })

    return {"city": city_label, "forecast": forecast, "coordinates": coords}


async def _openweather_current_for_coordinates(coords: dict, city_label: str) -> dict | None:
    if not settings.OPENWEATHER_API_KEY:
        return None

    async with httpx.AsyncClient() as client:
        resp = await client.get(
            OPENWEATHER_CURRENT_BASE,
            params={
                "lat": coords["lat"],
                "lon": coords["lon"],
                "appid": settings.OPENWEATHER_API_KEY,
                "units": "metric",
            },
            timeout=15,
        )
        resp.raise_for_status()
        data = resp.json()

    weather = (data.get("weather") or [{}])[0]
    main = data.get("main") or {}
    wind = data.get("wind") or {}
    return {
        "city": city_label,
        "country": coords.get("country", ""),
        "temperature": main.get("temp"),
        "feels_like": main.get("feels_like"),
        "humidity": main.get("humidity"),
        "description": _describe_openweather(int(weather.get("id", 800))),
        "wind_speed": wind.get("speed"),
        "coordinates": coords,
    }


async def _openweather_forecast_for_coordinates(coords: dict, city_label: str) -> dict | None:
    if not settings.OPENWEATHER_API_KEY:
        return None

    async with httpx.AsyncClient() as client:
        resp = await client.get(
            OPENWEATHER_FORECAST_BASE,
            params={
                "lat": coords["lat"],
                "lon": coords["lon"],
                "appid": settings.OPENWEATHER_API_KEY,
                "units": "metric",
            },
            timeout=15,
        )
        resp.raise_for_status()
        data = resp.json()

    grouped: dict[str, list[dict]] = defaultdict(list)
    for item in data.get("list") or []:
        date_text = str(item.get("dt_txt") or "").split(" ")[0]
        if date_text:
            grouped[date_text].append(item)

    forecast = []
    for date_text in list(grouped.keys())[:5]:
        entries = grouped[date_text]
        mins = [entry.get("main", {}).get("temp_min") for entry in entries if entry.get("main", {}).get("temp_min") is not None]
        maxes = [entry.get("main", {}).get("temp_max") for entry in entries if entry.get("main", {}).get("temp_max") is not None]
        pops = [entry.get("pop", 0) for entry in entries]
        codes = [int((entry.get("weather") or [{}])[0].get("id", 800)) for entry in entries]
        descriptions = [_describe_openweather(code) for code in codes]
        midday = next((entry for entry in entries if "12:00:00" in str(entry.get("dt_txt"))), entries[len(entries) // 2])
        midday_code = int(((midday.get("weather") or [{}])[0].get("id", 800)))

        forecast.append({
            "date": date_text,
            "min_temp": min(mins) if mins else None,
            "max_temp": max(maxes) if maxes else None,
            "description": _describe_openweather(midday_code) if descriptions else "Variable Conditions",
            "precipitation_probability": round(max(pops) * 100) if pops else 0,
        })

    return {"city": city_label, "forecast": forecast, "coordinates": coords}


async def get_current_weather(city: str) -> dict:
    """Get current weather for a city."""
    coords = await get_coordinates(city)
    if not coords:
        return {"error": f"City '{city}' not found"}

    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                OPEN_METEO_BASE,
                params={
                    "latitude": coords["lat"],
                    "longitude": coords["lon"],
                    "current": "temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m",
                    "timezone": "auto",
                },
                timeout=15,
            )
            resp.raise_for_status()
            data = resp.json()

        current = data.get("current", {})
        return {
            "city": coords["name"],
            "country": coords.get("country", ""),
            "temperature": current.get("temperature_2m"),
            "feels_like": current.get("apparent_temperature"),
            "humidity": current.get("relative_humidity_2m"),
            "description": _describe_weather(int(current.get("weather_code", 0))),
            "wind_speed": current.get("wind_speed_10m"),
            "coordinates": coords,
        }
    except httpx.HTTPError as meteo_exc:
        try:
            fallback = await _openweather_current_for_coordinates(coords, coords.get("name") or city)
            if fallback:
                return fallback
        except httpx.HTTPError:
            pass
        return {"error": f"Weather provider unavailable: {meteo_exc}"}


async def get_forecast(city: str) -> dict:
    """Get 5-day forecast for a city."""
    coords = await get_coordinates(city)
    if not coords:
        return {"error": f"City '{city}' not found"}

    try:
        return await _forecast_for_coordinates(coords, coords.get("name") or city)
    except httpx.HTTPError as exc:
        try:
            fallback = await _openweather_forecast_for_coordinates(coords, coords.get("name") or city)
            if fallback:
                return fallback
        except httpx.HTTPError:
            pass
        return {"error": f"Weather provider unavailable: {exc}"}


async def get_forecast_for_coordinates(coords: dict | None, city_label: str = "") -> dict:
    if not isinstance(coords, dict):
        return {"error": "Missing coordinates for forecast lookup"}

    lat = coords.get("lat")
    lon = coords.get("lon")
    if lat is None or lon is None:
        return {"error": "Invalid coordinates for forecast lookup"}

    try:
        return await _forecast_for_coordinates(coords, city_label or coords.get("name") or "Selected destination")
    except httpx.HTTPError as exc:
        try:
            fallback = await _openweather_forecast_for_coordinates(coords, city_label or coords.get("name") or "Selected destination")
            if fallback:
                return fallback
        except httpx.HTTPError:
            pass
        return {"error": f"Weather provider unavailable: {exc}"}
