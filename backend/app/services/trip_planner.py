"""
Trip planning orchestration: AI routing, weather intelligence, packing logic, and normalization.
"""
from __future__ import annotations

import asyncio
import json
import re
from datetime import timedelta
from datetime import datetime
from typing import Any

from app.ai.router import generate as route_ai
from app.services.cache import cache
from app.services.ai_service import generateItinerary
from app.services.routing import get_route
from app.services.weather import get_forecast, get_forecast_for_coordinates

PACKING_CATEGORIES = ("clothing", "essentials", "documents", "custom")
ITINERARY_CACHE_VERSION = "itinerary_v3_detailed"
ITINERARY_REFINE_CACHE_VERSION = "itinerary_refine_v3_detailed"
PACKING_CACHE_VERSION = "packing_v2_useful"
ITINERARY_SYSTEM_PROMPT = """
You are an expert travel planner with 20+ years of global experience.
Generate a complete, day-by-day travel itinerary as strict JSON only.
No markdown fences, no explanation, no preamble - pure valid JSON.

Important budgeting rule:
- Do not repeat the same daily budget every day.
- Vary accommodation, transport, meal, and activity costs based on neighborhood, activity type, and dining style.
- Lunch and dinner costs should differ when the plan implies different locations or experiences.

Return this exact schema:
{
  "destination": "string",
  "duration": "string",
  "theme": "string",
  "bestTimeToVisit": "string",
  "currency": "string",
  "language": "string",
  "timezone": "string",
  "overview": "2-3 sentence destination summary",
  "travelTips": ["tip1", "tip2", "tip3", "tip4", "tip5"],
  "emergencyContacts": {
    "police": "string",
    "ambulance": "string",
    "tourist_helpline": "string"
  },
  "days": [
    {
      "day": 1,
      "title": "string",
      "theme": "string",
      "weather": "string",
      "activities": [
        {
          "time": "9:00 AM",
          "activity": "string",
          "location": "string",
          "duration": "string",
          "cost": "string",
          "tips": "string",
          "category": "sightseeing|food|adventure|culture|shopping|relaxation|transport"
        }
      ],
      "meals": {
        "breakfast": "restaurant name + dish",
        "lunch": "restaurant name + dish",
        "dinner": "restaurant name + dish"
      },
      "accommodation": "string",
      "transport": "string",
      "estimatedDailyBudget": "string"
    }
  ],
  "totalBudgetEstimate": "string",
  "packingList": ["item1", "item2"],
  "localPhrases": [
    { "phrase": "local language phrase", "meaning": "english meaning" }
  ]
}
""".strip()

ITINERARY_ALLOWED_CATEGORIES = {
    "sightseeing",
    "food",
    "adventure",
    "culture",
    "shopping",
    "relaxation",
    "transport",
}

DEFAULT_TRAVEL_METADATA = {
    "language": "Local language varies by region",
    "timezone": "Check destination local time before travel",
    "best_time": "Check shoulder season weather and local holidays before booking.",
    "emergency_contacts": {
        "police": "Use the local emergency number",
        "ambulance": "Use the local medical emergency number",
        "tourist_helpline": "Check the official tourism board for live help",
    },
    "local_phrases": [
        {"phrase": "Hello", "meaning": "Greeting"},
        {"phrase": "Thank you", "meaning": "Polite thanks"},
        {"phrase": "Please", "meaning": "Polite request"},
        {"phrase": "Excuse me", "meaning": "Getting attention politely"},
        {"phrase": "Where is this place?", "meaning": "Ask for directions"},
    ],
    "travel_tips": [
        "Save your hotel address offline before you arrive.",
        "Keep one digital and one offline copy of key bookings.",
    ],
}

COUNTRY_TRAVEL_GUIDE = {
    "india": {
        "language": "Hindi, English widely used",
        "timezone": "IST (UTC+5:30)",
        "best_time": "October to March is usually the easiest season for many routes.",
        "emergency_contacts": {"police": "112", "ambulance": "108 / 102", "tourist_helpline": "1363"},
        "local_phrases": [
            {"phrase": "Namaste", "meaning": "Hello"},
            {"phrase": "Dhanyavaad", "meaning": "Thank you"},
            {"phrase": "Kripya", "meaning": "Please"},
            {"phrase": "Kitna hai?", "meaning": "How much is it?"},
            {"phrase": "Madad chahiye", "meaning": "I need help"},
        ],
    },
    "france": {
        "language": "French",
        "timezone": "CET / CEST",
        "best_time": "April to June and September to October are often comfortable.",
        "emergency_contacts": {"police": "17", "ambulance": "15", "tourist_helpline": "Official local tourism office"},
        "local_phrases": [
            {"phrase": "Bonjour", "meaning": "Hello"},
            {"phrase": "Merci", "meaning": "Thank you"},
            {"phrase": "S'il vous plait", "meaning": "Please"},
            {"phrase": "Ou est...?", "meaning": "Where is...?"},
            {"phrase": "Aidez-moi", "meaning": "Help me"},
        ],
    },
    "italy": {
        "language": "Italian",
        "timezone": "CET / CEST",
        "best_time": "April to June and September are usually comfortable for city trips.",
        "emergency_contacts": {"police": "112", "ambulance": "118", "tourist_helpline": "Official regional tourism office"},
        "local_phrases": [
            {"phrase": "Ciao", "meaning": "Hello"},
            {"phrase": "Grazie", "meaning": "Thank you"},
            {"phrase": "Per favore", "meaning": "Please"},
            {"phrase": "Dov'e...?", "meaning": "Where is...?"},
            {"phrase": "Aiuto", "meaning": "Help"},
        ],
    },
    "spain": {
        "language": "Spanish",
        "timezone": "CET / CEST",
        "best_time": "Spring and early autumn are often the easiest for walking-heavy plans.",
        "emergency_contacts": {"police": "091 / 112", "ambulance": "061 / 112", "tourist_helpline": "Official city tourism office"},
        "local_phrases": [
            {"phrase": "Hola", "meaning": "Hello"},
            {"phrase": "Gracias", "meaning": "Thank you"},
            {"phrase": "Por favor", "meaning": "Please"},
            {"phrase": "Donde esta...?", "meaning": "Where is...?"},
            {"phrase": "Necesito ayuda", "meaning": "I need help"},
        ],
    },
    "japan": {
        "language": "Japanese",
        "timezone": "JST (UTC+9)",
        "best_time": "Spring and autumn are usually popular for moderate weather.",
        "emergency_contacts": {"police": "110", "ambulance": "119", "tourist_helpline": "Japan Visitor Hotline"},
        "local_phrases": [
            {"phrase": "Konnichiwa", "meaning": "Hello"},
            {"phrase": "Arigato", "meaning": "Thank you"},
            {"phrase": "Onegaishimasu", "meaning": "Please"},
            {"phrase": "... wa doko desu ka?", "meaning": "Where is ...?"},
            {"phrase": "Tasuke te kudasai", "meaning": "Please help me"},
        ],
    },
    "thailand": {
        "language": "Thai",
        "timezone": "ICT (UTC+7)",
        "best_time": "November to February is often the most comfortable for many travelers.",
        "emergency_contacts": {"police": "191", "ambulance": "1669", "tourist_helpline": "1155 Tourist Police"},
        "local_phrases": [
            {"phrase": "Sawasdee", "meaning": "Hello"},
            {"phrase": "Khop khun", "meaning": "Thank you"},
            {"phrase": "Karuna", "meaning": "Please"},
            {"phrase": "... yoo tee nai?", "meaning": "Where is ...?"},
            {"phrase": "Chuay duay", "meaning": "Please help"},
        ],
    },
    "united arab emirates": {
        "language": "Arabic, English widely used",
        "timezone": "GST (UTC+4)",
        "best_time": "November to March is usually the easiest season for outdoor plans.",
        "emergency_contacts": {"police": "999", "ambulance": "998", "tourist_helpline": "Official emirate tourism office"},
        "local_phrases": [
            {"phrase": "Marhaba", "meaning": "Hello"},
            {"phrase": "Shukran", "meaning": "Thank you"},
            {"phrase": "Min fadlak", "meaning": "Please"},
            {"phrase": "Ayna...?", "meaning": "Where is ...?"},
            {"phrase": "Ahtaj musa'ada", "meaning": "I need help"},
        ],
    },
    "united kingdom": {
        "language": "English",
        "timezone": "GMT / BST",
        "best_time": "Late spring to early autumn is usually easier for walking and day trips.",
        "emergency_contacts": {"police": "999 / 112", "ambulance": "999 / 112", "tourist_helpline": "Official local tourism office"},
        "local_phrases": [
            {"phrase": "Hello", "meaning": "Greeting"},
            {"phrase": "Cheers", "meaning": "Thanks / friendly acknowledgement"},
            {"phrase": "Please", "meaning": "Polite request"},
            {"phrase": "Where is...?", "meaning": "Ask for directions"},
            {"phrase": "I need help", "meaning": "Emergency request"},
        ],
    },
    "united states": {
        "language": "English",
        "timezone": "Varies by state",
        "best_time": "Check the local season because conditions vary heavily by region.",
        "emergency_contacts": {"police": "911", "ambulance": "911", "tourist_helpline": "Official city or state tourism office"},
        "local_phrases": [
            {"phrase": "Hello", "meaning": "Greeting"},
            {"phrase": "Thank you", "meaning": "Polite thanks"},
            {"phrase": "Please", "meaning": "Polite request"},
            {"phrase": "Where is...?", "meaning": "Ask for directions"},
            {"phrase": "I need help", "meaning": "Emergency request"},
        ],
    },
    "singapore": {
        "language": "English, Mandarin, Malay, Tamil",
        "timezone": "SGT (UTC+8)",
        "best_time": "Year-round travel is common; plan around showers and humidity.",
        "emergency_contacts": {"police": "999", "ambulance": "995", "tourist_helpline": "Singapore Visitor Hotline"},
        "local_phrases": [
            {"phrase": "Hello", "meaning": "Greeting"},
            {"phrase": "Xie xie", "meaning": "Thank you"},
            {"phrase": "Tolong", "meaning": "Please / help"},
            {"phrase": "Di mana...?", "meaning": "Where is ...?"},
            {"phrase": "I need help", "meaning": "Emergency request"},
        ],
    },
}

