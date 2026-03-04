"""
Trip Pydantic models for request/response validation.
"""
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime

class TripCreate(BaseModel):
    destination: str = Field(..., min_length=2)
    origin: str = Field(..., min_length=2)
    start_date: str
    end_date: str
    budget: float = Field(..., gt=0)
    currency: str = "USD"
    travelers: int = Field(..., ge=1)
    travel_style: str = "balanced"  # budget / balanced / luxury
    interests: List[str] = []
    special_requirements: Optional[str] = None

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
    id: str
    user_id: str
    destination: str
    origin: str
    start_date: str
    end_date: str
    budget: float
    currency: str
    travelers: int
    travel_style: str
    interests: List[str]
    special_requirements: Optional[str]
    itinerary: Optional[Dict[str, Any]] = None
    weather_data: Optional[Dict[str, Any]] = None
    route_data: Optional[Dict[str, Any]] = None
    budget_breakdown: Optional[Dict[str, Any]] = None
    packing_list: Optional[List[str]] = None
    risk_alerts: Optional[List[str]] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
