from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel, EmailStr


class UserBase(BaseModel):
    email: EmailStr
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    is_active: bool = True


class UserCreate(UserBase):
    password: str
    role_ids: Optional[List[int]] = []


class UserUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    is_active: Optional[bool] = None
    password: Optional[str] = None
    role_ids: Optional[List[int]] = None


class RoleSummary(BaseModel):
    id: int
    name: str
    description: Optional[str] = None

    class Config:
        from_attributes = True


class UserResponse(UserBase):
    id: int
    is_superuser: bool
    auth_provider: str
    roles: List[RoleSummary] = []
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class UserRoleAssign(BaseModel):
    role_ids: List[int]
