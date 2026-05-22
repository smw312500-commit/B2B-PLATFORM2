import httpx
import os
from datetime import date

PLATFORM_API_URL = os.getenv("PLATFORM_API_URL", "http://localhost:8000/api/release")
COMPANY_ID = 3  # 지퍼단추사


async def send_release_to_platform(
    item_name: str,
    release_qty: int,
    release_date: date,
    label_code: str | None = None,
    trend_signal: str | None = None,
):
    payload = {
        "company_id":    COMPANY_ID,
        "item_name":     item_name,
        "quantity":      release_qty,
        "unit":          "개",
        "release_date":  str(release_date),
        "label_code":    label_code,
        "trend_signal":  trend_signal,
        "status":        "출고완료",
    }
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            await client.post(PLATFORM_API_URL, json=payload)
    except Exception:
        pass
