from __future__ import annotations

import json
import os
from typing import Any

from openai import AsyncOpenAI


RESEARCH_CORPUS = [
    {
        "source_id": "market-2025-fw-mens-tailored",
        "source_title": "2025 FW 남성복 시장 메모: 재킷/코트와 네이비 계열 기본색",
        "source_type": "demo_market_research",
        "period": "2025 FW",
        "keywords": ["남성", "가을", "겨울", "재킷", "코트", "울", "네이비", "그레이", "브라운"],
        "summary": "2025 FW 남성복에서는 울 재킷, 코트, 네이비/그레이 계열 기본색 선호가 반복 신호로 관찰됩니다.",
    },
    {
        "source_id": "market-2025-outdoor-gorpcore",
        "source_title": "2025 아웃도어/고프코어 신호: 나일론·폴리에스터 유틸리티 재킷",
        "source_type": "demo_market_research",
        "period": "2025 SS/FW",
        "keywords": ["공용", "남성", "여성", "재킷", "다운", "나일론", "폴리에스터", "카키", "베이지", "네이비", "아웃도어", "기능성"],
        "summary": "아웃도어/고프코어 계열은 나일론·폴리에스터, 카키·베이지·네이비, 유틸리티 재킷과 다운류에서 강한 신호로 분류됩니다.",
    },
    {
        "source_id": "market-2025-summer-casual",
        "source_title": "2025 여름 캐주얼 기본류: 티셔츠, 경량 팬츠와 밝은 중립색",
        "source_type": "demo_market_research",
        "period": "2025 SS",
        "keywords": ["여름", "티셔츠", "팬츠", "면", "폴리에스터", "화이트", "베이지", "블루", "캐주얼"],
        "summary": "여름 캐주얼군은 티셔츠·라이트 팬츠, 화이트·베이지·블루 같은 밝은 중립색 선호가 유의미합니다.",
    },
    {
        "source_id": "market-2025-golf-leisure",
        "source_title": "2025 골프/레저 카테고리: 깔끔한 폴로, 기능성 팬츠와 네이비/화이트",
        "source_type": "demo_market_research",
        "period": "2025 SS",
        "keywords": ["티셔츠", "팬츠", "폴리에스터", "네이비", "화이트", "남성", "여성", "골프", "레저"],
        "summary": "골프/레저군은 기능성 폴리에스터 티셔츠·팬츠, 네이비·화이트 조합에서 반복되는 시장 선호가 있습니다.",
    },
]


def _flatten_text(value: Any) -> str:
    if value is None:
        return ""
    if isinstance(value, dict):
        return " ".join(_flatten_text(item) for item in value.values())
    if isinstance(value, list):
        return " ".join(_flatten_text(item) for item in value)
    return str(value)


def _handoff_keywords(handoff: dict[str, Any]) -> set[str]:
    keywords: set[str] = set()
    for parsed in handoff.get("label_code_patterns") or []:
        if not isinstance(parsed, dict):
            continue
        for key in ("season_name", "gender_name", "category_name", "material_name", "color_name"):
            value = str(parsed.get(key) or "").strip()
            if value:
                keywords.add(value)

    compact_text = _flatten_text(handoff)
    for corpus in RESEARCH_CORPUS:
        for keyword in corpus["keywords"]:
            if keyword in compact_text:
                keywords.add(keyword)

    for field in ("hypothesis", "hypothesis_type"):
        for token in _flatten_text(handoff.get(field)).replace("/", " ").replace(",", " ").split():
            if len(token) >= 2:
                keywords.add(token)

    return keywords


def _score_source(keywords: set[str], source: dict[str, Any]) -> tuple[int, list[str]]:
    matched = [keyword for keyword in source["keywords"] if keyword in keywords]
    return len(matched), matched


def verify_handoff(handoff: dict[str, Any]) -> dict[str, Any]:
    keywords = _handoff_keywords(handoff)
    ranked = []
    for source in RESEARCH_CORPUS:
        score, matched = _score_source(keywords, source)
        if score <= 0:
            continue
        ranked.append({**source, "score": score, "matched_keywords": matched})
    ranked.sort(key=lambda item: item["score"], reverse=True)

    top_score = ranked[0]["score"] if ranked else 0
    if top_score >= 4:
        status = "verified"
        confidence = min(95, 55 + top_score * 8)
        verdict = "내부 가설과 데모 시장 근거가 같은 방향입니다. 보고서 작성팀 전달 대상으로 볼 수 있습니다."
    elif top_score >= 2:
        status = "weak"
        confidence = min(70, 35 + top_score * 10)
        verdict = "일부 시장 신호와 맞지만 보고서화 전 추가 근거가 필요합니다."
    else:
        status = "rejected"
        confidence = 25
        verdict = "현재 데모 리서치 근거셋에서는 해당 가설을 뒷받침할 신호가 부족합니다."

    evidence = [
        {
            "source_id": item["source_id"],
            "source_title": item["source_title"],
            "source_type": item["source_type"],
            "period": item["period"],
            "matched_keywords": item["matched_keywords"],
            "summary": item["summary"],
        }
        for item in ranked[:3]
    ]

    return {
        "handoff_id": handoff.get("handoff_id"),
        "hypothesis": handoff.get("hypothesis"),
        "status": status,
        "confidence": confidence,
        "verdict": verdict,
        "matched_keywords": sorted(keywords),
        "external_evidence": evidence,
        "report_team_ready": status == "verified",
        "adapter": {
            "name": "demo_research_verifier",
            "mode": "local_demo_corpus",
            "notice": "실제 웹 검색 API가 아니라 포트폴리오 시연용 데모 시장 근거셋과 대조한 결과입니다.",
        },
    }


