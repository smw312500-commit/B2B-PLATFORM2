"""
Windows 환경에서 한글 출력 깨짐 방지용 인코딩 설정
uvicorn 실행 전 import 하거나, 별도로 실행하면 됨
"""
import sys
import io

if sys.stdout.encoding != "utf-8":
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")
if sys.stderr.encoding != "utf-8":
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8")
