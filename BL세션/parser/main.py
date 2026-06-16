import io
import re
from typing import List, Optional

import pdfplumber
from dotenv import load_dotenv
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from bl_parser_gpt import MATERIAL_CODE, parse_bl_with_gpt

load_dotenv()

app = FastAPI(title="BL Parser Service", version="1.0.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

# ── 코드 → 표시명 매핑 ────────────────────────────────────────────
CODE_NAMES = {
    "C-BK": "면(Cotton) / 블랙(BK)",
    "C-WH": "면(Cotton) / 화이트(WH)",
    "C-NV": "면(Cotton) / 네이비(NV)",
    "C-GY": "면(Cotton) / 그레이(GY)",
    "C-BE": "면(Cotton) / 베이지(BE)",
    "C-RD": "면(Cotton) / 레드(RD)",
    "P-BK": "폴리에스터 / 블랙(BK)",
    "P-WH": "폴리에스터 / 화이트(WH)",
    "P-NV": "폴리에스터 / 네이비(NV)",
    "P-GY": "폴리에스터 / 그레이(GY)",
    "P-BE": "폴리에스터 / 베이지(BE)",
    "P-RD": "폴리에스터 / 레드(RD)",
    "L-BK": "린넨 / 블랙(BK)",
    "L-WH": "린넨 / 화이트(WH)",
    "L-NV": "린넨 / 네이비(NV)",
    "L-GY": "린넨 / 그레이(GY)",
    "L-BE": "린넨 / 베이지(BE)",
    "L-RD": "린넨 / 레드(RD)",
    "W-BK": "울(Wool) / 블랙(BK)",
    "W-WH": "울(Wool) / 화이트(WH)",
    "W-NV": "울(Wool) / 네이비(NV)",
    "W-GY": "울(Wool) / 그레이(GY)",
    "W-BE": "울(Wool) / 베이지(BE)",
    "W-RD": "울(Wool) / 레드(RD)",
    "M-BK": "혼방(Mixed) / 블랙(BK)",
    "M-WH": "혼방(Mixed) / 화이트(WH)",
    "M-NV": "혼방(Mixed) / 네이비(NV)",
    "M-GY": "혼방(Mixed) / 그레이(GY)",
    "M-BE": "혼방(Mixed) / 베이지(BE)",
    "M-RD": "혼방(Mixed) / 레드(RD)",
    "LABEL_FABRIC": "라벨원단",
    "PRINT_INK": "잉크",
    "RAW_WOOD": "원목",
    "RAW_PLASTIC": "플라스틱원료",
    "RAW_METAL": "금속원료",
    "ZIPPER_TAPE": "지퍼테이프",
    "COTTON_YARN": "면 원사",
    "POLY_YARN": "폴리에스터 원사",
    "LINEN_YARN": "린넨 원사",
    "WOOL_YARN": "울 원사",
    "MIXED_YARN": "혼방 원사",
}

# ── Pydantic ──────────────────────────────────────────────────────
class BLItem(BaseModel):
    code: str
    name: str
    qty: float
    unit: str


class BLResult(BaseModel):
    bl_number: Optional[str] = None
    shipper: Optional[str] = None
    port_of_loading: Optional[str] = None
    port_of_discharge: Optional[str] = None
    vessel: Optional[str] = None
    eta: Optional[str] = None
    items: List[BLItem] = []


# ── 텍스트 파싱 ───────────────────────────────────────────────────
def parse_bl_text(text: str) -> BLResult:
    result = BLResult()

    m = re.search(r"BL\s*No\.?\s*:?\s*(BL-[\w-]+)", text, re.IGNORECASE)
    if m:
        result.bl_number = m.group(1)

    m = re.search(r"SHIPPER\s*:?\s*(.+)", text, re.IGNORECASE)
    if m:
        result.shipper = m.group(1).strip()

    m = re.search(r"PORT OF LOADING\s*:?\s*(.+)", text, re.IGNORECASE)
    if m:
        result.port_of_loading = m.group(1).strip()

    m = re.search(r"PORT OF DISCHARGE\s*:?\s*(.+)", text, re.IGNORECASE)
    if m:
        result.port_of_discharge = m.group(1).strip()

    m = re.search(r"ETA\s*:?\s*(\d{4}[-/]\d{2}[-/]\d{2})", text, re.IGNORECASE)
    if m:
        result.eta = m.group(1)

    m = re.search(r"VESSEL\s*:?\s*(.+)", text, re.IGNORECASE)
    if m:
        result.vessel = m.group(1).strip()

    # 품목 파싱: [CODE] ... qty unit
    item_pattern = re.compile(
        r"\[([A-Z][A-Z0-9_\-]*)\].*?([\d,]+)\s+(Yards|yards|m|EA|ea|KG|kg|cans?|pcs?)\b",
        re.IGNORECASE,
    )
    for match in item_pattern.finditer(text):
        code = match.group(1).upper()
        qty_str = match.group(2).replace(",", "")
        unit = match.group(3)
        unit_normalized = _normalize_unit(unit)
        name = CODE_NAMES.get(code, code)
        try:
            result.items.append(BLItem(code=code, name=name, qty=float(qty_str), unit=unit_normalized))
        except ValueError:
            pass

    return result


def _normalize_unit(u: str) -> str:
    u = u.lower()
    if u in ("yards", "yard"):
        return "야드"
    if u in ("m", "meters", "meter"):
        return "m"
    if u in ("cans", "can"):
        return "통"
    if u in ("kg",):
        return "kg"
    if u in ("ea", "pcs", "pc"):
        return "EA"
    return u


# ── GPT 결과 매핑 ─────────────────────────────────────────────────
def _build_result_from_gpt(data: dict) -> BLResult:
    items: List[BLItem] = []
    for it in data.get("items") or []:
        material = it.get("matched_material") or it.get("description") or ""
        qty_raw = it.get("matched_qty")
        if qty_raw is None:
            qty_raw = it.get("quantity")
        unit_raw = it.get("matched_unit") or it.get("unit") or ""
        try:
            qty = float(str(qty_raw).replace(",", "").strip())
        except (TypeError, ValueError):
            continue
        code = MATERIAL_CODE.get(material, "")
        items.append(BLItem(code=code, name=material, qty=qty, unit=_normalize_unit(str(unit_raw))))

    return BLResult(
        bl_number=data.get("bl_number"),
        shipper=data.get("shipper"),
        port_of_loading=data.get("port_of_loading"),
        port_of_discharge=data.get("port_of_discharge"),
        vessel=data.get("vessel"),
        eta=data.get("eta"),
        items=items,
    )


# ── 엔드포인트 ────────────────────────────────────────────────────
@app.post("/parse-bl", response_model=BLResult)
async def parse_bl(file: UploadFile = File(...)):
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="PDF 파일만 업로드 가능합니다.")

    content = await file.read()

    # 1) GPT Vision 파싱 우선 시도 (OPENAI_API_KEY 필요)
    gpt_data = parse_bl_with_gpt(content)
    if gpt_data:
        result = _build_result_from_gpt(gpt_data)
        if result.items:
            return result

    # 2) GPT 미사용/실패 시 pdfplumber 정규식 파서로 대체
    try:
        pages = []
        with pdfplumber.open(io.BytesIO(content)) as pdf:
            for page in pdf.pages:
                t = page.extract_text()
                if t:
                    pages.append(t)
        full_text = "\n".join(pages)
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"PDF 파싱 실패: {str(e)}")

    if not full_text.strip():
        raise HTTPException(status_code=422, detail="PDF에서 텍스트를 추출할 수 없습니다.")

    result = parse_bl_text(full_text)

    if not result.items:
        raise HTTPException(
            status_code=422,
            detail="BL에서 품목을 찾을 수 없습니다. 지원 형식의 파일인지 확인하세요.",
        )

    return result


@app.get("/health")
def health():
    return {"status": "ok", "service": "BL Parser", "port": 8010}
