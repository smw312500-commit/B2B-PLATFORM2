from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from datetime import date
import math
from database import get_db
from models import FabricRelease, FabricStock
from schemas import AgentStatus, OrderStatus, StockWarning

router = APIRouter(prefix="/agent", tags=["agent"])

# 원단별 시간당 생산량 (야드/h, 직조기 1대)
PRODUCTION_SPEED = {"C": 8, "P": 15, "L": 5, "W": 4, "M": 10}
MACHINES = 5
DAILY_HOURS = 9

# 안전 재고 기준 (야드)
SAFE_STOCK = {"C": 500, "P": 300, "L": 200, "W": 150, "M": 250}


def calc_required_days(fabric_code: str, qty: float) -> float:
    speed = PRODUCTION_SPEED.get(fabric_code, 8)
    hours = qty / (MACHINES * speed)
    days = hours / DAILY_HOURS
    return math.ceil(days * 10) / 10  # 소수 1자리 올림


@router.get("/status", response_model=AgentStatus)
def get_agent_status(db: Session = Depends(get_db)):
    today = date.today()

    # 진행 중인 출고 건
    active_releases = db.query(FabricRelease).filter(
        FabricRelease.status == "생산중"
    ).all()

    orders: list[OrderStatus] = []
    for r in active_releases:
        days_left = (r.due_date - today).days
        req_days = calc_required_days(r.fabric_code, float(r.release_qty))

        if days_left < req_days:
            flag = "DANGER"
            msg = f"납기 불가 - {req_days:.1f}일 필요, {days_left}일 남음"
        elif days_left < req_days + 1:
            flag = "WARNING"
            msg = f"납기 위험 - 즉시 착수 필요"
        else:
            flag = "OK"
            msg = f"납기 가능"

        orders.append(OrderStatus(
            release_id=r.id,
            label_code=r.label_code,
            fabric_code=r.fabric_code,
            color_code=r.color_code,
            release_qty=float(r.release_qty),
            due_date=r.due_date,
            days_left=days_left,
            required_days=req_days,
            status_flag=flag,
            message=msg
        ))

    # 우선순위 정렬: DANGER > WARNING > OK, 동일 시 days_left 오름차순, 동일 시 느린 원단 먼저
    priority_flag = {"DANGER": 0, "WARNING": 1, "OK": 2}
    fabric_priority = {"W": 0, "L": 1, "M": 2, "C": 3, "P": 4}
    orders.sort(key=lambda x: (
        priority_flag[x.status_flag],
        x.days_left,
        fabric_priority.get(x.fabric_code, 9)
    ))

    # 재고 경고
    stocks = db.query(FabricStock).all()
    stock_warnings: list[StockWarning] = []
    for s in stocks:
        safe = SAFE_STOCK.get(s.fabric_code, 0)
        qty = float(s.stock_qty)
        if qty <= safe:
            stock_warnings.append(StockWarning(
                fabric_code=s.fabric_code,
                color_code=s.color_code,
                stock_qty=qty,
                safe_stock=safe,
                shortage=safe - qty,
                is_critical=(qty == 0)
            ))

    # 지시사항 생성
    instructions: list[str] = []
    danger_orders = [o for o in orders if o.status_flag == "DANGER"]
    warning_orders = [o for o in orders if o.status_flag == "WARNING"]
    critical_stocks = [w for w in stock_warnings if w.is_critical]
    low_stocks = [w for w in stock_warnings if not w.is_critical]

    for o in danger_orders:
        instructions.append(f"❌ 납기 불가: {o.label_code} ({o.fabric_code}_{o.color_code}) - 즉시 대응 필요")
    for o in warning_orders:
        instructions.append(f"⚠ 우선 착수: {o.label_code} ({o.fabric_code}_{o.color_code}) D-{o.days_left}일")
    for w in critical_stocks:
        instructions.append(f"❌ 긴급 발주: {w.fabric_code}_{w.color_code} 재고 없음")
    for w in low_stocks:
        instructions.append(f"⚠ 발주 권고: {w.fabric_code}_{w.color_code} 재고 {w.stock_qty:.0f}야드 (안전재고 {w.safe_stock:.0f})")
    if not instructions:
        ok_orders = [o for o in orders if o.status_flag == "OK"]
        if ok_orders:
            instructions.append(f"✅ 전 주문 납기 이상 없음. 오늘 생산 스케줄 정상 진행.")
        else:
            instructions.append("✅ 현재 진행 중인 주문이 없습니다.")

    return AgentStatus(orders=orders, stock_warnings=stock_warnings, instructions=instructions)
