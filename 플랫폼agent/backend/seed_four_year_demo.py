from __future__ import annotations

import argparse
import json
from datetime import date, datetime
from pathlib import Path

from database import SessionLocal
from models import CollectedRelease, InsightLog, LogisticsDriverCache, PackingList, ReportMessage


ROOT = Path(__file__).resolve().parents[2]
DATA_DIR = ROOT / "demo_data" / "four_year_supply_chain"
MESSAGES_PATH = DATA_DIR / "platform_report_messages.jsonl"
SNAPSHOTS_PATH = DATA_DIR / "logistics_snapshots.csv"
SUMMARY_PATH = DATA_DIR / "dataset_summary.json"


def parse_date(value: str | None):
    if not value:
        return None
    return date.fromisoformat(str(value)[:10])


def parse_datetime(value: str | None):
    if not value:
        return None
    return datetime.fromisoformat(str(value).replace("Z", ""))


def load_jsonl(path: Path) -> list[dict]:
    rows = []
    with path.open("r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line:
                rows.append(json.loads(line))
    return rows


def load_latest_snapshots(path: Path) -> list[dict]:
    import csv

    rows = []
    with path.open("r", encoding="utf-8-sig", newline="") as f:
        for row in csv.DictReader(f):
            rows.append(row)
    if not rows:
        return []
    latest_date = max(row["snapshot_date"] for row in rows)
    return [row for row in rows if row["snapshot_date"] == latest_date]


def reset_demo_rows(db, messages: list[dict]):
    db.query(ReportMessage).filter(ReportMessage.source_report_id.like("demo-%")).delete(synchronize_session=False)

    release_ids: list[int] = []
    for row in messages:
        if row.get("event_type") != "collected_release":
            continue
        payload = row.get("payload_json") or {}
        collected_at = parse_datetime(row.get("created_at"))
        due_date = parse_date(payload.get("due_date") or payload.get("report_batch_due_date"))
        query = db.query(CollectedRelease).filter(
            CollectedRelease.company_id == int(payload.get("company_id") or 2),
            CollectedRelease.label_code == payload.get("label_code"),
            CollectedRelease.due_date == due_date,
            CollectedRelease.collected_at == collected_at,
        )
        for record in query.all():
            release_ids.append(record.id)

    if release_ids:
        db.query(PackingList).filter(PackingList.collected_release_id.in_(release_ids)).delete(synchronize_session=False)
        db.query(CollectedRelease).filter(CollectedRelease.id.in_(release_ids)).delete(synchronize_session=False)

    db.query(InsightLog).filter(InsightLog.related_code == "DEMO4Y").delete(synchronize_session=False)
    db.commit()


def seed_messages(db, messages: list[dict]) -> tuple[int, int]:
    message_count = 0
    release_count = 0
    for row in messages:
        payload = row.get("payload_json") or {}
        report_id = payload.get("report_id")
        if report_id and db.query(ReportMessage).filter(ReportMessage.source_report_id == report_id).first():
            continue

        db.add(
            ReportMessage(
                channel=row["channel"],
                direction=row["direction"],
                source_agent=row["source_agent"],
                target_agent=row["target_agent"],
                event_type=row["event_type"],
                related_code=row.get("related_code"),
                title=row["title"],
                summary=row["summary"],
                payload_json=json.dumps(payload, ensure_ascii=False),
                status=row.get("status", "수신완료"),
                source_report_id=report_id,
                created_at=parse_datetime(row.get("created_at")),
            )
        )
        message_count += 1

        if row["event_type"] == "collected_release":
            db.add(
                CollectedRelease(
                    company_id=int(payload.get("company_id") or 2),
                    item_name=payload.get("item_name") or payload.get("label_code") or "demo shipment",
                    quantity=float(payload.get("quantity") or payload.get("completed_release_qty_total") or 0),
                    unit=payload.get("unit") or "장",
                    due_date=parse_date(payload.get("due_date") or payload.get("report_batch_due_date")),
                    status="출고완료",
                    label_code=payload.get("label_code"),
                    collected_at=parse_datetime(row.get("created_at")),
                )
            )
            release_count += 1
    db.commit()
    return message_count, release_count


def seed_latest_driver_cache(db, snapshots: list[dict]) -> int:
    count = 0
    for row in snapshots:
        driver_id = int(row["driver_id"])
        record = db.query(LogisticsDriverCache).filter(LogisticsDriverCache.driver_id == driver_id).first()
        if not record:
            record = LogisticsDriverCache(driver_id=driver_id)
            db.add(record)

        record.name = row["driver_name"]
        record.location_si = row["location_si"]
        record.location_gu = row["location_gu"]
        record.base_region = row["location_si"]
        record.vehicle_type = row["vehicle_type"]
        record.vehicle_id = int(row["vehicle_id"])
        record.vehicle_plate = row["vehicle_plate"]
        record.vehicle_max_weight = float(row["vehicle_max_weight_kg"])
        record.status = row["status"]
        record.current_destination = row["current_destination"] or None
        record.estimated_arrival = parse_date(row["estimated_arrival"])
        record.last_synced_at = parse_datetime(row["last_synced_at"])
        count += 1
    db.commit()
    return count


def seed_summary_insight(db):
    if db.query(InsightLog).filter(InsightLog.related_code == "DEMO4Y").first():
        return False
    summary = json.loads(SUMMARY_PATH.read_text(encoding="utf-8"))
    db.add(
        InsightLog(
            insight_type="데모데이터",
            related_code="DEMO4Y",
            content=(
                "4년치 시연 데이터 적재 완료. "
                f"총 {summary['total_garment_units']:,}장, "
                f"21일 이상 자재 지연 {summary['severe_material_delay_rows_21d_plus']}건, "
                f"납기 5일 이하/지연 생산 {summary['tight_production_rows_buffer_5d_or_less']}건."
            ),
        )
    )
    db.commit()
    return True


def main():
    parser = argparse.ArgumentParser(description="Seed four-year demo data into platform DB.")
    parser.add_argument("--apply", action="store_true", help="Actually insert rows. Without this, dry-run only.")
    parser.add_argument("--reset-demo", action="store_true", help="Remove prior demo rows before inserting.")
    args = parser.parse_args()

    messages = load_jsonl(MESSAGES_PATH)
    snapshots = load_latest_snapshots(SNAPSHOTS_PATH)
    print(f"messages={len(messages)} latest_driver_snapshots={len(snapshots)}")

    if not args.apply:
        print("dry-run only. use --apply to insert into platform DB.")
        return

    db = SessionLocal()
    try:
        if args.reset_demo:
            reset_demo_rows(db, messages)
            print("reset prior demo rows")
        message_count, release_count = seed_messages(db, messages)
        driver_count = seed_latest_driver_cache(db, snapshots)
        insight_added = seed_summary_insight(db)
        print(
            f"inserted report_messages={message_count}, collected_releases={release_count}, "
            f"driver_cache_upserts={driver_count}, summary_insight_added={insight_added}"
        )
    finally:
        db.close()


if __name__ == "__main__":
    main()
