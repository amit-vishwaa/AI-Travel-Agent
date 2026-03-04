"""
AI Service using Google Gemini.
Handles itinerary generation, packing suggestions, risk alerts, and chat.
"""
import json
import re
from typing import Optional

from app.config.settings import settings

try:
    from google import genai  # type: ignore[import]
except ImportError:  # pragma: no cover
    genai = None

_client = None
_MODEL_FALLBACKS = [
    "models/gemini-2.0-flash-lite-001",
    "models/gemini-2.0-flash-lite",
    "models/gemini-2.0-flash",
    "models/gemini-2.5-flash",
]


def _get_client():
    """Create and cache the Gemini client."""
    global _client
    if not settings.GEMINI_API_KEY:
        raise RuntimeError("GEMINI_API_KEY is not configured")
    if genai is None:
        raise RuntimeError("google-genai is not installed. Install dependencies from requirements.txt")
    if _client is None:
        _client = genai.Client(api_key=settings.GEMINI_API_KEY)
    return _client


def _extract_response_text(response) -> str:
    """Extract text from Gemini SDK response."""
    text = getattr(response, "text", None)
    if text:
        return text
    candidates = getattr(response, "candidates", None) or []
    for candidate in candidates:
        content = getattr(candidate, "content", None)
        parts = getattr(content, "parts", None) if content else None
        if not parts:
            continue
        for part in parts:
            part_text = getattr(part, "text", None)
            if part_text:
                return part_text
    return ""


def _list_models_for_hint(limit: int = 8) -> list[str]:
    """Best-effort model list for actionable error messages."""
    try:
        client = _get_client()
        names = []
        for model in client.models.list():
            name = getattr(model, "name", "")
            if name:
                names.append(name)
            if len(names) >= limit:
                break
        return names
    except Exception:
        return []


def get_model_name() -> str:
    """Return configured Gemini model."""
    configured = settings.GEMINI_MODEL or "models/gemini-2.0-flash-lite-001"
    if configured.startswith("models/"):
        return configured
    return f"models/{configured}"


def _is_quota_error(message: str) -> bool:
    lowered = (message or "").lower()
    return "resource_exhausted" in lowered or "quota exceeded" in lowered or "429" in lowered


def _generate_text(prompt: str) -> str:
    """Generate plain text from Gemini with production-safe error handling."""
    client = _get_client()
    model_name = get_model_name()
    models_to_try = [model_name]
    for fallback in _MODEL_FALLBACKS:
        if fallback not in models_to_try:
            models_to_try.append(fallback)

    last_exc = None
    for candidate_model in models_to_try:
        try:
            response = client.models.generate_content(
                model=candidate_model,
                contents=prompt,
            )
            text = _extract_response_text(response)
            if text:
                return text
            raise RuntimeError("Gemini returned an empty response")
        except Exception as exc:
            message = str(exc)
            lowered = message.lower()
            unavailable = (
                "is not found for api version" in lowered
                or "not supported for generatecontent" in lowered
                or "404" in lowered and "model" in lowered
            )
            if unavailable or _is_quota_error(message):
                last_exc = exc
                continue
            raise RuntimeError(f"Gemini generation failed: {message}") from exc

    if last_exc and _is_quota_error(str(last_exc)):
        raise RuntimeError(
            "Gemini API quota is currently exhausted for available models. "
            "Please wait a bit and retry, or use a different API key/project with available quota."
        ) from last_exc

    available_models = _list_models_for_hint()
    hint = f" Available models include: {', '.join(available_models)}." if available_models else ""
    raise RuntimeError(
        f"Configured Gemini model '{model_name}' is unavailable for this API/method, and fallbacks failed.{hint}"
    ) from last_exc


def clean_json_response(text: str) -> str:
    """Strip markdown code fences from AI JSON responses."""
    text = re.sub(r"```json\s*", "", text)
    text = re.sub(r"```\s*", "", text)
    return text.strip()


