"""
AI routes: chatbot and on-demand AI generation.
"""
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from typing import Optional
from app.services.ai_service import chat_with_ai
from app.services.auth import get_current_user

router = APIRouter(prefix="/ai", tags=["AI"])

class ChatRequest(BaseModel):
    message: str
    trip_context: Optional[dict] = None

class ChatResponse(BaseModel):
    response: str

@router.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest, current_user: dict = Depends(get_current_user)):
    """AI travel chatbot endpoint."""
    response = await chat_with_ai(request.message, request.trip_context)
    return ChatResponse(response=response)
