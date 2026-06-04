from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import Optional, List
from datetime import datetime
from database import get_db
from models import CollectedRelease, CompanyInfo
from schemas import CollectedReleaseIn, CollectedReleaseOut
from services.dispatch_auto import check_and_create_dispatch
from services.report_message import record_channel_message, resolve_channel

router = APIRouter()

COMPANY_TYPE_MAP = {
    "옷감사": 1,
    "케어라벨사": 2,
    "라벨사": 2,
    "지퍼단추사": 3,
    "지퍼사": 3,
    "물류사": 4,
}


def _resolve_company_id(data: CollectedReleaseIn) -> int:
    if data.company_id:
        return data.company_id
    if data.company_type:
        return COMPANY_TYPE_MAP.get(data.company_type, 0)
    return 0


def _enrich(record: CollectedRelease) -> CollectedReleaseOut:
    out = CollectedReleaseOut.from_orm(record)
    if record.company:
        out.company_name = record.company.company_name
    if out.quantity is None:
        out.quantity = None
    return out


@router.post("/collected-release", response_model=CollectedReleaseOut)
@router.post("/release", response_model=CollectedReleaseOut, include_in_schema=False)
async def receive_release(body: CollectedReleaseIn, db: Session = Depends(get_db)):
    company_id = _resolve_company_id(body)

    qty = body.quantity if body.quantity is not None else body.release_qty
    due = body.due_date if body.due_date is not None else body.release_date

    # 라벨사의 경우 item_name = label_code
    item_name = body.item_name
    if item_name is None and body.label_code:
        company = db.query(CompanyInfo).filter(CompanyInfo.id == company_id).first()
        if company and company.company_name == "케어라벨사":
            item_name = body.label_code

    record = CollectedRelease(
        company_id=company_id,
        item_name=item_name,
        quantity=qty,
        unit=body.unit,
        due_date=due,
        status=body.status or "출고완료",
        label_code=body.label_code,
        collected_at=datetime.now(),
    )
    db.add(record)
    db.commit()
    db.refresh(record)

    company = db.query(CompanyInfo).filter(CompanyInfo.id == company_id).first()
    company_name = company.company_name if company else body.company_type or f"company_{company_id}"
    related_code = body.label_code or item_name
    qty_text = f"{qty} {body.unit or ''}".strip() if qty is not None else "수량미상"
    due_text = str(due) if due else "납기미정"
    payload = body.model_dump(mode="json") if hasattr(body, "model_dump") else body.dict()
    record_channel_message(
        db,
        channel=resolve_channel(company_id=company_id, company_name=company_name),
        direction="inbound",
        source_agent=company_name,
        target_agent="플랫폼",
        event_type="collected_release",
        title="출고완료 보고 수신",
        summary=f"{company_name} 출고 보고 수신. 품목 {item_name or '미기재'}, 수량 {qty_text}, 납기 {due_text}",
        related_code=related_code,
        payload=payload,
        status=body.status or "출고완료",
    )

    # 3사 출고완료 체크 → 자동 배차
    if body.label_code:
        await check_and_create_dispatch(db, body.label_code, due)

    return _enrich(record)


@router.get("/collected-release", response_model=List[CollectedReleaseOut])
def list_releases(
    from_date: Optional[str] = Query(None, alias="from"),
    to_date: Optional[str] = Query(None, alias="to"),
    db: Session = Depends(get_db),
):
    q = db.query(CollectedRelease).order_by(CollectedRelease.collected_at.desc())
    if from_date:
        q = q.filter(CollectedRelease.collected_at >= from_date)
    if to_date:
        q = q.filter(CollectedRelease.collected_at <= to_date + " 23:59:59")
    records = q.all()
    return [_enrich(r) for r in records]
