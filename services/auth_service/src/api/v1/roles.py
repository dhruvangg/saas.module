from typing import List
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from src.database import get_db
from src.core.dependencies import get_current_user, require_permission
from src.core.audit import log_audit_event
from src.models.user import User
from src.models.role import Role
from src.models.privilege import Privilege
from src.schemas.role import (
    RoleCreate,
    RoleUpdate,
    RoleResponse,
    RolePrivilegeAssign
)

router = APIRouter(prefix="/roles", tags=["Roles"])


@router.get("", response_model=List[RoleResponse], dependencies=[Depends(require_permission("role:read"))])
async def list_roles(db: AsyncSession = Depends(get_db)):
    """List all roles and their assigned privileges."""
    stmt = select(Role).options(selectinload(Role.privileges)).order_by(Role.id.asc())
    result = await db.execute(stmt)
    return result.scalars().all()


@router.get("/{role_id}", response_model=RoleResponse, dependencies=[Depends(require_permission("role:read"))])
async def get_role(role_id: int, db: AsyncSession = Depends(get_db)):
    """Get single role by ID."""
    stmt = select(Role).options(selectinload(Role.privileges)).where(Role.id == role_id)
    result = await db.execute(stmt)
    role = result.scalar_one_or_none()
    if not role:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Role not found")
    return role


@router.post("", response_model=RoleResponse, status_code=status.HTTP_201_CREATED, dependencies=[Depends(require_permission("role:create"))])
async def create_role(
    payload: RoleCreate,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Create a new role with assigned privileges."""
    existing = await db.execute(select(Role).where(Role.name == payload.name.strip()))
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"A role with name '{payload.name}' already exists"
        )

    role = Role(
        name=payload.name.strip(),
        description=payload.description,
        is_system=False
    )

    if payload.privilege_ids:
        privs_result = await db.execute(select(Privilege).where(Privilege.id.in_(payload.privilege_ids)))
        role.privileges = list(privs_result.scalars().all())

    db.add(role)
    await db.commit()
    await db.refresh(role)

    # Re-fetch with privileges
    stmt = select(Role).options(selectinload(Role.privileges)).where(Role.id == role.id)
    result = await db.execute(stmt)
    created_role = result.scalar_one()

    await log_audit_event(
        db, action="ROLE_CREATE", resource="role",
        user_id=current_user.id, user_email=current_user.email,
        details={"role_id": role.id, "name": role.name, "privileges": [p.name for p in created_role.privileges]},
        ip_address=request.client.host if request.client else None
    )

    return created_role


@router.put("/{role_id}", response_model=RoleResponse, dependencies=[Depends(require_permission("role:update"))])
async def update_role(
    role_id: int,
    payload: RoleUpdate,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Update role details and privilege assignments."""
    stmt = select(Role).options(selectinload(Role.privileges)).where(Role.id == role_id)
    result = await db.execute(stmt)
    role = result.scalar_one_or_none()

    if not role:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Role not found")

    if payload.name and payload.name.strip() != role.name:
        # Check name uniqueness
        existing = await db.execute(select(Role).where(Role.name == payload.name.strip()))
        if existing.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"A role with name '{payload.name}' already exists"
            )
        role.name = payload.name.strip()

    if payload.description is not None:
        role.description = payload.description

    if payload.privilege_ids is not None:
        privs_result = await db.execute(select(Privilege).where(Privilege.id.in_(payload.privilege_ids)))
        role.privileges = list(privs_result.scalars().all())

    await db.commit()
    await db.refresh(role)

    await log_audit_event(
        db, action="ROLE_UPDATE", resource="role",
        user_id=current_user.id, user_email=current_user.email,
        details={"role_id": role.id, "name": role.name},
        ip_address=request.client.host if request.client else None
    )

    return role


@router.delete("/{role_id}", status_code=status.HTTP_200_OK, dependencies=[Depends(require_permission("role:delete"))])
async def delete_role(
    role_id: int,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Delete a role. Protects built-in system roles from deletion."""
    stmt = select(Role).where(Role.id == role_id)
    result = await db.execute(stmt)
    role = result.scalar_one_or_none()

    if not role:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Role not found")

    if role.is_system:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="System roles cannot be deleted"
        )

    role_name = role.name
    await db.delete(role)
    await db.commit()

    await log_audit_event(
        db, action="ROLE_DELETE", resource="role",
        user_id=current_user.id, user_email=current_user.email,
        details={"deleted_role_id": role_id, "deleted_role_name": role_name},
        ip_address=request.client.host if request.client else None
    )

    return {"message": f"Role '{role_name}' successfully deleted"}


@router.put("/{role_id}/privileges", response_model=RoleResponse, dependencies=[Depends(require_permission("role:update"))])
async def assign_role_privileges(
    role_id: int,
    payload: RolePrivilegeAssign,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Assign permissions/privileges to a role."""
    stmt = select(Role).options(selectinload(Role.privileges)).where(Role.id == role_id)
    result = await db.execute(stmt)
    role = result.scalar_one_or_none()

    if not role:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Role not found")

    privs_stmt = select(Privilege).where(Privilege.id.in_(payload.privilege_ids))
    privs_result = await db.execute(privs_stmt)
    role.privileges = list(privs_result.scalars().all())

    await db.commit()
    await db.refresh(role)

    await log_audit_event(
        db, action="ASSIGN_ROLE_PRIVILEGES", resource="role",
        user_id=current_user.id, user_email=current_user.email,
        details={"role_id": role.id, "privileges": [p.name for p in role.privileges]},
        ip_address=request.client.host if request.client else None
    )

    return role
