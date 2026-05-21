"""
DB 초기 데이터 삽입 스크립트
python init_db.py 실행 시 label_stock 기본 데이터 삽입
"""
from database import SessionLocal, engine, Base
from models import LabelStock

Base.metadata.create_all(bind=engine)

def seed():
    db = SessionLocal()
    try:
        if db.query(LabelStock).count() == 0:
            db.add_all([
                LabelStock(material_name="라벨원단", unit="m",  stock_qty=1000),
                LabelStock(material_name="잉크",     unit="통", stock_qty=10),
            ])
            db.commit()
            print("초기 재고 데이터 삽입 완료")
        else:
            print("이미 재고 데이터가 존재합니다")
    finally:
        db.close()

if __name__ == "__main__":
    seed()
