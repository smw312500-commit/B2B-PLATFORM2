from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database import get_db
from models import Delivery
from schemas import PlatformSignal
from datetime import timedelta

router = APIRouter()


@router.post("/signal")
def receive_platform_signal(signal: PlatformSignal, db: Session = Depends(get_db)):
    """플랫폼으로부터 출고완료 신호 수신 → 화물 자동 등록"""
    delivery = Delivery(
        company_id=signal.company_id,
        company_name=signal.company_name,
        origin_si=signal.origin_si,
        origin_gu=signal.origin_gu,
        destination=signal.destination,
        cargo_detail=signal.cargo_detail,
        weight_kg=signal.weight_kg,
        due_date=signal.due_date,
        status="배차대기",
    )
    db.add(delivery)
    db.commit()
    db.refresh(delivery)
    return {
        "message": "화물 등록 완료",
        "delivery_id": delivery.id,
        "company": signal.company_name,
        "destination": signal.destination,
        "due_date": str(signal.due_date),
    }


@router.get("/status")
def platform_status(db: Session = Depends(get_db)):
    """플랫폼으로 현재 배차 현황 제공"""
    deliveries = db.query(Delivery).all()
    return [
        {
            "delivery_id": d.id,
            "company_id": d.company_id,
            "destination": d.destination,
            "status": d.status,
            "pickup_date": str(d.pickup_date) if d.pickup_date else None,
            "complete_date": str(d.complete_date) if d.complete_date else None,
        }
        for d in deliveries
    ]
