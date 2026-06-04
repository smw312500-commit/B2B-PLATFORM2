from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from database import get_db
from models import ReportMessage
from schemas import ReportChannelOut, ReportMessageOut
from services.report_message import get_channel_catalog, is_valid_channel, serialize_payload

router = APIRouter(prefix="/report-channels", tags=["보고 채널"])


@router.get("/", response_model=list[ReportChannelOut])
def list_report_channels(db: Session = Depends(get_db)):
    result = []

    for info in get_channel_catalog():
        channel = info["channel"]
        last_message = (
            db.query(ReportMessage)
            .filter(ReportMessage.channel == channel)
            .order_by(ReportMessage.created_at.desc(), ReportMessage.id.desc())
            .first()
        )
        message_count = db.query(ReportMessage).filter(ReportMessage.channel == channel).count()

        result.append(
            ReportChannelOut(
                channel=channel,
                label=info["label"],
                counterparty=info["counterparty"],
                message_count=message_count,
                last_message_at=last_message.created_at if last_message else None,
                last_summary=last_message.summary if last_message else None,
                last_direction=last_message.direction if last_message else None,
                last_status=last_message.status if last_message else None,
            )
        )

    return result


@router.get("/{channel}/messages", response_model=list[ReportMessageOut])
def list_report_channel_messages(
    channel: str,
    limit: int = Query(100, ge=1, le=300),
    db: Session = Depends(get_db),
):
    if not is_valid_channel(channel):
        raise HTTPException(status_code=404, detail="채널을 찾을 수 없습니다.")

    records = (
        db.query(ReportMessage)
        .filter(ReportMessage.channel == channel)
        .order_by(ReportMessage.created_at.desc(), ReportMessage.id.desc())
        .limit(limit)
        .all()
    )
    records.reverse()

    return [
        ReportMessageOut(
            id=record.id,
            channel=record.channel,
            direction=record.direction,
            source_agent=record.source_agent,
            target_agent=record.target_agent,
            event_type=record.event_type,
            related_code=record.related_code,
            title=record.title,
            summary=record.summary,
            payload_json=serialize_payload(record.payload_json),
            status=record.status,
            created_at=record.created_at,
        )
        for record in records
    ]
