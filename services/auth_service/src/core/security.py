from datetime import datetime, timedelta
from typing import Optional, Any, Union
import secrets
import hashlib
from jose import jwt, JWTError
import bcrypt
from src.config import settings


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a plain password against a bcrypt hash."""
    if not plain_password or not hashed_password:
        return False
    try:
        return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))
    except Exception:
        return False


def get_password_hash(password: str) -> str:
    """Hash a password using bcrypt."""
    salt = bcrypt.gensalt(rounds=12)
    return bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")


def create_access_token(
    subject: Union[str, Any],
    email: str,
    is_superuser: bool = False,
    roles: list = None,
    permissions: list = None,
    expires_delta: Optional[timedelta] = None
) -> str:
    """Create a signed JWT access token containing subject, roles, and effective permissions."""
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)

    to_encode = {
        "sub": str(subject),
        "email": email,
        "is_superuser": is_superuser,
        "roles": roles or [],
        "permissions": permissions or [],
        "exp": expire,
        "iat": datetime.utcnow(),
        "type": "access"
    }

    encoded_jwt = jwt.encode(to_encode, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)
    return encoded_jwt


def decode_token(token: str) -> Optional[dict]:
    """Decode and validate a JWT token."""
    try:
        payload = jwt.decode(
            token,
            settings.JWT_SECRET_KEY,
            algorithms=[settings.JWT_ALGORITHM]
        )
        return payload
    except JWTError:
        return None


def generate_refresh_token_string() -> str:
    """Generate a high-entropy random URL-safe refresh token string."""
    return secrets.token_urlsafe(48)


def hash_token(token: str) -> str:
    """Hash token string for secure database storage."""
    return hashlib.sha256(token.encode("utf-8")).hexdigest()
