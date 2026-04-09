"""
SERPAPI-backed Google Flights search helpers.
"""
from __future__ import annotations

import re
from datetime import date, timedelta
from typing import Any

import httpx

from app.config.settings import settings
from app.services.cache import cache

SERPAPI_BASE_URL = "https://serpapi.com/search.json"
AIRPORT_CODE_STOPWORDS = {
    "AIR",
    "ALL",
    "AND",
    "ARE",
    "DAY",
    "FOR",
    "IATA",
    "ICAO",
    "THE",
    "USA",
}
MAX_AIRPORT_CANDIDATES = 3
NEARBY_DATE_OFFSETS = (0, 1, -1, 2, -2, 3, -3)


def _extract_airport_code(value: str) -> str | None:
    text = str(value or "").strip().upper()
    if re.fullmatch(r"[A-Z]{3}", text):
        return text

    paren_match = re.search(r"\(([A-Z]{3})\)", text)
    if paren_match:
        return paren_match.group(1)

    word_match = re.search(r"\b([A-Z]{3})\b", text)
    if word_match:
        return word_match.group(1)

    return None


def _extract_airport_codes_from_text(value: Any) -> list[str]:
    text = str(value or "").upper()
    patterns = [
        r"\bIATA(?:\s+AIRPORT)?\s+CODE[:\s]+([A-Z]{3})\b",
        r"\bAIRPORT\s+CODE[:\s]+([A-Z]{3})\b",
        r"\(([A-Z]{3})\)",
        r"\b([A-Z]{3})\b",
    ]
    seen: set[str] = set()
    codes: list[str] = []
    for pattern in patterns:
        for match in re.findall(pattern, text):
            candidate = match.strip().upper()
            if candidate in AIRPORT_CODE_STOPWORDS or candidate in seen:
                continue
            seen.add(candidate)
            codes.append(candidate)
    return codes


def _collect_candidate_texts(payload: dict[str, Any]) -> list[str]:
    candidate_texts: list[str] = []
    answer_box = payload.get("answer_box")
    if isinstance(answer_box, dict):
        for field in ("answer", "snippet", "title"):
            value = answer_box.get(field)
            if value:
                candidate_texts.append(str(value))

    knowledge_graph = payload.get("knowledge_graph")
    if isinstance(knowledge_graph, dict):
        for field in ("title", "description"):
            value = knowledge_graph.get(field)
            if value:
                candidate_texts.append(str(value))

    for result in payload.get("organic_results") or []:
        if not isinstance(result, dict):
            continue
        for field in ("title", "snippet"):
            value = result.get(field)
            if value:
                candidate_texts.append(str(value))

    return candidate_texts


def _airport_lookup_queries(location: str) -> list[tuple[str, str]]:
    normalized = str(location or "").strip()
    return [
        ("city_airport", f"{normalized} airport IATA code"),
        ("nearest_international_airport", f"nearest international airport to {normalized} IATA code"),
        ("nearest_international_airport", f"closest international airport to {normalized} IATA code"),
        ("nearest_airport", f"nearest airport to {normalized} IATA code"),
        ("nearest_airport", f"closest airport to {normalized} IATA code"),
    ]


def _parse_iso_date(value: str | None) -> date | None:
    if not value:
        return None
    try:
        return date.fromisoformat(value)
    except ValueError:
        return None


def _date_variants(start_date: str, end_date: str | None = None) -> list[dict[str, Any]]:
    start = _parse_iso_date(start_date)
    end = _parse_iso_date(end_date)
    if not start:
        return [{"outbound_date": start_date, "return_date": end_date, "date_offset_days": 0}]

    variants: list[dict[str, Any]] = []
    seen: set[tuple[str, str | None]] = set()
    for offset in NEARBY_DATE_OFFSETS:
        outbound = (start + timedelta(days=offset)).isoformat()
        return_value = (end + timedelta(days=offset)).isoformat() if end else None
        key = (outbound, return_value)
        if key in seen:
            continue
        seen.add(key)
        variants.append(
            {
                "outbound_date": outbound,
                "return_date": return_value,
                "date_offset_days": offset,
            }
        )
    return variants


