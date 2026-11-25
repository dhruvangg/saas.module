from datetime import datetime, timedelta
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, Response, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from sqlalchemy.orm import selectinload

from src.database import get_db
from src.config import settings
from src.core.security import (
    verify_password,
    create_access_token,
    generate_refresh_token_string,
    hash_token,
    get_password_hash
)
from src.core.dependencies import get_current_user, get_user_effective_permissions
from src.core.google_oauth import verify_google_token
from src.core.audit import log_audit_event
from src.models.user import User
from src.models.role import Role
from src.models.refresh_token import RefreshToken
from src.schemas.auth import (
    LoginRequest,
    GoogleLoginRequest,
    RefreshTokenRequest,
    Token,
    UserAuthProfile
)

router = APIRouter(prefix="/auth", tags=["Authentication"])


async def create_user_tokens(user: User, db: AsyncSession, response: Response) -> Token:
    """Helper to generate access token and store rotating refresh token."""
    roles = [role.name for role in user.roles]
    permissions = list(get_user_effective_permissions(user))

    # Access token
    access_token = create_access_token(
        subject=user.id,
        email=user.email,
        is_superuser=user.is_superuser,
        roles=roles,
        permissions=permissions
    )

    # Refresh token
    refresh_token_plain = generate_refresh_token_string()
    refresh_hash = hash_token(refresh_token_plain)
    expires_at = datetime.utcnow() + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)

    db_refresh = RefreshToken(
        user_id=user.id,
        token_hash=refresh_hash,
        expires_at=expires_at,
        revoked=False
    )
    db.add(db_refresh)
    await db.commit()

    # Set HttpOnly Cookie for security
    response.set_cookie(
        key="refresh_token",
        value=refresh_token_plain,
        httponly=True,
        secure=settings.ENVIRONMENT != "development",
        samesite="lax",
        max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 86400,
        path="/api/v1/auth"
    )

    user_profile = UserAuthProfile(
        id=user.id,
        email=user.email,
        first_name=user.first_name,
        last_name=user.last_name,
        full_name=user.full_name,
        is_active=user.is_active,
        is_superuser=user.is_superuser,
        auth_provider=user.auth_provider,
        roles=roles,
        permissions=permissions
    )

    return Token(
        access_token=access_token,
        refresh_token=refresh_token_plain,
        token_type="bearer",
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        user=user_profile
    )


@router.post("/login", response_model=Token)
async def login(
    payload: LoginRequest,
    request: Request,
    response: Response,
    db: AsyncSession = Depends(get_db)
):
    """Authenticate with Email and Password."""
    stmt = (
        select(User)
        .options(selectinload(User.roles).selectinload(Role.privileges))
        .where(User.email == payload.email.lower().strip())
    )
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()

    if not user or not user.hashed_password or not verify_password(payload.password, user.hashed_password):
        await log_audit_event(
            db, action="LOGIN_FAILED", resource="auth",
            user_email=payload.email, ip_address=request.client.host if request.client else None
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password"
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is deactivated. Contact an administrator."
        )

    await log_audit_event(
        db, action="USER_LOGIN", resource="auth",
        user_id=user.id, user_email=user.email,
        ip_address=request.client.host if request.client else None
    )

    return await create_user_tokens(user, db, response)


