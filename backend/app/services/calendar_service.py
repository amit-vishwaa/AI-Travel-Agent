"""
iCalendar (.ics) generation for trip plans.
Complies with RFC 5545 for Google Calendar, Apple Calendar, and Microsoft Outlook.
"""
from __future__ import annotations

import re
import uuid
from datetime import datetime, timedelta
from typing import Any


def _escape_ics(text: Any) -> str:
    """Escape text according to RFC 5545 standards."""
    if not text:
        return ""
    val = str(text)
    val = val.replace("\\", "\\\\").replace(";", "\\;").replace(",", "\\,")
    val = val.replace("\r\n", "\\n").replace("\n", "\\n").replace("\r", "\\n")
    return val


def _parse_time(time_str: str) -> tuple[int, int]:
    """Parse time strings like '9:00 AM', '14:30', '1:00 PM' into (hour, minute)."""
    if not time_str:
        return (9, 0)
    match = re.search(r"(\d{1,2})(?::(\d{2}))?\s*(am|pm)?", str(time_str), re.IGNORECASE)
    if not match:
        return (9, 0)
    hour = int(match.group(1))
    minute = int(match.group(2) or 0)
    ampm = (match.group(3) or "").lower()
    if ampm == "pm" and hour < 12:
        hour += 12
    elif ampm == "am" and hour == 12:
        hour = 0
    return (hour, minute)


def build_trip_ical(trip: dict) -> bytes:
    """Generate an .ics calendar file for the given trip."""
    destination = trip.get("destination", "Destination")
    origin = trip.get("origin", "")
    start_date_str = trip.get("start_date") or ""
    
    # Try parsing start_date
    try:
        base_date = datetime.strptime(start_date_str[:10], "%Y-%m-%d")
    except Exception:
        base_date = datetime.utcnow()

    now_stamp = datetime.utcnow().strftime("%Y%m%dT%H%M%SZ")
    
    lines = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//AI Travel Agent//EN",
        "CALSCALE:GREGORIAN",
        "METHOD:PUBLISH",
        f"X-WR-CALNAME:{_escape_ics(f'Trip to {destination}')}",
        "X-WR-TIMEZONE:UTC",
    ]

    itinerary = trip.get("itinerary") or {}
    days = itinerary.get("days") or []

    # If day-by-day plan exists
    for day_idx, day_obj in enumerate(days):
        day_date = base_date + timedelta(days=day_idx)
        day_num = day_obj.get("day", day_idx + 1)
        day_theme = day_obj.get("theme") or day_obj.get("title") or f"Day {day_num} in {destination}"
        activities = day_obj.get("activities") or []

        if activities and isinstance(activities, list):
            for act_idx, act in enumerate(activities):
                if not isinstance(act, dict):
                    continue
                act_name = act.get("activity") or f"Activity {act_idx + 1}"
                location = act.get("location") or destination
                cost = act.get("cost") or ""
                tips = act.get("tips") or ""
                time_str = act.get("time") or "9:00 AM"
                hour, minute = _parse_time(time_str)

                start_dt = day_date.replace(hour=hour, minute=minute, second=0)
                end_dt = start_dt + timedelta(hours=2)

                dt_start = start_dt.strftime("%Y%m%dT%H%M%SZ")
                dt_end = end_dt.strftime("%Y%m%dT%H%M%SZ")
                uid = f"ai-travel-{uuid.uuid4().hex[:12]}@aitravelagent.app"

                description_parts = [
                    f"Day {day_num}: {day_theme}",
                    f"Activity: {act_name}",
                ]
                if cost:
                    description_parts.append(f"Estimated Cost: {cost}")
                if tips:
                    description_parts.append(f"Tips: {tips}")
                if act.get("category"):
                    description_parts.append(f"Category: {act.get('category').capitalize()}")

                desc = "\\n".join([_escape_ics(p) for p in description_parts])

                lines.extend([
                    "BEGIN:VEVENT",
                    f"UID:{uid}",
                    f"DTSTAMP:{now_stamp}",
                    f"DTSTART:{dt_start}",
                    f"DTEND:{dt_end}",
                    f"SUMMARY:{_escape_ics(act_name)} - Day {day_num}",
                    f"DESCRIPTION:{desc}",
                    f"LOCATION:{_escape_ics(location)}",
                    "STATUS:CONFIRMED",
                    "END:VEVENT",
                ])
        else:
            # Fallback: Whole day event
            dt_start = day_date.strftime("%Y%m%d")
            dt_end = (day_date + timedelta(days=1)).strftime("%Y%m%d")
            uid = f"ai-travel-day-{uuid.uuid4().hex[:12]}@aitravelagent.app"

            lines.extend([
                "BEGIN:VEVENT",
                f"UID:{uid}",
                f"DTSTAMP:{now_stamp}",
                f"DTSTART;VALUE=DATE:{dt_start}",
                f"DTEND;VALUE=DATE:{dt_end}",
                f"SUMMARY:{_escape_ics(f'Day {day_num}: {day_theme}')}",
                f"DESCRIPTION:{_escape_ics(f'Explore {destination}. {day_theme}')}",
                f"LOCATION:{_escape_ics(destination)}",
                "STATUS:CONFIRMED",
                "END:VEVENT",
            ])

    lines.append("END:VCALENDAR")
    lines.append("")
    return "\r\n".join(lines).encode("utf-8")
