from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import date
from database import get_db
from models import ZipperRelease, ZipperStock
from schemas import ReleaseCreate, ReleaseComplete, ReleaseOut
from services.platform_sender import send_release_to_platform
from services.ai_agent import get_item_type, RAW_MATERIAL_MAP

router = APIRouter(prefix="/releases", tags=["출고"])


@router.get("/", response_model=list[ReleaseOut])
def get_releases(db: Session = Depends(get_db)):
    return db.query(ZipperRelease).order_by(ZipperRelease.created_at.desc()).all()


@router.post("/", response_model=ReleaseOut, status_code=201)
def create_release(body: ReleaseCreate, db: Session = Depends(get_db)):
    release = ZipperRelease(**body.model_dump(), status="생산중")
    db.add(release)
    db.commit()
    db.refresh(release)
    return release


@router.delete("/bulk")
def delete_releases_bulk(ids: list[int], db: Session = Depends(get_db)):
    rows = db.query(ZipperRelease).filter(ZipperRelease.id.in_(ids)).all()
    if not rows:
        raise HTTPException(status_code=404, detail="삭제할 항목이 없습니다")
    for row in rows:
        db.delete(row)
    db.commit()
    return {"deleted": len(rows)}


@router.post("/{release_id}/complete", response_model=ReleaseOut)
async def complete_release(
    release_id: int,
    body: ReleaseComplete = ReleaseComplete(),
    db: Session = Depends(get_db),
):
    release = db.query(ZipperRelease).filter(ZipperRelease.id == release_id).first()
    if not release:
        raise HTTPException(status_code=404, detail="출고 항목을 찾을 수 없습니다")
    if release.status == "출고완료":
        raise HTTPException(status_code=400, detail="이미 출고완료된 항목입니다")

    # 원자재 재고 차감
    item_type = get_item_type(release.item_name)
    raw_info  = RAW_MATERIAL_MAP.get(item_type)

    if raw_info:
        raw_needed = release.release_qty / raw_info["rate"]
        stock = db.query(ZipperStock).filter(
            ZipperStock.material_name == raw_info["name"]
        ).first()
        if stock:
            new_qty = float(stock.stock_qty) - raw_needed
            if new_qty < 0:
                raise HTTPException(
                    status_code=400,
                    detail=f"{raw_info['name']} 재고 부족 (필요 {raw_needed:.1f}{raw_info['unit']}, 현재 {stock.stock_qty}{raw_info['unit']})"
                )
            stock.stock_qty = new_qty

    release.status       = "출고완료"
    release.release_date = date.today()
    release.started_at   = body.started_at
    release.finished_at  = body.finished_at
    db.commit()
    db.refresh(release)

    await send_release_to_platform(
        item_name=release.item_name,
        release_qty=release.release_qty,
        release_date=release.release_date,
        label_code=release.label_code,
    )

    return release
