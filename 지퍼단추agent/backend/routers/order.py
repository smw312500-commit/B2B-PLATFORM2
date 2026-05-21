from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from datetime import date
from database import get_db
from models import ZipperOrder
from schemas import OrderCreate, OrderResponse

router = APIRouter(prefix="/orders", tags=["발주"])


@router.get("/", response_model=List[OrderResponse])
def get_orders(db: Session = Depends(get_db)):
    return db.query(ZipperOrder).order_by(ZipperOrder.order_date.desc()).all()


@router.get("/active", response_model=List[OrderResponse])
def get_active_orders(db: Session = Depends(get_db)):
    return (
        db.query(ZipperOrder)
        .filter(ZipperOrder.status == "대기중")
        .order_by(ZipperOrder.order_date.desc())
        .all()
    )


@router.post("/", response_model=OrderResponse, status_code=201)
def create_order(body: OrderCreate, db: Session = Depends(get_db)):
    new_order = ZipperOrder(**body.model_dump())
    db.add(new_order)
    db.commit()
    db.refresh(new_order)
    return new_order


@router.put("/{order_id}/cancel", response_model=OrderResponse)
def cancel_order(order_id: int, db: Session = Depends(get_db)):
    order = db.query(ZipperOrder).filter(ZipperOrder.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="발주를 찾을 수 없습니다")
    if order.status != "대기중":
        raise HTTPException(status_code=400, detail=f"취소 불가 상태: {order.status}")
    order.status = "취소"
    db.commit()
    db.refresh(order)
    return order


@router.put("/{order_id}/receive", response_model=OrderResponse)
def receive_order(order_id: int, db: Session = Depends(get_db)):
    """입고 완료 처리"""
    order = db.query(ZipperOrder).filter(ZipperOrder.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="발주를 찾을 수 없습니다")
    if order.status != "대기중":
        raise HTTPException(status_code=400, detail=f"입고 처리 불가 상태: {order.status}")
    order.status = "입고완료"
    db.commit()
    db.refresh(order)
    return order
