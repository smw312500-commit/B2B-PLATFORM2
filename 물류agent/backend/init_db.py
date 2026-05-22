"""
DB 초기화 스크립트
python init_db.py 실행 시 테이블 생성
"""
from database import engine, Base
import models  # noqa: F401 - 모델 등록용

Base.metadata.create_all(bind=engine)
print("company_logistics 테이블 생성 완료 (driver / vehicle / delivery)")
