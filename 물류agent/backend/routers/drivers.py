from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from database import get_db
from models import Driver
from schemas import DriverCreate, DriverUpdate, DriverOut

router = APIRouter()


@router.get("/", response_model=List[DriverOut])
def get_drivers(db: Session = Depends(get_db)):
    return db.query(Driver).all()


@router.post("/", response_model=DriverOut)
def create_driver(data: DriverCreate, db: Session = Depends(get_db)):
    driver = Driver(**data.dict())
    db.add(driver)
    db.commit()
    db.refresh(driver)
    return driver


@router.put("/{driver_id}", response_model=DriverOut)
def update_driver(driver_id: int, data: DriverUpdate, db: Session = Depends(get_db)):
    driver = db.query(Driver).filter(Driver.id == driver_id).first()
    if not driver:
        raise HTTPException(status_code=404, detail="기사를 찾을 수 없습니다")
    for key, value in data.dict(exclude_none=True).items():
        setattr(driver, key, value)
    db.commit()
    db.refresh(driver)
    return driver


@router.delete("/{driver_id}")
def delete_driver(driver_id: int, db: Session = Depends(get_db)):
    driver = db.query(Driver).filter(Driver.id == driver_id).first()
    if not driver:
        raise HTTPException(status_code=404, detail="기사를 찾을 수 없습니다")
    db.delete(driver)
    db.commit()
    return {"message": "삭제 완료"}
