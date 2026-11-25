from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel
from src.schemas.privilege import PrivilegeResponse


class RoleBase(BaseModel):
    name: str
    description: Optional[str] = None


class RoleCreate(RoleBase):
    privilege_ids: Optional[List[int]] = []


class RoleUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    privilege_ids: Optional[List[int]] = None


class RoleResponse(RoleBase):
    id: int
    is_system: bool
    privileges: List[PrivilegeResponse] = []
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class RolePrivilegeAssign(BaseModel):
    privilege_ids: List[int]
