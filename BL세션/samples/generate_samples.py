"""
샘플 BL PDF 5개 생성 스크립트 (reportlab 필요)
실행: python generate_samples.py
"""

import os
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm
from reportlab.lib.enums import TA_CENTER
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable,
)

OUTPUT_DIR = os.path.dirname(os.path.abspath(__file__))

DARK_BLUE = colors.HexColor("#1e3a5f")
LIGHT_BLUE = colors.HexColor("#dbeafe")


def make_bl(filename, bl_number, shipper, items, bl_date="2026-05-30", eta="2026-06-15"):
    filepath = os.path.join(OUTPUT_DIR, filename)

    doc = SimpleDocTemplate(
        filepath, pagesize=A4,
        rightMargin=20 * mm, leftMargin=20 * mm,
        topMargin=20 * mm, bottomMargin=20 * mm,
    )
    styles = getSampleStyleSheet()
    title_s = ParagraphStyle("title", parent=styles["Normal"],
                              alignment=TA_CENTER, fontSize=18,
                              fontName="Helvetica-Bold", spaceAfter=4)
    label_s = ParagraphStyle("label", parent=styles["Normal"],
                              fontSize=9, fontName="Helvetica-Bold")

    story = []

    story.append(Paragraph("BILL OF LADING", title_s))
    story.append(HRFlowable(width="100%", thickness=2, color=DARK_BLUE))
    story.append(Spacer(1, 8))

    hdr = [
        [Paragraph("BL No.:", label_s), bl_number, Paragraph("DATE:", label_s), bl_date],
        [Paragraph("SHIPPER:", label_s), shipper,
         Paragraph("CONSIGNEE:", label_s), "YeongFab Fashion Co., Ltd."],
        [Paragraph("PORT OF LOADING:", label_s), "Shanghai, China",
         Paragraph("PORT OF DISCHARGE:", label_s), "Incheon, Korea"],
        [Paragraph("VESSEL:", label_s), "COSCO HARMONY V.023E",
         Paragraph("ETA:", label_s), eta],
    ]
    hdr_t = Table(hdr, colWidths=[42*mm, 63*mm, 45*mm, 60*mm])
    hdr_t.setStyle(TableStyle([
        ("FONTNAME", (1, 0), (1, -1), "Helvetica"),
        ("FONTNAME", (3, 0), (3, -1), "Helvetica"),
        ("FONTSIZE", (0, 0), (-1, -1), 9),
        ("TOPPADDING", (0, 0), (-1, -1), 3),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
    ]))
    story.append(hdr_t)
    story.append(Spacer(1, 14))

    story.append(Paragraph("DESCRIPTION OF GOODS", ParagraphStyle(
        "gh", parent=styles["Normal"], fontName="Helvetica-Bold", fontSize=11)))
    story.append(HRFlowable(width="100%", thickness=1, color=colors.grey))
    story.append(Spacer(1, 6))

    rows = [["CODE", "DESCRIPTION", "QTY", "UNIT", "WEIGHT (KG)"]]
    total_qty = 0
    for it in items:
        w = it["qty"] * it.get("weight_per", 0.3)
        rows.append([
            f"[{it['code']}]",
            it["desc"],
            f"{it['qty']:,}",
            it["unit"],
            f"{w:,.1f}",
        ])
        total_qty += it["qty"]

    rows.append(["", "TOTAL", f"{total_qty:,}", items[0]["unit"], ""])

    items_t = Table(rows, colWidths=[32*mm, 72*mm, 25*mm, 18*mm, 33*mm])
    items_t.setStyle(TableStyle([
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTNAME", (0, 1), (-1, -1), "Helvetica"),
        ("FONTSIZE", (0, 0), (-1, -1), 9),
        ("BACKGROUND", (0, 0), (-1, 0), DARK_BLUE),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("BACKGROUND", (0, -1), (-1, -1), colors.lightgrey),
        ("FONTNAME", (0, -1), (-1, -1), "Helvetica-Bold"),
        ("ALIGN", (2, 0), (2, -1), "RIGHT"),
        ("ALIGN", (4, 0), (4, -1), "RIGHT"),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
        ("ROWBACKGROUNDS", (0, 1), (-1, -2), [colors.white, LIGHT_BLUE]),
    ]))
    story.append(items_t)
    story.append(Spacer(1, 24))

    story.append(Paragraph(
        "AS CARRIER:  ___________________________  Authorized Signature",
        ParagraphStyle("sig", parent=styles["Normal"], fontSize=9)))

    doc.build(story)
    print(f"  Generated: {filename}")


