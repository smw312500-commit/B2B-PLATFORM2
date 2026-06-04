from database import engine, SessionLocal, Base
import models  # noqa: F401 — ensures models are registered

INITIAL_COMPANIES = [
    {"id": 1, "company_name": "옷감사",     "company_type": "생산사", "address_si": "부산시", "address_gu": "사하구"},
    {"id": 2, "company_name": "케어라벨사", "company_type": "생산사", "address_si": "부산시", "address_gu": "강서구"},
    {"id": 3, "company_name": "지퍼단추사", "company_type": "생산사", "address_si": "부산시", "address_gu": "해운대구"},
    {"id": 4, "company_name": "물류사",     "company_type": "물류사", "address_si": "서울시", "address_gu": "강남구"},
]


def init():
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        for data in INITIAL_COMPANIES:
            exists = db.query(models.CompanyInfo).filter(models.CompanyInfo.id == data["id"]).first()
            if not exists:
                db.add(models.CompanyInfo(**data))
        db.commit()
        print("DB 초기화 완료")
    finally:
        db.close()


if __name__ == "__main__":
    init()