def verify_handoffs(handoffs: list[dict[str, Any]]) -> dict[str, Any]:
    results = [verify_handoff(handoff) for handoff in handoffs]
    return _summarize_results(
        results,
        {
            "name": "demo_research_verifier",
            "mode": "local_demo_corpus",
            "official_hermes_linked": False,
        },
    )


def _build_web_prompt(handoff: dict[str, Any]) -> str:
    compact_handoff = json.dumps(handoff, ensure_ascii=False, indent=2)
    return f"""
You are the B2B apparel-material platform research verification adapter.
Use web search to verify whether the internal insight handoff is supported by external market evidence.

Handoff:
{compact_handoff}

Rules:
- Search the live web. Do not rely only on prior model knowledge.
- Focus on apparel, fashion retail, material sourcing, colors, categories, and season trend signals.
- If the handoff is about label code patterns, interpret the parsed labels as apparel market signals.
- Use conservative judgment. If evidence is weak, mark "weak". If it is not supported, mark "rejected".
- Return only JSON. No markdown.

JSON schema:
{{
  "status": "verified" | "weak" | "rejected",
  "confidence": 0-100,
  "verdict": "Korean sentence explaining the verification result",
  "matched_keywords": ["keyword"],
  "external_evidence": [
    {{
      "source_id": "short-id",
      "source_title": "source title",
      "source_type": "web_research",
      "period": "published or market period if known",
      "matched_keywords": ["keyword"],
      "summary": "Korean summary of why this source matters"
    }}
  ]
}}
"""


def _extract_json_object(text: str) -> dict[str, Any]:
    raw = (text or "").strip()
    if raw.startswith("```"):
        raw = raw.split("```", 2)[1]
        if raw.strip().startswith("json"):
            raw = raw.strip()[4:]
    raw = raw.strip()
    try:
        parsed = json.loads(raw)
        return parsed if isinstance(parsed, dict) else {}
    except json.JSONDecodeError:
        start = raw.find("{")
        end = raw.rfind("}")
        if start >= 0 and end > start:
            parsed = json.loads(raw[start:end + 1])
            return parsed if isinstance(parsed, dict) else {}
        raise


def _response_to_dict(response: Any) -> dict[str, Any]:
    if hasattr(response, "model_dump"):
        return response.model_dump()
    if hasattr(response, "dict"):
        return response.dict()
    return {}


def _collect_web_search_queries(value: Any) -> list[str]:
    queries: list[str] = []
    if isinstance(value, dict):
        if value.get("type") == "web_search_call":
            action = value.get("action") or {}
            query = action.get("query")
            if isinstance(query, str) and query:
                queries.append(query)
            for query in action.get("queries") or []:
                if isinstance(query, str):
                    queries.append(query)
                elif isinstance(query, dict) and query.get("query"):
                    queries.append(str(query["query"]))
        for item in value.values():
            queries.extend(_collect_web_search_queries(item))
    elif isinstance(value, list):
        for item in value:
            queries.extend(_collect_web_search_queries(item))
    return list(dict.fromkeys(queries))


def _collect_url_citations(value: Any) -> list[dict[str, Any]]:
    citations: list[dict[str, Any]] = []
    if isinstance(value, dict):
        if value.get("type") == "url_citation":
            url = value.get("url")
            if url:
                citations.append({
                    "url": url,
                    "title": value.get("title") or url,
                    "start_index": value.get("start_index"),
                    "end_index": value.get("end_index"),
                })
        for item in value.values():
            citations.extend(_collect_url_citations(item))
    elif isinstance(value, list):
        for item in value:
            citations.extend(_collect_url_citations(item))

    deduped = []
    seen = set()
    for citation in citations:
        if citation["url"] in seen:
            continue
        seen.add(citation["url"])
        deduped.append(citation)
    return deduped


