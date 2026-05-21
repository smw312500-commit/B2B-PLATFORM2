from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from datetime import date
import httpx
import os
from database import get_db
from models import FabricRelease, FabricStock
from schemas import FabricReleaseCreate, FabricReleaseOut

router = APIRouter(prefix="/release", tags=["release"])

PLATFORM_API_URL = os.getenv("PLATFORM_API_URL", "http://localhost:8000")

VALID_LABEL_CODE_BRANDS = {"W"}
VALID_SEASONS = {"1", "2", "3", "4"}
VALID_GENDERS = {"W", "M"}
VALID_ITEMS = {"T", "P", "J", "D"}
VALID_FABRICS = {"C", "P", "L", "W", "M"}
VALID_COLORS = {"BK", "WH", "NV", "GY", "BE", "RD"}


def validate_label_code(code: str) -> bool:
    if len(code) != 9:
        return False
    if code[0] not in VALID_LABEL_CODE_BRANDS:
        return False
    if code[1] not in VALID_SEASONS:
        return False
    if code[2] not in VALID_GENDERS:
        return False
    if code[3] not in VALID_ITEMS:
        return False
    if code[4] not in VALID_FABRICS:
        return False
    if not code[5:7].isdigit():
        return False
    if code[7:9] not in VALID_COLORS:
        return False
    return True


@router.get("/", response_model=List[FabricReleaseOut])
def get_all_releases(db: Session = Depends(get_db)):
    return db.query(FabricRelease).order_by(FabricRelease.created_at.desc()).all()


@router.get("/active", response_model=List[FabricReleaseOut])
def get_active_releases(db: Session = Depends(get_db)):
    return db.query(FabricRelease).filter(FabricRelease.status == "생산중").all()


@router.post("/", response_model=FabricReleaseOut, status_code=201)
def create_release(data: FabricReleaseCreate, db: Session = Depends(get_db)):
    if not validate_label_code(data.label_code):
        raise HTTPException(status_code=400, detail=f"유효하지 않은 라벨코드: {data.label_code}")

    release = FabricRelease(**data.model_dump(), status="생산중")
    db.add(release)
    db.commit()
    db.refresh(release)
    return release


@router.patch("/{release_id}/complete", response_model=FabricReleaseOut)
async def complete_release(release_id: int, db: Session = Depends(get_db)):
    release = db.query(FabricRelease).filter(FabricRelease.id == release_id).first()
    if not release:
        raise HTTPException(status_code=404, detail="출고 내역을 찾을 수 없습니다.")
    if release.status == "출고완료":
        raise HTTPException(status_code=400, detail="이미 출고완료된 건입니다.")

    # 재고 차감
    stock = db.query(FabricStock).filter(
        FabricStock.fabric_code == release.fabric_code,
        FabricStock.color_code == release.color_code
    ).first()
    if not stock:
        raise HTTPException(status_code=400, detail="해당 원단 재고 정보가 없습니다.")
    if stock.stock_qty < release.release_qty:
        raise HTTPException(status_code=400, detail="재고 부족으로 출고 완료 처리 불가합니다.")

    stock.stock_qty = float(stock.stock_qty) - float(release.release_qty)
    release.status = "출고완료"
    release.release_date = date.today()
    db.commit()
    db.refresh(release)

    # 플랫폼으로 출고완료 신호 전송
    payload = {
        "company_id": 1,  # 옷감사 ID
        "item_name": f"{_fabric_name(release.fabric_code)}_{release.color_code}",
        "quantity": float(release.release_qty),
        "unit": "야드",
        "due_date": str(release.due_date),
        "status": "출고완료",
        "label_code": release.label_code,
        "fabric_code": release.fabric_code,
        "color_code": release.color_code,
    }
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            await client.post(f"{PLATFORM_API_URL}/api/collected-release", json=payload)
    except Exception:
        pass  # 플랫폼 전송 실패 시 로컬 처리는 유지

    return release


def _fabric_name(code: str) -> str:
    names = {"C": "면", "P": "폴리에스터", "L": "린넨", "W": "울", "M": "혼방"}
    return names.get(code, code)
