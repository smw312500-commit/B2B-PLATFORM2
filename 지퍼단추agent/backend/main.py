from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import engine, Base
from routers import stock, order, release, agent

Base.metadata.create_all(bind=engine)

app = FastAPI(title="지퍼단추사 AI Agent", version="1.0.0")

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


@app.get("/")
def root():
    return {"service": "지퍼단추사 AI Agent", "status": "running"}
