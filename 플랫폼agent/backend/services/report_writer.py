from __future__ import annotations

import json
import os
from typing import Any

from openai import AsyncOpenAI


SYSTEM_PROMPT = """You are the report-writing team for a B2B apparel material supply-chain platform.
Write a Korean management report by combining reports already produced by the insight team and research team.

Rules:
- Use only the supplied reports and evidence. Never invent a company, number, date, or causal relationship.
- Distinguish observed facts from interpretation.
- If material delays and production deterioration occur together, describe them as an association or possible cause unless direct causal evidence exists.
- State which additional data would strengthen the conclusion, such as machine operating hours, downtime reasons, inventory days, or supplier-specific lead time.
- The report headline and summary must clearly name the supplied target company or report scope.
- Graph data is supporting evidence, not the report itself.
- Return only a JSON object with the requested fields.
"""


def _extract_json_object(text: str) -> dict[str, Any]:
    raw = (text or "").strip()
    if raw.startswith("```"):
        raw = raw.split("```", 2)[1]
        if raw.strip().startswith("json"):
            raw = raw.strip()[4:]
    raw = raw.strip()
    try:
        value = json.loads(raw)
    except json.JSONDecodeError:
        start = raw.find("{")
        end = raw.rfind("}")
        if start < 0 or end <= start:
            raise
        value = json.loads(raw[start:end + 1])
    return value if isinstance(value, dict) else {}


def _normalize_report(value: dict[str, Any], payload: dict[str, Any]) -> dict[str, Any]:
    period = str(payload.get("period") or "selected period")
    findings = value.get("findings") if isinstance(value.get("findings"), list) else []
    data_gaps = value.get("data_gaps") if isinstance(value.get("data_gaps"), list) else []
    recommendations = value.get("recommendations") if isinstance(value.get("recommendations"), list) else []
    return {
        "period": value.get("period") or period,
        "report_scope": value.get("report_scope") or payload.get("report_scope") or "overview",
        "report_category": value.get("report_category") or payload.get("report_category") or "전체 종합",
        "target_name": value.get("target_name") or payload.get("target_name") or "전체 생산기업",
        "headline": value.get("headline") or "운영 인사이트 종합 보고",
        "executive_summary": value.get("executive_summary") or "수신 보고를 종합했지만 요약 문장이 부족합니다.",
        "findings": findings[:6],
        "data_gaps": data_gaps[:6],
        "recommendations": recommendations[:6],
        "confidence_note": value.get("confidence_note") or "제공된 내부 보고와 근거 범위에서 작성된 초안입니다.",
        "adapter": {
            "name": "openai_report_writer",
            "mode": "cross_team_report_synthesis",
            "model": os.getenv("OPENAI_REPORT_MODEL", "gpt-4.1-mini"),
        },
    }


async def compose_cross_team_report(payload: dict[str, Any]) -> dict[str, Any]:
    api_key = os.getenv("OPENAI_API_KEY", "")
    if not api_key or api_key == "your_openai_key":
        raise RuntimeError("OPENAI_API_KEY is not configured")

    period = str(payload.get("period") or "selected period")
    model = os.getenv("OPENAI_REPORT_MODEL", "gpt-4.1-mini")
    client = AsyncOpenAI(api_key=api_key)
    prompt = f"""Create the cross-team management report from this input.

Input:
{json.dumps(payload, ensure_ascii=False, indent=2)}

Return this JSON structure:
{{
  "period": "analysis period",
  "report_scope": "overview | company | market",
  "report_category": "Korean report category",
  "target_name": "target company name or market scope",
  "headline": "one clear Korean headline",
  "executive_summary": "2-4 Korean sentences summarizing the situation and likely relationship",
  "findings": [
    {{
      "title": "finding title",
      "statement": "observed fact in Korean",
      "interpretation": "careful interpretation in Korean",
      "evidence": ["supporting fact"],
      "source_teams": ["insight", "research"]
    }}
  ],
  "data_gaps": [
    {{
      "data": "missing data name",
      "reason": "why this data would strengthen or reject the interpretation"
    }}
  ],
  "recommendations": [
    {{
      "action": "recommended action",
      "reason": "reason",
      "priority": "high | medium | low"
    }}
  ],
  "confidence_note": "fact/inference boundary and limitations"
}}
"""

    response = await client.chat.completions.create(
        model=model,
        response_format={"type": "json_object"},
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": prompt},
        ],
        temperature=0.2,
        max_tokens=2200,
    )
    parsed = _extract_json_object(response.choices[0].message.content or "")
    return _normalize_report(parsed, payload)
