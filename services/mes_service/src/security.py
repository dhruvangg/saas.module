import os
from typing import Callable, List
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError

JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "9f8a3c8e5d2b1a0f9e8d7c6b5a4f3e2d1c0b9a8f7e6d5c4b3a2f1e0d9c8b7a6")
JWT_ALGORITHM = "HS256"

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="http://localhost:8000/api/v1/auth/login", auto_error=False)


def get_token_claims(token: str = Depends(oauth2_scheme)) -> dict:
    """Stateless JWT validation across microservices."""
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authorization token required"
        )
    try:
        payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
        return payload
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired authorization token"
        )


def require_permission(permission: str) -> Callable:
    """Dependency ensuring caller's token includes the required privilege."""
    def checker(claims: dict = Depends(get_token_claims)) -> dict:
        is_superuser = claims.get("is_superuser", False)
        if is_superuser:
            return claims

        user_perms: List[str] = claims.get("permissions", [])
        has_perm = (
            "*" in user_perms or
            permission in user_perms or
            f"{permission.split(':')[0]}:*" in user_perms
        )

        if not has_perm:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied: missing required privilege '{permission}'"
            )
        return claims

    return checker
