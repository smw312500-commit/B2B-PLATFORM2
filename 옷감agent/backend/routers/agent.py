from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import date
import math
from database import get_db
from models import FabricRelease, FabricStock
from pydantic import BaseModel

router = APIRouter(prefix="/agent", tags=["agent"])

PRODUCTION_SPEED = {"C": 8, "P": 15, "L": 5, "W": 4, "M": 10}
YARN_RATIO       = {"C": 3.0, "P": 5.0, "L": 2.5, "W": 2.0, "M": 3.5}
FABRIC_NAMES     = {"C": "면", "P": "폴리에스터", "L": "린넨", "W": "울", "M": "혼방"}
MACHINES    = 5
DAILY_HOURS = 9

SAFE_STOCK = {"C": 500, "P": 300, "L": 200, "W": 150, "M": 250}


def calc_required_days(fabric_code: str, qty: float) -> float:
    speed = PRODUCTION_SPEED.get(fabric_code, 8)
    hours = qty / (MACHINES * speed)
    days  = hours / DAILY_HOURS
    return math.ceil(days * 10) / 10


def calc_required_hours(fabric_code: str, qty: float) -> float:
    speed = PRODUCTION_SPEED.get(fabric_code, 8)
    return round(qty / (MACHINES * speed), 1)


# ── Agent Status ─────────────────────────────────────────────
@router.get("/status")
def get_agent_status(db: Session = Depends(get_db)):
    today = date.today()

    # 원자재 재고 전체
    all_stocks = db.query(FabricStock).order_by(FabricStock.fabric_code, FabricStock.color_code).all()
    stocks_list = [
        {
            "material_name": f"{FABRIC_NAMES.get(s.fabric_code, s.fabric_code)}_{s.color_code}",
            "fabric_code": s.fabric_code,
            "color_code": s.color_code,
            "stock_qty": float(s.stock_qty),
            "unit": "야드",
        }
        for s in all_stocks
    ]

    # 진행 중인 출고 건
    active_releases = db.query(FabricRelease).filter(FabricRelease.status == "생산중").all()

    active_orders = []
    for r in active_releases:
        days_left = (r.due_date - today).days
        req_days  = calc_required_days(r.fabric_code, float(r.release_qty))
        req_hours = calc_required_hours(r.fabric_code, float(r.release_qty))

        if days_left < req_days:
            flag = "DANGER"
        elif days_left < req_days + 1:
            flag = "WARNING"
        else:
            flag = "OK"

        active_orders.append({
            "id": r.id,
            "item_name": f"{r.fabric_code}_{r.color_code}",
            "label_code": r.label_code,
            "fabric_code": r.fabric_code,
            "color_code": r.color_code,
            "release_qty": float(r.release_qty),
            "due_date": str(r.due_date),
            "days_remaining": days_left,
            "required_days": req_days,
            "required_hours": req_hours,
            "status_flag": flag,
        })

    priority = {"DANGER": 0, "WARNING": 1, "OK": 2}
    active_orders.sort(key=lambda x: (priority[x["status_flag"]], x["days_remaining"]))

    # 재고 경고
    stock_warnings = []
    for s in all_stocks:
        safe = SAFE_STOCK.get(s.fabric_code, 0)
        qty  = float(s.stock_qty)
        if qty <= safe:
            item = f"{FABRIC_NAMES.get(s.fabric_code, s.fabric_code)}_{s.color_code}"
            if qty == 0:
                stock_warnings.append(f"❌ 긴급 발주: [{item}] 재고 없음")
            else:
                stock_warnings.append(f"⚠ 발주 권고: [{item}] {qty:.0f}야드 (안전재고 {safe}야드)")

    return {
        "stocks": stocks_list,
        "active_orders": active_orders,
        "stock_warnings": stock_warnings,
    }


# ── Validate ─────────────────────────────────────────────────
VALID_FABRIC_CODES = {"C", "P", "L", "W", "M"}

@router.get("/validate/{fabric_code}")
def validate_fabric(fabric_code: str):
    code = fabric_code.upper()
    if code not in VALID_FABRIC_CODES:
        return {"valid": False, "message": f"유효하지 않은 원단코드: {code}"}
    name = FABRIC_NAMES.get(code, code)
    return {"valid": True, "message": f"✅ {code} ({name}) — 유효한 원단코드"}


# ── Analyze ──────────────────────────────────────────────────
class AnalyzeRequest(BaseModel):
    fabric_code: str
    color_code: str
    release_qty: float
    due_date: str


@router.post("/analyze")
def analyze_order(body: AnalyzeRequest, db: Session = Depends(get_db)):
    code = body.fabric_code.upper()
    if code not in VALID_FABRIC_CODES:
        raise HTTPException(status_code=400, detail=f"유효하지 않은 원단코드: {code}")

    today        = date.today()
    due          = date.fromisoformat(body.due_date)
    days_left    = (due - today).days
    req_hours    = calc_required_hours(code, body.release_qty)
    req_days     = calc_required_days(code, body.release_qty)
    yarn_ratio   = YARN_RATIO.get(code, 3.0)
    yarn_needed  = math.ceil(body.release_qty / yarn_ratio * 10) / 10

    stock = db.query(FabricStock).filter(
        FabricStock.fabric_code == code,
        FabricStock.color_code  == body.color_code.upper()
    ).first()

    stock_qty = float(stock.stock_qty) if stock else 0
    stock_ok  = stock_qty >= body.release_qty

    if days_left < req_days:
        deadline_status = "납기불가"
    elif days_left < req_days + 1:
        deadline_status = "납기위험"
    else:
        deadline_status = "납기가능"

    warnings = []
    instructions = []
    if not stock_ok:
        warnings.append(f"⚠ 재고 부족: 현재 {stock_qty:.0f}야드, 필요 {body.release_qty:.0f}야드")
    if deadline_status == "납기불가":
        warnings.append(f"❌ 납기 불가: {req_days:.1f}일 필요, {days_left}일 남음")
        instructions.append("긴급 외주 또는 납기 조정 필요")
    elif deadline_status == "납기위험":
        instructions.append("즉시 착수 권고 — 여유 없음")
    else:
        instructions.append(f"정상 납기 가능 — 착수 시작일 조율 가능")

    return {
        "fabric_code": code,
        "color_code": body.color_code.upper(),
        "release_qty": body.release_qty,
        "due_date": body.due_date,
        "days_remaining": days_left,
        "required_hours": req_hours,
        "required_days": req_days,
        "raw_material": f"원사({FABRIC_NAMES.get(code, code)})",
        "raw_needed": yarn_needed,
        "raw_unit": "kg",
        "stock_qty": stock_qty,
        "stock_ok": stock_ok,
        "deadline_status": deadline_status,
        "is_valid": True,
        "warnings": warnings,
        "instructions": instructions,
    }
