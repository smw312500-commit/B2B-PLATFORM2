from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import date, datetime
from decimal import Decimal


# ── FabricStock ──────────────────────────────────────────────
class FabricStockBase(BaseModel):
    fabric_code: str = Field(..., max_length=1)
    color_code: str = Field(..., max_length=2)
    stock_qty: Decimal


class FabricStockCreate(FabricStockBase):
    pass


class FabricStockUpdate(BaseModel):
    stock_qty: Decimal


class FabricStockOut(FabricStockBase):
    id: int
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True


# ── FabricOrder ──────────────────────────────────────────────
class FabricOrderBase(BaseModel):
    material_name: str
    order_qty: Decimal
    supplier: str
    order_date: date
    due_date: date
    note: Optional[str] = None


class FabricOrderCreate(FabricOrderBase):
    pass


class FabricOrderOut(FabricOrderBase):
    id: int
    status: str

    class Config:
        from_attributes = True


# ── FabricRelease ────────────────────────────────────────────
class FabricReleaseBase(BaseModel):
    label_code: str = Field(..., min_length=9, max_length=9)
    fabric_code: str = Field(..., max_length=1)
    color_code: str = Field(..., max_length=2)
    release_qty: Decimal
    due_date: date


class FabricReleaseCreate(FabricReleaseBase):
    pass


class FabricReleaseOut(FabricReleaseBase):
    id: int
    status: str
    release_date: Optional[date]
    created_at: Optional[datetime]

    class Config:
        from_attributes = True


# ── Agent ────────────────────────────────────────────────────
class OrderStatus(BaseModel):
    release_id: int
    label_code: str
    fabric_code: str
    color_code: str
    release_qty: float
    due_date: date
    days_left: int
    required_days: float
    status_flag: str    # OK / WARNING / DANGER
    message: str


class StockWarning(BaseModel):
    fabric_code: str
    color_code: str
    stock_qty: float
    safe_stock: float
    shortage: float
    is_critical: bool


class AgentStatus(BaseModel):
    orders: List[OrderStatus]
    stock_warnings: List[StockWarning]
    instructions: List[str]