def _extract_json_payload(text: str) -> str:
    """Extract the first JSON object/array from model output."""
    cleaned = clean_json_response(text)
    if not cleaned:
        return cleaned

    obj_match = re.search(r"\{[\s\S]*\}", cleaned)
    arr_match = re.search(r"\[[\s\S]*\]", cleaned)

    if obj_match and arr_match:
        return obj_match.group(0) if obj_match.start() < arr_match.start() else arr_match.group(0)
    if obj_match:
        return obj_match.group(0)
    if arr_match:
        return arr_match.group(0)
    return cleaned


def _loads_json(text: str):
    """Parse model output as JSON with payload extraction fallback."""
    try:
        return json.loads(clean_json_response(text))
    except json.JSONDecodeError:
        payload = _extract_json_payload(text)
        return json.loads(payload)


def _join_interests(trip_data: dict) -> str:
    interests = trip_data.get("interests") or []
    if isinstance(interests, list):
        return ", ".join(str(i) for i in interests)
    return str(interests)


def _fallback_chat_response(message: str, trip_context: Optional[dict] = None) -> str:
    """Return a useful fallback answer when AI provider is unavailable."""
    destination = trip_context.get("destination") if trip_context else "your destination"
    lower = (message or "").lower()

    if any(k in lower for k in ["budget", "cost", "money", "cheap"]):
        return (
            f"I cannot reach live AI right now, but here is a quick budget plan for {destination}:\n"
            "1) Allocate about 40% stay, 25% food, 20% transport, 15% activities.\n"
            "2) Pre-book flights/hotels and keep a 10% emergency buffer.\n"
            "3) Track daily spend and shift one paid activity to a free local experience if needed."
        )

    if any(k in lower for k in ["pack", "packing", "carry", "luggage"]):
        return (
            f"I cannot reach live AI right now. Quick packing checklist for {destination}:\n"
            "1) Documents: ID/passport, bookings, insurance.\n"
            "2) Essentials: charger, medicines, weather-appropriate layers.\n"
            "3) Smart add-ons: reusable bottle, power bank, small day bag."
        )

    if any(k in lower for k in ["safe", "risk", "security", "danger"]):
        return (
            f"I cannot reach live AI right now. Safety basics for {destination}:\n"
            "1) Save emergency numbers and your stay address offline.\n"
            "2) Use licensed transport and avoid poorly lit areas late night.\n"
            "3) Keep digital copies of key documents and split cash/cards."
        )

    return (
        "I cannot reach live AI right now, but I can still help with a structured plan:\n"
        "1) Tell me destination, dates, budget, and travel style.\n"
        "2) I will provide a practical day plan, budget split, and packing checklist.\n"
        "3) If you want, start with: 'Create a 3-day plan for <city> under <budget>'."
    )


