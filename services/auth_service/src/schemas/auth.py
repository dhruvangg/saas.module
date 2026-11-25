from typing import List, Optional
from pydantic import BaseModel, EmailStr


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class GoogleLoginRequest(BaseModel):
    credential: str  # Google ID token / JWT from @react-oauth/google or Google Identity Services


class RefreshTokenRequest(BaseModel):
    refresh_token: Optional[str] = None


class UserAuthProfile(BaseModel):
    id: int
    email: str
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    full_name: str
    is_active: bool
    is_superuser: bool
    auth_provider: str
    roles: List[str]
    permissions: List[str]

    class Config:
        from_attributes = True


class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int
    user: UserAuthProfile


class TokenPayload(BaseModel):
    sub: str  # User ID as string
    email: str
    is_superuser: bool = False
    roles: List[str] = []
    permissions: List[str] = []
    exp: Optional[int] = None
