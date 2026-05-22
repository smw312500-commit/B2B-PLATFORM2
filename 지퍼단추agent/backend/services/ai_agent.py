import math
from datetime import date

# 기계 1대당 시간당 생산량
PRODUCTION_RATE = {
    "원목단추":     20,
    "플라스틱단추": 300,
    "금속단추":     150,
    "지퍼":         200,
}

MACHINES_PER_TYPE = 2
DAILY_HOURS = 9

# 원자재 변환비율
RAW_MATERIAL_MAP = {
    "원목단추":     {"name": "원목",        "unit": "kg", "rate": 50},
    "플라스틱단추": {"name": "플라스틱원료", "unit": "kg", "rate": 200},
    "금속단추":     {"name": "금속원료",     "unit": "kg", "rate": 150},
    "지퍼":         {"name": "지퍼테이프",   "unit": "m",  "rate": 1},
}

# 안전재고
SAFE_STOCK = {
    "원목":        50,
    "플라스틱원료": 100,
    "금속원료":    80,
    "지퍼테이프":  200,
}

# 라벨코드 품목코드 → 필요 부자재
ITEM_CODE_MAP = {
    "T": {"label": "티셔츠", "parts": ["플라스틱단추"]},
    "P": {"label": "바지",   "parts": ["금속단추"]},
    "J": {"label": "재킷",   "parts": ["지퍼", "금속단추"]},
    "D": {"label": "다운",   "parts": ["지퍼"]},
}


def get_item_type(item_name: str) -> str:
    parts = item_name.upper().split("_")
    if parts[0] == "ZIPPER":
        return "지퍼"
    map_ = {"WOOD": "원목단추", "PLASTIC": "플라스틱단추", "METAL": "금속단추"}
    return map_.get(parts[0], item_name)


def calc_hours(item_type: str, qty: int) -> float:
    rate = PRODUCTION_RATE.get(item_type, 100)
    return qty / (MACHINES_PER_TYPE * rate)


def calc_days(hours: float) -> int:
    return math.ceil(hours / DAILY_HOURS)


def calc_raw_needed(item_type: str, qty: int) -> float:
    info = RAW_MATERIAL_MAP.get(item_type)
    if not info:
        return 0
    return math.ceil(qty / info["rate"] * 10) / 10


def calculate_agent_result(
    item_name: str,
    release_qty: int,
    due_date: date,
    raw_stocks: dict,   # {원자재명: qty}
) -> dict:
    item_type = get_item_type(item_name)
    today = date.today()
    days_remaining = (due_date - today).days

    hours = calc_hours(item_type, release_qty)
    days_needed = calc_days(hours)

    raw_info = RAW_MATERIAL_MAP.get(item_type, {})
    raw_needed = calc_raw_needed(item_type, release_qty)
    current_raw = raw_stocks.get(raw_info.get("name", ""), 0)
    stock_ok = current_raw >= raw_needed

    if days_remaining >= days_needed + 1:
        deadline_status = "납기가능"
    elif days_remaining >= days_needed:
        deadline_status = "납기위험"
    else:
        deadline_status = "납기불가"

    warnings = []
    instructions = []

    if not stock_ok:
        shortage = raw_needed - current_raw
        warnings.append(
            f"⚠ {raw_info.get('name','')} 부족: 현재 {current_raw}{raw_info.get('unit','')}, "
            f"필요 {raw_needed}{raw_info.get('unit','')} (부족 {round(shortage,1)})"
        )
        instructions.append(f"{raw_info.get('name','')} {round(shortage+10,1)}{raw_info.get('unit','')} 발주 권고")

    if deadline_status == "납기불가":
        instructions.insert(0, f"❌ 납기 불가: {days_needed}일 필요, {days_remaining}일 남음")
    elif deadline_status == "납기위험":
        instructions.insert(0, "⚠ 납기 위험: 즉시 생산 착수 필요")

    safe = SAFE_STOCK.get(raw_info.get("name", ""), 0)
    if current_raw <= safe and raw_info:
        warnings.append(f"⚠ {raw_info['name']} 안전재고 이하 ({current_raw}{raw_info['unit']})")

    return {
        "item_name":       item_name,
        "item_type":       item_type,
        "release_qty":     release_qty,
        "required_hours":  round(hours, 2),
        "required_days":   days_needed,
        "raw_material":    raw_info.get("name", "-"),
        "raw_needed":      raw_needed,
        "raw_unit":        raw_info.get("unit", ""),
        "stock_ok":        stock_ok,
        "days_remaining":  days_remaining,
        "deadline_status": deadline_status,
        "warnings":        warnings,
        "instructions":    instructions,
        "is_valid":        True,
    }
