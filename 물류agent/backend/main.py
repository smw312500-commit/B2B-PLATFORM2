from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import engine, Base
from routers import drivers, vehicles, deliveries, ai_agent, platform

Base.metadata.create_all(bind=engine)

app = FastAPI(title="물류 Agent API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(drivers.router, prefix="/api/drivers", tags=["기사관리"])
app.include_router(vehicles.router, prefix="/api/vehicles", tags=["차량관리"])
app.include_router(deliveries.router, prefix="/api/deliveries", tags=["화물관리"])
app.include_router(ai_agent.router, prefix="/api/ai", tags=["AI 배차"])
app.include_router(platform.router, prefix="/api/platform", tags=["플랫폼 연동"])


@app.get("/")
def root():
    return {"message": "물류 Agent API 정상 동작 중"}
