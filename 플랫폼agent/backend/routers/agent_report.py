"""
각사 AI → 플랫폼 보고 수신 엔드포인트
- POST /api/agent-report/schedule    생산 스케줄 보고
- POST /api/agent-report/reschedule  돌발상황 재조정 보고
- POST /api/agent-report/import      BL 입고 보고
"""
import os
import httpx
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime
from pydantic import BaseModel
from typing import Optional
from database import get_db
from models import AgentReport, CompanyInfo
from services.report_message import record_channel_message, resolve_channel

router = APIRouter(prefix="/agent-report", tags=["에이전트 보고"])

LOGISTICS_API_URL = os.getenv("LOGISTICS_API_URL", "http://localhost:8004")

# ── 이동시간 매트릭스 (일 단위) ──────────────────────────
MOVE_DAYS = {
    "부산시": {"인천항": 1, "부산항": 0},
    "서울시": {"인천항": 0, "부산항": 1},
}
BUFFER_DAYS = 1  # 여유 1일


# ── 스키마 ────────────────────────────────────────────────
class ScheduleReport(BaseModel):
    company_id: int | str
    company_name: Optional[str] = None
    item: str
    qty: int | float
    start_at: Optional[str] = None
    estimated_completion: Optional[str] = None
    due_date: Optional[str] = None
    status: Optional[str] = "진행중"
    product_weight_kg: Optional[float] = None
    shipping_weight_kg: Optional[float] = None
    fabric_weight_kg: Optional[float] = None
    ink_weight_kg: Optional[float] = None
    material_weight_kg: Optional[float] = None
    reported_at: Optional[str] = None


class RescheduleReport(BaseModel):
    company_id: int | str
    company_name: Optional[str] = None
    label_code: Optional[str] = None
    reason: str
    new_estimated_completion: Optional[str] = None
    reported_at: Optional[str] = None


class ImportReport(BaseModel):
    company_id: int | str
    company_name: Optional[str] = None
    material: str
    qty: int | float
    unit: Optional[str] = None
    weight_kg: Optional[float] = None
    arrival_date: str
    bl_number: Optional[str] = None
    material_display_name: Optional[str] = None
    supplier: Optional[str] = None
    due_date: Optional[str] = None
    note: Optional[str] = None
    reported_at: Optional[str] = None


COMPANY_ID_BY_NAME = {
    "옷감사": 1,
    "옷감": 1,
    "케어라벨사": 2,
    "케어라벨": 2,
    "라벨사": 2,
    "라벨": 2,
    "라벨agent": 2,
    "지퍼단추사": 3,
    "지퍼단추": 3,
    "물류사": 4,
    "물류": 4,
}

COMPANY_NAME_BY_ID = {
    1: "옷감사",
    2: "케어라벨사",
    3: "지퍼단추사",
    4: "물류사",
}


# ── 물류 신호 전송 ────────────────────────────────────────
async def _send_logistics_signal(
    db: Session,
    payload: dict,
    *,
    title: str,
    summary: str,
    related_code: Optional[str] = None,
):
    delivered = False
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            await client.post(f"{LOGISTICS_API_URL}/api/platform/signal", json=payload)
            delivered = True
    except Exception:
        delivered = False

    record_channel_message(
        db,
        channel="logistics",
        direction="outbound",
        source_agent="플랫폼",
        target_agent="물류사",
        event_type=payload.get("signal_type", "platform_signal"),
        title=title,
        summary=summary,
        related_code=related_code,
        payload=payload,
        status="전송완료" if delivered else "전송실패",
    )


def _first_date_text(*values: Optional[str]) -> Optional[str]:
    for value in values:
        if value:
            return str(value)
    return None


def _date_only(value: Optional[str]) -> Optional[str]:
    if not value:
        return None
    text = str(value)
    return text[:10] if len(text) >= 10 else text


def _normalize_qty_for_storage(value: int | float | None) -> Optional[int]:
    if value is None:
        return None
    numeric = float(value)
    if numeric.is_integer():
        return int(numeric)
    return None


def _resolve_company_identity(
    db: Session,
    company_id_raw: int | str | None,
    company_name_raw: Optional[str],
) -> tuple[int, str]:
    resolved_id = None
    resolved_name = company_name_raw.strip() if isinstance(company_name_raw, str) and company_name_raw.strip() else None

    if isinstance(company_id_raw, int):
        resolved_id = company_id_raw
    elif isinstance(company_id_raw, str):
        stripped = company_id_raw.strip()
        if stripped.isdigit():
            resolved_id = int(stripped)
        elif stripped:
            for name_key, mapped_id in COMPANY_ID_BY_NAME.items():
                if name_key in stripped:
                    resolved_id = mapped_id
                    break
            if resolved_name is None:
                resolved_name = stripped

    if resolved_id is None and resolved_name:
        for name_key, mapped_id in COMPANY_ID_BY_NAME.items():
            if name_key in resolved_name:
                resolved_id = mapped_id
                break

    if resolved_id is not None:
        company = db.query(CompanyInfo).filter(CompanyInfo.id == resolved_id).first()
        if company:
            return company.id, company.company_name
        return resolved_id, resolved_name or COMPANY_NAME_BY_ID.get(resolved_id, f"company_{resolved_id}")

    raise HTTPException(status_code=422, detail="company_id 또는 company_name으로 회사를 식별할 수 없습니다.")


