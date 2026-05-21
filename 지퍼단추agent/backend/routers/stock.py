from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from database import get_db
from models import ZipperStock, RawMaterialStock
from schemas import StockResponse, StockUpdate, RawMaterialResponse, RawMaterialUpdate

router = APIRouter(prefix="/stock", tags=["재고"])


@router.get("/", response_model=List[StockResponse])
def get_all_stock(db: Session = Depends(get_db)):
    return db.query(ZipperStock).all()


@router.get("/{item_id}", response_model=StockResponse)
def get_stock(item_id: int, db: Session = Depends(get_db)):
    item = db.query(ZipperStock).filter(ZipperStock.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="재고 항목을 찾을 수 없습니다")
    return item


@router.put("/{item_id}", response_model=StockResponse)
def update_stock(item_id: int, body: StockUpdate, db: Session = Depends(get_db)):
    item = db.query(ZipperStock).filter(ZipperStock.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="재고 항목을 찾을 수 없습니다")
    item.stock_qty = body.stock_qty
    db.commit()
    db.refresh(item)
    return item


# ── 원자재 재고 ───────────────────────────────────────
@router.get("/raw/", response_model=List[RawMaterialResponse])
def get_raw_materials(db: Session = Depends(get_db)):
    return db.query(RawMaterialStock).all()


@router.put("/raw/{item_id}", response_model=RawMaterialResponse)
def update_raw_material(item_id: int, body: RawMaterialUpdate, db: Session = Depends(get_db)):
    item = db.query(RawMaterialStock).filter(RawMaterialStock.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="원자재 항목을 찾을 수 없습니다")
    item.stock_qty = body.stock_qty
    db.commit()
    db.refresh(item)
    return item
