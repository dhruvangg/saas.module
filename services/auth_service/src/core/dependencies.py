from typing import Set, Callable
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from src.database import get_db
from src.core.security import decode_token
from src.models.user import User
from src.models.role import Role

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login", auto_error=False)


def get_user_effective_permissions(user: User) -> Set[str]:
    """Compute unique effective permissions set from all roles assigned to user."""
    if user.is_superuser:
        return {"*"}

    permissions = set()
    for role in user.roles:
        for priv in role.privileges:
            permissions.add(priv.name)
    return permissions


async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db)
) -> User:
    """Validate JWT token and retrieve the user with their roles and privileges."""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate authentication credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    if not token:
        raise credentials_exception

    payload = decode_token(token)
    if not payload:
        raise credentials_exception

    user_id = payload.get("sub")
    if not user_id:
        raise credentials_exception

    stmt = (
        select(User)
        .options(
            selectinload(User.roles).selectinload(Role.privileges)
        )
        .where(User.id == int(user_id))
    )
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()

    if not user:
        raise credentials_exception

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is deactivated"
        )

    return user


def require_permission(permission: str) -> Callable:
    """
    FastAPI dependency factory to enforce RBAC permissions.
    Usage:
        @router.post("/items", dependencies=[Depends(require_permission("item:create"))])
    """
    async def permission_checker(current_user: User = Depends(get_current_user)) -> User:
        if current_user.is_superuser:
            return current_user

        effective_permissions = get_user_effective_permissions(current_user)

        # Allow exact match or wildcard resource match (e.g., 'user:*' matches 'user:create')
        has_perm = (
            "*" in effective_permissions or
            permission in effective_permissions or
            f"{permission.split(':')[0]}:*" in effective_permissions
        )

        if not has_perm:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied: missing required privilege '{permission}'"
            )

        return current_user

    return permission_checker


async def require_superuser(current_user: User = Depends(get_current_user)) -> User:
    """Dependency ensuring only system superusers can perform an action."""
    if not current_user.is_superuser:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Superuser access required for this action"
        )
    return current_user
