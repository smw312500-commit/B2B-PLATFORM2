"""
플랫폼Agent 런처 — CMD 창 없이 실행
더블클릭 또는 PlatformAgent.exe 로 실행.

구조:
  backend/  — FastAPI uvicorn (127.0.0.1:8000)
             launcher_main:app = main.app + frontend/dist/ StaticFiles 마운트
  logs/     — 런타임 로그 저장

frontend/dist/ 가 있으면 http://localhost:8000 에서 API + 정적 파일 통합 서빙.
DEMO_MODE=1 인 경우 backend/.env 기준으로 4년치 공급망 데이터가 자동 seed됨.
"""
import datetime
import os
import subprocess
import sys
import time
import urllib.request
import webbrowser
from pathlib import Path

CREATE_NO_WINDOW = 0x08000000  # Windows: CMD 창 숨김

if getattr(sys, "frozen", False):
    BASE = Path(sys.executable).parent
else:
    BASE = Path(__file__).resolve().parent

BACKEND_DIR = BASE / "backend"
LOGS_DIR = BASE / "logs"
LOGS_DIR.mkdir(exist_ok=True)


def _ts() -> str:
    return datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")


def _log(msg: str) -> None:
    line = f"[{_ts()}] {msg}\n"
    try:
        with open(LOGS_DIR / "launcher.log", "a", encoding="utf-8") as f:
            f.write(line)
    except Exception:
        pass


def _find_python() -> str:
    for cmd in ["py", "python", "python3"]:
        try:
            r = subprocess.run([cmd, "--version"], capture_output=True, timeout=3)
            if r.returncode == 0:
                return cmd
        except Exception:
            pass
    return "python"


def _start_backend(py: str) -> tuple[subprocess.Popen, object]:
    """launcher_main:app 으로 uvicorn 실행 (StaticFiles 포함)."""
    log_file = open(LOGS_DIR / "backend.log", "a", encoding="utf-8", buffering=1)
    proc = subprocess.Popen(
        [py, "-m", "uvicorn", "launcher_main:app",
         "--host", "127.0.0.1",
         "--port", "8000"],
        cwd=str(BACKEND_DIR),
        stdout=log_file,
        stderr=log_file,
        creationflags=CREATE_NO_WINDOW,
    )
    return proc, log_file


def _wait_backend(timeout: int = 35) -> bool:
    for _ in range(timeout):
        try:
            urllib.request.urlopen("http://127.0.0.1:8000/", timeout=1)
            return True
        except Exception:
            time.sleep(1)
    return False


def main() -> None:
    _log("=" * 50)
    _log("플랫폼Agent 런처 시작")
    _log(f"BASE={BASE}")

    py = _find_python()
    _log(f"Python: {py}")

    dist = BACKEND_DIR.parent / "frontend" / "dist"
    if dist.exists():
        _log(f"frontend/dist 확인 — 포트 8000 통합 서빙")
    else:
        _log("경고: frontend/dist 없음 — API 전용 모드 (프론트 미포함)")

    # ── 백엔드 + 정적 파일 서버 시작 ────────────────────────
    back_proc, back_log = _start_backend(py)
    _log(f"백엔드 PID={back_proc.pid} (포트 8000)")

    # ── 백엔드 준비 대기 후 브라우저 열기 ────────────────────
    _log("백엔드 준비 대기 중...")
    ready = _wait_backend(35)
    if ready:
        _log("백엔드 준비 완료")
    else:
        _log("경고: 준비 대기 시간 초과 — 브라우저 열기 강행")

    webbrowser.open("http://localhost:8000")
    _log("브라우저 열기 완료 → http://localhost:8000")

    # ── 백엔드 종료 시까지 대기 ──────────────────────────────
    try:
        back_proc.wait()
    except KeyboardInterrupt:
        _log("KeyboardInterrupt — 종료 처리")
    finally:
        _log("프로세스 종료 중...")
        try:
            back_proc.terminate()
        except Exception:
            pass
        try:
            back_log.close()
        except Exception:
            pass
        _log("플랫폼Agent 런처 종료")


if __name__ == "__main__":
    main()
