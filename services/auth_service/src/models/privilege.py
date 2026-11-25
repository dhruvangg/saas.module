from datetime import datetime
from sqlalchemy import Column, Integer, String, Boolean, Text, DateTime
from sqlalchemy.orm import relationship
from src.database import Base
from src.models.associations import role_privileges


class Privilege(Base):
    __tablename__ = "privileges"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String(200), unique=True, index=True, nullable=False)  # e.g. "user:create"
    resource = Column(String(100), index=True, nullable=False)          # e.g. "user"
    action = Column(String(100), nullable=False)                        # e.g. "create"
    description = Column(Text, nullable=True)
    is_system = Column(Boolean, default=False, nullable=False)          # Built-in privileges
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    roles = relationship("Role", secondary=role_privileges, back_populates="privileges")
