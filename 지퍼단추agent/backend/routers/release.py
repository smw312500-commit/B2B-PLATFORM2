from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func, extract
from typing import List
from datetime import date
from database import get_db
from models import ZipperRelease, ZipperStock, RawMaterialStock
from schemas import ReleaseCreate, ReleaseResponse
from production_logic import RAW_MATERIAL_MAP, get_trend_signal
import httpx, os

router = APIRouter(prefix="/releases", tags=["출고"])

PLATFORM_API_URL = os.getenv("PLATFORM_API_URL", "http://localhost:8000")
PLATFORM_COMPANY_ID = 3  # 지퍼단추사 ID


@router.get("/", response_model=List[ReleaseResponse])
def get_releases(db: Session = Depends(get_db)):
    return db.query(ZipperRelease).order_by(ZipperRelease.created_at.desc()).all()


@router.get("/active", response_model=List[ReleaseResponse])
def get_active_releases(db: Session = Depends(get_db)):
    return (
        db.query(ZipperRelease)
        .filter(ZipperRelease.status == "생산중")
        .order_by(ZipperRelease.due_date.asc())
        .all()
    )


@router.post("/", response_model=ReleaseResponse, status_code=201)
def create_release(body: ReleaseCreate, db: Session = Depends(get_db)):
    new_release = ZipperRelease(**body.model_dump())
    db.add(new_release)
    db.commit()
    db.refresh(new_release)
    return new_release


@router.put("/{release_id}/complete", response_model=ReleaseResponse)
def complete_release(release_id: int, db: Session = Depends(get_db)):
    """완료 버튼: 출고완료 처리 + 재고 차감 + 플랫폼 전송"""
    release = db.query(ZipperRelease).filter(ZipperRelease.id == release_id).first()
    if not release:
        raise HTTPException(status_code=404, detail="출고를 찾을 수 없습니다")
    if release.status == "출고완료":
        raise HTTPException(status_code=400, detail="이미 출고완료된 항목입니다")

    # 1. 상태 변경
    release.status = "출고완료"
    release.release_date = date.today()

    # 2. 완제품 재고 차감
    stock_item = db.query(ZipperStock).filter(
        ZipperStock.item_name == release.item_name
    ).first()
    if stock_item:
        stock_item.stock_qty = max(0, stock_item.stock_qty - release.release_qty)

    # 3. 원자재 재고 차감
    item_label = _resolve_item_label(release.item_name)
    if item_label and item_label in RAW_MATERIAL_MAP:
        raw_info = RAW_MATERIAL_MAP[item_label]
        raw_stock = db.query(RawMaterialStock).filter(
            RawMaterialStock.material_name == raw_info["name"]
        ).first()
        if raw_stock:
            raw_used = release.release_qty / raw_info["rate"]
            raw_stock.stock_qty = max(0, float(raw_stock.stock_qty) - raw_used)

    db.commit()
    db.refresh(release)

    # 4. 플랫폼 전송 (비동기 무시 방식 - 실패해도 완료 처리는 유지)
    trend = _calc_trend_signal(release, db)
    _send_to_platform(release, trend)

    return release


def _resolve_item_label(item_name: str) -> str:
    """item_name 코드 → 품목 한글명"""
    if item_name.startswith("WOOD"):
        return "원목단추"
    if item_name.startswith("PLASTIC"):
        return "플라스틱단추"
    if item_name.startswith("METAL"):
        return "금속단추"
    if item_name.startswith("ZIPPER"):
        return "지퍼"
    return ""


def _calc_trend_signal(release: ZipperRelease, db: Session) -> str | None:
    today = date.today()
    prev_month = today.month - 1 if today.month > 1 else 12
    prev_year = today.year if today.month > 1 else today.year - 1

    current = db.query(func.sum(ZipperRelease.release_qty)).filter(
        ZipperRelease.item_name == release.item_name,
        extract("year", ZipperRelease.release_date) == today.year,
        extract("month", ZipperRelease.release_date) == today.month,
    ).scalar() or 0

    prev = db.query(func.sum(ZipperRelease.release_qty)).filter(
        ZipperRelease.item_name == release.item_name,
        extract("year", ZipperRelease.release_date) == prev_year,
        extract("month", ZipperRelease.release_date) == prev_month,
    ).scalar() or 0

    return get_trend_signal(release.item_name, int(current), int(prev))


def _send_to_platform(release: ZipperRelease, trend_signal: str | None):
    payload = {
        "company_id": PLATFORM_COMPANY_ID,
        "item_name": release.item_name,
        "quantity": release.release_qty,
        "unit": "개",
        "due_date": str(release.due_date) if release.due_date else None,
        "status": "출고완료",
        "label_code": release.label_code,
        "trend_signal": trend_signal,
    }
    try:
        with httpx.Client(timeout=5.0) as client:
            client.post(f"{PLATFORM_API_URL}/api/collect/release", json=payload)
    except Exception:
        pass
