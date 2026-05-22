from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database import get_db
from models import ZipperStock, ZipperRelease
from schemas import AgentRequest, AgentResponse
from services.ai_agent import calculate_agent_result, SAFE_STOCK
from services.validator import validate_item_code
from datetime import date

router = APIRouter(prefix="/agent", tags=["AI Agent"])


@router.post("/analyze", response_model=AgentResponse)
def analyze(body: AgentRequest, db: Session = Depends(get_db)):
    raw_stocks = {s.material_name: float(s.stock_qty) for s in db.query(ZipperStock).all()}
    result = calculate_agent_result(
        item_name=body.item_name,
        release_qty=body.release_qty,
        due_date=body.due_date,
        raw_stocks=raw_stocks,
    )
    return result


@router.get("/validate/{item_name:path}")
def validate(item_name: str):
    ok, msg = validate_item_code(item_name)
    return {"item_name": item_name, "valid": ok, "message": msg}


@router.get("/status")
def agent_status(db: Session = Depends(get_db)):
    stocks = db.query(ZipperStock).all()
    active_releases = (
        db.query(ZipperRelease)
        .filter(ZipperRelease.status == "생산중")
        .order_by(ZipperRelease.due_date)
        .all()
    )

    stock_map = {s.material_name: float(s.stock_qty) for s in stocks}
    stock_list = [
        {"material_name": s.material_name, "unit": s.unit, "stock_qty": float(s.stock_qty)}
        for s in stocks
    ]

    warnings = []
    for name, safe_qty in SAFE_STOCK.items():
        qty = stock_map.get(name, 0)
        unit = next((s.unit for s in stocks if s.material_name == name), "")
        if qty == 0:
            warnings.append(f"❌ {name} 재고 없음 — 긴급 발주 필요")
        elif qty <= safe_qty:
            warnings.append(f"⚠ {name} 안전재고 이하 ({qty}{unit})")

    today = date.today()
    orders_summary = []
    for r in active_releases:
        days_remaining = (r.due_date - today).days
        orders_summary.append({
            "id":            r.id,
            "item_name":     r.item_name,
            "release_qty":   r.release_qty,
            "due_date":      r.due_date.isoformat(),
            "days_remaining": days_remaining,
        })

    return {
        "stocks":         stock_list,
        "stock_warnings": warnings,
        "active_orders":  orders_summary,
    }
