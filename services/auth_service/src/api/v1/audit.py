from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from src.database import get_db
from src.core.dependencies import require_permission
from src.models.audit_log import AuditLog
from src.schemas.audit import AuditLogResponse

router = APIRouter(prefix="/audit", tags=["Audit Logs"])


@router.get("", response_model=List[AuditLogResponse], dependencies=[Depends(require_permission("audit:read"))])
async def list_audit_logs(
    resource: Optional[str] = Query(None, description="Filter by resource type"),
    action: Optional[str] = Query(None, description="Filter by action name"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: AsyncSession = Depends(get_db)
):
    """Retrieve system audit logs for MES compliance and traceability."""
    stmt = select(AuditLog).order_by(AuditLog.id.desc()).offset(skip).limit(limit)
    if resource:
        stmt = stmt.where(AuditLog.resource == resource.strip().lower())
    if action:
        stmt = stmt.where(AuditLog.action == action.strip().upper())
    result = await db.execute(stmt)
    return result.scalars().all()
