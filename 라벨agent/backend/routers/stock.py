from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import LabelStock
from schemas import LabelStockOut, LabelStockUpdate

router = APIRouter(prefix="/stock", tags=["재고"])


@router.get("/", response_model=list[LabelStockOut])
def get_all_stock(db: Session = Depends(get_db)):
    return db.query(LabelStock).all()


@router.patch("/{stock_id}", response_model=LabelStockOut)
def update_stock(stock_id: int, body: LabelStockUpdate, db: Session = Depends(get_db)):
    item = db.query(LabelStock).filter(LabelStock.id == stock_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="재고 항목을 찾을 수 없습니다")
    item.stock_qty = body.stock_qty
    db.commit()
    db.refresh(item)
    return item
