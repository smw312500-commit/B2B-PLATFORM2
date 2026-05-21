from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import date, timedelta
from typing import List
import os
import json
from openai import OpenAI
from database import get_db
from models import Delivery, Driver, Vehicle
from schemas import AIDispatchResult

router = APIRouter()

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

TRAVEL_DAYS = {
    "인천항": 1,
    "부산항": 1,
}


def calc_pickup_date(due_date: date, destination: str, origin_si: str) -> date:
    travel = TRAVEL_DAYS.get(destination, 1)
    if destination == "부산항" and origin_si and "부산" in origin_si:
        travel = 1
    return due_date - timedelta(days=travel + 1)


def select_best_driver(delivery: Delivery, drivers: List[Driver]) -> Driver | None:
    available = [d for d in drivers if d.status == "가용"]
    if not available:
        return None

    same_si = [d for d in available if d.location_si == delivery.origin_si]
    if same_si:
        return same_si[0]

    return available[0]


def check_round_trip(delivery: Delivery, deliveries: List[Delivery]) -> str:
    if delivery.destination == "인천항":
        return_origin_si = "인천시"
        return_dest = "부산항"
    else:
        return_origin_si = "부산시"
        return_dest = "인천항"

    for d in deliveries:
        if (
            d.id != delivery.id
            and d.status == "배차대기"
            and d.destination == return_dest
            and d.origin_si == return_origin_si
            and d.due_date >= delivery.due_date
        ):
            return f"연결완료 (귀환 시 {d.origin_si} {d.origin_gu} 픽업 가능)"

    return "빈차 귀환"


@router.post("/dispatch/{delivery_id}", response_model=AIDispatchResult)
def auto_dispatch(delivery_id: int, db: Session = Depends(get_db)):
    delivery = db.query(Delivery).filter(Delivery.id == delivery_id).first()
    if not delivery:
        raise HTTPException(status_code=404, detail="배송 건을 찾을 수 없습니다")

    drivers = db.query(Driver).all()
    all_deliveries = db.query(Delivery).all()

    pickup_date = calc_pickup_date(
        delivery.due_date, delivery.destination, delivery.origin_si
    )
    best_driver = select_best_driver(delivery, drivers)
    round_trip = check_round_trip(delivery, all_deliveries)

    if best_driver:
        vehicle = (
            db.query(Vehicle).filter(Vehicle.driver_id == best_driver.id).first()
        )
        delivery.driver_id = best_driver.id
        delivery.vehicle_id = vehicle.id if vehicle else None
        delivery.pickup_date = pickup_date
        delivery.empty_return = round_trip
        delivery.status = "배차대기"
        best_driver.status = "운행중"
        db.commit()
        db.refresh(delivery)

        return AIDispatchResult(
            delivery_id=delivery.id,
            driver_id=best_driver.id,
            driver_name=best_driver.name,
            pickup_date=pickup_date,
            round_trip=round_trip,
            message=f"{best_driver.name} 기사 배차 완료. 픽업일: {pickup_date}",
        )

    return AIDispatchResult(
        delivery_id=delivery.id,
        driver_id=None,
        driver_name=None,
        pickup_date=pickup_date,
        round_trip=round_trip,
        message="가용 기사 없음. 수동 배차 필요.",
    )


@router.get("/panel")
def get_ai_panel(db: Session = Depends(get_db)):
    today = date.today()
    deliveries = db.query(Delivery).filter(Delivery.status != "완료").all()

    messages = []

    urgent = [d for d in deliveries if d.due_date and (d.due_date - today).days < 0]
    for d in urgent:
        messages.append({
            "type": "error",
            "icon": "❌",
            "text": f"납기 불가 [{d.company_name or ''}] {d.destination} 납기일 초과",
        })

    d1 = [d for d in deliveries if d.due_date and (d.due_date - today).days == 1]
    for d in d1:
        messages.append({
            "type": "warning",
            "icon": "⚠",
            "text": f"납기 D-1 [{d.company_name or ''}] {d.destination} 즉시 배차 필요",
        })

    today_pickup = [d for d in deliveries if d.pickup_date == today]
    for d in today_pickup:
        driver_name = d.driver.name if d.driver else "미배차"
        messages.append({
            "type": "info",
            "icon": "▶",
            "text": f"오늘 배차 {driver_name} → {d.origin_si} {d.origin_gu} 픽업 → {d.destination}",
        })

    round_trip = [d for d in deliveries if d.empty_return and "연결완료" in d.empty_return]
    for d in round_trip:
        messages.append({
            "type": "success",
            "icon": "🔄",
            "text": f"왕복 연결 {d.empty_return}",
        })

    if not messages:
        messages.append({
            "type": "success",
            "icon": "✅",
            "text": "정상 운행 중. 특이사항 없음.",
        })

    drivers = db.query(Driver).all()
    driver_panels = []
    for driver in drivers:
        driver_deliveries = [d for d in deliveries if d.driver_id == driver.id]
        driver_panels.append({
            "driver_id": driver.id,
            "driver_name": driver.name,
            "status": driver.status,
            "today_jobs": [
                {
                    "id": d.id,
                    "destination": d.destination,
                    "pickup_date": str(d.pickup_date) if d.pickup_date else None,
                    "due_date": str(d.due_date) if d.due_date else None,
                    "status": d.status,
                }
                for d in driver_deliveries
            ],
        })

    return {"messages": messages, "driver_panels": driver_panels}
