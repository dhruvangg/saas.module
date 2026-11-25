from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from src.security import require_permission, get_token_claims

router = APIRouter(prefix="/work-orders", tags=["MES Work Orders"])


class WorkOrderCreate(BaseModel):
    order_number: str
    product_code: str
    target_quantity: int
    line_id: str


class WorkOrder(WorkOrderCreate):
    id: int
    completed_quantity: int = 0
    status: str = "SCHEDULED"  # SCHEDULED, IN_PROGRESS, COMPLETED, PAUSED
    created_by: str
    created_at: str


# In-memory sample datastore for demonstrating microservice isolation
SAMPLE_ORDERS = [
    {
        "id": 1,
        "order_number": "WO-2026-001",
        "product_code": "MOTOR-ASSEMBLY-V2",
        "target_quantity": 500,
        "completed_quantity": 340,
        "line_id": "LINE-01",
        "status": "IN_PROGRESS",
        "created_by": "admin@boilerplate.com",
        "created_at": "2026-11-25T10:00:00Z"
    },
    {
        "id": 2,
        "order_number": "WO-2026-002",
        "product_code": "CIRCUIT-BOARD-PCB7",
        "target_quantity": 1200,
        "completed_quantity": 0,
        "line_id": "LINE-03",
        "status": "SCHEDULED",
        "created_by": "admin@boilerplate.com",
        "created_at": "2026-11-25T14:30:00Z"
    }
]


@router.get("", response_model=List[WorkOrder], dependencies=[Depends(require_permission("mes:order:read"))])
async def get_work_orders():
    """Retrieve production work orders (Protected by 'mes:order:read')."""
    return SAMPLE_ORDERS


@router.post("", response_model=WorkOrder, status_code=status.HTTP_201_CREATED, dependencies=[Depends(require_permission("mes:order:create"))])
async def create_work_order(order: WorkOrderCreate, claims: dict = Depends(get_token_claims)):
    """Create a new shopfloor work order (Protected by 'mes:order:create')."""
    new_id = max(o["id"] for o in SAMPLE_ORDERS) + 1 if SAMPLE_ORDERS else 1
    new_order = {
        "id": new_id,
        "order_number": order.order_number,
        "product_code": order.product_code,
        "target_quantity": order.target_quantity,
        "completed_quantity": 0,
        "line_id": order.line_id,
        "status": "SCHEDULED",
        "created_by": claims.get("email", "unknown"),
        "created_at": datetime.utcnow().isoformat() + "Z"
    }
    SAMPLE_ORDERS.append(new_order)
    return new_order
