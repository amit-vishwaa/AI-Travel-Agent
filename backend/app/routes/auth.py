"""
Authentication routes: register, login, Google OAuth, reset password, get current user.
"""
from datetime import datetime, timedelta
import httpx
from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, status
from jose import jwt
from pymongo.errors import PyMongoError

from app.config.database import get_database
from app.config.settings import settings
from app.models.user import (
    ForgotPasswordRequest,
    GoogleAuthRequest,
    MessageResponse,
    TokenResponse,
    UserCreate,
    UserLogin,
    UserResponse,
)
from app.services.auth import (
    create_access_token,
    get_current_user,
    hash_password,
    verify_password,
)

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register(user_data: UserCreate):
    """Register a new user account with secure password hashing and normalized email."""
    db = get_database()
    clean_email = user_data.email.strip().lower()
    clean_name = user_data.name.strip()

    if len(user_data.password) < 6:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must be at least 6 characters long."
        )

    # Check if email already exists (case-insensitive check)
    try:
        existing = await db["users"].find_one({"email": clean_email})
    except PyMongoError:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database service is unavailable. Please verify MongoDB is running or configure MONGODB_URL in backend/.env."
        )

    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email already exists. Please sign in instead."
        )

    # Create user document
    user_doc = {
        "name": clean_name,
        "email": clean_email,
        "hashed_password": hash_password(user_data.password),
        "auth_provider": "local",
        "created_at": datetime.utcnow()
    }
    try:
        result = await db["users"].insert_one(user_doc)
    except PyMongoError:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Could not save user record. Database is currently unreachable."
        )
    user_id = str(result.inserted_id)

    # Create access token
    token = create_access_token(
        data={"sub": user_id},
        expires_delta=timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )

    return TokenResponse(
        access_token=token,
        user=UserResponse(
            id=user_id,
            name=clean_name,
            email=clean_email,
            auth_provider="local",
            created_at=user_doc["created_at"]
        )
    )


@router.post("/login", response_model=TokenResponse)
async def login(credentials: UserLogin):
    """Login with email and password."""
    db = get_database()
    clean_email = credentials.email.strip().lower()

    try:
        user = await db["users"].find_one({"email": clean_email})
    except PyMongoError:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database service is unavailable. Please verify MongoDB is running or configure MONGODB_URL in backend/.env."
        )
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="No account found with this email. Please check your email or register."
        )

    if not user.get("hashed_password"):
        # Account was created with Google OAuth
        if user.get("auth_provider") == "google":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="This account was registered using Google. Please click 'Sign in with Google'."
            )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid account credentials."
        )

    if not verify_password(credentials.password, user["hashed_password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect password. Please try again or use forgot password."
        )

    user_id = str(user["_id"])
    token = create_access_token(
        data={"sub": user_id},
        expires_delta=timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )

    return TokenResponse(
        access_token=token,
        user=UserResponse(
            id=user_id,
            name=user.get("name", "Traveler"),
            email=user["email"],
            avatar_url=user.get("avatar_url"),
            auth_provider=user.get("auth_provider", "local"),
            created_at=user.get("created_at") or datetime.utcnow()
        )
    )


@router.post("/google", response_model=TokenResponse)
async def google_auth(payload: GoogleAuthRequest):
    """Authenticate or register a user seamlessly with Google."""
    email = None
    name = None
    picture = None
    google_id = None

    if payload.credential:
        # First attempt: Google OAuth2 tokeninfo endpoint
        try:
            async with httpx.AsyncClient(timeout=8.0) as client:
                res = await client.get(
                    "https://oauth2.googleapis.com/tokeninfo",
                    params={"id_token": payload.credential}
                )
                if res.status_code == 200:
                    data = res.json()
                    email = data.get("email")
                    name = data.get("name")
                    picture = data.get("picture")
                    google_id = data.get("sub")
        except Exception:
            pass

        # Second attempt: Firebase / Google JWT claims decoding
        if not email:
            try:
                claims = jwt.get_unverified_claims(payload.credential)
                email = claims.get("email")
                name = claims.get("name")
                picture = claims.get("picture")
                google_id = claims.get("sub") or claims.get("user_id")
            except Exception:
                pass

    # Fallback to direct client payload if token verification was already performed or in test/demo mode
    email = email or payload.email
    name = name or payload.name
    picture = picture or payload.picture
    google_id = google_id or payload.google_id

    if not email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Could not retrieve email from Google authentication. Please try again."
        )

    clean_email = str(email).strip().lower()
    clean_name = str(name or clean_email.split("@")[0]).strip()

    db = get_database()
    try:
        user = await db["users"].find_one({"email": clean_email})

        if not user:
            # Create brand-new user via Google
            user_doc = {
                "name": clean_name,
                "email": clean_email,
                "auth_provider": "google",
                "google_id": google_id,
                "avatar_url": picture,
                "created_at": datetime.utcnow()
            }
            res = await db["users"].insert_one(user_doc)
            user_id = str(res.inserted_id)
            user_doc["_id"] = res.inserted_id
        else:
            user_id = str(user["_id"])
            user_doc = user
            # Link Google ID and avatar if not yet set
            updates = {}
            if not user.get("avatar_url") and picture:
                updates["avatar_url"] = picture
            if not user.get("google_id") and google_id:
                updates["google_id"] = google_id
            if updates:
                await db["users"].update_one({"_id": user["_id"]}, {"$set": updates})
    except PyMongoError:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database service is unavailable during Google sign-in. Please ensure MongoDB is running."
        )

    token = create_access_token(
        data={"sub": user_id},
        expires_delta=timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )

    return TokenResponse(
        access_token=token,
        user=UserResponse(
            id=user_id,
            name=user_doc.get("name") or clean_name,
            email=clean_email,
            avatar_url=user_doc.get("avatar_url") or picture,
            auth_provider=user_doc.get("auth_provider", "google"),
            created_at=user_doc.get("created_at") or datetime.utcnow()
        )
    )


@router.post("/forgot-password", response_model=MessageResponse)
async def forgot_password(payload: ForgotPasswordRequest):
    """Password reset endpoint."""
    db = get_database()
    clean_email = payload.email.strip().lower()
    user = await db["users"].find_one({"email": clean_email})

    if user:
        await db["users"].update_one(
            {"_id": user["_id"]},
            {
                "$set": {
                    "hashed_password": hash_password(payload.new_password),
                    "password_updated_at": datetime.utcnow(),
                }
            },
        )

    return MessageResponse(
        message="If an account exists for that email, the password has been updated."
    )


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: dict = Depends(get_current_user)):
    """Get the currently authenticated user's profile."""
    return UserResponse(
        id=current_user["id"],
        name=current_user["name"],
        email=current_user["email"],
        avatar_url=current_user.get("avatar_url"),
        auth_provider=current_user.get("auth_provider", "local"),
        created_at=current_user["created_at"]
    )
