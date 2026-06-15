from __future__ import annotations

import csv
import json
from dataclasses import dataclass
from datetime import date, datetime, timedelta
from pathlib import Path
from random import Random


OUT_DIR = Path(__file__).resolve().parent / "four_year_supply_chain"
TOTAL_GARMENTS = 6_000_000
YEARS = [2023, 2024, 2025, 2026]

COMPANIES = [
    {"id": 1, "name": "옷감사", "channel": "fabric"},
    {"id": 2, "name": "케어라벨사", "channel": "label"},
    {"id": 3, "name": "지퍼단추사", "channel": "zipper"},
]

MATERIALS = {
    "케어라벨사": [
        ("라벨 원단", "m", "Apex Label Materials", "Stable Label Backup"),
        ("잉크", "통", "Korea Ink Supply", "Busan Ink Backup"),
    ],
    "옷감사": [
        ("면 원사", "kg", "Qingdao Cotton Trading", "Vietnam Yarn Backup"),
        ("폴리 원사", "kg", "Sino Poly Fiber", "Daegu Poly Backup"),
        ("염료", "kg", "Korea Dye Works", "Busan Dye Backup"),
    ],
    "지퍼단추사": [
        ("플라스틱 원료", "kg", "Ningbo Resin Parts", "Korea Resin Backup"),
        ("금속 원료", "kg", "Qingdao Metal Parts", "Incheon Metal Backup"),
        ("지퍼 테이프", "m", "Shenzhen Zipper Tape", "Korea Tape Backup"),
    ],
}

PROBLEM_SUPPLIERS = {
    "Apex Label Materials",
    "Qingdao Cotton Trading",
    "Qingdao Metal Parts",
}

PRODUCT_PROFILES = [
    ("W2MTC08RD", "여름", "여성", "면", "티셔츠", "레드"),
    ("W2WPL07BE", "여름", "여성", "폴리에스터", "팬츠", "베이지"),
    ("W1MTP05BE", "봄", "남성", "폴리에스터", "티셔츠", "베이지"),
    ("W2WTL06WH", "봄", "여성", "리넨", "티셔츠", "화이트"),
    ("W2MPL09NV", "가을", "남성", "폴리에스터", "팬츠", "네이비"),
    ("W2WPM10GY", "겨울", "여성", "울", "코트", "그레이"),
    ("W3MJW01NV", "겨울", "남성", "울", "재킷", "네이비"),
    ("W2WTO11BK", "가을", "여성", "트윌", "아우터", "블랙"),
]

CUSTOMERS = [
    "North Peak Apparel",
    "Urban Trail Korea",
    "Daily Cotton Studio",
    "River Outdoor Co.",
    "Mode Basic Partners",
]

DESTINATIONS = ["부산항", "인천항"]


@dataclass(frozen=True)
class ShipmentPlan:
    shipment_batch_id: str
    shipment_date: date
    shipment_due_date: date
    garments: int
    profile: tuple[str, str, str, str, str, str]
    customer: str
    destination: str
    scenario_tag: str


def month_ship_days(year: int, month: int) -> list[int]:
    if year == 2026 and month == 7:
        return [3, 10, 17, 24, 31]
    return [7, 15, 23, 28] if month in {2, 5, 8, 11} else [8, 18, 27]


def phase_for_year(year: int) -> str:
    if year <= 2024:
        return "smooth"
    if year == 2025:
        return "supply_crack"
    return "supply_and_production_break"


def supplier_delay_days(year: int, quarter: int, supplier: str, rng: Random) -> int:
    if supplier not in PROBLEM_SUPPLIERS:
        return rng.randint(0, 6)
    if year <= 2024:
        return rng.randint(0, 7)
    if year == 2025:
        base = [12, 17, 22, 27][quarter - 1]
        return max(0, base + rng.randint(-3, 4))
    base = [24, 31, 38, 44][quarter - 1]
    return max(0, base + rng.randint(-4, 5))


