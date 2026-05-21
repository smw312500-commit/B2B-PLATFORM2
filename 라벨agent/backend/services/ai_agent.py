"""
케어라벨회사 AI Agent 판단 로직
생산규칙.txt + AI_로직.txt 기반 구현
"""
import math
from datetime import date
from services.label_validator import validate_label_code, parse_label_code

PRINTERS = 3
SPEED_PER_PRINTER = 800        # 장/시간
DAILY_HOURS = 9                # 일일 가동시간
MAX_DAILY = PRINTERS * SPEED_PER_PRINTER * DAILY_HOURS  # 21,600장/일

FABRIC_PER_METER = 25          # 1m당 라벨 25장
INK_PER_CAN = 10_000           # 1통당 라벨 10,000장

SAFE_FABRIC_M = 500            # 안전 재고 기준 (m)
SAFE_INK_CAN = 5               # 안전 재고 기준 (통)


def calculate_agent_result(
    label_code: str,
    release_qty: int,
    due_date: date,
    fabric_stock: float,
    ink_stock: float,
    today: date | None = None,
) -> dict:
    if today is None:
        today = date.today()

    warnings = []
    instructions = []

    # STEP 1: 라벨코드 유효성 검증
    is_valid, msg = validate_label_code(label_code)
    if not is_valid:
        return {
            "label_code": label_code,
            "is_valid": False,
            "parsed_info": None,
            "required_hours": 0,
            "required_days": 0,
            "deadline_status": "오류",
            "days_remaining": 0,
            "required_fabric_m": 0,
            "required_ink_count": 0,
            "fabric_stock": fabric_stock,
            "ink_stock": ink_stock,
            "stock_ok": False,
            "warnings": [f"❌ 라벨코드 오류: {msg}"],
            "instructions": ["라벨코드를 확인하고 다시 입력하세요"],
        }

    parsed_info = parse_label_code(label_code)

    # STEP 2: 소요시간 계산
    total_speed = PRINTERS * SPEED_PER_PRINTER  # 2,400장/h
    required_hours = release_qty / total_speed

    # STEP 3: 납기 가능일수
    required_days = math.ceil(required_hours / DAILY_HOURS)

    # STEP 4: 납기 판정
    days_remaining = (due_date - today).days

    if days_remaining >= required_days + 1:
        deadline_status = "납기가능"
    elif days_remaining >= required_days:
        deadline_status = "납기위험"
    else:
        deadline_status = "납기불가"
        warnings.append(f"❌ 납기 불가: 필요 {required_days}일, 남은 일수 {days_remaining}일")
        instructions.append("납기일 조정 또는 긴급 생산 검토 필요")

    if deadline_status == "납기위험":
        warnings.append(f"⚠ 납기 위험: 여유 없음 (필요 {required_days}일, 남은 {days_remaining}일)")
        instructions.append("즉시 생산 착수 권고")

    # STEP 5: 필요 원자재 계산
    required_fabric_m = math.ceil(release_qty / FABRIC_PER_METER)
    required_ink_count = math.ceil(release_qty / INK_PER_CAN)

    # STEP 6: 재고 확인
    fabric_ok = fabric_stock >= required_fabric_m
    ink_ok = ink_stock >= required_ink_count
    stock_ok = fabric_ok and ink_ok

    if not fabric_ok:
        shortage = required_fabric_m - fabric_stock
        warnings.append(f"⚠ 라벨원단 부족: 필요 {required_fabric_m}m, 현재 {fabric_stock}m (부족 {shortage}m)")
        instructions.append(f"라벨원단 {shortage}m 이상 즉시 발주 필요")

    if not ink_ok:
        shortage = required_ink_count - ink_stock
        warnings.append(f"⚠ 잉크 부족: 필요 {required_ink_count}통, 현재 {ink_stock}통 (부족 {shortage}통)")
        instructions.append(f"잉크 {shortage}통 이상 즉시 발주 필요")

    # 안전 재고 경고
    if fabric_ok and fabric_stock <= SAFE_FABRIC_M:
        warnings.append(f"⚠ 라벨원단 안전재고 이하: {fabric_stock}m (기준: {SAFE_FABRIC_M}m)")
        instructions.append("라벨원단 발주 권고")

    if ink_ok and ink_stock <= SAFE_INK_CAN:
        warnings.append(f"⚠ 잉크 안전재고 이하: {ink_stock}통 (기준: {SAFE_INK_CAN}통)")
        instructions.append("잉크 발주 권고")

    if stock_ok and deadline_status == "납기가능" and not warnings:
        instructions.append(
            f"✅ 정상: {label_code} {release_qty:,}장 생산 가능 "
            f"(소요 {required_hours:.1f}h / D-{days_remaining})"
        )

    return {
        "label_code": label_code,
        "is_valid": True,
        "parsed_info": parsed_info,
        "required_hours": round(required_hours, 2),
        "required_days": required_days,
        "deadline_status": deadline_status,
        "days_remaining": days_remaining,
        "required_fabric_m": float(required_fabric_m),
        "required_ink_count": required_ink_count,
        "fabric_stock": fabric_stock,
        "ink_stock": ink_stock,
        "stock_ok": stock_ok,
        "warnings": warnings,
        "instructions": instructions,
    }
