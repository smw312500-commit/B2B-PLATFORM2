from pydantic import BaseModel, field_validator
from typing import Optional
from datetime import date, datetime
from decimal import Decimal


# ── LabelStock ──────────────────────────────────────────────
class LabelStockBase(BaseModel):
    material_name: str
    unit: str
    stock_qty: Decimal

class LabelStockUpdate(BaseModel):
    stock_qty: Decimal

class LabelStockOut(LabelStockBase):
    id: int
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True


# ── LabelOrder ──────────────────────────────────────────────
class LabelOrderCreate(BaseModel):
    material_name: str
    order_qty: Decimal
    supplier: Optional[str] = None
    order_date: date
    due_date: date
    note: Optional[str] = None

class LabelOrderOut(LabelOrderCreate):
    id: int
    status: str

    class Config:
        from_attributes = True


# ── LabelRelease ─────────────────────────────────────────────
class LabelReleaseCreate(BaseModel):
    label_code: str
    release_qty: int
    due_date: date

    @field_validator("label_code")
    @classmethod
    def validate_label_code(cls, v: str) -> str:
        from services.label_validator import validate_label_code
        ok, msg = validate_label_code(v)
        if not ok:
            raise ValueError(msg)
        return v

class LabelReleaseComplete(BaseModel):
    started_at:  Optional[datetime] = None
    finished_at: Optional[datetime] = None

class LabelReleaseOut(LabelReleaseCreate):
    id: int
    status: str
    release_date: Optional[date]
    started_at:   Optional[datetime]
    finished_at:  Optional[datetime]
    created_at:   Optional[datetime]

    class Config:
        from_attributes = True


# ── AI Agent ─────────────────────────────────────────────────
class AgentRequest(BaseModel):
    label_code: str
    release_qty: int
    due_date: date

class AgentResponse(BaseModel):
    label_code: str
    is_valid: bool
    parsed_info: Optional[dict]
    required_hours: float
    required_days: int
    deadline_status: str          # 납기가능 / 납기위험 / 납기불가
    days_remaining: int
    required_fabric_m: float
    required_ink_count: int
    fabric_stock: float
    ink_stock: float
    stock_ok: bool
    warnings: list[str]
    instructions: list[str]