async def _serpapi_get(params: dict[str, Any]) -> dict[str, Any]:
    async with httpx.AsyncClient(timeout=settings.SERPAPI_TIMEOUT_SECONDS) as client:
        response = await client.get(SERPAPI_BASE_URL, params=params)
        response.raise_for_status()
        payload = response.json()
    if not isinstance(payload, dict):
        return {}
    return payload


async def _lookup_airport_candidates(location: str) -> tuple[list[dict[str, Any]], dict[str, Any]]:
    direct_code = _extract_airport_code(location)
    if direct_code:
        direct = {
            "code": direct_code,
            "source": "trip_text",
            "query": None,
            "snippet": location,
            "used_nearest_airport": False,
            "airport_type": "exact",
        }
        return [direct], direct

    if not settings.SERPAPI_API_KEY:
        missing = {
            "code": None,
            "source": "missing_api_key",
            "query": None,
            "snippet": None,
            "used_nearest_airport": False,
            "airport_type": None,
        }
        return [], missing

    cache_key = cache.make_key("airport_code_lookup", {"location": location})
    cached = await cache.get(cache_key)
    if isinstance(cached, dict):
        return cached.get("candidates") or [], cached.get("primary") or {}

    candidates: list[dict[str, Any]] = []
    seen_codes: set[str] = set()
    primary: dict[str, Any] = {
        "code": None,
        "source": "serpapi_google",
        "query": None,
        "snippet": None,
        "used_nearest_airport": False,
        "airport_type": None,
    }
    last_candidate_text: str | None = None

    for strategy, query in _airport_lookup_queries(location):
        primary["query"] = query
        try:
            payload = await _serpapi_get(
                {
                    "engine": "google",
                    "q": query,
                    "hl": "en",
                    "gl": "us",
                    "num": "5",
                    "api_key": settings.SERPAPI_API_KEY,
                }
            )
        except httpx.HTTPStatusError as exc:
            primary["source"] = "lookup_error"
            try:
                error_payload = exc.response.json()
                primary["snippet"] = error_payload.get("error") or exc.response.text
            except Exception:
                primary["snippet"] = exc.response.text
            await cache.set(cache_key, {"candidates": [], "primary": primary}, ttl_seconds=300)
            return [], primary
        except httpx.HTTPError as exc:
            primary["source"] = "lookup_error"
            primary["snippet"] = str(exc)
            await cache.set(cache_key, {"candidates": [], "primary": primary}, ttl_seconds=300)
            return [], primary

        candidate_texts = _collect_candidate_texts(payload)
        if candidate_texts and not last_candidate_text:
            last_candidate_text = candidate_texts[0]

        for text in candidate_texts:
            codes = _extract_airport_codes_from_text(text)
            for code in codes:
                if code in seen_codes:
                    continue
                seen_codes.add(code)
                candidate = {
                    "code": code,
                    "source": strategy,
                    "query": query,
                    "snippet": text,
                    "used_nearest_airport": strategy != "city_airport",
                    "airport_type": "international" if strategy == "nearest_international_airport" else strategy,
                }
                candidates.append(candidate)
                if primary.get("code") is None:
                    primary = candidate.copy()
                if len(candidates) >= MAX_AIRPORT_CANDIDATES:
                    await cache.set(cache_key, {"candidates": candidates, "primary": primary}, ttl_seconds=86400)
                    return candidates, primary

    if primary.get("code") is None:
        primary["snippet"] = last_candidate_text

    await cache.set(cache_key, {"candidates": candidates, "primary": primary}, ttl_seconds=86400)
    return candidates, primary


def _route_search_url(origin: str, destination: str, start_date: str, end_date: str | None = None) -> str:
    query = [
        "flights from",
        origin,
        "to",
        destination,
        start_date,
        end_date or "",
    ]
    return f"https://www.google.com/search?q={'+'.join(str(part).strip().replace(' ', '+') for part in query if str(part).strip())}"


