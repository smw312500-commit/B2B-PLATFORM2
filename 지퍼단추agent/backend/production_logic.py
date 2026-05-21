"""
생산규칙.txt + AI_로직.txt 기반 계산 로직
"""
import math
from datetime import date, timedelta
from typing import List, Dict, Optional


# 기계 1대당 시간당 생산량
PRODUCTION_RATE = {
    "원목단추":     20,
    "플라스틱단추": 300,
    "금속단추":     150,
    "지퍼":         200,
}

MACHINES_PER_ITEM = 2      # 기계 보유 대수
DAILY_HOURS = 9            # 일일 가동시간

# 원자재 변환비율 (원자재 1단위 → 가공품 개수)
RAW_MATERIAL_MAP = {
    "원목단추":     {"name": "원목",        "unit": "kg", "rate": 50},
    "플라스틱단추": {"name": "플라스틱원료", "unit": "kg", "rate": 200},
    "금속단추":     {"name": "금속원료",     "unit": "kg", "rate": 150},
    "지퍼":         {"name": "지퍼테이프",   "unit": "m",  "rate": 1},
}

# 안전 재고 기준
SAFETY_STOCK = {
    "원목":         {"qty": 50,  "unit": "kg"},
    "플라스틱원료": {"qty": 100, "unit": "kg"},
    "금속원료":     {"qty": 80,  "unit": "kg"},
    "지퍼테이프":   {"qty": 200, "unit": "m"},
}

# 라벨코드 4번째 자리 → 필요 부자재 매핑
ITEM_CODE_MAP = {
    "T": {"label": "티셔츠",  "parts": [("플라스틱단추", "PLASTIC")]},
    "P": {"label": "바지",    "parts": [("금속단추", "METAL")]},
    "J": {"label": "재킷",    "parts": [("지퍼", "ZIPPER_M"), ("금속단추", "METAL")]},
    "D": {"label": "다운",    "parts": [("지퍼", "ZIPPER_L")]},
}

# 품목명 → item_name 코드 매핑 (기본값; 컬러는 별도 처리)
ITEM_NAME_DEFAULTS = {
    "플라스틱단추": "PLASTIC_BK",
    "금속단추":     "METAL_SV",
    "지퍼":         "ZIPPER_M",  # size override by item_code
}


def calc_production_hours(item_type: str, qty: int) -> float:
    rate = PRODUCTION_RATE[item_type]
    return qty / (MACHINES_PER_ITEM * rate)


def calc_production_days(hours: float) -> int:
    return math.ceil(hours / DAILY_HOURS)


def calc_raw_material(item_type: str, qty: int) -> float:
    rate = RAW_MATERIAL_MAP[item_type]["rate"]
    return math.ceil(qty / rate * 10) / 10  # 소수 첫째자리 올림


def parse_label_code(label_code: str) -> Dict:
    if len(label_code) != 9:
        raise ValueError(f"라벨코드는 9자리여야 합니다: {label_code}")
    return {
        "brand":   label_code[0],
        "season":  label_code[1],
        "gender":  label_code[2],
        "item":    label_code[3],
        "fabric":  label_code[4],
        "style":   label_code[5:7],
        "color":   label_code[7:9],
    }


def analyze_order(label_code: str, order_qty: int, due_date: date) -> Dict:
    parsed = parse_label_code(label_code)
    item_code = parsed["item"]

    if item_code not in ITEM_CODE_MAP:
        raise ValueError(f"지원하지 않는 품목코드: {item_code}")

    item_info = ITEM_CODE_MAP[item_code]
    today = date.today()
    days_remaining = (due_date - today).days

    requirements = []
    max_days_needed = 0

    for item_type, item_name_base in item_info["parts"]:
        hours = calc_production_hours(item_type, order_qty)
        days = calc_production_days(hours)
        raw_info = RAW_MATERIAL_MAP[item_type]
        raw_needed = calc_raw_material(item_type, order_qty)

        # ZIPPER size override
        if item_type == "지퍼":
            size_map = {"J": "ZIPPER_M", "D": "ZIPPER_L", "P": "ZIPPER_S"}
            item_name = size_map.get(item_code, "ZIPPER_M")
        else:
            item_name = item_name_base

        requirements.append({
            "item_name":            item_name,
            "item_label":           item_type,
            "qty_needed":           order_qty,
            "production_hours":     round(hours, 2),
            "production_days":      days,
            "raw_material":         raw_info["name"],
            "raw_material_needed":  raw_needed,
            "raw_material_unit":    raw_info["unit"],
        })

        if days > max_days_needed:
            max_days_needed = days

    # J(재킷)은 지퍼+단추 순차 생산 → 합산
    if item_code == "J" and len(requirements) == 2:
        total_hours = sum(r["production_hours"] for r in requirements)
        max_days_needed = calc_production_days(total_hours)

    # 납기 판정
    if days_remaining >= max_days_needed + 1:
        deadline_status = "납기가능"
    elif days_remaining >= max_days_needed:
        deadline_status = "납기위험"
    else:
        deadline_status = "납기불가"

    return {
        "label_code":       label_code,
        "item_code":        item_code,
        "item_type":        item_info["label"],
        "requirements":     requirements,
        "total_days_needed": max_days_needed,
        "days_remaining":   days_remaining,
        "deadline_status":  deadline_status,
        "warnings":         [],
        "recommendations":  [],
    }


def check_safety_stock(material_name: str, current_qty: float) -> Optional[str]:
    if material_name in SAFETY_STOCK:
        safe = SAFETY_STOCK[material_name]
        if current_qty == 0:
            return f"❌ {material_name} 재고 없음 — 긴급 발주 필요"
        if current_qty <= safe["qty"]:
            return f"⚠ {material_name} 재고 부족 ({current_qty}{safe['unit']}) — 발주 권고"
    return None


def get_trend_signal(item_name: str, current_month_qty: int, prev_month_qty: int) -> Optional[str]:
    if prev_month_qty == 0:
        return None
    growth = (current_month_qty - prev_month_qty) / prev_month_qty * 100
    if "WOOD" in item_name and growth >= 20:
        return "프리미엄 셔츠 라인 수요 증가"
    if "ZIPPER_L" in item_name and growth >= 20:
        return "아웃도어 다운 시즌 수요 증가"
    if "METAL" in item_name and growth >= 20:
        return "포멀 재킷 라인 수요 증가"
    if "PLASTIC" in item_name and growth <= -20:
        return "캐주얼 라인 수요 감소"
    return None
