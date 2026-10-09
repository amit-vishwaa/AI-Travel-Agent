"""
Trip routes: CRUD operations, editable packing lists, and PDF export.
"""
from __future__ import annotations

from datetime import datetime
from typing import List

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, Request, Response, status

from app.config.database import get_database
from app.models.trip import TripCreate, TripUpdate
from app.services.ai_preferences import get_ai_preferences
from app.services.auth import get_current_user
from app.services.flight_search import search_trip_flights
from app.services.pdf_service import build_trip_pdf
from app.services.trip_planner import (
    build_trip_plan,
    compute_duration_days,
    enrich_itinerary_details,
    generate_packing_list,
    normalize_packing_list,
    rebalance_itinerary_costs,
)
from app.services.weather import get_forecast, get_forecast_for_coordinates

router = APIRouter(prefix="/trips", tags=["Trips"])


def trip_doc_to_response(doc: dict) -> dict:
    """Convert a MongoDB document to a serializable dict."""
    doc["id"] = str(doc.pop("_id"))
    if "duration_days" in doc and "duration" not in doc:
        doc["duration"] = doc.pop("duration_days")
    if isinstance(doc.get("itinerary"), dict):
        doc["itinerary"] = rebalance_itinerary_costs(doc["itinerary"], doc, doc.get("currency", "USD"))
    return doc


def _weather_missing_or_invalid(weather: dict | None) -> bool:
    if not isinstance(weather, dict):
        return True
    if weather.get("error"):
        return True
    forecast = weather.get("forecast")
    return not isinstance(forecast, list) or len(forecast) == 0


async def hydrate_trip_doc(doc: dict, db=None) -> dict:
    trip = dict(doc)
    updates: dict = {}

    try:
        weather = trip.get("weather")
        if _weather_missing_or_invalid(weather):
            refreshed_weather = await get_forecast(trip.get("destination", ""))
            if (
                isinstance(refreshed_weather, dict)
                and refreshed_weather.get("error")
                and isinstance((trip.get("route_data") or {}).get("destination"), dict)
            ):
                refreshed_weather = await get_forecast_for_coordinates(
                    (trip.get("route_data") or {}).get("destination"),
                    trip.get("destination", ""),
                )
            if isinstance(refreshed_weather, dict):
                weather = refreshed_weather
                trip["weather"] = refreshed_weather
                updates["weather"] = refreshed_weather
    except Exception:
        weather = trip.get("weather")

    duration_days = trip.get("duration_days")
    if not duration_days:
        try:
            duration_days = compute_duration_days(trip)
            trip["duration_days"] = duration_days
        except Exception:
            duration_days = trip.get("duration") or 1

    try:
        if isinstance(trip.get("itinerary"), dict):
            enriched_itinerary = enrich_itinerary_details(
                trip["itinerary"],
                {**trip, "duration_days": duration_days},
                trip.get("currency", "USD"),
                trip.get("weather"),
                trip.get("packing_list"),
            )
            trip["itinerary"] = rebalance_itinerary_costs(enriched_itinerary, trip, trip.get("currency", "USD"))
            updates["itinerary"] = trip["itinerary"]
    except Exception:
        pass

    if updates and db is not None:
        try:
            updates["updated_at"] = datetime.utcnow()
            await db["trips"].update_one({"_id": trip["_id"]}, {"$set": updates})
        except Exception:
            pass

    return trip


@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_trip(
    trip_data: TripCreate,
    request: Request,
    current_user: dict = Depends(get_current_user),
):
    db = get_database()
    trip_dict = trip_data.model_dump()
    planned = await build_trip_plan(trip_dict, get_ai_preferences(request))
    trip_doc = {
        **trip_dict,
        **planned,
        "user_id": current_user["id"],
    }

    result = await db["trips"].insert_one(trip_doc)
    trip_doc["id"] = str(result.inserted_id)
    trip_doc.pop("_id", None)
    return trip_doc


@router.get("/", response_model=List[dict])
async def get_user_trips(current_user: dict = Depends(get_current_user)):
    db = get_database()
    cursor = db["trips"].find({"user_id": current_user["id"]}).sort("created_at", -1)
    trips = []
    async for doc in cursor:
        trips.append(trip_doc_to_response(doc))
    return trips


@router.get("/{trip_id}")
async def get_trip(trip_id: str, current_user: dict = Depends(get_current_user)):
    db = get_database()
    try:
        doc = await db["trips"].find_one({"_id": ObjectId(trip_id), "user_id": current_user["id"]})
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid trip ID")

    if not doc:
        raise HTTPException(status_code=404, detail="Trip not found")
    hydrated = await hydrate_trip_doc(doc, db)
    return trip_doc_to_response(hydrated)


@router.put("/{trip_id}")
async def update_trip(trip_id: str, trip_update: TripUpdate, current_user: dict = Depends(get_current_user)):
    db = get_database()
    update_data = {k: v for k, v in trip_update.model_dump().items() if v is not None}
    update_data["updated_at"] = datetime.utcnow()

    try:
        result = await db["trips"].update_one(
            {"_id": ObjectId(trip_id), "user_id": current_user["id"]},
            {"$set": update_data},
        )
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid trip ID")

    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Trip not found")
    return {"message": "Trip updated successfully"}