COUNTRY_ALIASES = {
    "uae": "united arab emirates",
    "u.a.e.": "united arab emirates",
    "uk": "united kingdom",
    "england": "united kingdom",
    "great britain": "united kingdom",
    "usa": "united states",
    "u.s.a.": "united states",
    "us": "united states",
    "u.s.": "united states",
}


def compute_duration_days(trip_data: dict) -> int:
    if trip_data.get("duration_days"):
        return int(trip_data["duration_days"])
    start = datetime.fromisoformat(trip_data["start_date"])
    end = datetime.fromisoformat(trip_data["end_date"])
    return max((end - start).days, 1)


def infer_currency(destination: str, weather_data: dict | None = None) -> str:
    coords = (weather_data or {}).get("coordinates", {})
    joined = " ".join([destination or "", coords.get("name", ""), coords.get("country", "")]).lower()
    return "INR" if "india" in joined or str(coords.get("country", "")).upper() == "IN" else "USD"


def currency_symbol(currency: str) -> str:
    return "Rs" if (currency or "").upper() == "INR" else "$"


def _interest_labels(trip_data: dict) -> list[str]:
    return [str(item).strip() for item in (trip_data.get("interests") or []) if str(item).strip()]


def _interest_templates(interests: list[str]) -> list[dict[str, str]]:
    library = {
        "History & Culture": {
            "morning": "heritage walk",
            "afternoon": "museum or old-town exploration",
            "evening": "local cultural performance or historic square visit",
        },
        "Food & Cuisine": {
            "morning": "breakfast market or signature cafe stop",
            "afternoon": "street food trail or cooking experience",
            "evening": "regional dinner at a well-rated local restaurant",
        },
        "Nature & Wildlife": {
            "morning": "park, lakefront, or scenic viewpoint visit",
            "afternoon": "garden, trail, or nature reserve time",
            "evening": "sunset walk in a calmer outdoor area",
        },
        "Art & Museums": {
            "morning": "gallery district or museum start",
            "afternoon": "design quarter or exhibition visit",
            "evening": "creative neighborhood cafe or performance space",
        },
        "Beaches": {
            "morning": "beachfront start before peak heat",
            "afternoon": "shade-friendly coastal break",
            "evening": "sunset by the waterfront",
        },
        "Nightlife": {
            "morning": "slow start with brunch or coffee",
            "afternoon": "relaxed neighborhood exploration",
            "evening": "bars, live music, or late dining district",
        },
        "Adventure & Sports": {
            "morning": "active outing or guided sports session",
            "afternoon": "recovery lunch and lighter activity",
            "evening": "easy dinner and rest",
        },
        "Shopping": {
            "morning": "artisan or local shopping street",
            "afternoon": "market and boutique browsing",
            "evening": "leisurely dinner near a commercial district",
        },
        "Photography": {
            "morning": "golden-hour photo walk",
            "afternoon": "landmark and street-scene capture session",
            "evening": "sunset and night-light viewpoints",
        },
        "Spirituality": {
            "morning": "temple, church, or meditation-friendly site",
            "afternoon": "quiet reflective stop or garden visit",
            "evening": "peaceful local ritual or calm neighborhood walk",
        },
    }
    return [library[name] for name in interests if name in library]


def _generic_location(location: str | None, destination: str) -> bool:
    value = (location or "").strip().lower()
    destination_value = (destination or "").strip().lower()
    generic_terms = {
        "",
        destination_value,
        "city center",
        "downtown",
        "old town",
        "local market",
        "museum area",
        "historic district",
        "popular neighborhood",
        "waterfront",
    }
    return value in generic_terms


def _country_candidates(destination: str, weather_data: dict | None = None) -> list[str]:
    coords = (weather_data or {}).get("coordinates", {}) if isinstance(weather_data, dict) else {}
    raw_values = [
        coords.get("country"),
        coords.get("name"),
        destination,
    ]
    candidates: list[str] = []
    for raw in raw_values:
        text = str(raw or "").strip().lower()
        if not text:
            continue
        candidates.append(text)
        parts = [part.strip() for part in re.split(r"[,/|-]", text) if part.strip()]
        candidates.extend(parts)
    return candidates


def _travel_metadata(destination: str, weather_data: dict | None = None) -> dict[str, Any]:
    metadata = dict(DEFAULT_TRAVEL_METADATA)
    metadata["emergency_contacts"] = dict(DEFAULT_TRAVEL_METADATA["emergency_contacts"])
    metadata["local_phrases"] = [dict(item) for item in DEFAULT_TRAVEL_METADATA["local_phrases"]]
    metadata["travel_tips"] = list(DEFAULT_TRAVEL_METADATA["travel_tips"])

    candidates = _country_candidates(destination, weather_data)
    matched_key = ""
    for candidate in candidates:
        normalized = COUNTRY_ALIASES.get(candidate, candidate)
        if normalized in COUNTRY_TRAVEL_GUIDE:
            matched_key = normalized
            break
        for country_name in COUNTRY_TRAVEL_GUIDE:
            if country_name in normalized or normalized in country_name:
                matched_key = country_name
                break
        if matched_key:
            break

    if matched_key:
        guide = COUNTRY_TRAVEL_GUIDE[matched_key]
        metadata.update({
            "language": guide.get("language", metadata["language"]),
            "timezone": guide.get("timezone", metadata["timezone"]),
            "best_time": guide.get("best_time", metadata["best_time"]),
        })
        metadata["emergency_contacts"] = {
            **metadata["emergency_contacts"],
            **dict(guide.get("emergency_contacts") or {}),
        }
        metadata["local_phrases"] = [dict(item) for item in guide.get("local_phrases") or metadata["local_phrases"]]

    return metadata


def _text(value: Any) -> str:
    return str(value or "").strip()


def _number(value: Any) -> float | None:
    if isinstance(value, bool):
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def _amount_from_text(value: Any) -> float | None:
    text = _text(value).replace(",", "")
    if not text:
        return None
    match = re.search(r"(-?\d+(?:\.\d+)?)", text)
    if not match:
        return None
    try:
        return float(match.group(1))
    except ValueError:
        return None


def _format_amount(amount: float, currency: str) -> str:
    rounded = max(round(float(amount or 0)), 0)
    symbols = {
        "USD": "$",
        "INR": "Rs ",
        "EUR": "EUR ",
        "GBP": "GBP ",
        "AED": "AED ",
        "JPY": "JPY ",
        "AUD": "AUD ",
        "CAD": "CAD ",
        "SGD": "SGD ",
    }
    prefix = symbols.get((currency or "").upper(), f"{currency} ")
    return f"{prefix}{rounded:,}"


def _duration_hours(value: Any) -> float:
    text = _text(value).lower()
    numbers = [float(part) for part in re.findall(r"\d+(?:\.\d+)?", text)]
    if not numbers:
        return 2.0
    if len(numbers) >= 2:
        return max(sum(numbers[:2]) / 2, 1.0)
    return max(numbers[0], 1.0)


def _weighted_factor(text: Any, weights: dict[str, float], default: float = 1.0) -> float:
    haystack = _text(text).lower()
    factor = default
    for keyword, delta in weights.items():
        if keyword in haystack:
            factor += delta
    return min(max(factor, 0.72), 1.65)


def _stay_factor(text: Any) -> float:
    return _weighted_factor(text, {
        "luxury": 0.28,
        "grand": 0.18,
        "premium": 0.18,
        "boutique": 0.12,
        "resort": 0.24,
        "waterfront": 0.16,
        "prime": 0.14,
        "central": 0.09,
        "old town": 0.08,
        "hostel": -0.18,
        "budget": -0.16,
        "transit hub": -0.08,
    })


def _location_factor(text: Any) -> float:
    return _weighted_factor(text, {
        "waterfront": 0.14,
        "old town": 0.1,
        "historic": 0.08,
        "museum": 0.06,
        "market": 0.07,
        "food street": 0.09,
        "downtown": 0.08,
        "central": 0.06,
        "promenade": 0.08,
        "district": 0.04,
        "transit hub": -0.06,
        "suburban": -0.08,
    })