def risk_stage_from_delay(delay_days: int) -> str:
    if delay_days >= 21:
        return "supplier_problem_candidate"
    if delay_days >= 15:
        return "material_risk"
    if delay_days >= 8:
        return "watch"
    return "normal_variation"


def production_buffer_days(year: int, company: str, rng: Random) -> int:
    if year <= 2024:
        return rng.randint(18, 31)
    if year == 2025:
        return rng.randint(7, 16)
    if company == "옷감사":
        return rng.randint(-2, 5)
    if company == "케어라벨사":
        return rng.randint(0, 7)
    return rng.randint(-1, 6)


def production_duration_days(year: int, company: str, garments: int, rng: Random) -> int:
    base = {
        "옷감사": 12,
        "케어라벨사": 5,
        "지퍼단추사": 7,
    }[company]
    volume_factor = max(0, int((garments - 30_000) / 18_000))
    year_penalty = 0 if year <= 2024 else (2 if year == 2025 else 5)
    return max(2, base + volume_factor + year_penalty + rng.randint(-1, 2))


def build_shipment_plans(rng: Random) -> list[ShipmentPlan]:
    weighted = []
    for year in YEARS:
        for month in range(1, 13):
            for index, day in enumerate(month_ship_days(year, month), start=1):
                season_weight = 1.0
                if month in {5, 6, 7}:
                    season_weight = 1.18
                elif month in {10, 11, 12}:
                    season_weight = 1.12
                elif month in {1, 2}:
                    season_weight = 0.92

                degradation_weight = 1.0
                if year == 2025:
                    degradation_weight = 0.97
                elif year == 2026:
                    degradation_weight = 0.93

                weight = season_weight * degradation_weight * rng.uniform(0.85, 1.15)
                weighted.append((year, month, day, index, weight))

    total_weight = sum(item[4] for item in weighted)
    raw_counts = [max(16_000, int(TOTAL_GARMENTS * item[4] / total_weight)) for item in weighted]
    diff = TOTAL_GARMENTS - sum(raw_counts)
    raw_counts[-1] += diff

    plans = []
    for seq, ((year, month, day, index, _weight), garments) in enumerate(zip(weighted, raw_counts), start=1):
        profile = PRODUCT_PROFILES[(seq + month + year) % len(PRODUCT_PROFILES)]
        shipment_date = date(year, month, day)
        due_date = shipment_date
        phase = phase_for_year(year)
        tag = phase
        if year == 2026 and month == 7:
            tag = {
                1: "july_normal",
                2: "july_due_day_pressure",
                3: "july_round_trip_candidate",
                4: "july_heavy_load",
                5: "july_duplicate_guard",
            }[index]
        plans.append(
            ShipmentPlan(
                shipment_batch_id=f"SHP-{year}{month:02d}-{index:02d}",
                shipment_date=shipment_date,
                shipment_due_date=due_date,
                garments=garments,
                profile=profile,
                customer=CUSTOMERS[(seq + year) % len(CUSTOMERS)],
                destination=DESTINATIONS[(seq + month) % len(DESTINATIONS)],
                scenario_tag=tag,
            )
        )
    return plans


