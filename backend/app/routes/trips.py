"""
Trip routes: CRUD operations for trips plus AI-generated trip planning.
"""
from fastapi import APIRouter, HTTPException, status, Depends
from bson import ObjectId
from typing import List
from datetime import datetime
from app.models.trip import TripCreate, TripUpdate, TripResponse
from app.services.auth import get_current_user
from app.services.ai_service import (
    generate_itinerary, generate_budget_breakdown,
    generate_packing_list, generate_risk_alerts
)
from app.services.weather import get_forecast
from app.services.routing import get_route
from app.config.database import get_database

router = APIRouter(prefix="/trips", tags=["Trips"])

def trip_doc_to_response(doc: dict) -> dict:
    """Convert a MongoDB document to a serialisable dict."""
    doc["id"] = str(doc.pop("_id"))
    return doc

@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_trip(
    trip_data: TripCreate,
    current_user: dict = Depends(get_current_user)
):
    """
    Create a new trip and asynchronously generate:
    - AI itinerary
    - Budget breakdown
    - Packing list
    - Risk alerts
    - Weather forecast
    - Route data
    """
    db = get_database()
    trip_dict = trip_data.model_dump()

    # Gather AI and API data concurrently
    import asyncio
    weather_task = get_forecast(trip_data.destination)
    route_task = get_route(trip_data.origin, trip_data.destination)
    itinerary_task = generate_itinerary(trip_dict)
    budget_task = generate_budget_breakdown(trip_dict)

    weather_data, route_data, itinerary, budget = await asyncio.gather(
        weather_task, route_task, itinerary_task, budget_task, return_exceptions=True
    )

    generation_warnings = []

    if isinstance(weather_data, Exception):
        generation_warnings.append(f"Weather fetch failed: {str(weather_data)}")
        weather_data = {"error": "Weather unavailable right now"}
    if isinstance(route_data, Exception):
        generation_warnings.append(f"Route fetch failed: {str(route_data)}")
        route_data = {"error": "Route unavailable right now", "route_available": False}
    if isinstance(itinerary, Exception):
        generation_warnings.append(f"Itinerary generation failed: {str(itinerary)}")
        itinerary = {"error": "AI itinerary could not be generated right now"}
    if isinstance(budget, Exception):
        generation_warnings.append(f"Budget generation failed: {str(budget)}")
        budget = {"error": "AI budget breakdown could not be generated right now"}

    followup_weather = weather_data if isinstance(weather_data, dict) and "forecast" in weather_data else None
    packing_task = generate_packing_list(trip_dict, followup_weather)
    risk_task = generate_risk_alerts(trip_dict, followup_weather)
    packing_list, risk_alerts = await asyncio.gather(packing_task, risk_task, return_exceptions=True)

    if isinstance(packing_list, Exception):
        generation_warnings.append(f"Packing list generation failed: {str(packing_list)}")
        packing_list = [{"category": "Error", "items": ["Packing suggestions unavailable right now"]}]

    if isinstance(risk_alerts, Exception):
        generation_warnings.append(f"Risk alert generation failed: {str(risk_alerts)}")
        risk_alerts = [{
            "level": "low",
            "category": "General",
            "title": "Unavailable",
            "description": "Risk alerts are unavailable right now.",
            "recommendation": "Please check again later.",
        }]

    # Build the trip document
    trip_doc = {
        **trip_dict,
        "user_id": current_user["id"],
        "itinerary": itinerary,
        "weather_data": weather_data,
        "route_data": route_data,
        "budget_breakdown": budget,
        "packing_list": packing_list,
        "risk_alerts": risk_alerts,
        "generation_warnings": generation_warnings,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    }

    result = await db["trips"].insert_one(trip_doc)
    trip_doc["id"] = str(result.inserted_id)
    trip_doc.pop("_id", None)

    return trip_doc

@router.get("/", response_model=List[dict])
async def get_user_trips(current_user: dict = Depends(get_current_user)):
    """Get all trips for the current user."""
    db = get_database()
    cursor = db["trips"].find({"user_id": current_user["id"]}).sort("created_at", -1)
    trips = []
    async for doc in cursor:
        trips.append(trip_doc_to_response(doc))
    return trips

@router.get("/{trip_id}")
async def get_trip(trip_id: str, current_user: dict = Depends(get_current_user)):
    """Get a specific trip by ID."""
    db = get_database()
    try:
        doc = await db["trips"].find_one({"_id": ObjectId(trip_id), "user_id": current_user["id"]})
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid trip ID")

    if not doc:
        raise HTTPException(status_code=404, detail="Trip not found")

    return trip_doc_to_response(doc)

@router.put("/{trip_id}")
async def update_trip(
    trip_id: str,
    trip_update: TripUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Update trip details."""
    db = get_database()
    update_data = {k: v for k, v in trip_update.model_dump().items() if v is not None}
    update_data["updated_at"] = datetime.utcnow()

    try:
        result = await db["trips"].update_one(
            {"_id": ObjectId(trip_id), "user_id": current_user["id"]},
            {"$set": update_data}
        )
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid trip ID")

    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Trip not found")

    return {"message": "Trip updated successfully"}

@router.delete("/{trip_id}")
async def delete_trip(trip_id: str, current_user: dict = Depends(get_current_user)):
    """Delete a trip."""
    db = get_database()
    try:
        result = await db["trips"].delete_one({"_id": ObjectId(trip_id), "user_id": current_user["id"]})
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid trip ID")

    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Trip not found")

    return {"message": "Trip deleted successfully"}