async def generate_itinerary(trip_data: dict) -> dict:
    """Generate a detailed day-wise itinerary using Gemini."""
    currency = (trip_data.get("currency") or "USD").upper()
    prompt = f"""
You are an expert travel planner. Generate a detailed day-by-day itinerary for this trip.

Trip Details:
- Origin: {trip_data.get('origin')}
- Destination: {trip_data.get('destination')}
- Start Date: {trip_data.get('start_date')}
- End Date: {trip_data.get('end_date')}
- Budget: {trip_data.get('budget')} {currency}
- Number of Travelers: {trip_data.get('travelers')}
- Travel Style: {trip_data.get('travel_style')}
- Interests: {_join_interests(trip_data)}
- Special Requirements: {trip_data.get('special_requirements', 'None')}

Return ONLY a valid JSON object with this structure:
{{
  "trip_summary": "Brief 2-sentence overview of the trip",
  "days": [
    {{
      "day": 1,
      "date": "YYYY-MM-DD",
      "theme": "Day theme title",
      "morning": {{
        "activity": "Activity name",
        "description": "Detailed description",
        "location": "Specific location",
        "duration": "2 hours",
        "estimated_cost": 20,
        "tips": "Helpful tip"
      }},
      "afternoon": {{
        "activity": "Activity name",
        "description": "Detailed description",
        "location": "Specific location",
        "duration": "3 hours",
        "estimated_cost": 35,
        "tips": "Helpful tip"
      }},
      "evening": {{
        "activity": "Activity name",
        "description": "Detailed description",
        "location": "Specific location",
        "duration": "2 hours",
        "estimated_cost": 50,
        "tips": "Helpful tip"
      }},
      "accommodation": {{
        "type": "Hotel/Hostel/Airbnb",
        "name": "Suggested property name",
        "estimated_cost_per_night": 80,
        "area": "Neighborhood/area"
      }},
      "meals": [
        {{"meal": "Breakfast", "suggestion": "Restaurant/cafe name", "cuisine": "type", "cost": 15}},
        {{"meal": "Lunch", "suggestion": "Restaurant/cafe name", "cuisine": "type", "cost": 20}},
        {{"meal": "Dinner", "suggestion": "Restaurant/cafe name", "cuisine": "type", "cost": 35}}
      ],
      "daily_total_estimate": 255
    }}
  ],
  "total_estimated_cost": 1200,
  "highlights": ["Top 3-5 highlights of the trip"],
  "local_tips": ["3-5 insider local tips"],
  "best_transport": "Recommended transport method"
}}

Make the itinerary realistic, culturally authentic, and suited to the travel style.
Important:
- All cost fields must be numbers in {currency}.
- Do not use "$" or any currency symbol in numeric fields.
""".strip()

    try:
        parsed = _loads_json(_generate_text(prompt))
        if not isinstance(parsed, dict):
            return {"error": "AI itinerary response is not a JSON object"}
        return parsed
    except json.JSONDecodeError as parse_err:
        return {"error": "Failed to parse AI response", "details": str(parse_err)}
    except Exception as e:
        return {"error": str(e)}


async def generate_budget_breakdown(trip_data: dict) -> dict:
    """Generate a detailed budget breakdown for the trip."""
    currency = (trip_data.get("currency") or "USD").upper()
    prompt = f"""
Create a detailed budget breakdown for this trip.

Details:
- Destination: {trip_data.get('destination')}
- Duration: {trip_data.get('start_date')} to {trip_data.get('end_date')}
- Total Budget: {trip_data.get('budget')} {currency}
- Travelers: {trip_data.get('travelers')}
- Travel Style: {trip_data.get('travel_style')}

Return ONLY valid JSON:
{{
  "total_budget": 2000,
  "currency": "{currency}",
  "per_person_budget": 1000,
  "categories": [
    {{"name": "Accommodation", "amount": 600, "percentage": 30, "tips": "Book early for best rates"}},
    {{"name": "Food & Dining", "amount": 400, "percentage": 20, "tips": "Mix street food and restaurants"}},
    {{"name": "Transportation", "amount": 300, "percentage": 15, "tips": "Use public transit when possible"}},
    {{"name": "Activities & Tours", "amount": 350, "percentage": 17.5, "tips": "Book popular attractions in advance"}},
    {{"name": "Shopping & Souvenirs", "amount": 200, "percentage": 10, "tips": "Budget for local crafts and gifts"}},
    {{"name": "Emergency Fund", "amount": 150, "percentage": 7.5, "tips": "Always keep 10% as emergency reserve"}}
  ],
  "daily_budget": 285,
  "money_saving_tips": ["tip1", "tip2", "tip3"],
  "budget_rating": "good"
}}

Important:
- Use {currency} for all budget values.
- Return all monetary values as numbers, without currency symbols.
""".strip()

    try:
        parsed = _loads_json(_generate_text(prompt))
        if not isinstance(parsed, dict):
            return {"error": "AI budget response is not a JSON object"}
        return parsed
    except Exception as e:
        return {"error": str(e)}


