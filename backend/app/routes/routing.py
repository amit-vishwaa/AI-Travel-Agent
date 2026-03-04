"""
Route optimization API routes.
"""
from fastapi import APIRouter, HTTPException, Depends, Query
from app.services.routing import get_route, search_places
from app.services.auth import get_current_user

router = APIRouter(prefix="/route", tags=["Routing"])


@router.get("/cities")
async def city_suggestions(
    q: str = Query(..., min_length=1, description="City/place prefix query"),
    limit: int = Query(8, ge=1, le=10),
    current_user: dict = Depends(get_current_user)
):
    """Return global city/place suggestions for autocomplete dropdowns."""
    try:
        return {"suggestions": await search_places(q, size=limit)}
    except Exception as exc:
        raise HTTPException(status_code=503, detail=f"City search unavailable: {str(exc)}")

@router.get("/")
async def calculate_route(
    origin: str,
    destination: str,
    profile: str = "driving-car",
    current_user: dict = Depends(get_current_user)
):
    """
    Get route between two locations.
    Profile: driving-car | foot-walking | cycling-regular
    """
    data = await get_route(origin, destination, profile)
    if "error" in data:
        raise HTTPException(status_code=400, detail=data["error"])
    return data