def build_material_receipts(rng: Random) -> list[dict]:
    rows = []
    receipt_id = 1
    for year in YEARS:
        for quarter in range(1, 5):
            q_start_month = (quarter - 1) * 3 + 1
            promised_date = date(year, q_start_month, 1) - timedelta(days=10)
            order_date = promised_date - timedelta(days=45)
            for company in COMPANIES:
                for material_name, unit, primary_supplier, backup_supplier in MATERIALS[company["name"]]:
                    use_backup = year == 2026 and quarter == 4 and primary_supplier in PROBLEM_SUPPLIERS
                    supplier = backup_supplier if use_backup else primary_supplier
                    delay = supplier_delay_days(year, quarter, supplier, rng)
                    actual_date = promised_date + timedelta(days=delay)
                    qty_base = {
                        "케어라벨사": 430_000,
                        "옷감사": 780_000,
                        "지퍼단추사": 520_000,
                    }[company["name"]]
                    qty = int(qty_base * rng.uniform(0.82, 1.22))
                    rows.append(
                        {
                            "receipt_id": f"MAT-{receipt_id:04d}",
                            "year": year,
                            "quarter": f"Q{quarter}",
                            "company_id": company["id"],
                            "company_name": company["name"],
                            "material_name": material_name,
                            "supplier": supplier,
                            "order_date": order_date.isoformat(),
                            "promised_date": promised_date.isoformat(),
                            "actual_receipt_date": actual_date.isoformat(),
                            "delay_days": delay,
                            "ordered_qty": qty,
                            "unit": unit,
                            "risk_stage": risk_stage_from_delay(delay),
                            "note": "대체 공급사 테스트" if use_backup else "",
                        }
                    )
                    receipt_id += 1
    return rows


def build_finished_shipments(plans: list[ShipmentPlan]) -> list[dict]:
    rows = []
    for plan in plans:
        code, season, gender, fabric, garment_type, color = plan.profile
        fabric_yards = round(plan.garments * 1.35, 1)
        total_weight_kg = round(plan.garments * 0.028 + fabric_yards * 0.18, 1)
        rows.append(
            {
                "shipment_batch_id": plan.shipment_batch_id,
                "shipment_date": plan.shipment_date.isoformat(),
                "shipment_due_date": plan.shipment_due_date.isoformat(),
                "production_year": plan.shipment_date.year,
                "target_retail_year": plan.shipment_date.year + 1,
                "customer": plan.customer,
                "destination": plan.destination,
                "label_code": code,
                "season": season,
                "gender": gender,
                "fabric": fabric,
                "garment_type": garment_type,
                "color": color,
                "garment_units": plan.garments,
                "label_qty": plan.garments,
                "fabric_yards": fabric_yards,
                "zipper_button_qty": int(plan.garments * 2.4),
                "total_weight_kg": total_weight_kg,
                "box_count": max(1, int(plan.garments / 1000)),
                "scenario_tag": plan.scenario_tag,
            }
        )
    return rows


def build_production_batches(plans: list[ShipmentPlan], rng: Random) -> list[dict]:
    rows = []
    production_id = 1
    for plan in plans:
        code, season, gender, fabric, garment_type, color = plan.profile
        for company in COMPANIES:
            buffer_days = production_buffer_days(plan.shipment_date.year, company["name"], rng)
            complete_date = plan.shipment_due_date - timedelta(days=buffer_days)
            duration = production_duration_days(plan.shipment_date.year, company["name"], plan.garments, rng)
            start_date = complete_date - timedelta(days=duration)
            is_late = complete_date > plan.shipment_due_date
            rows.append(
                {
                    "production_id": f"PRD-{production_id:05d}",
                    "shipment_batch_id": plan.shipment_batch_id,
                    "company_id": company["id"],
                    "company_name": company["name"],
                    "label_code": code,
                    "season": season,
                    "gender": gender,
                    "fabric": fabric,
                    "garment_type": garment_type,
                    "color": color,
                    "garment_units": plan.garments,
                    "production_start_date": start_date.isoformat(),
                    "production_complete_date": complete_date.isoformat(),
                    "production_due_date": plan.shipment_due_date.isoformat(),
                    "production_duration_days": duration,
                    "due_buffer_days": buffer_days,
                    "is_late": "Y" if is_late else "N",
                    "line_or_machine": f"{company['channel']}-line-{(production_id % 6) + 1}",
                    "risk_stage": "late" if is_late else ("tight" if buffer_days <= 5 else "normal"),
                    "scenario_tag": plan.scenario_tag,
                }
            )
            production_id += 1
    return rows


