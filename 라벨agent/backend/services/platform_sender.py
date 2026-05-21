"""
플랫폼으로 출고완료 신호 전송
platform.collected_release 테이블에 라벨코드 포함 데이터 전달
"""
import httpx
import os
from datetime import date
from services.label_validator import parse_label_code

PLATFORM_API_URL = os.getenv("PLATFORM_API_URL", "http://localhost:8000/api/release")


async def send_release_to_platform(
    label_code: str,
    release_qty: int,
    release_date: date,
) -> dict:
    parsed = parse_label_code(label_code)

    payload = {
        "label_code": label_code,
        "release_qty": release_qty,
        "release_date": release_date.isoformat(),
        "company_type": "케어라벨사",
        "parsed_info": parsed,
    }

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(PLATFORM_API_URL, json=payload)
            response.raise_for_status()
            return {"success": True, "response": response.json()}
    except httpx.ConnectError:
        return {"success": False, "error": "플랫폼 서버에 연결할 수 없습니다"}
    except httpx.HTTPStatusError as e:
        return {"success": False, "error": f"플랫폼 응답 오류: {e.response.status_code}"}
    except Exception as e:
        return {"success": False, "error": str(e)}
