from typing import List, Union, Dict
from fastapi import APIRouter, Depends, HTTPException, status, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from collections import defaultdict

from src.database import get_db
from src.core.dependencies import get_current_user, require_permission
from src.core.audit import log_audit_event
from src.models.user import User
from src.models.privilege import Privilege
from src.schemas.privilege import (
    PrivilegeCreate,
    PrivilegeResponse,
    PrivilegeGrouped
)

router = APIRouter(prefix="/privileges", tags=["Privileges"])


@router.get("", response_model=List[PrivilegeResponse], dependencies=[Depends(require_permission("privilege:read"))])
async def list_privileges(
    resource: str = Query(None, description="Filter by resource (e.g., user, role, mes)"),
    db: AsyncSession = Depends(get_db)
):
    """List all registered system and custom privileges."""
    stmt = select(Privilege).order_by(Privilege.resource.asc(), Privilege.name.asc())
    if resource:
        stmt = stmt.where(Privilege.resource == resource.strip().lower())
    result = await db.execute(stmt)
    return result.scalars().all()


@router.get("/grouped", response_model=List[PrivilegeGrouped], dependencies=[Depends(require_permission("privilege:read"))])
async def list_privileges_grouped(db: AsyncSession = Depends(get_db)):
    """List privileges grouped by module/resource for easy UI matrix assignment."""
    stmt = select(Privilege).order_by(Privilege.resource.asc(), Privilege.name.asc())
    result = await db.execute(stmt)
    privileges = result.scalars().all()

    groups: Dict[str, list] = defaultdict(list)
    for priv in privileges:
        groups[priv.resource].append(priv)

    return [
        PrivilegeGrouped(resource=res, privileges=items)
        for res, items in groups.items()
    ]


@router.post("", response_model=PrivilegeResponse, status_code=status.HTTP_201_CREATED, dependencies=[Depends(require_permission("privilege:create"))])
async def create_privilege(
    payload: PrivilegeCreate,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Register a new privilege."""
    formatted_name = f"{payload.resource.lower().strip()}:{payload.action.lower().strip()}"
    existing = await db.execute(select(Privilege).where(Privilege.name == formatted_name))
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Privilege '{formatted_name}' already exists"
        )

    privilege = Privilege(
        name=formatted_name,
        resource=payload.resource.lower().strip(),
        action=payload.action.lower().strip(),
        description=payload.description,
        is_system=False
    )
    db.add(privilege)
    await db.commit()
    await db.refresh(privilege)

    await log_audit_event(
        db, action="PRIVILEGE_CREATE", resource="privilege",
        user_id=current_user.id, user_email=current_user.email,
        details={"privilege_id": privilege.id, "name": privilege.name},
        ip_address=request.client.host if request.client else None
    )

    return privilege


@router.delete("/{privilege_id}", status_code=status.HTTP_200_OK, dependencies=[Depends(require_permission("privilege:delete"))])
async def delete_privilege(
    privilege_id: int,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Delete a custom privilege. Protects built-in system privileges."""
    stmt = select(Privilege).where(Privilege.id == privilege_id)
    result = await db.execute(stmt)
    privilege = result.scalar_one_or_none()

    if not privilege:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Privilege not found")

    if privilege.is_system:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="System privileges cannot be deleted"
        )

    priv_name = privilege.name
    await db.delete(privilege)
    await db.commit()

    await log_audit_event(
        db, action="PRIVILEGE_DELETE", resource="privilege",
        user_id=current_user.id, user_email=current_user.email,
        details={"deleted_privilege_id": privilege_id, "name": priv_name},
        ip_address=request.client.host if request.client else None
    )

    return {"message": f"Privilege '{priv_name}' successfully deleted"}
