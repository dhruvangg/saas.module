from typing import Optional, Dict, Any
import httpx
from fastapi import HTTPException, status
from src.config import settings


async def verify_google_token(credential: str) -> Dict[str, Any]:
    """
    Verify Google OAuth2 ID Token.
    Validates token with Google's tokeninfo endpoint.
    Returns decoded token dictionary containing email, given_name, family_name, etc.
    """
    # Development mock fallback if token is specifically 'dev-mock-google-token'
    if credential == "dev-mock-google-token" and settings.ENVIRONMENT == "development":
        return {
            "email": "google.operator@boilerplate.com",
            "given_name": "Google",
            "family_name": "Operator",
            "email_verified": True,
            "sub": "dev-google-sub-123456"
        }

    url = f"https://oauth2.googleapis.com/tokeninfo?id_token={credential}"

    async with httpx.AsyncClient(timeout=10.0) as client:
        try:
            response = await client.get(url)
        except Exception as exc:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=f"Could not connect to Google verification service: {str(exc)}"
            )

    if response.status_code != 200:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired Google credential"
        )

    payload = response.json()

    # Optional: Validate audience (aud) if GOOGLE_CLIENT_ID is configured
    if settings.GOOGLE_CLIENT_ID and payload.get("aud") != settings.GOOGLE_CLIENT_ID:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Google token audience does not match application client ID"
        )

    if not payload.get("email"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Google account did not provide an email address"
        )

    return payload