def build_logistics_performance(plans: list[ShipmentPlan], rng: Random) -> list[dict]:
    rows = []
    carriers = ["플랫폼연동물류", "기존계약물류A", "기존계약물류B"]
    for index, plan in enumerate(plans, start=1):
        year = plan.shipment_date.year
        carrier = carriers[index % len(carriers)]
        request_at = datetime.combine(plan.shipment_date - timedelta(days=2), datetime.min.time()).replace(hour=10)
        assign_hours = rng.randint(2, 10)
        if carrier != "플랫폼연동물류":
            assign_hours += 8 if year >= 2025 else 3
        if year == 2026:
            assign_hours += rng.randint(4, 18)
        assigned_at = request_at + timedelta(hours=assign_hours)
        pickup_date = plan.shipment_date - timedelta(days=1 if assign_hours < 24 else 0)
        delivery_delay = 0
        if year == 2026 and carrier != "플랫폼연동물류":
            delivery_delay = rng.choice([0, 1, 1, 2])
        rows.append(
            {
                "dispatch_id": f"DSP-{index:05d}",
                "shipment_batch_id": plan.shipment_batch_id,
                "carrier": carrier,
                "destination": plan.destination,
                "request_at": request_at.isoformat(timespec="minutes"),
                "assigned_at": assigned_at.isoformat(timespec="minutes"),
                "assignment_hours": assign_hours,
                "pickup_date": pickup_date.isoformat(),
                "delivery_due_date": plan.shipment_due_date.isoformat(),
                "actual_delivery_date": (plan.shipment_due_date + timedelta(days=delivery_delay)).isoformat(),
                "delivery_delay_days": delivery_delay,
                "status": "지연" if delivery_delay else "정상",
                "scenario_tag": plan.scenario_tag,
            }
        )
    return rows


def build_logistics_snapshots(rng: Random) -> list[dict]:
    drivers = [
        ("김도현", "부산시", "강서구", "5톤 트럭", 5000),
        ("신동엽", "서울시", "구로구", "1톤 트럭", 1000),
        ("이하늘", "인천시", "중구", "3.5톤 트럭", 3500),
        ("박민수", "대구시", "달서구", "5톤 트럭", 5000),
        ("최서윤", "부산시", "해운대구", "11톤 트럭", 11000),
        ("정우진", "광주시", "북구", "2.5톤 트럭", 2500),
        ("한지훈", "인천시", "연수구", "5톤 트럭", 5000),
        ("문소라", "서울시", "성동구", "1톤 트럭", 1000),
    ]
    rows = []
    snapshot_id = 1
    for year in YEARS:
        for month in range(1, 13):
            snapshot_date = date(year, month, 5)
            for driver_index, (name, si, gu, vehicle_type, max_weight) in enumerate(drivers, start=1):
                stale = year == 2026 and month in {6, 7, 8} and driver_index in {2, 8}
                last_synced = datetime.combine(snapshot_date, datetime.min.time()).replace(hour=9)
                if stale:
                    last_synced -= timedelta(days=5)
                status = rng.choice(["가용", "가용", "가용", "운행중", "휴무"])
                rows.append(
                    {
                        "snapshot_id": f"LOG-SNP-{snapshot_id:05d}",
                        "snapshot_date": snapshot_date.isoformat(),
                        "driver_id": driver_index,
                        "vehicle_id": driver_index,
                        "driver_name": name,
                        "location_si": si,
                        "location_gu": gu,
                        "vehicle_type": vehicle_type,
                        "vehicle_plate": f"{10 + driver_index}가 {1000 + driver_index * 137}",
                        "vehicle_max_weight_kg": max_weight,
                        "status": status,
                        "current_destination": rng.choice(["부산항", "인천항", "서울", "대구", ""]),
                        "estimated_arrival": (snapshot_date + timedelta(days=rng.randint(0, 3))).isoformat(),
                        "last_synced_at": last_synced.isoformat(timespec="minutes"),
                        "is_stale": "Y" if stale else "N",
                    }
                )
                snapshot_id += 1
    return rows


