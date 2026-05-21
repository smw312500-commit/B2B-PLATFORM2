from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database import get_db
from models import LabelStock
from schemas import AgentRequest, AgentResponse
from services.ai_agent import calculate_agent_result
from services.label_validator import validate_label_code

router = APIRouter(prefix="/agent", tags=["AI Agent"])


@router.post("/analyze", response_model=AgentResponse)
def analyze(body: AgentRequest, db: Session = Depends(get_db)):
    fabric = db.query(LabelStock).filter(LabelStock.material_name == "라벨원단").first()
    ink = db.query(LabelStock).filter(LabelStock.material_name == "잉크").first()

    fabric_qty = float(fabric.stock_qty) if fabric else 0.0
    ink_qty = float(ink.stock_qty) if ink else 0.0

    result = calculate_agent_result(
        label_code=body.label_code,
        release_qty=body.release_qty,
        due_date=body.due_date,
        fabric_stock=fabric_qty,
        ink_stock=ink_qty,
    )
    return result


@router.get("/validate/{label_code}")
def validate(label_code: str):
    ok, msg = validate_label_code(label_code)
    return {"label_code": label_code, "valid": ok, "message": msg}


@router.get("/status")
def agent_status(db: Session = Depends(get_db)):
    """현재 재고 상태 + 진행중 주문 요약 반환 (AI Agent 패널용)"""
    from models import LabelRelease
    from services.ai_agent import SAFE_FABRIC_M, SAFE_INK_CAN
    from datetime import date

    stocks = db.query(LabelStock).all()
    active_releases = (
        db.query(LabelRelease)
        .filter(LabelRelease.status == "생산중")
        .order_by(LabelRelease.due_date)
        .all()
    )

    stock_map = {s.material_name: float(s.stock_qty) for s in stocks}
    fabric_qty = stock_map.get("라벨원단", 0.0)
    ink_qty = stock_map.get("잉크", 0.0)

    warnings = []
    if fabric_qty == 0:
        warnings.append("❌ 라벨원단 재고 없음 — 긴급 발주 필요")
    elif fabric_qty <= SAFE_FABRIC_M:
        warnings.append(f"⚠ 라벨원단 안전재고 이하 ({fabric_qty}m)")

    if ink_qty == 0:
        warnings.append("❌ 잉크 재고 없음 — 긴급 발주 필요")
    elif ink_qty <= SAFE_INK_CAN:
        warnings.append(f"⚠ 잉크 안전재고 이하 ({ink_qty}통)")

    orders_summary = []
    today = date.today()
    for r in active_releases:
        days_remaining = (r.due_date - today).days
        orders_summary.append({
            "id": r.id,
            "label_code": r.label_code,
            "release_qty": r.release_qty,
            "due_date": r.due_date.isoformat(),
            "days_remaining": days_remaining,
        })

    return {
        "fabric_stock": fabric_qty,
        "ink_stock": ink_qty,
        "stock_warnings": warnings,
        "active_orders": orders_summary,
    }
