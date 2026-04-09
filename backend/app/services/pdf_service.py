"""
PDF export for trip plans.
"""
from __future__ import annotations

from html import escape
from io import BytesIO

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle


def _safe(value) -> str:
    return escape("" if value is None else str(value))


def _paragraphs(items: list[str], style: ParagraphStyle) -> list[Paragraph]:
    return [Paragraph(f"- {_safe(item)}", style) for item in items if item]


def _is_new_itinerary(itinerary: dict) -> bool:
    days = itinerary.get("days") or []
    return bool(days) and isinstance(days[0], dict) and isinstance(days[0].get("activities"), list)


def build_trip_pdf(trip: dict) -> bytes:
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, leftMargin=16 * mm, rightMargin=16 * mm, topMargin=16 * mm)
    styles = getSampleStyleSheet()
    title = styles["Title"]
    body = styles["BodyText"]
    heading = styles["Heading2"]
    body.leading = 14

    elements = [
        Paragraph("AI Travel Agent Travel Plan", title),
        Paragraph(f"{_safe(trip.get('origin'))} to {_safe(trip.get('destination'))}", heading),
        Paragraph(
            f"Dates: {_safe(trip.get('start_date'))} to {_safe(trip.get('end_date'))} | "
            f"Travelers: {_safe(trip.get('travelers'))} | Budget: {_safe(trip.get('budget'))} {_safe(trip.get('currency'))}",
            body,
        ),
        Spacer(1, 8),
    ]

    itinerary = trip.get("itinerary") or {}
    if _is_new_itinerary(itinerary):
        if itinerary.get("overview"):
            elements.extend([Paragraph("Trip Overview", heading), Paragraph(_safe(itinerary["overview"]), body), Spacer(1, 6)])

        meta_rows = [
            f"Duration: {_safe(itinerary.get('duration'))}",
            f"Theme: {_safe(itinerary.get('theme'))}",
            f"Best time: {_safe(itinerary.get('bestTimeToVisit'))}",
            f"Currency: {_safe(itinerary.get('currency'))}",
            f"Language: {_safe(itinerary.get('language'))}",
            f"Timezone: {_safe(itinerary.get('timezone'))}",
            f"Total budget: {_safe(itinerary.get('totalBudgetEstimate'))}",
        ]
        elements.extend([Paragraph(item, body) for item in meta_rows if item])
        elements.append(Spacer(1, 6))

        days = itinerary.get("days") or []
        if days:
            elements.append(Paragraph("Day-wise Itinerary", heading))
            for day in days:
                elements.append(
                    Paragraph(
                        f"Day {_safe(day.get('day'))}: {_safe(day.get('title'))} - {_safe(day.get('theme'))}",
                        styles["Heading3"],
                    )
                )
                elements.append(Paragraph(f"Weather: {_safe(day.get('weather'))}", body))
                meals = day.get("meals") or {}
                if meals:
                    elements.append(
                        Paragraph(
                            f"<b>Meals:</b> Breakfast {_safe(meals.get('breakfast'))} | "
                            f"Lunch {_safe(meals.get('lunch'))} | Dinner {_safe(meals.get('dinner'))}",
                            body,
                        )
                    )
                for activity in day.get("activities") or []:
                    elements.append(
                        Paragraph(
                            f"<b>{_safe(activity.get('time'))}:</b> {_safe(activity.get('activity'))} "
                            f"({_safe(activity.get('location'))}, {_safe(activity.get('duration'))}, "
                            f"{_safe(activity.get('cost'))}, {_safe(activity.get('category'))})",
                            body,
                        )
                    )
                    if activity.get("tips"):
                        elements.append(Paragraph(f"Tip: {_safe(activity.get('tips'))}", body))
                elements.append(Paragraph(f"<b>Transport:</b> {_safe(day.get('transport'))}", body))
                elements.append(Paragraph(f"<b>Stay:</b> {_safe(day.get('accommodation'))}", body))
                elements.append(Paragraph(f"<b>Daily budget:</b> {_safe(day.get('estimatedDailyBudget'))}", body))
                elements.append(Spacer(1, 4))

        if itinerary.get("travelTips"):
            elements.extend([Paragraph("Travel Tips", heading), *_paragraphs(itinerary.get("travelTips") or [], body), Spacer(1, 6)])
        if itinerary.get("packingList"):
            elements.extend([Paragraph("Packing List", heading), *_paragraphs(itinerary.get("packingList") or [], body), Spacer(1, 6)])
        if itinerary.get("localPhrases"):
            elements.append(Paragraph("Local Phrases", heading))
            for phrase in itinerary.get("localPhrases") or []:
                elements.append(Paragraph(f"{_safe(phrase.get('phrase'))}: {_safe(phrase.get('meaning'))}", body))
            elements.append(Spacer(1, 6))
        contacts = itinerary.get("emergencyContacts") or {}
        if contacts:
            elements.append(Paragraph("Emergency Contacts", heading))
            elements.append(Paragraph(f"Police: {_safe(contacts.get('police'))}", body))
            elements.append(Paragraph(f"Ambulance: {_safe(contacts.get('ambulance'))}", body))
            elements.append(Paragraph(f"Tourist helpline: {_safe(contacts.get('tourist_helpline'))}", body))
            elements.append(Spacer(1, 6))
    else:
        if itinerary.get("trip_summary"):
            elements.extend([Paragraph("Trip Summary", heading), Paragraph(_safe(itinerary["trip_summary"]), body), Spacer(1, 6)])

        days = itinerary.get("days") or []
        if days:
            elements.append(Paragraph("Day-wise Itinerary", heading))
            for day in days:
                elements.append(Paragraph(f"Day {_safe(day.get('day'))}: {_safe(day.get('theme'))} ({_safe(day.get('date'))})", styles["Heading3"]))
                for slot_name in ("morning", "afternoon", "evening"):
                    slot = day.get(slot_name) or {}
                    if slot:
                        text = (
                            f"<b>{slot_name.title()}:</b> {_safe(slot.get('activity'))} - {_safe(slot.get('description'))} "
                            f"({_safe(slot.get('location'))}, {_safe(slot.get('duration'))}, cost {_safe(slot.get('estimated_cost'))})"
                        )
                        elements.append(Paragraph(text, body))
                transport = day.get("transport") or {}
                if transport:
                    elements.append(
                        Paragraph(
                            f"<b>Transport:</b> {_safe(transport.get('mode'))} - {_safe(transport.get('details'))} "
                            f"(cost {_safe(transport.get('estimated_cost'))})",
                            body,
                        )
                    )
                meals = day.get("meals") or []
                for meal in meals:
                    elements.append(
                        Paragraph(
                            f"<b>{_safe(meal.get('meal'))}:</b> {_safe(meal.get('suggestion'))} "
                            f"({_safe(meal.get('cuisine'))}, cost {_safe(meal.get('cost'))})",
                            body,
                        )
                    )
                accommodation = day.get("accommodation") or {}
                if accommodation:
                    elements.append(
                        Paragraph(
                            f"<b>Stay:</b> {_safe(accommodation.get('name'))} - {_safe(accommodation.get('area'))} "
                            f"({_safe(accommodation.get('type'))}, cost/night {_safe(accommodation.get('estimated_cost_per_night'))})",
                            body,
                        )
                    )
                cost_breakdown = day.get("cost_breakdown") or {}
                if cost_breakdown:
                    elements.append(
                        Paragraph(
                            " / ".join(
                                [
                                    f"{_safe(label.title())}: {_safe(amount)}"
                                    for label, amount in cost_breakdown.items()
                                ]
                            ),
                            body,
                        )
                    )
                elements.append(Spacer(1, 4))

        if itinerary.get("travelTips") or itinerary.get("local_tips") or itinerary.get("travel_suggestions"):
            travel_tips = itinerary.get("travelTips") or [*(itinerary.get("local_tips") or []), *(itinerary.get("travel_suggestions") or [])]
            elements.extend([Paragraph("Travel Tips", heading), *_paragraphs(travel_tips, body), Spacer(1, 6)])
        if itinerary.get("packingList"):
            elements.extend([Paragraph("Packing List", heading), *_paragraphs(itinerary.get("packingList") or [], body), Spacer(1, 6)])
        if itinerary.get("localPhrases"):
            elements.append(Paragraph("Local Phrases", heading))
            for phrase in itinerary.get("localPhrases") or []:
                elements.append(Paragraph(f"{_safe(phrase.get('phrase'))}: {_safe(phrase.get('meaning'))}", body))
            elements.append(Spacer(1, 6))
        contacts = itinerary.get("emergencyContacts") or {}
        if contacts:
            elements.append(Paragraph("Emergency Contacts", heading))
            elements.append(Paragraph(f"Police: {_safe(contacts.get('police'))}", body))
            elements.append(Paragraph(f"Ambulance: {_safe(contacts.get('ambulance'))}", body))
            elements.append(Paragraph(f"Tourist helpline: {_safe(contacts.get('tourist_helpline'))}", body))
            elements.append(Spacer(1, 6))

    budget = trip.get("budget_breakdown") or {}
    categories = budget.get("categories") or []
    if categories:
        elements.append(Paragraph("Budget Breakdown", heading))
        table_data = [["Category", "Amount", "%"]] + [
            [_safe(item.get("name")), _safe(item.get("amount")), _safe(item.get("percentage"))] for item in categories
        ]
        table = Table(table_data, hAlign="LEFT")
        table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#0f766e")),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f8fafc")]),
        ]))
        elements.extend([table, Spacer(1, 6)])

    risk = trip.get("risk_alert") or {}
    alerts = risk.get("alerts") or []
    if alerts:
        elements.append(Paragraph("Risk Alerts", heading))
        elements.extend(
            Paragraph(
                f"<b>{_safe(alert.get('risk_level'))}:</b> {_safe(alert.get('title'))} - {_safe(alert.get('smart_suggestion'))} "
                f"(Alternative: {_safe(alert.get('alternative'))})",
                body,
            )
            for alert in alerts
        )
        elements.append(Spacer(1, 6))

    packing_list = trip.get("packing_list") or {}
    if packing_list:
        elements.append(Paragraph("Packing List", heading))
        for category, items in packing_list.items():
            elements.append(Paragraph(_safe(category.title()), styles["Heading3"]))
            elements.extend(_paragraphs([item.get("name") for item in items], body))
        elements.append(Spacer(1, 6))

    doc.build(elements)
    return buffer.getvalue()
