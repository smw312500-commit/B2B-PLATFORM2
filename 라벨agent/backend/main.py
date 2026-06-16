import asyncio

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from database import engine, Base
from routers import stock, order, release, agent, machine
from services.platform_retry import run_platform_retry_loop

Base.metadata.create_all(bind=engine)


def _ensure_report_id_columns() -> None:
    """Add report_id column to existing label_platform_report_* tables (no-op if already present)."""
    with engine.connect() as conn:
        for table in ("label_platform_report_event", "label_platform_report_message"):
            exists = conn.execute(
                text(
                    "SELECT COUNT(*) FROM information_schema.columns "
                    "WHERE table_schema = DATABASE() AND table_name = :table AND column_name = 'report_id'"
                ),
                {"table": table},
            ).scalar()
            if not exists:
                conn.execute(text(f"ALTER TABLE {table} ADD COLUMN report_id VARCHAR(50) NULL"))
                conn.commit()


_ensure_report_id_columns()

app = FastAPI(title="케어라벨회사 AI Agent", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(stock.router)
app.include_router(order.router)
app.include_router(release.router)
app.include_router(agent.router)
app.include_router(machine.router)


@app.on_event("startup")
async def _start_platform_retry_loop() -> None:
    asyncio.create_task(run_platform_retry_loop())


@app.get("/")
def root():
    return {"service": "케어라벨회사 AI Agent", "status": "running"}
