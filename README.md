# MES Enterprise Boilerplate

A modern, production-grade **Manufacturing Execution System (MES)** boilerplate built with **React** (JavaScript / Vite / Tailwind CSS), **Python (FastAPI)**, and **MariaDB / MySQL**.

Designed with a decoupled **Microservices Architecture**, granular **Role-Based Access Control (RBAC)**, **JWT + HttpOnly cookie authentication**, and **Google OAuth 2.0**.

---

## 🚀 Key Highlights & Tech Stack

| Component | Technology | Rationale for MES |
| :--- | :--- | :--- |
| **Frontend** | React 18, Vite, Tailwind CSS, Lucide Icons | Fast development, modular UI, zero TypeScript compilation overhead. |
| **IAM Service** | Python 3.11+, FastAPI, SQLAlchemy 2.0 (Async), Pydantic v2 | High-throughput async API, auto OpenAPI/Swagger docs, native validation. |
| **Database** | MariaDB 11.x / MySQL 8.x | Relational integrity, ACID transactions, foreign key cascading for RBAC. |
| **Auth & Security** | JWT (Access + Rotating Refresh Token) + Google OAuth 2.0 | Stateless decoupled claims for microservices + secure HttpOnly cookies. |
| **RBAC Engine** | Many-to-Many (`User` $\leftrightarrow$ `Role` $\leftrightarrow$ `Privilege`) | Dynamic permission checks (`<Can I="user:create">`, `@require_permission`). |
| **Containerization** | Docker Compose | One-command orchestration of DB, Auth, MES microservice, and Frontend. |

---

## 🏭 Why Python (FastAPI) for MES?

1. **Industrial Connectivity (OPC-UA, Modbus, MQTT, PLCs)**: Shopfloors require real-time protocol bridges. Python's `asyncua` (OPC-UA) and `pymodbus` are the industry standard for SCADA/PLC integration.
2. **Production Telemetry & SPC (Six Sigma)**: Built-in compatibility with `numpy`, `pandas`, `scipy` for Overall Equipment Effectiveness (OEE), Pareto downtime analysis, and Statistical Process Control charts.
3. **Computer Vision & Defect Detection**: Easily integrate OpenCV / PyTorch for camera-based assembly inspection.
4. **Interactive OpenAPI Specs**: FastAPI produces instant interactive Swagger documentation at `/docs` with strict schema validation without needing a TypeScript build step.

---

## 🏛️ Microservice Architecture

```
                       ┌───────────────────────────────────────┐
                       │           React Frontend              │
                       │          (Vite + Port 3000)           │
                       └───────────────────┬───────────────────┘
                                           │
                               Bearer JWT Token with Claims
                                           │
             ┌─────────────────────────────┴─────────────────────────────┐
             ▼                                                           ▼
┌─────────────────────────┐                                 ┌─────────────────────────┐
│   Auth & IAM Service    │                                 │    MES Core Service     │
│   (FastAPI Port 8000)   │                                 │   (FastAPI Port 8001)   │
├─────────────────────────┤                                 ├─────────────────────────┤
│ • /auth/login & /google │                                 │ • /work-orders          │
│ • User CRUD             │◀────── Shared Secret / JWKS ───▶│ • Machine Telemetry     │
│ • Role CRUD             │        (Stateless Verification) │ • Quality Control       │
│ • Privilege Registry    │                                 │ • Enforces permissions  │
│ • Audit Trail           │                                 │   from token claims     │
└────────────┬────────────┘                                 └────────────┬────────────┘
             │                                                           │
             ▼                                                           ▼
    ┌─────────────────┐                                         ┌─────────────────┐
    │  MariaDB (IAM)  │                                         │  MariaDB (MES)  │
    └─────────────────┘                                         └─────────────────┘
```

Downstream microservices (such as the included `mes_service`) validate incoming requests statelessly using the permissions array embedded directly inside the JWT access token—eliminating database roundtrips to the Auth service.

---

## 🔐 Seed Accounts & Built-in Roles

When the backend starts up, it automatically initializes database tables and seeds standard roles and accounts:

| Account | Email | Password | Role | Permissions |
| :--- | :--- | :--- | :--- | :--- |
| **Super Admin** | `admin@boilerplate.com` | `Admin@123456` | Super Admin | `*` (Wildcard / All privileges) |
| **Floor Operator** | `operator@boilerplate.com` | `Operator@123456` | Operator | `mes:order:read`, `mes:machine:read` |

### Pre-defined Built-in Roles:
- **Super Admin**: Full unconstrained administrative access to all modules and configurations.
- **Admin**: User and security management (`user:*`, `role:*`, `privilege:*`, `audit:read`).
- **Production Manager**: Manages work orders, machines, and schedules (`mes:order:*`, `mes:machine:*`).
- **Quality Inspector**: Performs inspections and lot sign-offs (`mes:quality:inspect`, `mes:quality:approve`).
- **Operator**: Floor machine operator tracking active work orders.
- **Viewer**: Read-only access across the dashboard.

---

## 📦 Quick Start with Docker Compose

To spin up the entire stack (MariaDB, Auth Service, MES Service, and React Frontend):

```bash
docker compose up -d --build
```

Access the services:
- **Frontend Dashboard**: [http://localhost:3000](http://localhost:3000)
- **Auth & IAM API Docs (Swagger)**: [http://localhost:8000/docs](http://localhost:8000/docs)
- **MES Core Service API Docs**: [http://localhost:8001/docs](http://localhost:8001/docs)

---

## 💻 Local Development Setup (Without Docker)

### 1. Prerequisites
- Python 3.10+
- Node.js 18+ and npm
- MariaDB or MySQL running locally (or SQLite fallback)

### 2. Configure Environment
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Ensure your `DATABASE_URL` matches your local MariaDB credentials.

### 3. Start Backend Auth Service
```bash
cd services/auth_service
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Start FastAPI server (Auto-migrates & seeds on first run)
uvicorn src.main:app --reload --port 8000
```

### 4. Start Sample MES Microservice
```bash
cd services/mes_service
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

uvicorn src.main:app --reload --port 8001
```

### 5. Start React Frontend
```bash
cd frontend
npm install
npm run dev
```
Open [http://localhost:3000](http://localhost:3000).

---

## 🛡️ Dynamic RBAC Implementation Guide

### 1. In React Frontend

#### Conditional Navigation
The `Sidebar.jsx` dynamically hides links if the logged-in user lacks the required permission:
```jsx
{
  name: 'Users',
  to: '/users',
  icon: Users,
  show: hasPermission('user:read'),
}
```

#### Declarative Component Authorization
Wrap any button, tab, or card with `<Can>`:
```jsx
import { Can } from '../components/auth/Can';

<Can I="user:create">
  <button onClick={openCreateModal}>New User</button>
</Can>
```

#### Route Protection
```jsx
<Route
  path="roles"
  element={
    <ProtectedRoute permission="role:read">
      <RoleList />
    </ProtectedRoute>
  }
/>
```

### 2. In FastAPI Backend

Protect endpoints using dependency injection:
```python
from fastapi import APIRouter, Depends
from src.core.dependencies import require_permission

router = APIRouter()

@router.post("/items", dependencies=[Depends(require_permission("item:create"))])
async def create_item():
    return {"message": "Created successfully"}
```

---

## 🧪 Testing

Run backend security and token tests:
```bash
cd services/auth_service
pytest tests/
```