def _meal_factor(text: Any, meal_name: str, day_index: int) -> float:
    base = {"breakfast": 0.9, "lunch": 1.0, "dinner": 1.12}.get(meal_name, 1.0)
    factor = _weighted_factor(text, {
        "hotel": 0.02,
        "bakery": -0.04,
        "street": -0.08,
        "cafe": -0.03,
        "casual": -0.02,
        "market": 0.04,
        "signature": 0.12,
        "chef": 0.12,
        "rooftop": 0.14,
        "tasting": 0.16,
        "waterfront": 0.09,
        "fine dining": 0.18,
    }, default=base)
    return factor * (1 + (day_index % 3) * 0.03)


def _activity_factor(activity: dict[str, Any], day_index: int) -> float:
    category = _text(activity.get("category")).lower()
    category_factor = {
        "transport": 0.78,
        "food": 0.92,
        "sightseeing": 1.0,
        "culture": 1.04,
        "shopping": 1.08,
        "relaxation": 0.96,
        "adventure": 1.18,
    }.get(category, 1.0)
    duration_factor = 0.82 + min(_duration_hours(activity.get("duration")), 5.0) * 0.09
    time_factor = 1.06 if "pm" in _text(activity.get("time")).lower() else 0.98
    return category_factor * duration_factor * time_factor * _location_factor(activity.get("location")) * (1 + (day_index % 2) * 0.04)


def _rebalance_legacy_itinerary_costs(payload: dict[str, Any], trip_data: dict, currency: str) -> dict[str, Any]:
    days = payload.get("days") or []
    if not days:
        return payload

    total_target = sum(
        (_number(day.get("daily_total_estimate")) or _number((day.get("cost_breakdown") or {}).get("total")) or 0)
        for day in days
    )
    if total_target <= 0:
        total_target = max(float(trip_data.get("budget") or 0), 0)
    if total_target <= 0:
        return payload

    adjusted_days: list[dict[str, Any]] = []
    raw_totals: list[float] = []
    base_day_budget = total_target / max(len(days), 1)

    for index, day in enumerate(days):
        morning = day.get("morning") or {}
        afternoon = day.get("afternoon") or {}
        evening = day.get("evening") or {}
        activities = [morning, afternoon, evening]
        accommodation = day.get("accommodation") or {}
        transport = day.get("transport") or {}
        meals = day.get("meals") or []
        cost_breakdown = day.get("cost_breakdown") or {}

        activity_values = []
        for slot_name, activity in zip(("morning", "afternoon", "evening"), activities):
            base_value = _number(activity.get("estimated_cost")) or base_day_budget * {"morning": 0.15, "afternoon": 0.18, "evening": 0.14}[slot_name]
            activity_values.append(base_value * _activity_factor({
                "category": "food" if slot_name == "evening" and "dinner" in _text(activity.get("description")).lower() else "sightseeing",
                "duration": activity.get("duration"),
                "time": {"morning": "9:00 AM", "afternoon": "1:00 PM", "evening": "6:00 PM"}[slot_name],
                "location": activity.get("location"),
            }, index))

        adjusted_meals = []
        for meal in meals:
            meal_name = _text(meal.get("meal")).lower() or "meal"
            default_share = {"breakfast": 0.07, "lunch": 0.12, "dinner": 0.16}.get(meal_name, 0.1)
            base_value = _number(meal.get("cost")) or base_day_budget * default_share
            adjusted_meals.append(base_value * _meal_factor(meal.get("suggestion"), meal_name, index))

        stay_value = (_number(accommodation.get("estimated_cost_per_night")) or base_day_budget * 0.34) * _stay_factor(
            f"{accommodation.get('type', '')} {accommodation.get('name', '')} {accommodation.get('area', '')}"
        ) * (1 + (index % 3) * 0.04)
        transport_value = (_number(transport.get("estimated_cost")) or base_day_budget * 0.1) * _location_factor(
            f"{transport.get('details', '')} {morning.get('location', '')} {afternoon.get('location', '')}"
        ) * (1 + len([item for item in activities if item]) * 0.02)
        other_value = (_number(cost_breakdown.get("other")) or base_day_budget * 0.05) * (0.94 + (index % 4) * 0.03)

        raw_total = sum(activity_values) + sum(adjusted_meals) + stay_value + transport_value + other_value
        adjusted_days.append({
            "day": day,
            "activity_values": activity_values,
            "meal_values": adjusted_meals,
            "stay_value": stay_value,
            "transport_value": transport_value,
            "other_value": other_value,
            "raw_total": raw_total,
        })
        raw_totals.append(raw_total)

    scale = total_target / max(sum(raw_totals), 1)

    for item in adjusted_days:
        day = item["day"]
        morning, afternoon, evening = day.get("morning") or {}, day.get("afternoon") or {}, day.get("evening") or {}
        activities = [morning, afternoon, evening]
        for activity, value in zip(activities, item["activity_values"]):
            activity["estimated_cost"] = round(value * scale, 2)

        for meal, value in zip(day.get("meals") or [], item["meal_values"]):
            meal["cost"] = round(value * scale, 2)

        accommodation = day.get("accommodation") or {}
        transport = day.get("transport") or {}
        cost_breakdown = day.get("cost_breakdown") or {}
        accommodation["estimated_cost_per_night"] = round(item["stay_value"] * scale, 2)
        transport["estimated_cost"] = round(item["transport_value"] * scale, 2)

        activities_total = round(sum(activity.get("estimated_cost") or 0 for activity in activities), 2)
        food_total = round(sum((_number(meal.get("cost")) or 0) for meal in (day.get("meals") or [])), 2)
        transport_total = round(transport.get("estimated_cost") or 0, 2)
        stay_total = round(accommodation.get("estimated_cost_per_night") or 0, 2)
        other_total = round(item["other_value"] * scale, 2)
        total = round(activities_total + food_total + transport_total + stay_total + other_total, 2)

        cost_breakdown.update({
            "activities": activities_total,
            "food": food_total,
            "transport": transport_total,
            "stay": stay_total,
            "other": other_total,
            "total": total,
        })
        day["cost_breakdown"] = cost_breakdown
        day["daily_total_estimate"] = total

    return payload


def _rebalance_structured_itinerary_costs(payload: dict[str, Any], trip_data: dict, currency: str) -> dict[str, Any]:
    days = payload.get("days") or []
    if not days:
        return payload

    total_target = sum((_amount_from_text(day.get("estimatedDailyBudget")) or 0) for day in days)
    if total_target <= 0:
        total_target = _amount_from_text(payload.get("totalBudgetEstimate")) or max(float(trip_data.get("budget") or 0), 0)
    if total_target <= 0:
        return payload

    raw_days: list[dict[str, Any]] = []
    total_raw = 0.0
    base_day_budget = total_target / max(len(days), 1)
    meal_defaults = {
        "breakfast": base_day_budget * 0.08,
        "lunch": base_day_budget * 0.12,
        "dinner": base_day_budget * 0.16,
    }

    for index, day in enumerate(days):
        activities = day.get("activities") or []
        activity_values = []
        for activity in activities:
            base_value = _amount_from_text(activity.get("cost")) or base_day_budget * 0.12
            activity_values.append(base_value * _activity_factor(activity, index))

        meals = day.get("meals") or {}
        meal_values = {
            meal_name: meal_defaults[meal_name] * _meal_factor(meals.get(meal_name), meal_name, index)
            for meal_name in ("breakfast", "lunch", "dinner")
        }

        stay_value = base_day_budget * 0.34 * _stay_factor(day.get("accommodation")) * (1 + (index % 3) * 0.04)
        transport_value = base_day_budget * 0.1 * _location_factor(
            f"{day.get('transport', '')} {' '.join(_text(activity.get('location')) for activity in activities[:2])}"
        ) * (1 + len(activities) * 0.025)
        misc_value = base_day_budget * 0.05 * (0.95 + (index % 4) * 0.03)
        raw_total = sum(activity_values) + sum(meal_values.values()) + stay_value + transport_value + misc_value

        raw_days.append({
            "day": day,
            "activity_values": activity_values,
            "meal_values": meal_values,
            "stay_value": stay_value,
            "transport_value": transport_value,
            "misc_value": misc_value,
            "raw_total": raw_total,
        })
        total_raw += raw_total

    scale = total_target / max(total_raw, 1)
    final_total = 0.0

    for entry in raw_days:
        day = entry["day"]
        for activity, value in zip(day.get("activities") or [], entry["activity_values"]):
            activity["cost"] = _format_amount(value * scale, currency)
        day_total = round(entry["raw_total"] * scale, 2)
        day["estimatedDailyBudget"] = _format_amount(day_total, currency)
        final_total += day_total

    payload["totalBudgetEstimate"] = _format_amount(final_total, currency)
    return payload


def rebalance_itinerary_costs(payload: dict[str, Any], trip_data: dict, currency: str) -> dict[str, Any]:
    if not isinstance(payload, dict):
        return payload
    days = payload.get("days") or []
    if not isinstance(days, list) or not days:
        return payload
    try:
        if days and isinstance(days[0], dict) and isinstance(days[0].get("activities"), list):
            return _rebalance_structured_itinerary_costs(payload, trip_data, currency)
        if days and isinstance(days[0], dict) and any(key in days[0] for key in ("morning", "afternoon", "evening")):
            return _rebalance_legacy_itinerary_costs(payload, trip_data, currency)
    except Exception:
        return payload
    return payload


