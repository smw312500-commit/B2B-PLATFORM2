from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import date, datetime
from decimal import Decimal


# ── 재고 ──────────────────────────────────────────────
class StockBase(BaseModel):
    item_name: str
    material: str
    stock_qty: int

class StockUpdate(BaseModel):
    stock_qty: int

class StockResponse(StockBase):
    id: int
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True


# ── 원자재 재고 ────────────────────────────────────────
class RawMaterialBase(BaseModel):
    material_name: str
    unit: str
    stock_qty: Decimal

class RawMaterialUpdate(BaseModel):
    stock_qty: Decimal

class RawMaterialResponse(RawMaterialBase):
    id: int
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True


# ── 발주 ──────────────────────────────────────────────
class OrderCreate(BaseModel):
    material_name: str
    unit: str
    order_qty: Decimal
    supplier: Optional[str] = None
    order_date: date
    due_date: Optional[date] = None
    note: Optional[str] = None

class OrderResponse(OrderCreate):
    id: int
    status: str

    class Config:
        from_attributes = True


# ── 출고 ──────────────────────────────────────────────
class ReleaseCreate(BaseModel):
    label_code: Optional[str] = Field(None, max_length=9)
    item_name: str
    material: str
    release_qty: int
    due_date: Optional[date] = None

class ReleaseResponse(ReleaseCreate):
    id: int
    status: str
    release_date: Optional[date]
    created_at: Optional[datetime]

    class Config:
        from_attributes = True


# ── AI Agent ──────────────────────────────────────────
class AgentAnalyzeRequest(BaseModel):
    label_code: str = Field(..., min_length=9, max_length=9)
    order_qty: int
    due_date: date

class ItemRequirement(BaseModel):
    item_name: str      # 예: ZIPPER_M, METAL_BK
    item_label: str     # 예: 중형 지퍼, 금속단추 블랙
    qty_needed: int
    production_hours: float
    production_days: int
    raw_material: str
    raw_material_needed: float
    raw_material_unit: str

class AgentAnalyzeResponse(BaseModel):
    label_code: str
    item_code: str           # 라벨코드 4번째 자리
    item_type: str           # 티셔츠/바지/재킷/다운
    requirements: List[ItemRequirement]
    total_days_needed: int
    days_remaining: int
    deadline_status: str     # 납기가능/납기위험/납기불가
    warnings: List[str]
    recommendations: List[str]
    gpt_comment: Optional[str] = None

class AgentStatusResponse(BaseModel):
    active_releases: List[dict]
    stock_warnings: List[dict]
    priority_orders: List[dict]
    today: str


# ── 플랫폼 전송 ──────────────────────────────────────
class PlatformReleasePayload(BaseModel):
    label_code: Optional[str]
    item_code: str
    item_name: str
    parts: List[dict]
    release_qty: int
    release_date: str
    company: str = "지퍼단추사"
    trend_signal: Optional[str] = None
