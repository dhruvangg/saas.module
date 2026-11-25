from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel


class PrivilegeBase(BaseModel):
    name: str  # e.g. "user:create"
    resource: str  # e.g. "user"
    action: str  # e.g. "create"
    description: Optional[str] = None


class PrivilegeCreate(PrivilegeBase):
    pass


class PrivilegeUpdate(BaseModel):
    description: Optional[str] = None


class PrivilegeResponse(PrivilegeBase):
    id: int
    is_system: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class PrivilegeGrouped(BaseModel):
    resource: str
    privileges: List[PrivilegeResponse]