@router.post("/google", response_model=Token)
async def google_login(
    payload: GoogleLoginRequest,
    request: Request,
    response: Response,
    db: AsyncSession = Depends(get_db)
):
    """Authenticate with Google OAuth 2.0."""
    google_data = await verify_google_token(payload.credential)
    email = google_data["email"].lower().strip()

    stmt = (
        select(User)
        .options(selectinload(User.roles).selectinload(Role.privileges))
        .where(User.email == email)
    )
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()

    if not user:
        # Create new user via Google Sign-In
        user = User(
            email=email,
            first_name=google_data.get("given_name", ""),
            last_name=google_data.get("family_name", ""),
            auth_provider="google",
            is_active=True,
            is_superuser=False
        )
        # Assign default Viewer role if available
        viewer_role_stmt = select(Role).options(selectinload(Role.privileges)).where(Role.name == "Viewer")
        viewer_result = await db.execute(viewer_role_stmt)
        viewer_role = viewer_result.scalar_one_or_none()
        if viewer_role:
            user.roles.append(viewer_role)

        db.add(user)
        await db.commit()
        await db.refresh(user)

        # Re-fetch user with relationships
        stmt = (
            select(User)
            .options(selectinload(User.roles).selectinload(Role.privileges))
            .where(User.id == user.id)
        )
        result = await db.execute(stmt)
        user = result.scalar_one()

        await log_audit_event(
            db, action="GOOGLE_SIGNUP", resource="auth",
            user_id=user.id, user_email=user.email,
            details={"provider": "google"},
            ip_address=request.client.host if request.client else None
        )
    else:
        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Account is deactivated."
            )
        await log_audit_event(
            db, action="GOOGLE_LOGIN", resource="auth",
            user_id=user.id, user_email=user.email,
            details={"provider": "google"},
            ip_address=request.client.host if request.client else None
        )

    return await create_user_tokens(user, db, response)


@router.post("/refresh", response_model=Token)
async def refresh_access_token(
    request: Request,
    response: Response,
    payload: Optional[RefreshTokenRequest] = None,
    db: AsyncSession = Depends(get_db)
):
    """Rotate refresh token and issue a fresh access token."""
    # Read refresh token from body or HttpOnly cookie
    refresh_token_plain = None
    if payload and payload.refresh_token:
        refresh_token_plain = payload.refresh_token
    elif "refresh_token" in request.cookies:
        refresh_token_plain = request.cookies["refresh_token"]

    if not refresh_token_plain:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token missing"
        )

    token_hash = hash_token(refresh_token_plain)
    stmt = (
        select(RefreshToken)
        .where(
            and_(
                RefreshToken.token_hash == token_hash,
                RefreshToken.revoked == False,
                RefreshToken.expires_at > datetime.utcnow()
            )
        )
    )
    result = await db.execute(stmt)
    stored_token = result.scalar_one_or_none()

    if not stored_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or revoked refresh token"
        )

    # Invalidate used refresh token (Token Rotation)
    stored_token.revoked = True
    await db.commit()

    # Load associated user
    user_stmt = (
        select(User)
        .options(selectinload(User.roles).selectinload(Role.privileges))
        .where(User.id == stored_token.user_id)
    )
    user_result = await db.execute(user_stmt)
    user = user_result.scalar_one_or_none()

    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or inactive"
        )

    return await create_user_tokens(user, db, response)


@router.post("/logout")
async def logout(
    request: Request,
    response: Response,
    payload: Optional[RefreshTokenRequest] = None,
    db: AsyncSession = Depends(get_db)
):
    """Revoke refresh token and clear session cookie."""
    refresh_token_plain = None
    if payload and payload.refresh_token:
        refresh_token_plain = payload.refresh_token
    elif "refresh_token" in request.cookies:
        refresh_token_plain = request.cookies["refresh_token"]

    if refresh_token_plain:
        token_hash = hash_token(refresh_token_plain)
        stmt = select(RefreshToken).where(RefreshToken.token_hash == token_hash)
        result = await db.execute(stmt)
        stored_token = result.scalar_one_or_none()
        if stored_token:
            stored_token.revoked = True
            await db.commit()

    response.delete_cookie(key="refresh_token", path="/api/v1/auth")
    return {"message": "Successfully logged out"}


@router.get("/me", response_model=UserAuthProfile)
async def get_me(current_user: User = Depends(get_current_user)):
    """Retrieve currently authenticated user profile with roles and effective permissions."""
    roles = [role.name for role in current_user.roles]
    permissions = list(get_user_effective_permissions(current_user))

    return UserAuthProfile(
        id=current_user.id,
        email=current_user.email,
        first_name=current_user.first_name,
        last_name=current_user.last_name,
        full_name=current_user.full_name,
        is_active=current_user.is_active,
        is_superuser=current_user.is_superuser,
        auth_provider=current_user.auth_provider,
        roles=roles,
        permissions=permissions
    )
