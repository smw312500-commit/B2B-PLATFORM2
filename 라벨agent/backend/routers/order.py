from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import date
from database import get_db
from models import LabelOrder
from schemas import LabelOrderCreate, LabelOrderOut

router = APIRouter(prefix="/orders", tags=["발주"])


@router.get("/", response_model=list[LabelOrderOut])
def get_orders(db: Session = Depends(get_db)):
    return db.query(LabelOrder).order_by(LabelOrder.order_date.desc()).all()


@router.post("/", response_model=LabelOrderOut)
def create_order(body: LabelOrderCreate, db: Session = Depends(get_db)):
    order = LabelOrder(
        material_name=body.material_name,
        order_qty=body.order_qty,
        supplier=body.supplier,
        order_date=body.order_date,
        due_date=body.due_date,
        note=body.note,
        status="대기중",
    )
    db.add(order)
    db.commit()
    db.refresh(order)
    return order


@router.patch("/{order_id}/cancel", response_model=LabelOrderOut)
def cancel_order(order_id: int, db: Session = Depends(get_db)):
    order = db.query(LabelOrder).filter(LabelOrder.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="발주를 찾을 수 없습니다")
    if order.status not in ("대기중",):
        raise HTTPException(status_code=400, detail=f"'{order.status}' 상태는 취소할 수 없습니다")
    order.status = "취소"
    db.commit()
    db.refresh(order)
    return order