def _style_text(trip_data: dict) -> str:
    interests = [item for item in _interest_labels(trip_data) if item]
    if interests:
        return ", ".join(interests)
    return _text(trip_data.get("travel_style")) or "balanced"


def _budget_level(trip_data: dict) -> str:
    return _text(trip_data.get("travel_style")) or "balanced"


def _ai_cache_hint(ai_preferences: dict[str, Any] | None = None) -> dict[str, Any]:
    prefs = ai_preferences or {}
    return {
        "provider": prefs.get("provider"),
        "model": prefs.get("model"),
    }


def _itinerary_user_prompt(trip_data: dict) -> str:
    return (
        f"Create a {trip_data.get('duration_days')}-day travel itinerary for {trip_data.get('destination')}.\n"
        f"Travel style: {_style_text(trip_data)}. Budget level: {_budget_level(trip_data)}.\n"
        "Cover morning, afternoon, and evening every day.\n"
        "Include hidden gems, local food spots, transport between locations,\n"
        "safety tips, and at least 5 local phrases.\n"
        "Make daily budgets vary naturally based on area, meals, accommodation, and activity intensity."
    )


def _parse_itinerary_json(raw: str) -> dict[str, Any]:
    text = (raw or "").strip()
    text = re.sub(r"^```(?:json)?\s*", "", text, flags=re.IGNORECASE)
    text = re.sub(r"\s*```$", "", text)
    if not text:
        raise ValueError("Empty itinerary response")

    try:
        payload = json.loads(text)
    except json.JSONDecodeError:
        match = re.search(r"\{[\s\S]*\}", text)
        if not match:
            raise ValueError("The itinerary response was not valid JSON")
        try:
            payload = json.loads(match.group(0))
        except json.JSONDecodeError as exc:
            raise ValueError("The itinerary response could not be parsed as JSON") from exc

    if not isinstance(payload, dict):
        raise ValueError("The itinerary response must be a JSON object")
    return payload


def _friendly_itinerary_error() -> dict[str, Any]:
    return {
        "error": "We couldn't generate a readable itinerary right now. Please try again.",
        "_meta": {"provider": "Unavailable", "cached": False},
    }


def _validate_structured_itinerary(payload: Any, trip_data: dict) -> None:
    if not isinstance(payload, dict):
        raise ValueError("Itinerary payload must be a JSON object")

    required_strings = (
        "destination",
        "duration",
        "theme",
        "bestTimeToVisit",
        "currency",
        "language",
        "timezone",
        "overview",
        "totalBudgetEstimate",
    )
    for field_name in required_strings:
        if not _text(payload.get(field_name)):
            raise ValueError(f"Itinerary field '{field_name}' is missing")

    travel_tips = payload.get("travelTips")
    if not isinstance(travel_tips, list) or len([tip for tip in travel_tips if _text(tip)]) < 5:
        raise ValueError("Travel tips are incomplete")

    packing_list = payload.get("packingList")
    if not isinstance(packing_list, list) or len([item for item in packing_list if _text(item)]) < 2:
        raise ValueError("Packing list is incomplete")

    local_phrases = payload.get("localPhrases")
    if not isinstance(local_phrases, list) or len(local_phrases) < 5:
        raise ValueError("Local phrases are incomplete")
    for index, phrase in enumerate(local_phrases, start=1):
        if not isinstance(phrase, dict) or not _text(phrase.get("phrase")) or not _text(phrase.get("meaning")):
            raise ValueError(f"Local phrase {index} is incomplete")

    contacts = payload.get("emergencyContacts")
    if not isinstance(contacts, dict):
        raise ValueError("Emergency contacts are missing")
    for field_name in ("police", "ambulance", "tourist_helpline"):
        if not _text(contacts.get(field_name)):
            raise ValueError(f"Emergency contact '{field_name}' is missing")

    expected_days = max(int(trip_data.get("duration_days") or 1), 1)
    days = payload.get("days")
    if not isinstance(days, list) or len(days) < expected_days:
        raise ValueError("Itinerary does not include all trip days")

    for day_index, day in enumerate(days[:expected_days], start=1):
        if not isinstance(day, dict):
            raise ValueError(f"Day {day_index} is invalid")
        for field_name in ("title", "theme", "weather", "accommodation", "transport", "estimatedDailyBudget"):
            if not _text(day.get(field_name)):
                raise ValueError(f"Day {day_index} field '{field_name}' is missing")
        meals = day.get("meals")
        if not isinstance(meals, dict):
            raise ValueError(f"Day {day_index} meals are missing")
        for field_name in ("breakfast", "lunch", "dinner"):
            if not _text(meals.get(field_name)):
                raise ValueError(f"Day {day_index} meal '{field_name}' is missing")

        activities = day.get("activities")
        if not isinstance(activities, list) or len(activities) < 3:
            raise ValueError(f"Day {day_index} activities are incomplete")
        for activity_index, activity in enumerate(activities, start=1):
            if not isinstance(activity, dict):
                raise ValueError(f"Day {day_index} activity {activity_index} is invalid")
            for field_name in ("time", "activity", "location", "duration", "cost", "tips", "category"):
                if not _text(activity.get(field_name)):
                    raise ValueError(f"Day {day_index} activity {activity_index} field '{field_name}' is missing")
            if _text(activity.get("category")).lower() not in ITINERARY_ALLOWED_CATEGORIES:
                raise ValueError(f"Day {day_index} activity {activity_index} category is invalid")


def _validate_itinerary_payload(
    payload: Any,
    trip_data: dict,
    *,
    require_specific_locations: bool,
) -> None:
    if not isinstance(payload, dict):
        raise ValueError("Itinerary payload must be a JSON object")

    duration_days = max(int(trip_data.get("duration_days") or 1), 1)
    destination = trip_data.get("destination", "")
    interests = _interest_labels(trip_data)

    if not _text(payload.get("trip_summary")):
        raise ValueError("Itinerary summary is missing")

    highlights = [item for item in (payload.get("highlights") or []) if _text(item)]
    local_tips = [item for item in (payload.get("local_tips") or []) if _text(item)]
    travel_suggestions = [item for item in (payload.get("travel_suggestions") or []) if _text(item)]
    hotel_suggestions = payload.get("hotel_suggestions") or []
    days = payload.get("days") or []

    if not isinstance(days, list) or len(days) < duration_days:
        raise ValueError("Itinerary does not include all trip days")
    if len(highlights) < 3:
        raise ValueError("Itinerary highlights are too thin")
    if len(local_tips) < 2:
        raise ValueError("Local tips are too thin")
    if len(travel_suggestions) < 2:
        raise ValueError("Travel suggestions are too thin")
    if not isinstance(hotel_suggestions, list) or len(hotel_suggestions) < 2:
        raise ValueError("Hotel suggestions are missing")

    for day_index, day in enumerate(days[:duration_days], start=1):
        if not isinstance(day, dict):
            raise ValueError(f"Day {day_index} is not an object")
        if not _text(day.get("theme")):
            raise ValueError(f"Day {day_index} theme is missing")
        day_total = _number(day.get("daily_total_estimate"))
        if day_total is None or day_total <= 0:
            raise ValueError(f"Day {day_index} total estimate is missing")

        meals = day.get("meals") or []
        if not isinstance(meals, list) or len(meals) < 2:
            raise ValueError(f"Day {day_index} meals are missing")
        for meal_index, meal in enumerate(meals, start=1):
            if not isinstance(meal, dict):
                raise ValueError(f"Day {day_index} meal {meal_index} is invalid")
            if not _text(meal.get("meal")) or not _text(meal.get("suggestion")):
                raise ValueError(f"Day {day_index} meal {meal_index} details are incomplete")
            meal_cost = _number(meal.get("cost"))
            if meal_cost is None or meal_cost < 0:
                raise ValueError(f"Day {day_index} meal {meal_index} cost is invalid")

        for slot_name in ("morning", "afternoon", "evening"):
            slot = day.get(slot_name)
            if not isinstance(slot, dict):
                raise ValueError(f"Day {day_index} {slot_name} slot is missing")
            if not _text(slot.get("activity")):
                raise ValueError(f"Day {day_index} {slot_name} activity is missing")
            if not _text(slot.get("description")):
                raise ValueError(f"Day {day_index} {slot_name} description is missing")
            if not _text(slot.get("location")):
                raise ValueError(f"Day {day_index} {slot_name} location is missing")
            if not _text(slot.get("duration")):
                raise ValueError(f"Day {day_index} {slot_name} duration is missing")
            slot_cost = _number(slot.get("estimated_cost"))
            if slot_cost is None or slot_cost < 0:
                raise ValueError(f"Day {day_index} {slot_name} cost is invalid")
            if require_specific_locations and _generic_location(slot.get("location"), destination):
                raise ValueError(f"Day {day_index} {slot_name} location is too generic")

        transport = day.get("transport")
        if not isinstance(transport, dict) or not _text(transport.get("mode")):
            raise ValueError(f"Day {day_index} transport details are missing")
        if not _text(transport.get("details")):
            raise ValueError(f"Day {day_index} transport description is missing")
        transport_cost = _number(transport.get("estimated_cost"))
        if transport_cost is None or transport_cost < 0:
            raise ValueError(f"Day {day_index} transport cost is invalid")

        accommodation = day.get("accommodation")
        if not isinstance(accommodation, dict):
            raise ValueError(f"Day {day_index} accommodation is missing")
        if not _text(accommodation.get("type")) or not _text(accommodation.get("name")):
            raise ValueError(f"Day {day_index} accommodation details are incomplete")
        if not _text(accommodation.get("area")):
            raise ValueError(f"Day {day_index} accommodation area is missing")
        nightly_cost = _number(accommodation.get("estimated_cost_per_night"))
        if nightly_cost is None or nightly_cost <= 0:
            raise ValueError(f"Day {day_index} accommodation cost is invalid")
        if require_specific_locations and _generic_location(accommodation.get("area"), destination):
            raise ValueError(f"Day {day_index} accommodation area is too generic")

        cost_breakdown = day.get("cost_breakdown")
        if not isinstance(cost_breakdown, dict):
            raise ValueError(f"Day {day_index} cost breakdown is missing")
        for field_name in ("activities", "food", "transport", "stay", "other", "total"):
            field_value = _number(cost_breakdown.get(field_name))
            if field_value is None or field_value < 0:
                raise ValueError(f"Day {day_index} cost breakdown field '{field_name}' is invalid")
        if abs((_number(cost_breakdown.get("total")) or 0) - day_total) > max(5, day_total * 0.15):
            raise ValueError(f"Day {day_index} total does not match cost breakdown")

    for hotel_index, hotel in enumerate(hotel_suggestions[:3], start=1):
        if not isinstance(hotel, dict):
            raise ValueError(f"Hotel suggestion {hotel_index} is not an object")
        if not _text(hotel.get("name")) or not _text(hotel.get("area")):
            raise ValueError(f"Hotel suggestion {hotel_index} is incomplete")
        nightly_cost = _number(hotel.get("price_per_night"))
        if nightly_cost is None or nightly_cost <= 0:
            raise ValueError(f"Hotel suggestion {hotel_index} price is invalid")
        if require_specific_locations and _generic_location(hotel.get("area"), destination):
            raise ValueError(f"Hotel suggestion {hotel_index} area is too generic")

    if interests and _interest_relevance_score(payload, interests) == 0:
        raise ValueError("Itinerary is not aligned with traveler interests")


