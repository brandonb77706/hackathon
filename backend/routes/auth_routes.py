"""
Google OAuth 2.0 flow.
Identity key: oauth_sub (Google subject ID). Email is stored for display only.
"""
import httpx
from fastapi import APIRouter, Request
from fastapi.responses import RedirectResponse
from datetime import datetime, timezone

from config import settings
from database import get_db
from auth import create_access_token, get_current_user
from models import UserProfile, TokenResponse
from fastapi import Depends

router = APIRouter(prefix="/auth", tags=["auth"])

GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v3/userinfo"


@router.get("/google")
async def google_login(request: Request):
    """Redirect user to Google consent screen."""
    redirect_uri = f"{request.base_url}auth/google/callback"
    params = {
        "client_id": settings.google_client_id,
        "redirect_uri": redirect_uri,
        "response_type": "code",
        "scope": "openid email profile",
        "access_type": "offline",
    }
    query = "&".join(f"{k}={v}" for k, v in params.items())
    return RedirectResponse(f"{GOOGLE_AUTH_URL}?{query}")


@router.get("/google/callback")
async def google_callback(code: str, request: Request):
    """
    Exchange code for tokens, fetch user info from Google,
    upsert user in MongoDB by oauth_sub, return signed JWT.
    """
    redirect_uri = f"{request.base_url}auth/google/callback"

    async with httpx.AsyncClient() as client:
        # Exchange auth code for Google tokens
        token_resp = await client.post(
            GOOGLE_TOKEN_URL,
            data={
                "code": code,
                "client_id": settings.google_client_id,
                "client_secret": settings.google_client_secret,
                "redirect_uri": redirect_uri,
                "grant_type": "authorization_code",
            },
        )
        token_data = token_resp.json()

        # Fetch Google user profile
        userinfo_resp = await client.get(
            GOOGLE_USERINFO_URL,
            headers={"Authorization": f"Bearer {token_data['access_token']}"},
        )
        userinfo = userinfo_resp.json()

    oauth_sub = userinfo["sub"]  # Primary identity — never use email for auth
    email = userinfo.get("email")
    name = userinfo.get("name")

    db = get_db()

    # Upsert by oauth_sub — email is only stored for display
    result = await db.users.find_one_and_update(
        {"oauth_sub": oauth_sub},
        {
            "$set": {"email": email, "name": name},
            "$setOnInsert": {
                "oauth_provider": "google",
                "oauth_sub": oauth_sub,
                "city": None,
                "created_at": datetime.now(timezone.utc),
            },
        },
        upsert=True,
        return_document=True,
    )

    user_id = str(result["_id"])
    jwt_token = create_access_token(user_id=user_id, oauth_sub=oauth_sub)

    # Redirect to frontend with JWT in query param (frontend stores in httpOnly cookie)
    return RedirectResponse(
        f"{settings.frontend_url}/auth/callback?token={jwt_token}"
    )


from pydantic import BaseModel as _BaseModel

class GoogleTokenRequest(_BaseModel):
    access_token: str


@router.post("/google-token", response_model=TokenResponse)
async def google_token_exchange(payload: GoogleTokenRequest):
    """
    Accepts a Google access token (issued by next-auth),
    fetches user info from Google, upserts user by oauth_sub, returns FastAPI JWT.
    This avoids a second OAuth redirect dance.
    """
    async with httpx.AsyncClient() as client:
        userinfo_resp = await client.get(
            GOOGLE_USERINFO_URL,
            headers={"Authorization": f"Bearer {payload.access_token}"},
        )
        if userinfo_resp.status_code != 200:
            from fastapi import HTTPException
            raise HTTPException(status_code=401, detail="Invalid Google access token")
        userinfo = userinfo_resp.json()

    oauth_sub = userinfo["sub"]
    email = userinfo.get("email")
    name = userinfo.get("name")

    db = get_db()
    result = await db.users.find_one_and_update(
        {"oauth_sub": oauth_sub},
        {
            "$set": {"email": email, "name": name},
            "$setOnInsert": {
                "oauth_provider": "google",
                "oauth_sub": oauth_sub,
                "city": None,
                "created_at": datetime.now(timezone.utc),
            },
        },
        upsert=True,
        return_document=True,
    )

    user_id = str(result["_id"])
    jwt_token = create_access_token(user_id=user_id, oauth_sub=oauth_sub)
    return TokenResponse(access_token=jwt_token)


@router.get("/me", response_model=UserProfile)
async def get_me(current_user: dict = Depends(get_current_user)):
    """Return profile for the authenticated user."""
    db = get_db()
    from bson import ObjectId

    user = await db.users.find_one({"_id": ObjectId(current_user["user_id"])})
    if not user:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="User not found")

    return UserProfile(
        user_id=str(user["_id"]),
        oauth_sub=user["oauth_sub"],
        email=user.get("email"),
        name=user.get("name"),
        city=user.get("city"),
        created_at=user.get("created_at"),
    )
