from datetime import datetime
from sqlalchemy import Column, Integer, String, Boolean, Text, DateTime
from sqlalchemy.orm import relationship
from src.database import Base
from src.models.associations import user_roles, role_privileges


class Role(Base):
    __tablename__ = "roles"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String(100), unique=True, index=True, nullable=False)
    description = Column(Text, nullable=True)
    is_system = Column(Boolean, default=False, nullable=False)  # Protect built-in roles
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    users = relationship("User", secondary=user_roles, back_populates="roles")
    privileges = relationship("Privilege", secondary=role_privileges, back_populates="roles", lazy="selectin")