def _validate_packing_list_payload(payload: Any, trip_data: dict, weather_data: dict | None = None) -> None:
    normalized = normalize_packing_list(payload)
    minimum_counts = {
        "clothing": 4,
        "essentials": 4,
        "documents": 2,
        "custom": 2,
    }

    for category in PACKING_CATEGORIES:
        items = normalized.get(category) or []
        if len(items) < minimum_counts[category]:
            raise ValueError(f"Packing list category '{category}' is too small")
        if any(not _text(item.get("name")) for item in items):
            raise ValueError(f"Packing list category '{category}' contains empty items")

    total_items = sum(len(normalized.get(category) or []) for category in PACKING_CATEGORIES)
    if total_items < 12:
        raise ValueError("Packing list is too short")

    forecast = (weather_data or {}).get("forecast") or []
    rainy = any((day.get("precipitation_probability") or 0) >= 50 for day in forecast)
    clothing_names = " ".join(item.get("name", "") for item in normalized.get("clothing") or []).lower()
    custom_names = " ".join(item.get("name", "") for item in normalized.get("custom") or []).lower()
    if rainy and "rain" not in clothing_names and "umbrella" not in custom_names:
        raise ValueError("Packing list is missing rainy-weather items")

    requirements = _text(trip_data.get("special_requirements")).lower()
    all_names = " ".join(
        item.get("name", "")
        for category in PACKING_CATEGORIES
        for item in (normalized.get(category) or [])
    ).lower()
    if "passport" in requirements and "passport" not in all_names:
        raise ValueError("Packing list missed passport-related requirement")


def _interest_relevance_score(itinerary: dict[str, Any], interests: list[str]) -> int:
    haystack = " ".join([
        itinerary.get("trip_summary", ""),
        " ".join(itinerary.get("highlights", []) or []),
        " ".join(itinerary.get("local_tips", []) or []),
        " ".join(
            " ".join([
                str(day.get("theme", "")),
                str((day.get("morning") or {}).get("activity", "")),
                str((day.get("afternoon") or {}).get("activity", "")),
                str((day.get("evening") or {}).get("activity", "")),
            ])
            for day in (itinerary.get("days") or [])
        ),
    ]).lower()
    return sum(1 for interest in interests if interest.lower().split("&")[0].strip() in haystack)


def _needs_itinerary_refinement(itinerary: dict[str, Any], trip_data: dict) -> bool:
    destination = trip_data.get("destination", "")
    interests = _interest_labels(trip_data)
    if interests and _interest_relevance_score(itinerary, interests) == 0:
        return True

    for day in itinerary.get("days", []) or []:
        for slot_name in ("morning", "afternoon", "evening"):
            slot = day.get(slot_name) or {}
            if _generic_location(slot.get("location"), destination):
                return True
    return False


async def _refine_itinerary(
    itinerary: dict[str, Any],
    trip_data: dict,
    currency: str,
    ai_preferences: dict[str, Any] | None = None,
) -> dict[str, Any]:
    prompt = f"""
You are refining an itinerary so it becomes highly specific and aligned with traveler interests.

Destination: {trip_data.get('destination')}
Interests: {", ".join(_interest_labels(trip_data))}
Requirements: {trip_data.get('special_requirements') or 'None'}
Currency: {currency}

Current itinerary JSON:
{json.dumps(itinerary, ensure_ascii=True)}

Return valid JSON only with the same structure, but fix these issues:
- Replace vague locations like city center, old town, downtown, museum area, or the destination name alone.
- Use named landmarks, streets, museums, neighborhoods, markets, temples, beaches, viewpoints, or restaurants.
- Keep every day theme and activity clearly tied to the selected interests.
- Preserve numeric cost fields.
- Ensure accommodation uses a real neighborhood or district and includes a realistic nightly estimate in {currency}.
- Keep meals, transport details, and cost breakdowns specific and practical.
""".strip()
    cache_key = cache.make_key(
        "itinerary_refine",
        {
            "version": ITINERARY_REFINE_CACHE_VERSION,
            "trip": trip_data,
            "draft": itinerary,
            "ai": _ai_cache_hint(ai_preferences),
        },
    )
    result = await route_ai(
        task="trip_planning",
        prompt=prompt,
        expect_json=True,
        cache_key=cache_key,
        validator=lambda payload: _validate_itinerary_payload(
            payload,
            trip_data,
            require_specific_locations=True,
        ),
        preferred_provider=(ai_preferences or {}).get("provider"),
        preferred_model=(ai_preferences or {}).get("model"),
    )
    payload = result["payload"]
    payload["_meta"] = {
        "provider": result["provider"],
        "model": result.get("model"),
        "cached": result["cached"],
        "refined": True,
    }
    return payload


def _fallback_date(start_date: str, day_index: int) -> str:
    try:
        return (datetime.fromisoformat(start_date) + timedelta(days=day_index)).date().isoformat()
    except Exception:
        return f"Day {day_index + 1}"


def normalize_packing_list(payload: Any) -> dict[str, list[dict[str, Any]]]:
    normalized = {category: [] for category in PACKING_CATEGORIES}

    if isinstance(payload, list):
        for category in payload:
            name = str(category.get("category", "")).lower() if isinstance(category, dict) else ""
            items = category.get("items", []) if isinstance(category, dict) else []
            target = "custom"
            if "cloth" in name:
                target = "clothing"
            elif "document" in name:
                target = "documents"
            elif name in {"essentials", "essential", "electronics", "toiletries", "health", "money"}:
                target = "essentials"
            for item in items or []:
                normalized[target].append({"id": f"{target}-{len(normalized[target]) + 1}", "name": str(item), "packed": False})
        return normalized

    if isinstance(payload, dict):
        for category in PACKING_CATEGORIES:
            items = payload.get(category, [])
            for idx, item in enumerate(items or [], start=1):
                if isinstance(item, dict):
                    normalized[category].append({
                        "id": str(item.get("id") or f"{category}-{idx}"),
                        "name": str(item.get("name") or item.get("label") or ""),
                        "packed": bool(item.get("packed", False)),
                    })
                else:
                    normalized[category].append({"id": f"{category}-{idx}", "name": str(item), "packed": False})
        return normalized

    return normalized


def _flatten_packing_names(packing_list: dict[str, list[dict[str, Any]]] | None, limit: int = 10) -> list[str]:
    flattened: list[str] = []
    for category in PACKING_CATEGORIES:
        for item in (packing_list or {}).get(category, []):
            name = _text(item.get("name") if isinstance(item, dict) else item)
            if name and name not in flattened:
                flattened.append(name)
            if len(flattened) >= limit:
                return flattened
    return flattened


