from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
import os
from database import get_db
from models import InsightLog
from schemas import InsightOut
from services.ai_insight import generate_insights

router = APIRouter()


@router.get("/insights", response_model=List[InsightOut])
def list_insights(db: Session = Depends(get_db)):
    records = db.query(InsightLog).order_by(InsightLog.created_at.desc()).all()
    return records


@router.post("/insights/analyze", response_model=List[InsightOut])
async def analyze_insights(db: Session = Depends(get_db)):
    api_key = os.getenv("OPENAI_API_KEY", "")
    if not api_key or api_key == "your_openai_key":
        raise HTTPException(status_code=400, detail="OPENAI_API_KEY가 설정되지 않았습니다")

    results = await generate_insights(db)

    saved = []
    for item in results:
        log = InsightLog(
            insight_type=item.get("type"),
            content=item.get("content"),
            related_code=item.get("related_code"),
        )
        db.add(log)
        db.flush()
        saved.append(log)
    db.commit()
    for s in saved:
        db.refresh(s)

    return saved
