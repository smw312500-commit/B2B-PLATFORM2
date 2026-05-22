from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import LabelOrder, LabelStock
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


@router.patch("/{order_id}/receive", response_model=LabelOrderOut)
def receive_order(order_id: int, db: Session = Depends(get_db)):
    """재고 도착 처리: 발주량을 재고에 합산하고 상태를 입고완료로 변경"""
    order = db.query(LabelOrder).filter(LabelOrder.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="발주를 찾을 수 없습니다")
    if order.status != "대기중":
        raise HTTPException(status_code=400, detail=f"'{order.status}' 상태는 입고 처리할 수 없습니다")

    stock = db.query(LabelStock).filter(LabelStock.material_name == order.material_name).first()
    if not stock:
        raise HTTPException(status_code=404, detail=f"'{order.material_name}' 재고 항목을 찾을 수 없습니다")

    stock.stock_qty = float(stock.stock_qty) + float(order.order_qty)
    order.status = "입고완료"
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
