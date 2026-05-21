from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func, extract
from datetime import date
from typing import List
from database import get_db
from models import ZipperRelease, ZipperStock, RawMaterialStock
from schemas import AgentAnalyzeRequest, AgentAnalyzeResponse, AgentStatusResponse
from production_logic import analyze_order, check_safety_stock, SAFETY_STOCK
import openai, os

router = APIRouter(prefix="/agent", tags=["AI Agent"])

openai.api_key = os.getenv("OPENAI_API_KEY", "")


@router.post("/analyze", response_model=AgentAnalyzeResponse)
def analyze(body: AgentAnalyzeRequest, db: Session = Depends(get_db)):
    try:
        result = analyze_order(body.label_code, body.order_qty, body.due_date)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    # 재고 확인 및 경고 추가
    raw_stocks = {r.material_name: float(r.stock_qty) for r in db.query(RawMaterialStock).all()}
    warnings = []
    recommendations = []

    for req in result["requirements"]:
        raw_name = req["raw_material"]
        current_qty = raw_stocks.get(raw_name, 0)
        needed = req["raw_material_needed"]

        if current_qty < needed:
            shortage = needed - current_qty
            warnings.append(
                f"⚠ {raw_name} 부족: 현재 {current_qty}{req['raw_material_unit']}, "
                f"필요 {needed}{req['raw_material_unit']} (부족 {round(shortage,1)})"
            )
            recommendations.append(f"{raw_name} {round(shortage + 10, 1)}{req['raw_material_unit']} 발주 권고")

        # 안전재고 경고
        warn = check_safety_stock(raw_name, current_qty)
        if warn and warn not in warnings:
            warnings.append(warn)

    if result["deadline_status"] == "납기불가":
        recommendations.insert(0, f"❌ 납기 불가: {result['total_days_needed']}일 필요, {result['days_remaining']}일 남음")
    elif result["deadline_status"] == "납기위험":
        recommendations.insert(0, f"⚠ 납기 위험: 즉시 생산 착수 필요")

    result["warnings"] = warnings
    result["recommendations"] = recommendations

    # GPT 코멘트
    if os.getenv("OPENAI_API_KEY"):
        result["gpt_comment"] = _get_gpt_comment(result)

    return AgentAnalyzeResponse(**result)


@router.get("/status", response_model=AgentStatusResponse)
def get_status(db: Session = Depends(get_db)):
    today = date.today()

    # 진행 중인 출고
    active_releases = db.query(ZipperRelease).filter(
        ZipperRelease.status == "생산중"
    ).order_by(ZipperRelease.due_date.asc()).all()

    active_list = []
    for r in active_releases:
        days_left = (r.due_date - today).days if r.due_date else None
        if days_left is None:
            status_icon = "⬜"
        elif days_left < 0:
            status_icon = "❌"
        elif days_left < 1:
            status_icon = "⚠"
        else:
            status_icon = "✅"

        active_list.append({
            "id": r.id,
            "label_code": r.label_code,
            "item_name": r.item_name,
            "release_qty": r.release_qty,
            "due_date": str(r.due_date) if r.due_date else None,
            "days_left": days_left,
            "status_icon": status_icon,
        })

    # 재고 경고
    raw_stocks = db.query(RawMaterialStock).all()
    stock_warnings = []
    for s in raw_stocks:
        warn = check_safety_stock(s.material_name, float(s.stock_qty))
        if warn:
            stock_warnings.append({
                "material": s.material_name,
                "qty": float(s.stock_qty),
                "unit": s.unit,
                "warning": warn,
            })

    # 우선순위 주문 (납기 위험 순)
    priority = sorted(
        [a for a in active_list if a["days_left"] is not None],
        key=lambda x: x["days_left"]
    )

    return AgentStatusResponse(
        active_releases=active_list,
        stock_warnings=stock_warnings,
        priority_orders=priority[:5],
        today=str(today),
    )


def _get_gpt_comment(result: dict) -> str:
    try:
        system_msg = (
            "당신은 지퍼단추 제조회사의 생산 AI 에이전트입니다. "
            "주문 분석 결과를 보고 작업자에게 한 줄로 핵심 지시사항을 전달하세요. "
            "간결하게 50자 이내로 작성하세요."
        )
        user_msg = (
            f"라벨코드: {result['label_code']}, 품목: {result['item_type']}, "
            f"납기상태: {result['deadline_status']}, 남은일수: {result['days_remaining']}일, "
            f"경고: {', '.join(result['warnings'][:2]) if result['warnings'] else '없음'}"
        )
        resp = openai.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": system_msg},
                {"role": "user", "content": user_msg},
            ],
            max_tokens=100,
            temperature=0.3,
        )
        return resp.choices[0].message.content.strip()
    except Exception:
        return None