def _merge_phrase_list(existing: Any, defaults: list[dict[str, str]]) -> list[dict[str, str]]:
    merged: list[dict[str, str]] = []
    seen: set[str] = set()
    for source in (existing if isinstance(existing, list) else []), defaults:
        for item in source:
            if not isinstance(item, dict):
                continue
            phrase = _text(item.get("phrase"))
            meaning = _text(item.get("meaning"))
            if not phrase or not meaning:
                continue
            key = phrase.lower()
            if key in seen:
                continue
            merged.append({"phrase": phrase, "meaning": meaning})
            seen.add(key)
            if len(merged) >= 5:
                return merged
    return merged


def _merge_tip_list(*sources: Any) -> list[str]:
    merged: list[str] = []
    seen: set[str] = set()
    for source in sources:
        if not isinstance(source, list):
            continue
        for item in source:
            text = _text(item)
            key = text.lower()
            if not text or key in seen:
                continue
            merged.append(text)
            seen.add(key)
            if len(merged) >= 5:
                return merged
    return merged


def enrich_itinerary_details(
    payload: dict[str, Any],
    trip_data: dict,
    currency: str,
    weather_data: dict | None = None,
    packing_list: dict[str, list[dict[str, Any]]] | None = None,
) -> dict[str, Any]:
    if not isinstance(payload, dict):
        return payload

    metadata = _travel_metadata(trip_data.get("destination", ""), weather_data)
    packing_names = _flatten_packing_names(packing_list)

    payload["destination"] = _text(payload.get("destination")) or _text(trip_data.get("destination")) or "Planned destination"
    payload["duration"] = _text(payload.get("duration")) or f"{max(int(trip_data.get('duration_days') or 1), 1)} days"
    payload["currency"] = _text(payload.get("currency")) or currency
    payload["language"] = _text(payload.get("language")) or metadata["language"]
    payload["timezone"] = _text(payload.get("timezone")) or metadata["timezone"]
    payload["bestTimeToVisit"] = _text(payload.get("bestTimeToVisit")) or metadata["best_time"]
    payload["overview"] = _text(payload.get("overview")) or _text(payload.get("trip_summary")) or f"A practical trip plan for {payload['destination']}."
    payload["travelTips"] = _merge_tip_list(
        payload.get("travelTips"),
        payload.get("local_tips"),
        payload.get("travel_suggestions"),
        metadata.get("travel_tips"),
    )
    if not payload["travelTips"]:
        payload["travelTips"] = list(DEFAULT_TRAVEL_METADATA["travel_tips"])

    existing_packing = [_text(item) for item in payload.get("packingList") or [] if _text(item)]
    payload["packingList"] = existing_packing or packing_names
    payload["localPhrases"] = _merge_phrase_list(payload.get("localPhrases"), metadata["local_phrases"])
    payload["emergencyContacts"] = {
        **metadata["emergency_contacts"],
        **(payload.get("emergencyContacts") if isinstance(payload.get("emergencyContacts"), dict) else {}),
    }
    if not _text(payload.get("totalBudgetEstimate")):
        total_budget = float(trip_data.get("budget") or 0)
        payload["totalBudgetEstimate"] = _format_amount(total_budget, currency) if total_budget > 0 else "Budget not specified"

    return payload


def _fallback_itinerary(trip_data: dict, currency: str) -> dict[str, Any]:
    destination = trip_data.get("destination", "your destination")
    start_date = trip_data.get("start_date", "Day 1")
    duration_days = int(trip_data.get("duration_days") or 1)
    total_budget = max(float(trip_data.get("budget") or 0), 0)
    travel_style = _text(trip_data.get("travel_style")).lower() or "balanced"
    interests = _interest_labels(trip_data)
    templates = _interest_templates(interests) or [{
        "morning": "local sightseeing",
        "afternoon": "popular neighborhood visit",
        "evening": "dinner and unwind",
    }]
    nightly_cost = max(round((total_budget * 0.35) / duration_days, 2), 60 if currency == "USD" else 2500)
    transport_cost = max(round((total_budget * 0.12) / duration_days, 2), 10 if currency == "USD" else 250)
    activity_cost = max(round((total_budget * 0.18) / duration_days, 2), 20 if currency == "USD" else 400)
    meal_cost = max(round((total_budget * 0.15) / duration_days, 2), 15 if currency == "USD" else 350)
    district_templates = [
        "historic quarter",
        "riverfront district",
        "museum neighborhood",
        "market area",
        "food street belt",
        "central promenade",
        "garden district",
        "old town lanes",
    ]
    meal_profiles = [
        ("bakery and coffee stop", "casual lunch cafe", "signature local dinner"),
        ("hotel breakfast spread", "street-food lunch trail", "waterfront dinner"),
        ("neighborhood breakfast spot", "market lunch stop", "chef-led tasting dinner"),
        ("artisan cafe breakfast", "museum district lunch", "rooftop dinner"),
    ]
    stay_profiles = {
        "budget": ("Smart Stay", "Transit Hub District", 0.82),
        "balanced": ("Central Stay", "Walkable Core District", 1.0),
        "luxury": ("Grand Hotel", "Prime Landmark District", 1.32),
    }
    stay_name, stay_area, stay_multiplier = stay_profiles.get(travel_style, stay_profiles["balanced"])
    days = []
    for index in range(duration_days):
        template = templates[index % len(templates)]
        day_interest = interests[index % len(interests)] if interests else "local highlights"
        district = district_templates[index % len(district_templates)]
        breakfast_style, lunch_style, dinner_style = meal_profiles[index % len(meal_profiles)]
        weekday_weight = 1 + (((index % 4) - 1.5) * 0.08)
        activity_weight = 1.12 if any(word in day_interest.lower() for word in ("adventure", "nightlife", "shopping")) else 0.96
        dining_weight = 1.18 if ("food" in day_interest.lower() or index % 3 == 1) else 0.92
        stay_weight = stay_multiplier + ((index % 3) * 0.06)
        transit_weight = 1.16 if ("market" in district or "old town" in district) else 0.94

        morning_cost = round(activity_cost * 0.32 * activity_weight * weekday_weight, 2)
        afternoon_cost = round(activity_cost * 0.41 * activity_weight * (1 + (index % 2) * 0.06), 2)
        evening_cost = round(activity_cost * 0.27 * max(activity_weight, dining_weight) * (1 + (index % 3) * 0.05), 2)
        breakfast_cost = round(meal_cost * 0.18 * (0.92 + (index % 2) * 0.08), 2)
        lunch_cost = round(meal_cost * 0.33 * dining_weight * (1 + (index % 4) * 0.04), 2)
        dinner_cost = round(meal_cost * 0.49 * max(dining_weight, 0.95) * (1 + (index % 3) * 0.06), 2)
        daily_transport_cost = round(transport_cost * transit_weight * (1 + (index % 2) * 0.05), 2)
        nightly_cost_today = round(nightly_cost * stay_weight, 2)
        other_cost = round(max(total_budget * 0.03 / duration_days, 0), 2)
        daily_total = round(
            morning_cost + afternoon_cost + evening_cost + daily_transport_cost + nightly_cost_today + breakfast_cost + lunch_cost + dinner_cost + other_cost,
            2,
        )
        hotel_name = f"{destination} {stay_name}"
        hotel_type = "Luxury Hotel" if travel_style == "luxury" else "Hotel"
        accommodation_area = f"{district.title()}, {destination}"
        breakfast_name = f"{breakfast_style.title()} near {accommodation_area}"
        lunch_name = f"{lunch_style.title()} in {district.title()}, {destination}"
        dinner_name = f"{dinner_style.title()} in {destination}"
        days.append({
            "day": index + 1,
            "date": _fallback_date(start_date, index),
            "theme": f"{day_interest} in {destination}",
            "morning": {
                "activity": template["morning"].title(),
                "description": f"Start the day with {template['morning']} matched to your interest in {day_interest.lower()}.",
                "location": f"Top-rated {day_interest.lower()} spot in {district.title()}, {destination}",
                "duration": "2-3 hours",
                "estimated_cost": morning_cost,
                "tips": "Check local opening hours before leaving.",
            },
            "afternoon": {
                "activity": template["afternoon"].title(),
                "description": f"Use the afternoon for {template['afternoon']} so the plan stays aligned with your selected interests.",
                "location": f"{district.title()} circuit in {destination}",
                "duration": "3 hours",
                "estimated_cost": afternoon_cost,
                "tips": "Keep one indoor backup option ready.",
            },
            "evening": {
                "activity": template["evening"].title(),
                "description": f"End the day with {template['evening']} and leave room for spontaneous local discoveries.",
                "location": f"Evening dining lane near {district.title()}, {destination}",
                "duration": "2 hours",
                "estimated_cost": evening_cost,
                "tips": "Reserve ahead if traveling in peak season.",
            },
            "transport": {
                "mode": "Local transit",
                "details": f"Use the safest and most convenient local option between {district.title()} stops.",
                "estimated_cost": daily_transport_cost,
            },
            "accommodation": {
                "type": hotel_type,
                "name": hotel_name,
                "area": accommodation_area,
                "estimated_cost_per_night": nightly_cost_today,
            },
            "hotel_suggestion": {
                "name": hotel_name,
                "area": accommodation_area,
                "price_per_night": nightly_cost_today,
                "reason": f"Balanced location and transit access near {district.title()}.",
            },
            "meals": [
                {"meal": "Breakfast", "suggestion": breakfast_name, "cuisine": "Local breakfast", "cost": breakfast_cost},
                {"meal": "Lunch", "suggestion": lunch_name, "cuisine": "Regional", "cost": lunch_cost},
                {"meal": "Dinner", "suggestion": dinner_name, "cuisine": "Signature dinner", "cost": dinner_cost},
            ],
            "meal_tip": "Prefer nearby local restaurants with strong ratings.",
            "cost_breakdown": {
                "activities": round(morning_cost + afternoon_cost + evening_cost, 2),
                "food": round(breakfast_cost + lunch_cost + dinner_cost, 2),
                "transport": daily_transport_cost,
                "stay": nightly_cost_today,
                "other": other_cost,
                "total": daily_total,
            },
            "daily_total_estimate": daily_total,
        })
    return {
        "trip_summary": f"A practical {duration_days}-day plan for {destination} shaped around {', '.join(interests) if interests else 'your selected style'} with flexible transit and room for adjustments.",
        "days": days,
        "highlights": [
            f"Focus on {interests[0]}" if interests else f"Explore key areas in {destination}",
            "Keep a balanced pace",
            "Leave room for local discoveries",
        ],
        "local_tips": ["Start early for popular spots", "Keep digital and offline copies of bookings", "Use trusted transport options at night"],
        "travel_suggestions": ["Book stay close to major transit", "Confirm attraction hours in advance"],
        "hotel_suggestions": [
            {"name": f"{destination} Budget Stay", "area": f"{district_templates[0].title()}, {destination}", "price_per_night": round(nightly_cost * 0.7, 2), "style": "budget", "reason": "Best if you want a lower nightly spend."},
            {"name": f"{destination} Base Stay", "area": f"{district_templates[3].title()}, {destination}", "price_per_night": nightly_cost, "style": "balanced", "reason": "Good base for first-time travelers."},
            {"name": f"{destination} Premium Stay", "area": f"{district_templates[5].title()}, {destination}", "price_per_night": round(nightly_cost * 1.6, 2), "style": "luxury", "reason": "Higher comfort in a stronger location."},
        ],
        "transport_suggestions": [{"mode": "Public transit", "details": "Use city transit for daily movement", "estimated_cost": round(transport_cost * 1.05, 2)}],
        "_meta": {"provider": "fallback", "cached": False},
    }