def _normalize_flight_option(option: dict[str, Any]) -> dict[str, Any]:
    flights = option.get("flights") or []
    first_leg = flights[0] if flights else {}
    last_leg = flights[-1] if flights else {}
    layovers = option.get("layovers") or []
    price = option.get("price")
    airline = first_leg.get("airline") or "Unknown airline"
    return {
        "airline": airline,
        "airline_logo": option.get("airline_logo") or first_leg.get("airline_logo"),
        "price": price,
        "total_duration": option.get("total_duration"),
        "stops": len(layovers),
        "travel_class": first_leg.get("travel_class"),
        "departure_airport": first_leg.get("departure_airport"),
        "arrival_airport": last_leg.get("arrival_airport"),
        "flights": flights,
        "layovers": layovers,
        "extensions": option.get("extensions") or [],
    }


def _lowest_price(best_flights: list[dict[str, Any]], other_flights: list[dict[str, Any]], payload: dict[str, Any]) -> int | None:
    price_insights = payload.get("price_insights") or {}
    lowest = price_insights.get("lowest_price")
    if isinstance(lowest, (int, float)):
        return int(lowest)

    prices = [
        option.get("price")
        for option in [*best_flights, *other_flights]
        if isinstance(option.get("price"), (int, float))
    ]
    return int(min(prices)) if prices else None


