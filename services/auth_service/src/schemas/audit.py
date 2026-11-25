from typing import Optional, Any, Dict
from datetime import datetime
from pydantic import BaseModel


class AuditLogResponse(BaseModel):
    id: int
    user_id: Optional[int] = None
    user_email: Optional[str] = None
    action: str
    resource: str
    details: Optional[Dict[str, Any]] = None
    ip_address: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True