def _fallback_budget(trip_data: dict, currency: str) -> dict[str, Any]:
    total_budget = float(trip_data.get("budget") or 0)
    travelers = max(int(trip_data.get("travelers") or 1), 1)
    duration_days = max(int(trip_data.get("duration_days") or 1), 1)
    categories = [
        ("Accommodation", 35, "Book refundable rates early."),
        ("Food", 20, "Mix local casual meals with one nicer dinner."),
        ("Transport", 15, "Use transit passes where possible."),
        ("Activities", 20, "Pre-book top attractions."),
        ("Buffer", 10, "Keep this untouched for surprises."),
    ]
    return {
        "total_budget": total_budget,
        "currency": currency,
        "per_person_budget": round(total_budget / travelers, 2) if total_budget else 0,
        "daily_budget": round(total_budget / duration_days, 2) if total_budget else 0,
        "categories": [
            {"name": name, "amount": round(total_budget * pct / 100, 2), "percentage": pct, "tips": tip}
            for name, pct, tip in categories
        ],
        "money_saving_tips": ["Book flights and stay early", "Use local transit cards", "Keep a daily spend target"],
        "budget_rating": "balanced",
        "_meta": {"provider": "fallback", "cached": False},
    }


def _fallback_risk_alert(weather_data: dict | None = None) -> dict[str, Any]:
    forecast = (weather_data or {}).get("forecast") or []
    rainy_day = next((day for day in forecast if (day.get("precipitation_probability") or 0) >= 60), None)
    weather_condition = rainy_day.get("description") if rainy_day else "Mixed conditions possible"
    suggestion = (
        f"Heavy rainfall expected on {rainy_day.get('date')} so avoid long outdoor plans in the afternoon."
        if rainy_day else
        "Check the morning forecast each day and keep one indoor alternative ready."
    )
    return {
        "weather_condition": weather_condition,
        "overall_risk_level": "Medium" if rainy_day else "Low",
        "alerts": [{
            "title": "Weather timing check",
            "category": "Weather",
            "weather_condition": weather_condition,
            "risk_level": "Medium" if rainy_day else "Low",
            "smart_suggestion": suggestion,
            "timing": "Plan outdoor sightseeing in the clearest part of the day.",
            "alternative": "Switch to museums, cafes, or covered markets if conditions worsen.",
        }],
        "_meta": {"provider": "fallback", "cached": False},
    }


def _fallback_packing_list(trip_data: dict | None = None, weather_data: dict | None = None) -> dict[str, list[dict[str, Any]]]:
    forecast = (weather_data or {}).get("forecast") or []
    rainy = any((day.get("precipitation_probability") or 0) >= 50 for day in forecast)
    warm = any((day.get("max_temp") or 0) >= 28 for day in forecast)
    trip_data = trip_data or {}
    interests = [item.lower() for item in _interest_labels(trip_data)]
    requirements = _text(trip_data.get("special_requirements")).lower()

    clothing = ["Comfortable walking clothes", "Extra socks", "Light jacket", "Sleepwear"]
    if warm:
        clothing.extend(["Breathable summer wear", "Cap or sun hat"])
    if rainy:
        clothing.extend(["Compact rain layer", "Quick-dry outfit"])
    if "beaches" in interests:
        clothing.extend(["Swimwear", "Flip-flops"])
    if "spirituality" in interests:
        clothing.append("Modest outfit for religious sites")

    essentials = ["Phone charger", "Medicines", "Reusable water bottle", "Power bank", "Toiletries pouch"]
    documents = ["ID or passport", "Bookings confirmation", "Emergency contacts"]
    custom = ["Sunglasses", "Snacks"]

    if rainy:
        custom.append("Compact umbrella")
    if warm:
        essentials.append("Sunscreen")
    if "passport" in requirements:
        documents.append("Passport photocopy")
    if "camera" in requirements or "photography" in interests:
        essentials.append("Camera charger")
    if "food & cuisine" in interests:
        custom.append("Antacid or digestion tablets")

    payload = {
        "clothing": clothing,
        "essentials": essentials,
        "documents": documents,
        "custom": custom,
    }
    return normalize_packing_list(payload)


async def _safe_ai_call(coro, fallback_factory, warnings: list[str], label: str):
    try:
        return await coro
    except Exception as exc:
        warnings.append(f"{label} used fallback handling: {exc}")
        return fallback_factory()


def _weather_summary(weather_data: dict | None) -> str:
    if not weather_data or "forecast" not in weather_data:
        return "Weather data unavailable."
    bits = []
    for day in weather_data.get("forecast", [])[:5]:
        bits.append(
            f"{day.get('date')}: {day.get('description')} "
            f"{day.get('min_temp')}C to {day.get('max_temp')}C, precipitation {day.get('precipitation_probability', 0)}%"
        )
    return "; ".join(bits)


async def generate_itinerary(
    trip_data: dict,
    currency: str,
    weather_data: dict | None = None,
    ai_preferences: dict[str, Any] | None = None,
) -> dict[str, Any]:
    cache_key = cache.make_key(
        "itinerary",
        {
            "version": ITINERARY_CACHE_VERSION,
            "trip": trip_data,
            "currency": currency,
            "weather": weather_data,
            "ai": _ai_cache_hint(ai_preferences),
        },
    )
    cached = await cache.get(cache_key)
    if isinstance(cached, dict):
        cached_meta = dict(cached.get("_meta") or {})
        cached_meta["cached"] = True
        return {**cached, "_meta": cached_meta}

    ai_result = await generateItinerary(
        {
            "destination": trip_data.get("destination"),
            "days": int(trip_data.get("duration_days") or 1),
            "style": _style_text(trip_data),
            "budget": _budget_level(trip_data),
            "systemPrompt": ITINERARY_SYSTEM_PROMPT,
            "userPrompt": _itinerary_user_prompt(trip_data),
            "preferredProvider": (ai_preferences or {}).get("provider"),
            "preferredModel": (ai_preferences or {}).get("model"),
        }
    )

    try:
        payload = _parse_itinerary_json(ai_result["result"])
        try:
            _validate_structured_itinerary(payload, trip_data)
        except Exception:
            _validate_itinerary_payload(payload, trip_data, require_specific_locations=False)
    except Exception:
        fallback_payload = _fallback_itinerary(trip_data, currency)
        fallback_payload = rebalance_itinerary_costs(fallback_payload, trip_data, currency)
        fallback_payload["_meta"] = {
            "provider": ai_result["provider"],
            "model": ai_result.get("model"),
            "cached": False,
            "fallback": True,
        }
        return fallback_payload

    payload = rebalance_itinerary_costs(payload, trip_data, currency)
    payload["_meta"] = {"provider": ai_result["provider"], "model": ai_result.get("model"), "cached": False}
    await cache.set(cache_key, payload)
    return payload