def build_platform_report_messages(
    material_rows: list[dict],
    production_rows: list[dict],
    shipment_rows: list[dict],
) -> list[dict]:
    rows: list[dict] = []
    message_id = 1
    channel_by_company = {"옷감사": "fabric", "케어라벨사": "label", "지퍼단추사": "zipper"}

    for row in material_rows:
        channel = channel_by_company[row["company_name"]]
        payload = {
            "company_id": int(row["company_id"]),
            "company_name": row["company_name"],
            "material": row["material_name"],
            "material_display_name": row["material_name"],
            "qty": float(row["ordered_qty"]),
            "unit": row["unit"],
            "supplier": row["supplier"],
            "supplier_company": row["supplier"],
            "arrival_date": row["actual_receipt_date"],
            "due_date": row["promised_date"],
            "order_date": row["order_date"],
            "delay_days": int(row["delay_days"]),
            "bl_number": f"BL-{row['receipt_id']}",
            "port_of_loading": "Shanghai" if "Qingdao" in row["supplier"] or "Ningbo" in row["supplier"] else "Busan",
            "port_of_discharge": "Busan, Republic of Korea",
            "receiving_company_location": f"{row['company_name']} 공장",
            "risk_stage": row["risk_stage"],
            "report_id": f"demo-{row['receipt_id']}",
        }
        rows.append(
            {
                "id": message_id,
                "channel": channel,
                "direction": "inbound",
                "source_agent": row["company_name"],
                "target_agent": "플랫폼",
                "event_type": "agent_report_import",
                "related_code": row["material_name"],
                "title": "원자재 입고 보고",
                "summary": (
                    f"{row['company_name']} {row['material_name']} 입고. "
                    f"공급사 {row['supplier']}. 납기 {row['promised_date']} / 실제 {row['actual_receipt_date']} "
                    f"/ 지연 {row['delay_days']}일"
                ),
                "payload_json": payload,
                "status": "수신완료",
                "created_at": row["actual_receipt_date"] + "T09:00:00",
            }
        )
        message_id += 1

    production_by_shipment: dict[str, list[dict]] = {}
    for row in production_rows:
        production_by_shipment.setdefault(row["shipment_batch_id"], []).append(row)

    for row in shipment_rows:
        related_production = production_by_shipment.get(row["shipment_batch_id"], [])
        completed_list = []
        for item in related_production:
            completed_list.append(
                {
                    "company_name": item["company_name"],
                    "label_code": item["label_code"],
                    "release_qty": int(item["garment_units"]),
                    "due_date": item["production_due_date"],
                    "release_date": item["production_complete_date"],
                    "started_at": item["production_start_date"],
                    "finished_at": item["production_complete_date"],
                    "due_buffer_days": int(item["due_buffer_days"]),
                    "is_late": item["is_late"],
                }
            )

        payload = {
            "company_id": 2,
            "company_name": "케어라벨사",
            "item_name": row["garment_type"],
            "label_code": row["label_code"],
            "quantity": int(row["garment_units"]),
            "unit": "장",
            "due_date": row["shipment_due_date"],
            "release_date": row["shipment_date"],
            "report_batch_due_date": row["shipment_due_date"],
            "completed_release_count": len(completed_list),
            "completed_release_qty_total": int(row["garment_units"]),
            "shipment_total_weight_kg": float(row["total_weight_kg"]),
            "shipment_box_count_total": int(row["box_count"]),
            "completed_release_list": completed_list,
            "export_port": row["destination"],
            "packing_list": {
                "filename": f"packing_list_{row['shipment_batch_id']}.csv",
                "content_type": "text/csv",
                "period_from": row["shipment_date"],
                "period_to": row["shipment_date"],
                "total_qty": int(row["garment_units"]),
                "total_weight_kg": float(row["total_weight_kg"]),
                "label_code_count": 1,
                "csv_base64": "",
                "csv_size_bytes": 0,
            },
            "apparel_info": {
                "target_retail_year": int(row["target_retail_year"]),
                "season": row["season"],
                "gender": row["gender"],
                "fabric": row["fabric"],
                "garment_type": row["garment_type"],
                "color": row["color"],
            },
            "ai_report": {
                "analysis_type": "demo_rule_based",
                "uses_openai": False,
                "summary": (
                    f"{row['shipment_batch_id']} {row['season']} {row['gender']} {row['garment_type']} "
                    f"{int(row['garment_units']):,}장 출고"
                ),
            },
            "scenario_tag": row["scenario_tag"],
            "report_id": f"demo-{row['shipment_batch_id']}",
        }
        rows.append(
            {
                "id": message_id,
                "channel": "label",
                "direction": "inbound",
                "source_agent": "케어라벨사",
                "target_agent": "플랫폼",
                "event_type": "collected_release",
                "related_code": row["label_code"],
                "title": "출고완료 보고",
                "summary": payload["ai_report"]["summary"],
                "payload_json": payload,
                "status": "수신완료",
                "created_at": row["shipment_date"] + "T17:00:00",
            }
        )
        message_id += 1

    return rows


