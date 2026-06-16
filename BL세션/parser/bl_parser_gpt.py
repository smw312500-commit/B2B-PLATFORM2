"""
GPT Vision 기반 BL(선하증권) 파싱 로직
PDF -> 페이지 이미지(PyMuPDF) -> GPT-4o-mini Vision -> JSON

OPENAI_API_KEY가 설정되어 있지 않거나 호출이 실패하면 parse_bl_with_gpt()는 None을 반환한다.
이 경우 main.py는 기존 pdfplumber 정규식 파서로 대체한다.
"""
from __future__ import annotations

import base64
import json
import os

import fitz  # PyMuPDF
from openai import OpenAI

# GPT가 골라야 할 한국어 원자재명 후보 (각사 agent의 BL 코드 매핑과 동일)
MATERIAL_OPTIONS = [
    "면 원사", "폴리에스터 원사", "린넨 원사", "울 원사", "혼방 원사",
    "라벨원단", "잉크", "원목", "플라스틱원료", "금속원료", "지퍼테이프", "염료",
]

# 한국어 원자재명 -> 내부 코드 (main.py CODE_NAMES와 매칭)
MATERIAL_CODE = {
    "면 원사": "COTTON_YARN",
    "폴리에스터 원사": "POLY_YARN",
    "린넨 원사": "LINEN_YARN",
    "울 원사": "WOOL_YARN",
    "혼방 원사": "MIXED_YARN",
    "라벨원단": "LABEL_FABRIC",
    "잉크": "PRINT_INK",
    "원목": "RAW_WOOD",
    "플라스틱원료": "RAW_PLASTIC",
    "금속원료": "RAW_METAL",
    "지퍼테이프": "ZIPPER_TAPE",
}

_PROMPT = f"""이 이미지는 선하증권(Bill of Lading)입니다.
다음 JSON 형식으로만 응답하세요. 설명 문장이나 코드블록 없이 JSON 객체만 출력합니다.

{{
  "bl_number": "B/L 번호",
  "shipper": "수출자(Shipper)",
  "port_of_loading": "선적항",
  "port_of_discharge": "도착항",
  "vessel": "선박명",
  "eta": "도착예정일을 YYYY-MM-DD 형식으로",
  "items": [
    {{
      "description": "품목명 원문 그대로",
      "quantity": 숫자만,
      "unit": "원문 단위 그대로",
      "matched_material": "다음 중 의미상 가장 가까운 한국어 원자재명 하나를 선택: {', '.join(MATERIAL_OPTIONS)}. 적절한 항목이 없으면 description을 그대로 사용",
      "matched_qty": 숫자만,
      "matched_unit": "kg, m, 통, EA, 야드 중 하나로 정규화",
      "confidence": "high, medium, low 중 하나"
    }}
  ]
}}

값을 찾을 수 없는 필드는 null로 두세요. 품목이 여러 개면 items 배열에 모두 포함하세요.
"""


def _pdf_to_png_images(pdf_bytes: bytes, max_pages: int = 2, zoom: float = 2.0) -> list[bytes]:
    images: list[bytes] = []
    doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    try:
        for page in doc[:max_pages]:
            pix = page.get_pixmap(matrix=fitz.Matrix(zoom, zoom))
            images.append(pix.tobytes("png"))
    finally:
        doc.close()
    return images


def parse_bl_with_gpt(pdf_bytes: bytes) -> dict | None:
    """GPT-4o-mini Vision으로 BL을 파싱해 raw dict를 반환한다.
    OPENAI_API_KEY가 없거나 호출/파싱에 실패하면 None을 반환한다."""
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        return None

    try:
        images = _pdf_to_png_images(pdf_bytes)
        if not images:
            return None

        content: list[dict] = [{"type": "text", "text": _PROMPT}]
        for img in images:
            b64 = base64.b64encode(img).decode("ascii")
            content.append({
                "type": "image_url",
                "image_url": {"url": f"data:image/png;base64,{b64}"},
            })

        client = OpenAI(api_key=api_key)
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": content}],
            response_format={"type": "json_object"},
            max_tokens=2000,
        )
        return json.loads(response.choices[0].message.content)
    except Exception:
        return None
