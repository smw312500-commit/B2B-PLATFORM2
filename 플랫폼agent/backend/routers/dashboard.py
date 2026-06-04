from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database import get_db
from models import CollectedRelease, Dispatch, InsightLog
from schemas import DashboardSummary

router = APIRouter()


@router.get("/dashboard/summary", response_model=DashboardSummary)
def get_summary(db: Session = Depends(get_db)):
    total_releases = db.query(CollectedRelease).count()
    completed_releases = db.query(CollectedRelease).filter(CollectedRelease.status == "출고완료").count()
    pending_dispatches = db.query(Dispatch).filter(Dispatch.status == "대기").count()
    active_insights = db.query(InsightLog).count()

    return DashboardSummary(
        total_releases=total_releases,
        completed_releases=completed_releases,
        pending_dispatches=pending_dispatches,
        active_insights=active_insights,
    )
