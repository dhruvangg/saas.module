from typing import Optional, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from src.models.audit_log import AuditLog


async def log_audit_event(
    db: AsyncSession,
    action: str,
    resource: str,
    user_id: Optional[int] = None,
    user_email: Optional[str] = None,
    details: Optional[Dict[str, Any]] = None,
    ip_address: Optional[str] = None
) -> AuditLog:
    """Helper to record an audit log entry for MES traceability and compliance."""
    log = AuditLog(
        user_id=user_id,
        user_email=user_email,
        action=action,
        resource=resource,
        details=details,
        ip_address=ip_address
    )
    db.add(log)
    try:
        await db.commit()
        await db.refresh(log)
    except Exception:
        await db.rollback()
    return log