def main():
    print("Generating sample BL PDFs...")

    # 1. 옷감사 — 면/폴리에스터 원사
    make_bl(
        "bl_fabric_cotton_poly.pdf",
        bl_number="BL-2026-F001",
        shipper="Shanghai Textile Manufacturing Co., Ltd.",
        items=[
            {"code": "COTTON_YARN", "desc": "100pct Cotton Ring-Spun Yarn 32s Count", "qty": 500, "unit": "KG", "weight_per": 1.0},
            {"code": "POLY_YARN", "desc": "Polyester Filament Yarn 150D/48F", "qty": 300, "unit": "KG", "weight_per": 1.0},
        ],
    )

    # 2. 옷감사 — 린넨/울/혼방 원사
    make_bl(
        "bl_fabric_linen_wool.pdf",
        bl_number="BL-2026-F002",
        shipper="Qingdao Premium Textile Co., Ltd.",
        items=[
            {"code": "LINEN_YARN", "desc": "100pct Linen Wet-Spun Yarn 24s Count", "qty": 200, "unit": "KG", "weight_per": 1.0},
            {"code": "WOOL_YARN", "desc": "100pct Merino Wool Yarn 2/48s Count", "qty": 150, "unit": "KG", "weight_per": 1.0},
            {"code": "MIXED_YARN", "desc": "Cotton Polyester Blended Yarn 65/35 32s", "qty": 250, "unit": "KG", "weight_per": 1.0},
        ],
    )

    # 3. 라벨사 — 라벨원단 + 잉크
    make_bl(
        "bl_label_materials.pdf",
        bl_number="BL-2026-L001",
        shipper="Guangzhou Label Supply Co., Ltd.",
        items=[
            {"code": "LABEL_FABRIC", "desc": "Woven Label Fabric Polyester Satin 25mm Width", "qty": 50000, "unit": "m", "weight_per": 0.005},
            {"code": "PRINT_INK", "desc": "Heat Transfer Printing Ink Black 5L per Can", "qty": 80, "unit": "cans", "weight_per": 5.5},
        ],
    )

    # 4. 지퍼단추사 — 지퍼테이프 + 금속원료
    make_bl(
        "bl_zipper_metal.pdf",
        bl_number="BL-2026-Z001",
        shipper="YKK Shanghai Trading Co., Ltd.",
        items=[
            {"code": "ZIPPER_TAPE", "desc": "Nylon Zipper Tape 25mm Width Assorted Colors", "qty": 2000, "unit": "m", "weight_per": 0.05},
            {"code": "RAW_METAL", "desc": "Iron Zinc Alloy Ingot for Button Stamping", "qty": 500, "unit": "kg", "weight_per": 1.0},
        ],
    )

    # 5. 지퍼단추사 — 원목 + 플라스틱원료
    make_bl(
        "bl_button_materials.pdf",
        bl_number="BL-2026-B001",
        shipper="Wenzhou Button Manufacturing Co., Ltd.",
        items=[
            {"code": "RAW_WOOD", "desc": "Natural Hardwood Block Beech for Button Cutting", "qty": 300, "unit": "kg", "weight_per": 1.0},
            {"code": "RAW_PLASTIC", "desc": "ABS Plastic Resin Pellets for Button Molding", "qty": 400, "unit": "kg", "weight_per": 1.0},
        ],
    )

    print("Done! 5 BL PDFs created.")


if __name__ == "__main__":
    main()