def write_csv(path: Path, rows: list[dict]) -> None:
    if not rows:
        return
    with path.open("w", newline="", encoding="utf-8-sig") as f:
        writer = csv.DictWriter(f, fieldnames=list(rows[0].keys()))
        writer.writeheader()
        writer.writerows(rows)


def summarize(material_rows: list[dict], production_rows: list[dict], shipment_rows: list[dict], logistics_rows: list[dict]) -> dict:
    severe_material = [row for row in material_rows if int(row["delay_days"]) >= 21]
    late_production = [row for row in production_rows if row["is_late"] == "Y"]
    tight_production = [row for row in production_rows if int(row["due_buffer_days"]) <= 5]
    year_summary = {}
    for year in YEARS:
        y_shipments = [row for row in shipment_rows if int(row["production_year"]) == year]
        y_material = [row for row in material_rows if int(row["year"]) == year]
        y_production = [row for row in production_rows if row["production_due_date"].startswith(str(year))]
        year_summary[str(year)] = {
            "garment_units": sum(int(row["garment_units"]) for row in y_shipments),
            "shipment_batches": len(y_shipments),
            "avg_material_delay_days": round(sum(int(row["delay_days"]) for row in y_material) / max(len(y_material), 1), 2),
            "material_delay_21d_count": sum(1 for row in y_material if int(row["delay_days"]) >= 21),
            "avg_production_due_buffer_days": round(sum(int(row["due_buffer_days"]) for row in y_production) / max(len(y_production), 1), 2),
            "tight_or_late_production_count": sum(1 for row in y_production if int(row["due_buffer_days"]) <= 5),
        }
    return {
        "dataset": "four_year_supply_chain_demo",
        "period": "2023-01-01 to 2026-12-31",
        "total_garment_units": sum(int(row["garment_units"]) for row in shipment_rows),
        "shipment_batches": len(shipment_rows),
        "production_batches": len(production_rows),
        "material_receipts": len(material_rows),
        "logistics_performance_rows": len(logistics_rows),
        "severe_material_delay_rows_21d_plus": len(severe_material),
        "late_production_rows": len(late_production),
        "tight_production_rows_buffer_5d_or_less": len(tight_production),
        "year_summary": year_summary,
        "intended_story": [
            "2023~2024: 공급/생산 모두 정상 기준선",
            "2025: 특정 공급사의 분기 원자재 입고가 2~3주 밀리기 시작",
            "2026: 같은 공급사가 3~6주 지연되고 생산완료도 납기 직전/당일까지 밀림",
            "분기 원자재 입고 특성상 21일 이상 반복 지연부터 공급사 문제 후보로 판단",
            "올해 출고/판매 흐름은 전년도 생산 데이터의 선행 신호로 해석",
        ],
    }