async def generate_budget_breakdown(
    trip_data: dict,
    currency: str,
    ai_preferences: dict[str, Any] | None = None,
) -> dict[str, Any]:
    prompt = f"""
Create a structured travel budget in valid JSON only.

Trip details:
- Destination: {trip_data.get('destination')}
- Duration days: {trip_data.get('duration_days')}
- Travelers: {trip_data.get('travelers')}
- Total budget: {trip_data.get('budget')} {currency}
- Style: {trip_data.get('travel_style')}

Return:
{{
  "total_budget": 0,
  "currency": "{currency}",
  "per_person_budget": 0,
  "daily_budget": 0,
  "categories": [
    {{"name": "Accommodation", "amount": 0, "percentage": 0, "tips": ""}},
    {{"name": "Food", "amount": 0, "percentage": 0, "tips": ""}},
    {{"name": "Transport", "amount": 0, "percentage": 0, "tips": ""}},
    {{"name": "Activities", "amount": 0, "percentage": 0, "tips": ""}},
    {{"name": "Buffer", "amount": 0, "percentage": 0, "tips": ""}}
  ],
  "money_saving_tips": ["", ""],
  "budget_rating": "budget|balanced|stretch"
}}
Ensure percentages roughly total 100.
""".strip()
    cache_key = cache.make_key("budget", {"trip": trip_data, "currency": currency, "ai": _ai_cache_hint(ai_preferences)})
    result = await route_ai(
        task="budget",
        prompt=prompt,
        expect_json=True,
        cache_key=cache_key,
        preferred_provider=(ai_preferences or {}).get("provider"),
        preferred_model=(ai_preferences or {}).get("model"),
    )
    payload = result["payload"]
    payload["_meta"] = {"provider": result["provider"], "model": result.get("model"), "cached": result["cached"]}
    return payload


async def generate_risk_alert(
    trip_data: dict,
    weather_data: dict | None = None,
    ai_preferences: dict[str, Any] | None = None,
) -> dict[str, Any]:
    prompt = f"""
Create weather-aware travel risk alerts in valid JSON only.

Trip details:
- Destination: {trip_data.get('destination')}
- Dates: {trip_data.get('start_date')} to {trip_data.get('end_date')}
- Travel style: {trip_data.get('travel_style')}
- Weather: {_weather_summary(weather_data)}

Return:
{{
  "weather_condition": "",
  "overall_risk_level": "Low|Medium|High",
  "alerts": [
    {{
      "title": "",
      "category": "Weather|Safety|Transport|Health",
      "weather_condition": "",
      "risk_level": "Low|Medium|High",
      "smart_suggestion": "",
      "timing": "",
      "alternative": ""
    }}
  ]
}}
Be specific and practical. Include at least one weather-driven alert if weather is available.
""".strip()
    cache_key = cache.make_key("risk", {"trip": trip_data, "weather": weather_data, "ai": _ai_cache_hint(ai_preferences)})
    result = await route_ai(
        task="structured",
        prompt=prompt,
        expect_json=True,
        cache_key=cache_key,
        preferred_provider=(ai_preferences or {}).get("provider"),
        preferred_model=(ai_preferences or {}).get("model"),
    )
    payload = result["payload"]
    payload["_meta"] = {"provider": result["provider"], "model": result.get("model"), "cached": result["cached"]}
    return payload


async def generate_packing_list(
    trip_data: dict,
    weather_data: dict | None = None,
    ai_preferences: dict[str, Any] | None = None,
) -> dict[str, list[dict[str, Any]]]:
    prompt = f"""
Generate a packing list in valid JSON only.

Trip details:
- Destination: {trip_data.get('destination')}
- Destination type hint: {', '.join(trip_data.get('interests') or [])}
- Duration days: {trip_data.get('duration_days')}
- Special requirements: {trip_data.get('special_requirements') or 'None'}
- Weather: {_weather_summary(weather_data)}

Return:
{{
  "clothing": ["", ""],
  "essentials": ["", ""],
  "documents": ["", ""],
  "custom": ["", ""]
}}
Important:
- Include at least 4 useful items in clothing, 4 in essentials, 2 in documents, and 2 in custom.
- Tailor items to climate, trip type, and traveler requirements.
- Avoid generic filler like "clothes" or "stuff".
- Mention weather gear when rain or strong sun is likely.
""".strip()
    cache_key = cache.make_key(
        "packing",
        {
            "version": PACKING_CACHE_VERSION,
            "trip": trip_data,
            "weather": weather_data,
            "ai": _ai_cache_hint(ai_preferences),
        },
    )
    result = await route_ai(
        task="structured",
        prompt=prompt,
        expect_json=True,
        cache_key=cache_key,
        validator=lambda payload: _validate_packing_list_payload(payload, trip_data, weather_data),
        preferred_provider=(ai_preferences or {}).get("provider"),
        preferred_model=(ai_preferences or {}).get("model"),
    )
    return normalize_packing_list(result["payload"])


async def chat_with_ai(
    message: str,
    trip_context: dict | None = None,
    history: list[dict[str, str]] | None = None,
    ai_preferences: dict[str, Any] | None = None,
) -> str:
    context = ""
    if trip_context:
        context = (
            f"Trip context: {trip_context.get('origin')} to {trip_context.get('destination')}, "
            f"{trip_context.get('start_date')} to {trip_context.get('end_date')}, "
            f"budget {trip_context.get('budget')} {trip_context.get('currency', 'USD')}."
        )
    transcript = "\n".join(
        f"{item.get('role', 'user')}: {item.get('content', '')}"
        for item in (history or [])[-6:]
    )
    prompt = f"""
You are a travel assistant. Keep responses practical, concise, and helpful.
{context}
Recent chat:
{transcript or 'No previous history'}

User message: {message}
""".strip()
    result = await route_ai(
        task="chat",
        prompt=prompt,
        expect_json=False,
        preferred_provider=(ai_preferences or {}).get("provider"),
        preferred_model=(ai_preferences or {}).get("model"),
    )
    return str(result["payload"])


async def build_trip_plan(trip_data: dict, ai_preferences: dict[str, Any] | None = None) -> dict[str, Any]:
    duration_days = compute_duration_days(trip_data)
    weather_data, route_data = await asyncio.gather(
        get_forecast(trip_data["destination"]),
        get_route(trip_data["origin"], trip_data["destination"]),
        return_exceptions=True,
    )

    warnings: list[str] = []
    if (
        (isinstance(weather_data, Exception) or not isinstance(weather_data, dict) or bool(weather_data.get("error")))
        and isinstance(route_data, dict)
        and isinstance(route_data.get("destination"), dict)
    ):
        route_weather = await get_forecast_for_coordinates(route_data.get("destination"), trip_data["destination"])
        if isinstance(route_weather, dict) and not route_weather.get("error"):
            weather_data = route_weather

    weather_invalid = (
        isinstance(weather_data, Exception)
        or not isinstance(weather_data, dict)
        or bool(weather_data.get("error"))
        or not isinstance(weather_data.get("forecast"), list)
        or not weather_data.get("forecast")
    )
    if weather_invalid:
        warnings.append(f"Weather data unavailable: {weather_data}")
        weather_data = {
            "error": "Weather forecast unavailable for this destination right now.",
            "city": trip_data["destination"],
            "forecast": [],
            "coordinates": {},
        }
    if isinstance(route_data, Exception) or not isinstance(route_data, dict):
        warnings.append(f"Route data unavailable: {route_data}")
        route_data = {"route_available": False}

    currency = trip_data.get("currency") or infer_currency(trip_data["destination"], weather_data)
    trip_data = {**trip_data, "currency": currency, "duration_days": duration_days}

    itinerary, budget = await asyncio.gather(
        _safe_ai_call(
            generate_itinerary(trip_data, currency, weather_data, ai_preferences),
            lambda: rebalance_itinerary_costs(_fallback_itinerary(trip_data, currency), trip_data, currency),
            warnings,
            "Itinerary",
        ),
        _safe_ai_call(
            generate_budget_breakdown(trip_data, currency, ai_preferences),
            lambda: _fallback_budget(trip_data, currency),
            warnings,
            "Budget",
        ),
    )
    risk_alert, packing_list = await asyncio.gather(
        _safe_ai_call(
            generate_risk_alert(trip_data, weather_data, ai_preferences),
            lambda: _fallback_risk_alert(weather_data),
            warnings,
            "Risk alerts",
        ),
        _safe_ai_call(
            generate_packing_list(trip_data, weather_data, ai_preferences),
            lambda: _fallback_packing_list(trip_data, weather_data),
            warnings,
            "Packing list",
        ),
    )
    itinerary = enrich_itinerary_details(itinerary, trip_data, currency, weather_data, packing_list)

    return {
        "destination": trip_data["destination"],
        "duration": duration_days,
        "currency": currency,
        "currency_symbol": currency_symbol(currency),
        "ai_preferences": ai_preferences or {},
        "itinerary": itinerary,
        "budget_breakdown": budget,
        "weather": weather_data,
        "route_data": route_data,
        "risk_alert": risk_alert,
        "packing_list": packing_list,
        "generation_warnings": warnings,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
    }
