from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, JSON
from src.database import Base


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    user_email = Column(String(255), nullable=True)
    action = Column(String(100), index=True, nullable=False)  # e.g. "USER_LOGIN", "ROLE_CREATE"
    resource = Column(String(100), index=True, nullable=False)  # e.g. "user", "role"
    details = Column(JSON, nullable=True)
    ip_address = Column(String(45), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