def main() -> None:
    rng = Random(20260615)
    OUT_DIR.mkdir(parents=True, exist_ok=True)

    plans = build_shipment_plans(rng)
    material_rows = build_material_receipts(rng)
    shipment_rows = build_finished_shipments(plans)
    production_rows = build_production_batches(plans, rng)
    logistics_perf_rows = build_logistics_performance(plans, rng)
    logistics_snapshot_rows = build_logistics_snapshots(rng)
    platform_message_rows = build_platform_report_messages(material_rows, production_rows, shipment_rows)
    summary = summarize(material_rows, production_rows, shipment_rows, logistics_perf_rows)

    write_csv(OUT_DIR / "material_receipts.csv", material_rows)
    write_csv(OUT_DIR / "production_batches.csv", production_rows)
    write_csv(OUT_DIR / "finished_shipments.csv", shipment_rows)
    write_csv(OUT_DIR / "logistics_performance.csv", logistics_perf_rows)
    write_csv(OUT_DIR / "logistics_snapshots.csv", logistics_snapshot_rows)
    write_csv(OUT_DIR / "platform_report_messages.csv", platform_message_rows)

    with (OUT_DIR / "platform_report_messages.jsonl").open("w", encoding="utf-8") as f:
        for row in platform_message_rows:
            f.write(json.dumps(row, ensure_ascii=False) + "\n")

    with (OUT_DIR / "dataset_summary.json").open("w", encoding="utf-8") as f:
        json.dump(summary, f, ensure_ascii=False, indent=2)

    readme = f"""# Four Year Supply Chain Demo Data

기간: 2023-01-01 ~ 2026-12-31

목적:
- 총 의류 {summary['total_garment_units']:,}장 규모의 4년치 시연 데이터
- 1~2년차는 정상 운영, 3년차는 자재 공급 지연 시작, 4년차는 자재 지연 + 생산성 저하가 확실하게 드러나도록 설계
- Hermes Insight / 분석 페이지에서 공급사 변경, 선발주, 생산성 개선, 물류 전략 제안을 만들기 위한 근거 데이터

파일:
- material_receipts.csv: 분기별 원자재 발주/납기/실제입고/공급사/지연일
- production_batches.csv: 생산사별 생산시작/완료/납기/납기여유일
- finished_shipments.csv: 월 3~4회 출고묶음과 패킹리스트 성격의 생산품 구성
- logistics_performance.csv: 물류 배차 요청/확정/배송 지연
- logistics_snapshots.csv: 월별 기사/차량 스냅샷
- platform_report_messages.csv/jsonl: 플랫폼 report_message 적재용 보고 이벤트
- dataset_summary.json: 의도된 패턴과 요약 통계

플랫폼 DB 적재:
- dry-run: `python 플랫폼agent/backend/seed_four_year_demo.py`
- 실제 적재: `python 플랫폼agent/backend/seed_four_year_demo.py --apply`
- 기존 demo report_id(`demo-*`) 행 정리 후 재적재: `python 플랫폼agent/backend/seed_four_year_demo.py --apply --reset-demo`

중요 판단 기준:
- 원자재는 분기 1회 입고이므로 3~7일 지연은 정상 변동으로 본다.
- 21일 이상 지연이 반복될 때 공급사 문제 후보로 본다.
- 2025년부터 일부 공급사의 21일 이상 지연이 발생한다.
- 2026년에는 21~45일 지연과 생산 납기 여유일 0~5일/일부 지연이 함께 발생한다.
- 올해 출고/판매 흐름은 전년도 생산 데이터의 선행 신호로 해석한다.
"""
    (OUT_DIR / "README.md").write_text(readme, encoding="utf-8")

    print(json.dumps(summary, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
