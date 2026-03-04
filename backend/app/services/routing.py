"""
Routing service using OpenRouteService API (free tier).
Provides geocoding and route optimization between origin and destination.
"""
import httpx
from app.config.settings import settings

ORS_BASE = "https://api.openrouteservice.org"


async def search_places(query: str, size: int = 8) -> list[dict]:
    """Search city/place suggestions globally by prefix text."""
    if not query or len(query.strip()) < 1:
        return []

    if not settings.OPENROUTESERVICE_API_KEY:
        return []

    async with httpx.AsyncClient() as client:
        resp = await client.get(
            f"{ORS_BASE}/geocode/search",
            params={
                "api_key": settings.OPENROUTESERVICE_API_KEY,
                "text": query.strip(),
                "size": max(1, min(size, 10)),
            },
            timeout=12
        )
        resp.raise_for_status()
        data = resp.json()

    suggestions = []
    for feature in data.get("features", []):
        props = feature.get("properties", {}) or {}
        coords = feature.get("geometry", {}).get("coordinates", [None, None])
        label = props.get("label") or props.get("name")
        if not label:
            continue
        suggestions.append({
            "label": label,
            "name": props.get("name", label),
            "country": props.get("country"),
            "region": props.get("region"),
            "lon": coords[0],
            "lat": coords[1],
        })
    return suggestions

async def geocode_place(place: str) -> dict:
    """Convert a place name to lat/lon coordinates."""
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            f"{ORS_BASE}/geocode/search",
            params={"api_key": settings.OPENROUTESERVICE_API_KEY, "text": place, "size": 1},
            timeout=15
        )
        resp.raise_for_status()
        data = resp.json()

    if not data["features"]:
        return None

    feature = data["features"][0]
    coords = feature["geometry"]["coordinates"]  # [lon, lat]
    return {
        "name": feature["properties"].get("label", place),
        "lon": coords[0],
        "lat": coords[1]
    }

async def get_route(origin: str, destination: str, profile: str = "driving-car") -> dict:
    """
    Get route between two places.
    profile options: driving-car, foot-walking, cycling-regular
    """
    origin_coords = await geocode_place(origin)
    dest_coords = await geocode_place(destination)

    if not origin_coords or not dest_coords:
        return {"error": "Could not geocode one or both locations"}

    async with httpx.AsyncClient() as client:
        resp = await client.post(
            f"{ORS_BASE}/v2/directions/{profile}/json",
            headers={"Authorization": settings.OPENROUTESERVICE_API_KEY, "Content-Type": "application/json"},
            json={
                "coordinates": [
                    [origin_coords["lon"], origin_coords["lat"]],
                    [dest_coords["lon"], dest_coords["lat"]]
                ],
                "instructions": True,
                "language": "en"
            },
            timeout=20
        )

        if resp.status_code != 200:
            # Return basic info without route if ORS fails
            return {
                "origin": origin_coords,
                "destination": dest_coords,
                "route_available": False,
                "message": "Detailed routing not available for this distance"
            }

        data = resp.json()

    route = data["routes"][0]
    summary = route["summary"]

    return {
        "origin": origin_coords,
        "destination": dest_coords,
        "distance_km": round(summary["distance"] / 1000, 2),
        "duration_hours": round(summary["duration"] / 3600, 2),
        "profile": profile,
        "geometry": route.get("geometry", ""),
        "route_available": True,
        "steps": [
            {
                "instruction": step["instruction"],
                "distance_m": step["distance"],
                "duration_s": step["duration"]
            }
            for step in route["segments"][0]["steps"][:10]  # First 10 steps
        ]
    }
