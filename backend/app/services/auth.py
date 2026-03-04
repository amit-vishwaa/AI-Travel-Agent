"""
Authentication service: JWT creation/verification and password hashing.
"""
import base64
import hashlib
from datetime import datetime, timedelta
from typing import Optional
import bcrypt
from jose import JWTError, jwt
from fastapi import HTTPException, status, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.config.settings import settings
from app.config.database import get_database

bearer_scheme = HTTPBearer()

def _normalized_password_bytes(password: str) -> bytes:
    """Normalize password bytes to a fixed, bcrypt-safe length."""
    digest = hashlib.sha256(password.encode("utf-8")).digest()
    return base64.b64encode(digest)

def hash_password(password: str) -> str:
    """Hash a plain-text password with bcrypt using normalized bytes."""
    normalized = _normalized_password_bytes(password)
    return bcrypt.hashpw(normalized, bcrypt.gensalt()).decode("utf-8")

def verify_password(plain: str, hashed: str) -> bool:
    """Verify password against hash, supporting legacy and normalized hashes."""
    hashed_bytes = hashed.encode("utf-8")
    plain_bytes = plain.encode("utf-8")
    normalized = _normalized_password_bytes(plain)

    try:
        if len(plain_bytes) <= 72 and bcrypt.checkpw(plain_bytes, hashed_bytes):
            return True
        return bcrypt.checkpw(normalized, hashed_bytes)
    except ValueError:
        return False

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Create a signed JWT access token."""
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme)
):
    """Dependency: decode JWT and return the current user document."""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        token = credentials.credentials
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        user_id: str | None = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    db = get_database()
    from bson import ObjectId
    user = await db["users"].find_one({"_id": ObjectId(user_id)})
    if user is None:
        raise credentials_exception
    user["id"] = str(user["_id"])
    return user
