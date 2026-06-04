from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List
from database import get_db
from models import Dispatch
from schemas import DispatchOut, LogisticsCompleteIn
from services.report_message import record_channel_message

router = APIRouter()


def _enrich(d: Dispatch) -> DispatchOut:
    out = DispatchOut.from_orm(d)
    if d.company:
        out.company_name = d.company.company_name
    return out


@router.get("/dispatch", response_model=List[DispatchOut])
def list_dispatches(db: Session = Depends(get_db)):
    records = db.query(Dispatch).order_by(Dispatch.created_at.desc()).all()
    return [_enrich(r) for r in records]


@router.post("/logistics/complete")
def logistics_complete(body: LogisticsCompleteIn, db: Session = Depends(get_db)):
    # dispatch 테이블에서 해당 배차를 찾아 완료 처리
    # delivery_id가 없으면 company_id + destination으로 가장 최근 대기 건 처리
    dispatch = None
    if body.delivery_id:
        dispatch = db.query(Dispatch).filter(Dispatch.id == body.delivery_id).first()

    if not dispatch and body.company_id:
        dispatch = (
            db.query(Dispatch)
            .filter(
                Dispatch.company_id == body.company_id,
                Dispatch.status.in_(["대기", "배차완료", "운행중"]),
            )
            .order_by(Dispatch.created_at.desc())
            .first()
        )

    if dispatch:
        dispatch.status = "완료"
        db.commit()
        payload = body.model_dump(mode="json") if hasattr(body, "model_dump") else body.dict()
        record_channel_message(
            db,
            channel="logistics",
            direction="inbound",
            source_agent="물류사",
            target_agent="플랫폼",
            event_type="logistics_complete",
            title="배송 완료 신호 수신",
            summary=f"배차 #{dispatch.id} 화물 배송 완료 보고 수신",
            related_code=dispatch.label_code,
            payload=payload,
            status=body.status or "완료",
        )
        return {"message": "배차 완료 처리됨", "dispatch_id": dispatch.id}

    payload = body.model_dump(mode="json") if hasattr(body, "model_dump") else body.dict()
    record_channel_message(
        db,
        channel="logistics",
        direction="inbound",
        source_agent="물류사",
        target_agent="플랫폼",
        event_type="logistics_status",
        title="물류 상태 보고 수신",
        summary="물류 상태 보고를 수신했지만 매칭된 배차를 찾지 못함",
        related_code=None,
        payload=payload,
        status=body.status or "미매칭",
    )
    return {"message": "처리할 배차 건 없음"}