def _calc_pickup(completion_str: str, destination: str = "인천항") -> str:
    """생산완료 시각 기준으로 픽업일 계산 (이동시간 + 여유시간)"""
    try:
        dt = datetime.fromisoformat(completion_str)
        total_days = 1 + BUFFER_DAYS  # 기본 이동 1일 + 여유 1일
        from datetime import timedelta
        pickup = dt.date() + timedelta(days=total_days)
        return str(pickup)
    except Exception:
        return completion_str[:10]


# ── 엔드포인트 ────────────────────────────────────────────
@router.post("/schedule")
async def report_schedule(body: ScheduleReport, db: Session = Depends(get_db)):
    company_id, company_name = _resolve_company_identity(db, body.company_id, body.company_name)
    completion_basis = _first_date_text(body.estimated_completion, body.due_date, body.reported_at)

    report = AgentReport(
        company_id=company_id,
        company_name=company_name,
        report_type="schedule",
        item=body.item,
        qty=_normalize_qty_for_storage(body.qty),
        start_at=body.start_at,
        estimated_completion=completion_basis,
        status=body.status,
    )
    db.add(report)
    db.commit()

    payload = body.model_dump(mode="json") if hasattr(body, "model_dump") else body.dict()
    record_channel_message(
        db,
        channel=resolve_channel(company_id=company_id, company_name=company_name),
        direction="inbound",
        source_agent=company_name,
        target_agent="플랫폼",
        event_type="agent_report_schedule",
        title="생산 스케줄 보고 수신",
        summary=f"{company_name}가 {body.item} {body.qty}건 생산 일정을 보고",
        related_code=body.item,
        payload=payload,
        status=body.status,
    )

    # 생산 완료 예정 → 물류에 사전 신호 전송
    pickup = _calc_pickup(completion_basis) if completion_basis else None
    if completion_basis and pickup:
        logistics_payload = {
            "company_id":   company_id,
            "company_name": company_name,
            "destination":  "인천항",
            "due_date":     _date_only(completion_basis),
            "pickup_date":  pickup,
            "signal_type":  "schedule",
            "item":         body.item,
            "qty":          body.qty,
        }
        await _send_logistics_signal(
            db,
            logistics_payload,
            title="픽업 필요 보고",
            summary=f"{company_name} 생산 완료 예정 화물 {body.item} {body.qty}건 픽업 필요",
            related_code=body.item,
        )

    return {"message": "스케줄 보고 수신 완료", "pickup_date": pickup}


@router.post("/reschedule")
async def report_reschedule(body: RescheduleReport, db: Session = Depends(get_db)):
    company_id, company_name = _resolve_company_identity(db, body.company_id, body.company_name)

    report = AgentReport(
        company_id=company_id,
        company_name=company_name,
        report_type="reschedule",
        reason=body.reason,
        estimated_completion=body.new_estimated_completion,
        status="재조정",
    )
    db.add(report)
    db.commit()

    payload = body.model_dump(mode="json") if hasattr(body, "model_dump") else body.dict()
    record_channel_message(
        db,
        channel=resolve_channel(company_id=company_id, company_name=company_name),
        direction="inbound",
        source_agent=company_name,
        target_agent="플랫폼",
        event_type="agent_report_reschedule",
        title="생산 일정 재조정 보고 수신",
        summary=f"사유 {body.reason}로 완료예정이 {body.new_estimated_completion}로 변경",
        related_code=body.label_code,
        payload=payload,
        status="재조정",
    )

    # 재조정 → 물류에 변경 신호 전송
    pickup = _calc_pickup(body.new_estimated_completion) if body.new_estimated_completion else None
    if body.new_estimated_completion and pickup:
        logistics_payload = {
            "company_id":   company_id,
            "company_name": company_name,
            "destination":  "인천항",
            "due_date":     _date_only(body.new_estimated_completion),
            "pickup_date":  pickup,
            "signal_type":  "reschedule",
            "reason":       body.reason,
            "label_code":   body.label_code,
        }
        await _send_logistics_signal(
            db,
            logistics_payload,
            title="배차 변경 요청",
            summary=f"{body.reason} 사유로 픽업 일정 재조정 요청",
            related_code=body.label_code,
        )

    return {"message": "재조정 보고 수신 완료", "new_pickup_date": pickup}


@router.post("/import")
async def report_import(body: ImportReport, db: Session = Depends(get_db)):
    company_id, company_name = _resolve_company_identity(db, body.company_id, body.company_name)

    report = AgentReport(
        company_id=company_id,
        company_name=company_name,
        report_type="import",
        material=body.material,
        qty=_normalize_qty_for_storage(body.qty),
        arrival_date=body.arrival_date,
        bl_number=body.bl_number,
        status="입고완료",
    )
    db.add(report)
    db.commit()

    payload = body.model_dump(mode="json") if hasattr(body, "model_dump") else body.dict()
    record_channel_message(
        db,
        channel=resolve_channel(company_id=company_id, company_name=company_name),
        direction="inbound",
        source_agent=company_name,
        target_agent="플랫폼",
        event_type="agent_report_import",
        title="BL 입고 보고 수신",
        summary=f"{company_name} 원자재 {body.material} {body.qty}{body.unit or ''} 입고 보고. BL {body.bl_number or '미기재'}",
        related_code=body.bl_number,
        payload=payload,
        status="입고완료",
    )

    return {"message": "BL 입고 보고 수신 완료", "bl_number": body.bl_number}


@router.get("/")
def list_reports(db: Session = Depends(get_db)):
    return db.query(AgentReport).order_by(AgentReport.created_at.desc()).limit(50).all()
