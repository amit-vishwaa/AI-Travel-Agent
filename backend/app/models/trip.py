"""
Trip Pydantic models for request/response validation.
"""
from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, ConfigDict, Field, computed_field


class TripCreate(BaseModel):
    destination: str = Field(..., min_length=2)
    origin: str = Field(..., min_length=2)
    start_date: str
    end_date: str
    budget: float = Field(..., gt=0)
    currency: str = "USD"
    travelers: int = Field(..., ge=1)
    travel_style: str = "balanced"
    interests: List[str] = Field(default_factory=list)
    special_requirements: Optional[str] = None

    @computed_field
    @property
    def duration_days(self) -> int:
        start = datetime.fromisoformat(self.start_date)
        end = datetime.fromisoformat(self.end_date)
        return max((end - start).days, 1)


class TripUpdate(BaseModel):
    destination: Optional[str] = None
    origin: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    budget: Optional[float] = None
    currency: Optional[str] = None
    travelers: Optional[int] = None
    travel_style: Optional[str] = None
    interests: Optional[List[str]] = None
    special_requirements: Optional[str] = None


class TripResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    user_id: str
    destination: str
    origin: str
    start_date: str
    end_date: str
    duration: int
    budget: float
    currency: str
    travelers: int
    travel_style: str
    interests: List[str]
    special_requirements: Optional[str]
    itinerary: Optional[Dict[str, Any]] = None
    weather: Optional[Dict[str, Any]] = None
    route_data: Optional[Dict[str, Any]] = None
    budget_breakdown: Optional[Dict[str, Any]] = None
    packing_list: Optional[Dict[str, List[Dict[str, Any]]]] = None
    risk_alert: Optional[Dict[str, Any]] = None
    created_at: datetime
    updated_at: datetime
