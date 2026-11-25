import asyncio
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from src.database import AsyncSessionLocal, engine, Base
from src.core.security import get_password_hash
from src.models import User, Role, Privilege

INITIAL_PRIVILEGES = [
    # User Management
    {"resource": "user", "action": "create", "name": "user:create", "description": "Create new user accounts"},
    {"resource": "user", "action": "read", "name": "user:read", "description": "View user accounts"},
    {"resource": "user", "action": "update", "name": "user:update", "description": "Edit users and assign roles"},
    {"resource": "user", "action": "delete", "name": "user:delete", "description": "Delete user accounts"},

    # Role Management
    {"resource": "role", "action": "create", "name": "role:create", "description": "Create new RBAC roles"},
    {"resource": "role", "action": "read", "name": "role:read", "description": "View RBAC roles"},
    {"resource": "role", "action": "update", "name": "role:update", "description": "Update roles and modify assigned privileges"},
    {"resource": "role", "action": "delete", "name": "role:delete", "description": "Delete custom roles"},

    # Privilege Management
    {"resource": "privilege", "action": "create", "name": "privilege:create", "description": "Register custom privileges"},
    {"resource": "privilege", "action": "read", "name": "privilege:read", "description": "View system privileges"},
    {"resource": "privilege", "action": "delete", "name": "privilege:delete", "description": "Delete custom privileges"},

    # Audit & Compliance
    {"resource": "audit", "action": "read", "name": "audit:read", "description": "View audit trail and compliance logs"},

    # MES Production Modules
    {"resource": "mes", "action": "order:create", "name": "mes:order:create", "description": "Create production work orders"},
    {"resource": "mes", "action": "order:read", "name": "mes:order:read", "description": "View production work orders"},
    {"resource": "mes", "action": "order:update", "name": "mes:order:update", "description": "Update work orders and production status"},
    {"resource": "mes", "action": "order:delete", "name": "mes:order:delete", "description": "Cancel or delete work orders"},

    # MES Machine & Shopfloor Telemetry
    {"resource": "mes", "action": "machine:read", "name": "mes:machine:read", "description": "View machine telemetry and OEE metrics"},
    {"resource": "mes", "action": "machine:control", "name": "mes:machine:control", "description": "Start, stop, or reset shop floor machines"},

    # MES Quality Control
    {"resource": "mes", "action": "quality:inspect", "name": "mes:quality:inspect", "description": "Perform quality inspections"},
    {"resource": "mes", "action": "quality:approve", "name": "mes:quality:approve", "description": "Approve or reject production lots"}
]

ROLE_DEFINITIONS = {
    "Super Admin": {
        "description": "Full unconstrained administrative access to the entire platform",
        "is_system": True,
        "privilege_names": [p["name"] for p in INITIAL_PRIVILEGES]
    },
    "Admin": {
        "description": "Administrative access for managing users, roles, and security audit logs",
        "is_system": True,
        "privilege_names": [
            "user:create", "user:read", "user:update", "user:delete",
            "role:create", "role:read", "role:update", "role:delete",
            "privilege:create", "privilege:read",
            "audit:read", "mes:order:read", "mes:machine:read"
        ]
    },
    "Production Manager": {
        "description": "Shopfloor manager controlling production schedules, work orders, and machines",
        "is_system": False,
        "privilege_names": [
            "user:read", "mes:order:create", "mes:order:read", "mes:order:update",
            "mes:machine:read", "mes:machine:control", "mes:quality:inspect"
        ]
    },
    "Quality Inspector": {
        "description": "Responsible for quality testing, lot inspections, and sign-offs",
        "is_system": False,
        "privilege_names": [
            "mes:order:read", "mes:quality:inspect", "mes:quality:approve"
        ]
    },
    "Operator": {
        "description": "Shopfloor machine operator tracking assigned work orders",
        "is_system": False,
        "privilege_names": [
            "mes:order:read", "mes:machine:read"
        ]
    },
    "Viewer": {
        "description": "Read-only access across the dashboard",
        "is_system": True,
        "privilege_names": [
            "user:read", "mes:order:read", "mes:machine:read"
        ]
    }
}


async def seed_data(db: AsyncSession):
    """Seed initial privileges, roles, and default admin user."""
    # 1. Seed Privileges
    priv_map = {}
    for p_data in INITIAL_PRIVILEGES:
        stmt = select(Privilege).where(Privilege.name == p_data["name"])
        existing = (await db.execute(stmt)).scalar_one_or_none()
        if not existing:
            priv = Privilege(
                name=p_data["name"],
                resource=p_data["resource"],
                action=p_data["action"],
                description=p_data["description"],
                is_system=True
            )
            db.add(priv)
            await db.flush()
            priv_map[priv.name] = priv
        else:
            priv_map[existing.name] = existing

    # 2. Seed Roles and map Privileges
    role_map = {}
    for role_name, r_info in ROLE_DEFINITIONS.items():
        stmt = select(Role).options(selectinload(Role.privileges)).where(Role.name == role_name)
        existing = (await db.execute(stmt)).scalar_one_or_none()
        if not existing:
            role = Role(
                name=role_name,
                description=r_info["description"],
                is_system=r_info["is_system"]
            )
            for p_name in r_info["privilege_names"]:
                if p_name in priv_map:
                    role.privileges.append(priv_map[p_name])
            db.add(role)
            await db.flush()
            role_map[role_name] = role
        else:
            # Sync privileges if missing
            current_p_names = {p.name for p in existing.privileges}
            for p_name in r_info["privilege_names"]:
                if p_name in priv_map and p_name not in current_p_names:
                    existing.privileges.append(priv_map[p_name])
            role_map[role_name] = existing

    # 3. Seed Default Super Admin User
    admin_email = "admin@boilerplate.com"
    stmt = select(User).options(selectinload(User.roles)).where(User.email == admin_email)
    admin_user = (await db.execute(stmt)).scalar_one_or_none()
    if not admin_user:
        admin_user = User(
            email=admin_email,
            hashed_password=get_password_hash("Admin@123456"),
            first_name="Super",
            last_name="Admin",
            is_active=True,
            is_superuser=True,
            auth_provider="local"
        )
        if "Super Admin" in role_map:
            admin_user.roles.append(role_map["Super Admin"])
        db.add(admin_user)

    # 4. Seed Default Operator User for testing restricted RBAC
    operator_email = "operator@boilerplate.com"
    stmt = select(User).options(selectinload(User.roles)).where(User.email == operator_email)
    operator_user = (await db.execute(stmt)).scalar_one_or_none()
    if not operator_user:
        operator_user = User(
            email=operator_email,
            hashed_password=get_password_hash("Operator@123456"),
            first_name="Floor",
            last_name="Operator",
            is_active=True,
            is_superuser=False,
            auth_provider="local"
        )
        if "Operator" in role_map:
            operator_user.roles.append(role_map["Operator"])
        db.add(operator_user)

    await db.commit()
    print("Database seeding completed successfully.")


async def main():
    # Create all tables if not exist
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with AsyncSessionLocal() as session:
        await seed_data(session)


if __name__ == "__main__":
    asyncio.run(main())
