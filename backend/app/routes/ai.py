"""
AI routes: local-first chatbot endpoint.
"""
from __future__ import annotations

from typing import Dict, List, Optional

from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel

from app.services.auth import get_current_user
from app.services.ai_preferences import get_ai_preferences
from app.services.trip_planner import chat_with_ai

router = APIRouter(prefix="/ai", tags=["AI"])


class ChatRequest(BaseModel):
    message: str
    trip_context: Optional[dict] = None
    history: Optional[List[Dict[str, str]]] = None


class ChatResponse(BaseModel):
    response: str


@router.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest, http_request: Request, current_user: dict = Depends(get_current_user)):
    ai_preferences = get_ai_preferences(http_request)
    response = await chat_with_ai(request.message, request.trip_context, request.history, ai_preferences)
    return ChatResponse(response=response)
