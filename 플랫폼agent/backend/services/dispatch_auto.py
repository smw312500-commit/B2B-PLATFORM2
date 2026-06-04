import os
import httpx
from datetime import date, timedelta
from sqlalchemy.orm import Session
from models import CollectedRelease, Dispatch
from services.report_message import record_channel_message

PRODUCER_IDS = {1, 2, 3}  # 옷감사, 케어라벨사, 지퍼단추사


async def check_and_create_dispatch(db: Session, label_code: str, due_date: date | None):
    """label_code 기준으로 3사 모두 출고완료인지 확인 후 dispatch 생성."""
    records = (
        db.query(CollectedRelease)
        .filter(
            CollectedRelease.label_code == label_code,
            CollectedRelease.status == "출고완료",
        )
        .all()
    )

    completed_companies = {r.company_id for r in records}
    if not PRODUCER_IDS.issubset(completed_companies):
        return  # 3사 미완료

    # 이미 이 label_code로 dispatch가 있으면 생성 안 함
    existing = db.query(Dispatch).filter(Dispatch.label_code == label_code).first()
    if existing:
        return

    # pickup_date = due_date - 2일
    pickup = None
    if due_date:
        pickup = due_date - timedelta(days=2)

    # 배차 생성 — company_id는 라벨사(2)를 기준으로 (3사 완료 신호 발신자)
    dispatch = Dispatch(
        label_code=label_code,
        company_id=2,
        destination="인천항",
        due_date=due_date,
        pickup_date=pickup,
        status="대기",
    )
    db.add(dispatch)
    db.commit()

    # 물류 agent에 배차 신호 전송
    await _notify_logistics(db, dispatch)


async def _notify_logistics(db: Session, dispatch: Dispatch):
    logistics_url = os.getenv("LOGISTICS_API_URL", "http://localhost:8004")
    payload = {
        "company_id":   dispatch.company_id,
        "company_name": "케어라벨사",
        "destination":  dispatch.destination,
        "due_date":     str(dispatch.due_date),
        "pickup_date":  str(dispatch.pickup_date),
    }
    delivered = False
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            await client.post(f"{logistics_url}/api/platform/signal", json=payload)
            delivered = True
    except Exception:
        delivered = False

    record_channel_message(
        db,
        channel="logistics",
        direction="outbound",
        source_agent="플랫폼",
        target_agent="물류사",
        event_type="platform_signal",
        title="배차 요청",
        summary=f"라벨코드 {dispatch.label_code or '미지정'} 화물을 {dispatch.destination}으로 배차 요청",
        related_code=dispatch.label_code,
        payload=payload,
        status="전송완료" if delivered else "전송실패",
    )
