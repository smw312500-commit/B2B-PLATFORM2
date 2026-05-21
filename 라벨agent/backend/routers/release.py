import math
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import date
from database import get_db
from models import LabelRelease, LabelStock
from schemas import LabelReleaseCreate, LabelReleaseOut
from services.platform_sender import send_release_to_platform

router = APIRouter(prefix="/releases", tags=["출고"])

FABRIC_PER_METER = 25
INK_PER_CAN = 10_000


@router.get("/", response_model=list[LabelReleaseOut])
def get_releases(db: Session = Depends(get_db)):
    return db.query(LabelRelease).order_by(LabelRelease.created_at.desc()).all()


@router.post("/", response_model=LabelReleaseOut)
def create_release(body: LabelReleaseCreate, db: Session = Depends(get_db)):
    release = LabelRelease(
        label_code=body.label_code,
        release_qty=body.release_qty,
        due_date=body.due_date,
        status="생산중",
    )
    db.add(release)
    db.commit()
    db.refresh(release)
    return release


@router.post("/{release_id}/complete", response_model=LabelReleaseOut)
async def complete_release(release_id: int, db: Session = Depends(get_db)):
    release = db.query(LabelRelease).filter(LabelRelease.id == release_id).first()
    if not release:
        raise HTTPException(status_code=404, detail="출고 항목을 찾을 수 없습니다")
    if release.status == "출고완료":
        raise HTTPException(status_code=400, detail="이미 출고완료된 항목입니다")

    # 재고 차감
    used_fabric = math.ceil(release.release_qty / FABRIC_PER_METER)
    used_ink = math.ceil(release.release_qty / INK_PER_CAN)

    fabric = db.query(LabelStock).filter(LabelStock.material_name == "라벨원단").first()
    ink = db.query(LabelStock).filter(LabelStock.material_name == "잉크").first()

    if fabric and float(fabric.stock_qty) < used_fabric:
        raise HTTPException(status_code=400, detail=f"라벨원단 재고 부족 (필요 {used_fabric}m, 현재 {fabric.stock_qty}m)")
    if ink and float(ink.stock_qty) < used_ink:
        raise HTTPException(status_code=400, detail=f"잉크 재고 부족 (필요 {used_ink}통, 현재 {ink.stock_qty}통)")

    if fabric:
        fabric.stock_qty = float(fabric.stock_qty) - used_fabric
    if ink:
        ink.stock_qty = float(ink.stock_qty) - used_ink

    release.status = "출고완료"
    release.release_date = date.today()
    db.commit()
    db.refresh(release)

    # 플랫폼으로 출고완료 신호 전송
    await send_release_to_platform(
        label_code=release.label_code,
        release_qty=release.release_qty,
        release_date=release.release_date,
    )

    return release
