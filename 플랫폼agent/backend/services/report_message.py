import json
from typing import Any, Optional

from sqlalchemy.orm import Session

from models import ReportMessage

CHANNEL_CATALOG = [
    {"channel": "label", "label": "플랫폼 - 라벨", "counterparty": "라벨"},
    {"channel": "logistics", "label": "플랫폼 - 물류", "counterparty": "물류"},
    {"channel": "zipper", "label": "플랫폼 - 지퍼단추", "counterparty": "지퍼단추"},
    {"channel": "fabric", "label": "플랫폼 - 옷감", "counterparty": "옷감"},
]

CHANNEL_BY_COMPANY_ID = {
    1: "fabric",
    2: "label",
    3: "zipper",
    4: "logistics",
}

CHANNEL_BY_COMPANY_NAME = {
    "옷감사": "fabric",
    "옷감": "fabric",
    "케어라벨사": "label",
    "케어라벨": "label",
    "라벨사": "label",
    "라벨": "label",
    "라벨agent": "label",
    "지퍼단추사": "zipper",
    "지퍼단추": "zipper",
    "물류사": "logistics",
    "물류": "logistics",
}


def get_channel_catalog():
    return CHANNEL_CATALOG


def is_valid_channel(channel: str) -> bool:
    return any(info["channel"] == channel for info in CHANNEL_CATALOG)


def resolve_channel(company_id: Optional[int] = None, company_name: Optional[str] = None) -> Optional[str]:
    normalized_company_id = company_id
    if isinstance(company_id, str):
        stripped = company_id.strip()
        if stripped.isdigit():
            normalized_company_id = int(stripped)

    if normalized_company_id in CHANNEL_BY_COMPANY_ID:
        return CHANNEL_BY_COMPANY_ID[normalized_company_id]

    if not company_name:
        return None

    for key, channel in CHANNEL_BY_COMPANY_NAME.items():
        if key in company_name:
            return channel
    return None


def serialize_payload(payload_json: Optional[str]) -> Any:
    if not payload_json:
        return None
    try:
        return json.loads(payload_json)
    except Exception:
        return payload_json


def record_channel_message(
    db: Session,
    *,
    channel: Optional[str],
    direction: str,
    source_agent: str,
    target_agent: str,
    event_type: str,
    title: str,
    summary: str,
    related_code: Optional[str] = None,
    payload: Optional[Any] = None,
    status: Optional[str] = None,
):
    if not channel:
        return None

    payload_json = None
    if payload is not None:
        payload_json = json.dumps(payload, ensure_ascii=False, default=str)

    message = ReportMessage(
        channel=channel,
        direction=direction,
        source_agent=source_agent,
        target_agent=target_agent,
        event_type=event_type,
        related_code=related_code,
        title=title,
        summary=summary,
        payload_json=payload_json,
        status=status,
    )
    db.add(message)
    db.commit()
    db.refresh(message)
    return message