async def generate_packing_list(trip_data: dict, weather_data: Optional[dict] = None) -> list:
    """Generate a smart packing list based on destination, duration, and weather."""
    weather_context = ""
    if weather_data and "forecast" in weather_data:
        temps = [d["max_temp"] for d in weather_data["forecast"]]
        avg_temp = sum(temps) / len(temps) if temps else 20
        weather_context = f"Average temperature: {avg_temp:.1f} C"

    prompt = f"""
Generate a smart packing list for this trip.

Trip Details:
- Destination: {trip_data.get('destination')}
- Duration: {trip_data.get('start_date')} to {trip_data.get('end_date')}
- Travelers: {trip_data.get('travelers')}
- Travel Style: {trip_data.get('travel_style')}
- Interests: {_join_interests(trip_data)}
- {weather_context}

Return ONLY a valid JSON array of objects:
[
  {{"category": "Documents", "items": ["Passport", "Travel insurance", "Hotel bookings printout"]}},
  {{"category": "Clothing", "items": ["item1", "item2"]}},
  {{"category": "Electronics", "items": ["item1", "item2"]}},
  {{"category": "Toiletries", "items": ["item1", "item2"]}},
  {{"category": "Health & Safety", "items": ["item1", "item2"]}},
  {{"category": "Money & Finance", "items": ["item1", "item2"]}},
  {{"category": "Entertainment", "items": ["item1", "item2"]}}
]
""".strip()

    try:
        parsed = _loads_json(_generate_text(prompt))
        if not isinstance(parsed, list):
            return [{"category": "Error", "items": ["AI packing list response is not a JSON array"]}]
        return parsed
    except Exception as e:
        return [{"category": "Error", "items": [str(e)]}]


async def generate_risk_alerts(trip_data: dict, weather_data: Optional[dict] = None) -> list:
    """Generate travel risk alerts and safety tips."""
    prompt = f"""
Analyze travel risks and safety considerations for this trip.

Destination: {trip_data.get('destination')}
Travel Dates: {trip_data.get('start_date')} to {trip_data.get('end_date')}
Travelers: {trip_data.get('travelers')}

Return ONLY a valid JSON array:
[
  {{
    "level": "low|medium|high",
    "category": "Health|Safety|Weather|Political|Transport|Financial",
    "title": "Risk title",
    "description": "Detailed description of the risk",
    "recommendation": "What to do about it"
  }}
]

Include 4-6 relevant risks. Be realistic and helpful, not alarmist.
""".strip()

    try:
        parsed = _loads_json(_generate_text(prompt))
        if not isinstance(parsed, list):
            return [{
                "level": "low",
                "category": "General",
                "title": "Error",
                "description": "AI risk response is not a JSON array",
                "recommendation": "Try again",
            }]
        return parsed
    except Exception as e:
        return [{
            "level": "low",
            "category": "General",
            "title": "Error",
            "description": str(e),
            "recommendation": "Try again",
        }]


async def chat_with_ai(message: str, trip_context: Optional[dict] = None) -> str:
    """AI travel chatbot powered by Gemini."""
    if not message or not message.strip():
        return "Please enter a question so I can help with your trip."

    context = ""
    if trip_context:
        context = f"""
Current trip context:
- Destination: {trip_context.get('destination')}
- Dates: {trip_context.get('start_date')} to {trip_context.get('end_date')}
- Budget: {trip_context.get('budget')} {trip_context.get('currency', 'USD')}
"""

    prompt = f"""
You are a friendly, knowledgeable AI travel assistant. Help travelers plan amazing trips.
{context}

User question: {message}

Provide a helpful, concise, and accurate response. Include practical tips when relevant.
Keep responses under 300 words unless a detailed explanation is needed.
""".strip()

    try:
        return _generate_text(prompt)
    except Exception as exc:
        if _is_quota_error(str(exc)):
            return (
                "Gemini quota is exhausted right now. Please retry in a short while, "
                "or switch to another API key/project with available quota."
            )
        return _fallback_chat_response(message, trip_context)
