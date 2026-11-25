from datetime import datetime
from sqlalchemy import Column, Integer, String, Boolean, DateTime
from sqlalchemy.orm import relationship
from src.database import Base
from src.models.associations import user_roles


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=True)  # Nullable for Google OAuth users
    first_name = Column(String(100), nullable=True)
    last_name = Column(String(100), nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    is_superuser = Column(Boolean, default=False, nullable=False)
    auth_provider = Column(String(50), default="local", nullable=False)  # 'local', 'google'
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    roles = relationship("Role", secondary=user_roles, back_populates="users", lazy="selectin")
    refresh_tokens = relationship("RefreshToken", back_populates="user", cascade="all, delete-orphan")

    @property
    def full_name(self) -> str:
        parts = [p for p in (self.first_name, self.last_name) if p]
        return " ".join(parts) if parts else self.email