@router.put("/{trip_id}/packing-list")
async def update_packing_list(trip_id: str, packing_list: dict, current_user: dict = Depends(get_current_user)):
    db = get_database()
    normalized = normalize_packing_list(packing_list)
    try:
        result = await db["trips"].update_one(
            {"_id": ObjectId(trip_id), "user_id": current_user["id"]},
            {"$set": {"packing_list": normalized, "updated_at": datetime.utcnow()}},
        )
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid trip ID")

    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Trip not found")
    return {"message": "Packing list updated", "packing_list": normalized}


@router.post("/{trip_id}/packing-list/regenerate")
async def regenerate_packing_list(
    trip_id: str,
    request: Request,
    current_user: dict = Depends(get_current_user),
):
    db = get_database()
    try:
        trip = await db["trips"].find_one({"_id": ObjectId(trip_id), "user_id": current_user["id"]})
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid trip ID")

    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")

    packing_list = await generate_packing_list(trip, trip.get("weather"), get_ai_preferences(request))
    await db["trips"].update_one(
        {"_id": ObjectId(trip_id), "user_id": current_user["id"]},
        {"$set": {"packing_list": packing_list, "updated_at": datetime.utcnow()}},
    )
    return {"message": "AI packing list regenerated", "packing_list": packing_list}


@router.post("/{trip_id}/regenerate")
async def regenerate_trip_plan(
    trip_id: str,
    request: Request,
    current_user: dict = Depends(get_current_user),
):
    db = get_database()
    try:
        trip = await db["trips"].find_one({"_id": ObjectId(trip_id), "user_id": current_user["id"]})
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid trip ID")

    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")

    trip_input = {
        "destination": trip.get("destination"),
        "origin": trip.get("origin"),
        "start_date": trip.get("start_date"),
        "end_date": trip.get("end_date"),
        "budget": trip.get("budget"),
        "currency": trip.get("currency"),
        "travelers": trip.get("travelers"),
        "travel_style": trip.get("travel_style"),
        "interests": trip.get("interests") or [],
        "special_requirements": trip.get("special_requirements"),
    }
    planned = await build_trip_plan(trip_input, get_ai_preferences(request))
    planned["updated_at"] = datetime.utcnow()

    await db["trips"].update_one(
        {"_id": ObjectId(trip_id), "user_id": current_user["id"]},
        {"$set": planned},
    )

    refreshed = await db["trips"].find_one({"_id": ObjectId(trip_id), "user_id": current_user["id"]})
    if not refreshed:
        raise HTTPException(status_code=404, detail="Trip not found after regeneration")
    hydrated = await hydrate_trip_doc(refreshed, db)
    return trip_doc_to_response(hydrated)


@router.get("/{trip_id}/flights")
async def get_trip_flights(trip_id: str, current_user: dict = Depends(get_current_user)):
    db = get_database()
    try:
        trip = await db["trips"].find_one({"_id": ObjectId(trip_id), "user_id": current_user["id"]})
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid trip ID")

    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")

    try:
        return await search_trip_flights(
            trip.get("origin", ""),
            trip.get("destination", ""),
            trip.get("start_date", ""),
            trip.get("end_date"),
            trip.get("currency", "USD"),
        )
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Flight search unavailable: {str(exc)}")


@router.get("/{trip_id}/generate-pdf")
async def generate_trip_pdf(trip_id: str, current_user: dict = Depends(get_current_user)):
    db = get_database()
    try:
        trip = await db["trips"].find_one({"_id": ObjectId(trip_id), "user_id": current_user["id"]})
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid trip ID")

    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")

    trip = trip_doc_to_response(await hydrate_trip_doc(trip, db))
    try:
        pdf_bytes = build_trip_pdf(trip)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"PDF generation failed: {str(exc)}")
    filename = f"trip-{trip['destination'].replace(' ', '-').lower()}.pdf"
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/public/{trip_id}")
async def get_public_trip(trip_id: str):
    """Retrieve trip details for shared public view without requiring authentication."""
    db = get_database()
    try:
        doc = await db["trips"].find_one({"_id": ObjectId(trip_id)})
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid trip ID")

    if not doc:
        raise HTTPException(status_code=404, detail="Trip not found")

    hydrated = await hydrate_trip_doc(doc, db)
    resp = trip_doc_to_response(hydrated)
    resp.pop("user_id", None)
    return resp


@router.get("/{trip_id}/calendar")
async def export_trip_calendar(trip_id: str):
    """Generate and download an iCalendar (.ics) file for the trip."""
    from app.services.calendar_service import build_trip_ical

    db = get_database()
    try:
        doc = await db["trips"].find_one({"_id": ObjectId(trip_id)})
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid trip ID")

    if not doc:
        raise HTTPException(status_code=404, detail="Trip not found")

    hydrated = await hydrate_trip_doc(doc, db)
    trip = trip_doc_to_response(hydrated)
    try:
        ics_bytes = build_trip_ical(trip)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Calendar export failed: {str(exc)}")

    filename = f"trip-{trip.get('destination', 'itinerary').replace(' ', '-').lower()}.ics"
    return Response(
        content=ics_bytes,
        media_type="text/calendar",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.delete("/{trip_id}")
async def delete_trip(trip_id: str, current_user: dict = Depends(get_current_user)):
    db = get_database()
    try:
        result = await db["trips"].delete_one({"_id": ObjectId(trip_id), "user_id": current_user["id"]})
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid trip ID")

    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Trip not found")
    return {"message": "Trip deleted successfully"}