async def search_trip_flights(
    origin: str,
    destination: str,
    start_date: str,
    end_date: str | None = None,
    currency: str = "USD",
) -> dict[str, Any]:
    origin_candidates, origin_resolution = await _lookup_airport_candidates(origin)
    destination_candidates, destination_resolution = await _lookup_airport_candidates(destination)

    if not origin_candidates or not destination_candidates:
        return {
            "error": (
                "Could not resolve this route to Google Flights airport codes yet. "
                f"Current trip values are '{origin}' to '{destination}'. "
                "Use values like DEL, DXB, PEK, AUS or names that include codes such as 'Delhi (DEL)'."
            ),
            "best_flights": [],
            "other_flights": [],
            "search_url": _route_search_url(origin, destination, start_date, end_date),
            "search_metadata": {
                "origin": origin,
                "destination": destination,
                "currency": currency,
                "origin_code": origin_resolution.get("code"),
                "destination_code": destination_resolution.get("code"),
                "outbound_date": start_date,
                "return_date": end_date,
                "origin_resolution": origin_resolution,
                "destination_resolution": destination_resolution,
                "searched_outbound_date": start_date,
                "searched_return_date": end_date,
                "date_offset_days": 0,
            },
        }

    if not settings.SERPAPI_API_KEY:
        return {
            "error": "SERPAPI_API_KEY is not configured",
            "best_flights": [],
            "other_flights": [],
            "lowest_price": None,
            "booking_url": _route_search_url(origin_resolution.get("code") or origin, destination_resolution.get("code") or destination, start_date, end_date),
            "search_url": _route_search_url(origin_resolution.get("code") or origin, destination_resolution.get("code") or destination, start_date, end_date),
            "search_metadata": {
                "origin": origin,
                "destination": destination,
                "currency": currency,
                "origin_code": origin_resolution.get("code"),
                "destination_code": destination_resolution.get("code"),
                "outbound_date": start_date,
                "return_date": end_date,
                "origin_resolution": origin_resolution,
                "destination_resolution": destination_resolution,
                "searched_outbound_date": start_date,
                "searched_return_date": end_date,
                "date_offset_days": 0,
            },
        }

    cache_key = cache.make_key(
        "trip_flights",
        {
            "origin": origin,
            "destination": destination,
            "origin_candidates": [candidate.get("code") for candidate in origin_candidates],
            "destination_candidates": [candidate.get("code") for candidate in destination_candidates],
            "start_date": start_date,
            "end_date": end_date,
            "currency": currency,
        },
    )
    cached = await cache.get(cache_key)
    if isinstance(cached, dict):
        return cached

    last_error = "No flights returned for this route"

    for date_variant in _date_variants(start_date, end_date):
        for origin_candidate in origin_candidates:
            for destination_candidate in destination_candidates:
                params = {
                    "engine": "google_flights",
                    "departure_id": origin_candidate["code"],
                    "arrival_id": destination_candidate["code"],
                    "outbound_date": date_variant["outbound_date"],
                    "api_key": settings.SERPAPI_API_KEY,
                    "hl": "en",
                    "gl": "us",
                    "currency": currency or "USD",
                    "deep_search": "true",
                }
                if date_variant["return_date"]:
                    params["return_date"] = date_variant["return_date"]
                    params["type"] = "1"

                try:
                    payload = await _serpapi_get(params)
                except httpx.HTTPStatusError as exc:
                    try:
                        error_payload = exc.response.json()
                        last_error = error_payload.get("error") or exc.response.text
                    except Exception:
                        last_error = exc.response.text or f"SERPAPI returned {exc.response.status_code}"
                    continue
                except httpx.HTTPError as exc:
                    last_error = f"Could not reach SERPAPI: {str(exc)}"
                    continue

                best_flights = [_normalize_flight_option(item) for item in (payload.get("best_flights") or [])[:8]]
                other_flights = [_normalize_flight_option(item) for item in (payload.get("other_flights") or [])[:8]]
                if not best_flights and not other_flights:
                    last_error = payload.get("error") or "No flights returned for this route"
                    continue

                google_flights_url = (
                    ((payload.get("search_metadata") or {}).get("google_flights_url"))
                    or _route_search_url(
                        origin_candidate["code"],
                        destination_candidate["code"],
                        date_variant["outbound_date"],
                        date_variant["return_date"],
                    )
                )

                result = {
                    "best_flights": best_flights,
                    "other_flights": other_flights,
                    "lowest_price": _lowest_price(best_flights, other_flights, payload),
                    "booking_url": google_flights_url,
                    "search_metadata": {
                        "origin": origin,
                        "destination": destination,
                        "currency": currency,
                        "origin_code": origin_candidate["code"],
                        "destination_code": destination_candidate["code"],
                        "outbound_date": start_date,
                        "return_date": end_date,
                        "searched_outbound_date": date_variant["outbound_date"],
                        "searched_return_date": date_variant["return_date"],
                        "date_offset_days": date_variant["date_offset_days"],
                        "used_nearby_date": date_variant["date_offset_days"] != 0,
                        "origin_resolution": origin_candidate,
                        "destination_resolution": destination_candidate,
                    },
                    "search_url": _route_search_url(
                        origin_candidate["code"],
                        destination_candidate["code"],
                        date_variant["outbound_date"],
                        date_variant["return_date"],
                    ),
                    "error": None,
                }
                return await cache.set(cache_key, result)

    fallback = {
        "best_flights": [],
        "other_flights": [],
        "lowest_price": None,
        "booking_url": _route_search_url(
            origin_resolution.get("code") or origin,
            destination_resolution.get("code") or destination,
            start_date,
            end_date,
        ),
        "search_metadata": {
            "origin": origin,
            "destination": destination,
            "currency": currency,
            "origin_code": origin_resolution.get("code"),
            "destination_code": destination_resolution.get("code"),
            "outbound_date": start_date,
            "return_date": end_date,
            "searched_outbound_date": start_date,
            "searched_return_date": end_date,
            "date_offset_days": 0,
            "used_nearby_date": False,
            "origin_resolution": origin_resolution,
            "destination_resolution": destination_resolution,
        },
        "search_url": _route_search_url(
            origin_resolution.get("code") or origin,
            destination_resolution.get("code") or destination,
            start_date,
            end_date,
        ),
        "error": last_error,
    }
    return await cache.set(cache_key, fallback)
