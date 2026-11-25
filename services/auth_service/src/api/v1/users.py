from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_
from sqlalchemy.orm import selectinload

from src.database import get_db
from src.core.dependencies import get_current_user, require_permission
from src.core.security import get_password_hash
from src.core.audit import log_audit_event
from src.models.user import User
from src.models.role import Role
from src.schemas.user import (
    UserCreate,
    UserUpdate,
    UserResponse,
    UserRoleAssign
)

router = APIRouter(prefix="/users", tags=["Users"])


@router.get("", response_model=List[UserResponse], dependencies=[Depends(require_permission("user:read"))])
async def list_users(
    search: Optional[str] = Query(None, description="Search by email or name"),
    role_id: Optional[int] = Query(None, description="Filter by role ID"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: AsyncSession = Depends(get_db)
):
    """List users with role details and search filtering."""
    stmt = select(User).options(selectinload(User.roles)).offset(skip).limit(limit).order_by(User.id.desc())

    if search:
        search_fmt = f"%{search.strip()}%"
        stmt = stmt.where(
            or_(
                User.email.ilike(search_fmt),
                User.first_name.ilike(search_fmt),
                User.last_name.ilike(search_fmt)
            )
        )

    if role_id:
        stmt = stmt.where(User.roles.any(Role.id == role_id))

    result = await db.execute(stmt)
    return result.scalars().all()


@router.get("/{user_id}", response_model=UserResponse, dependencies=[Depends(require_permission("user:read"))])
async def get_user(user_id: int, db: AsyncSession = Depends(get_db)):
    """Retrieve details for a single user."""
    stmt = select(User).options(selectinload(User.roles)).where(User.id == user_id)
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return user


@router.post("", response_model=UserResponse, status_code=status.HTTP_201_CREATED, dependencies=[Depends(require_permission("user:create"))])
async def create_user(
    payload: UserCreate,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Create a new user and assign roles."""
    # Check if email exists
    existing = await db.execute(select(User).where(User.email == payload.email.lower().strip()))
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with this email address already exists"
        )

    user = User(
        email=payload.email.lower().strip(),
        hashed_password=get_password_hash(payload.password),
        first_name=payload.first_name,
        last_name=payload.last_name,
        is_active=payload.is_active,
        auth_provider="local"
    )

    if payload.role_ids:
        roles_result = await db.execute(select(Role).where(Role.id.in_(payload.role_ids)))
        user.roles = list(roles_result.scalars().all())

    db.add(user)
    await db.commit()
    await db.refresh(user)

    # Re-fetch user with roles
    stmt = select(User).options(selectinload(User.roles)).where(User.id == user.id)
    result = await db.execute(stmt)
    created_user = result.scalar_one()

    await log_audit_event(
        db, action="USER_CREATE", resource="user",
        user_id=current_user.id, user_email=current_user.email,
        details={"created_user_id": user.id, "email": user.email, "roles": [r.name for r in created_user.roles]},
        ip_address=request.client.host if request.client else None
    )

    return created_user


@router.put("/{user_id}", response_model=UserResponse, dependencies=[Depends(require_permission("user:update"))])
async def update_user(
    user_id: int,
    payload: UserUpdate,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Update user information, password, activation status, or role assignments."""
    stmt = select(User).options(selectinload(User.roles)).where(User.id == user_id)
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    if payload.first_name is not None:
        user.first_name = payload.first_name
    if payload.last_name is not None:
        user.last_name = payload.last_name
    if payload.is_active is not None:
        # Prevent deactivating the last active superuser
        if user.is_superuser and not payload.is_active:
            count_stmt = select(func.count(User.id)).where(User.is_superuser == True, User.is_active == True)
            super_count = await db.scalar(count_stmt)
            if super_count <= 1:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Cannot deactivate the last active Super Admin account"
                )
        user.is_active = payload.is_active

    if payload.password:
        user.hashed_password = get_password_hash(payload.password)

    if payload.role_ids is not None:
        roles_result = await db.execute(select(Role).where(Role.id.in_(payload.role_ids)))
        user.roles = list(roles_result.scalars().all())

    await db.commit()
    await db.refresh(user)

    await log_audit_event(
        db, action="USER_UPDATE", resource="user",
        user_id=current_user.id, user_email=current_user.email,
        details={"updated_user_id": user.id, "email": user.email},
        ip_address=request.client.host if request.client else None
    )

    return user


@router.delete("/{user_id}", status_code=status.HTTP_200_OK, dependencies=[Depends(require_permission("user:delete"))])
async def delete_user(
    user_id: int,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Delete a user account. Protects against self-deletion and deleting the last super admin."""
    if current_user.id == user_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot delete your own account"
        )

    stmt = select(User).where(User.id == user_id)
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    if user.is_superuser:
        count_stmt = select(func.count(User.id)).where(User.is_superuser == True)
        super_count = await db.scalar(count_stmt)
        if super_count <= 1:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot delete the last Super Admin in the system"
            )

    deleted_email = user.email
    await db.delete(user)
    await db.commit()

    await log_audit_event(
        db, action="USER_DELETE", resource="user",
        user_id=current_user.id, user_email=current_user.email,
        details={"deleted_user_id": user_id, "deleted_email": deleted_email},
        ip_address=request.client.host if request.client else None
    )

    return {"message": f"User '{deleted_email}' successfully deleted"}


@router.put("/{user_id}/roles", response_model=UserResponse, dependencies=[Depends(require_permission("user:update"))])
async def assign_user_roles(
    user_id: int,
    payload: UserRoleAssign,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Assign multiple roles to a user."""
    stmt = select(User).options(selectinload(User.roles)).where(User.id == user_id)
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    roles_stmt = select(Role).where(Role.id.in_(payload.role_ids))
    roles_result = await db.execute(roles_stmt)
    roles = list(roles_result.scalars().all())

    user.roles = roles
    await db.commit()
    await db.refresh(user)

    await log_audit_event(
        db, action="ASSIGN_USER_ROLES", resource="user",
        user_id=current_user.id, user_email=current_user.email,
        details={"target_user_id": user.id, "assigned_roles": [r.name for r in roles]},
        ip_address=request.client.host if request.client else None
    )

    return user