def _collect_web_sources(value: Any) -> list[dict[str, Any]]:
    sources: list[dict[str, Any]] = []
    if isinstance(value, dict):
        url = value.get("url") or value.get("source_url")
        if isinstance(url, str) and url.startswith(("http://", "https://")):
            sources.append({
                "url": url,
                "title": value.get("title") or value.get("source_title") or url,
            })
        for item in value.values():
            sources.extend(_collect_web_sources(item))
    elif isinstance(value, list):
        for item in value:
            sources.extend(_collect_web_sources(item))

    deduped = []
    seen = set()
    for source in sources:
        if source["url"] in seen:
            continue
        seen.add(source["url"])
        deduped.append(source)
    return deduped


def _normalize_web_result(handoff: dict[str, Any], parsed: dict[str, Any], response: Any, model: str) -> dict[str, Any]:
    response_dict = _response_to_dict(response)
    status = parsed.get("status")
    if status not in {"verified", "weak", "rejected"}:
        status = "weak"

    try:
        confidence = int(parsed.get("confidence", 50))
    except (TypeError, ValueError):
        confidence = 50
    confidence = max(0, min(100, confidence))

    evidence = parsed.get("external_evidence") if isinstance(parsed.get("external_evidence"), list) else []
    citations = _collect_url_citations(response_dict)
    for index, citation in enumerate(citations[:5], start=1):
        evidence.append({
            "source_id": f"web-citation-{index}",
            "source_title": citation["title"],
            "source_type": "web_citation",
            "period": "live web",
            "matched_keywords": [],
            "summary": citation["url"],
            "url": citation["url"],
        })

    cited_urls = {item.get("url") for item in evidence if item.get("url")}
    sources = [source for source in _collect_web_sources(response_dict) if source["url"] not in cited_urls]
    for index, source in enumerate(sources[:5], start=1):
        evidence.append({
            "source_id": f"web-source-{index}",
            "source_title": source["title"],
            "source_type": "web_source",
            "period": "live web",
            "matched_keywords": [],
            "summary": source["url"],
            "url": source["url"],
        })

    web_queries = _collect_web_search_queries(response_dict)
    has_web_trace = bool(web_queries or citations or sources)
    if not has_web_trace and status == "verified":
        status = "weak"
        confidence = min(confidence, 60)

    return {
        "handoff_id": handoff.get("handoff_id"),
        "hypothesis": handoff.get("hypothesis"),
        "status": status,
        "confidence": confidence,
        "verdict": parsed.get("verdict") or "웹 검증 결과를 해석했지만 설명 문장이 부족합니다.",
        "matched_keywords": parsed.get("matched_keywords") if isinstance(parsed.get("matched_keywords"), list) else [],
        "external_evidence": evidence[:6],
        "web_queries": web_queries,
        "web_search_used": has_web_trace,
        "report_team_ready": status == "verified",
        "adapter": {
            "name": "openai_web_search_verifier",
            "mode": "live_web_search",
            "model": model,
            "official_hermes_linked": False,
        },
    }


async def verify_handoff_web(handoff: dict[str, Any]) -> dict[str, Any]:
    api_key = os.getenv("OPENAI_API_KEY", "")
    if not api_key or api_key == "your_openai_key":
        raise RuntimeError("OPENAI_API_KEY is not configured")

    model = os.getenv("OPENAI_WEB_SEARCH_MODEL", "gpt-4.1-mini")
    client = AsyncOpenAI(api_key=api_key)
    response = await client.responses.create(
        model=model,
        tools=[{"type": "web_search"}],
        tool_choice="required",
        include=["web_search_call.action.sources"],
        max_output_tokens=1400,
        input=_build_web_prompt(handoff),
    )
    try:
        parsed = _extract_json_object(response.output_text)
    except Exception:
        parsed = {
            "status": "weak",
            "confidence": 45,
            "verdict": (
                "웹 검색은 수행됐지만 모델 출력 JSON 정규화에 실패했습니다. "
                f"원문 요약: {(response.output_text or '')[:300]}"
            ),
            "matched_keywords": list(_handoff_keywords(handoff))[:8],
            "external_evidence": [],
        }
    return _normalize_web_result(handoff, parsed, response, model)


async def verify_handoffs_web(handoffs: list[dict[str, Any]]) -> dict[str, Any]:
    results = []
    for handoff in handoffs:
        results.append(await verify_handoff_web(handoff))
    return _summarize_results(
        results,
        {
            "name": "openai_web_search_verifier",
            "mode": "live_web_search",
            "model": os.getenv("OPENAI_WEB_SEARCH_MODEL", "gpt-4.1-mini"),
            "official_hermes_linked": False,
        },
    )


def _summarize_results(results: list[dict[str, Any]], adapter: dict[str, Any]) -> dict[str, Any]:
    return {
        "adapter": adapter,
        "verified_count": sum(1 for item in results if item["status"] == "verified"),
        "weak_count": sum(1 for item in results if item["status"] == "weak"),
        "rejected_count": sum(1 for item in results if item["status"] == "rejected"),
        "results": results,
    }
