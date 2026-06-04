from pydantic import BaseModel, Field
from typing import Optional, Any
from datetime import date, datetime


# ── 수신: 생산사 출고완료 신호 ──────────────────────────────
class CollectedReleaseIn(BaseModel):
    company_id: Optional[int] = None
    company_type: Optional[str] = None   # 케어라벨사 등 (company_id 없을 때 매핑용)
    item_name: Optional[str] = None
    quantity: Optional[float] = None
    release_qty: Optional[float] = None  # 라벨agent가 보내는 필드명
    unit: Optional[str] = None
    due_date: Optional[date] = None
    release_date: Optional[date] = None  # 지퍼단추agent가 보내는 필드명
    status: Optional[str] = "출고완료"
    label_code: Optional[str] = None
    trend_signal: Optional[str] = None
    parsed_info: Optional[Any] = None


# ── 응답: 수집된 출고 ───────────────────────────────────────
class CollectedReleaseOut(BaseModel):
    id: int
    company_id: int
    company_name: Optional[str] = None
    item_name: Optional[str] = None
    quantity: Optional[float] = None
    unit: Optional[str] = None
    due_date: Optional[date] = None
    status: Optional[str] = None
    label_code: Optional[str] = None
    collected_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# ── 수신: 물류사 배송완료 신호 ─────────────────────────────
class LogisticsCompleteIn(BaseModel):
    delivery_id: Optional[int] = None
    company_id: Optional[int] = None
    destination: Optional[str] = None
    complete_date: Optional[str] = None
    status: Optional[str] = None


# ── 응답: 배차 ─────────────────────────────────────────────
class DispatchOut(BaseModel):
    id: int
    label_code: Optional[str] = None
    company_id: int
    company_name: Optional[str] = None
    destination: Optional[str] = None
    weight_kg: Optional[float] = None
    due_date: Optional[date] = None
    pickup_date: Optional[date] = None
    status: Optional[str] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# ── 응답: 인사이트 ─────────────────────────────────────────
class InsightOut(BaseModel):
    id: int
    insight_type: Optional[str] = None
    content: Optional[str] = None
    related_code: Optional[str] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# ── 응답: 대시보드 요약 ────────────────────────────────────
class DashboardSummary(BaseModel):
    total_releases: int
    completed_releases: int
    pending_dispatches: int
    active_insights: int


# ── 응답: 라벨코드 추적 ────────────────────────────────────
class CompanyStatus(BaseModel):
    status: Optional[str] = None
    item_name: Optional[str] = None
    qty: Optional[float] = None


class LabelCodeStatus(BaseModel):
    label_code: str
    옷감사: CompanyStatus
    라벨사: CompanyStatus
    지퍼단추사: CompanyStatus
    all_complete: bool


class ReportChannelOut(BaseModel):
    channel: str
    label: str
    counterparty: str
    message_count: int
    last_message_at: Optional[datetime] = None
    last_summary: Optional[str] = None
    last_direction: Optional[str] = None
    last_status: Optional[str] = None


class ReportMessageOut(BaseModel):
    id: int
    channel: str
    direction: str
    source_agent: str
    target_agent: str
    event_type: str
    related_code: Optional[str] = None
    title: str
    summary: str
    payload_json: Optional[Any] = None
    status: Optional[str] = None
    created_at: Optional[datetime] = None
