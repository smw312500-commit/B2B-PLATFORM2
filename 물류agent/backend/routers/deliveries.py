from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from datetime import date
from database import get_db
from models import Delivery, Driver, Vehicle
from schemas import DeliveryCreate, DeliveryOut
import httpx
import os

router = APIRouter()

PLATFORM_API_URL = os.getenv("PLATFORM_API_URL", "http://localhost:8000")


def _enrich(delivery: Delivery) -> DeliveryOut:
    out = DeliveryOut.from_orm(delivery)
    if delivery.driver:
        out.driver_name = delivery.driver.name
    if delivery.vehicle:
        out.vehicle_plate = delivery.vehicle.plate_no
    return out


@router.get("/", response_model=List[DeliveryOut])
def get_deliveries(db: Session = Depends(get_db)):
    deliveries = db.query(Delivery).order_by(Delivery.due_date).all()
    return [_enrich(d) for d in deliveries]


@router.post("/", response_model=DeliveryOut)
def create_delivery(data: DeliveryCreate, db: Session = Depends(get_db)):
    delivery = Delivery(**data.dict())
    db.add(delivery)
    db.commit()
    db.refresh(delivery)
    return _enrich(delivery)


@router.post("/{delivery_id}/complete")
def complete_delivery(delivery_id: int, db: Session = Depends(get_db)):
    delivery = db.query(Delivery).filter(Delivery.id == delivery_id).first()
    if not delivery:
        raise HTTPException(status_code=404, detail="배송 건을 찾을 수 없습니다")

    delivery.status = "완료"
    delivery.complete_date = date.today()

    if delivery.driver:
        delivery.driver.status = "가용"
        delivery.driver.location_si = _destination_to_si(delivery.destination)

    db.commit()
    db.refresh(delivery)

    _notify_platform_complete(delivery)

    return {"message": "배송 완료 처리 됨", "delivery_id": delivery_id}


def _destination_to_si(destination: str) -> str:
    mapping = {"인천항": "인천시", "부산항": "부산시"}
    return mapping.get(destination, "")


def _notify_platform_complete(delivery: Delivery):
    try:
        payload = {
            "delivery_id": delivery.id,
            "company_id": delivery.company_id,
            "destination": delivery.destination,
            "complete_date": str(delivery.complete_date),
            "status": "완료",
        }
        with httpx.Client(timeout=5) as client:
            client.post(f"{PLATFORM_API_URL}/api/logistics/complete", json=payload)
    except Exception:
        pass


@router.put("/{delivery_id}/assign")
def assign_driver(delivery_id: int, driver_id: int, vehicle_id: int, pickup_date: date, db: Session = Depends(get_db)):
    delivery = db.query(Delivery).filter(Delivery.id == delivery_id).first()
    if not delivery:
        raise HTTPException(status_code=404, detail="배송 건을 찾을 수 없습니다")

    driver = db.query(Driver).filter(Driver.id == driver_id).first()
    if not driver:
        raise HTTPException(status_code=404, detail="기사를 찾을 수 없습니다")

    delivery.driver_id = driver_id
    delivery.vehicle_id = vehicle_id
    delivery.pickup_date = pickup_date
    delivery.status = "배차대기"
    driver.status = "운행중"

    db.commit()
    db.refresh(delivery)
    return _enrich(delivery)
