from sqlalchemy import Table, Column, Integer, ForeignKey
from src.database import Base

# Association table between Users and Roles (Many-to-Many)
user_roles = Table(
    "user_roles",
    Base.metadata,
    Column("user_id", Integer, ForeignKey("users.id", ondelete="CASCADE"), primary_key=True),
    Column("role_id", Integer, ForeignKey("roles.id", ondelete="CASCADE"), primary_key=True),
)

# Association table between Roles and Privileges (Many-to-Many)
role_privileges = Table(
    "role_privileges",
    Base.metadata,
    Column("role_id", Integer, ForeignKey("roles.id", ondelete="CASCADE"), primary_key=True),
    Column("privilege_id", Integer, ForeignKey("privileges.id", ondelete="CASCADE"), primary_key=True),
)
