from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import os

load_dotenv()

from database import engine, Base
from routers import stock, order, release, agent

# DB 테이블 자동 생성
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="지퍼단추사 업무자동화 API",
    description="지퍼/단추 재고·발주·출고 및 AI Agent 판단 API",
    version="1.0.0",
)

origins = os.getenv("CORS_ORIGINS", "http://localhost:3000").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(stock.router)
app.include_router(order.router)
app.include_router(release.router)
app.include_router(agent.router)


@app.get("/")
def root():
    return {"service": "지퍼단추사 AI Agent", "status": "running"}


@app.on_event("startup")
def seed_initial_data():
    """DB 초기 데이터 삽입 (테이블이 비어 있을 때만)"""
    from database import SessionLocal
    from models import ZipperStock, RawMaterialStock

    db = SessionLocal()
    try:
        if db.query(ZipperStock).count() == 0:
            items = [
                ZipperStock(item_name="WOOD_BR",     material="원목",       stock_qty=500),
                ZipperStock(item_name="WOOD_BK",     material="원목",       stock_qty=300),
                ZipperStock(item_name="PLASTIC_BK",  material="플라스틱",   stock_qty=3000),
                ZipperStock(item_name="PLASTIC_WH",  material="플라스틱",   stock_qty=2000),
                ZipperStock(item_name="METAL_SV",    material="금속",       stock_qty=1500),
                ZipperStock(item_name="METAL_BK",    material="금속",       stock_qty=1200),
                ZipperStock(item_name="ZIPPER_S",    material="조립",       stock_qty=800),
                ZipperStock(item_name="ZIPPER_M",    material="조립",       stock_qty=600),
                ZipperStock(item_name="ZIPPER_L",    material="조립",       stock_qty=400),
            ]
            db.add_all(items)

        if db.query(RawMaterialStock).count() == 0:
            raws = [
                RawMaterialStock(material_name="원목",        unit="kg", stock_qty=80),
                RawMaterialStock(material_name="플라스틱원료", unit="kg", stock_qty=150),
                RawMaterialStock(material_name="금속원료",     unit="kg", stock_qty=100),
                RawMaterialStock(material_name="지퍼테이프",   unit="m",  stock_qty=500),
            ]
            db.add_all(raws)

        db.commit()
    finally:
        db.close()


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("BACKEND_PORT", 8002))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)
