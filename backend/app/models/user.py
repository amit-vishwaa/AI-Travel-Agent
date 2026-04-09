"""
User Pydantic models for request/response validation.
"""
from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from datetime import datetime

class UserCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=50)
    email: EmailStr
    password: str = Field(..., min_length=6)

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class ForgotPasswordRequest(BaseModel):
    email: EmailStr
    new_password: str = Field(..., min_length=6)

class UserResponse(BaseModel):
    id: str
    name: str
    email: str
    created_at: datetime

    class Config:
        from_attributes = True

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

class MessageResponse(BaseModel):
    message: str

class UserInDB(BaseModel):
    id: Optional[str] = None
    name: str
    email: str
    hashed_password: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
