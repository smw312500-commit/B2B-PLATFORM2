from sqlalchemy import Column, Integer, String, Text, DateTime, Date, DECIMAL, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from database import Base


class CompanyInfo(Base):
    __tablename__ = "company_info"

    id = Column(Integer, primary_key=True, autoincrement=True)
    company_name = Column(String(100), nullable=False)
    company_type = Column(String(20))
    address_si = Column(String(20))
    address_gu = Column(String(20))

    releases = relationship("CollectedRelease", back_populates="company")
    dispatches = relationship("Dispatch", back_populates="company")


class CollectedRelease(Base):
    __tablename__ = "collected_release"

    id = Column(Integer, primary_key=True, autoincrement=True)
    company_id = Column(Integer, ForeignKey("company_info.id"), nullable=False)
    item_name = Column(String(100))
    quantity = Column(DECIMAL(10, 1))
    unit = Column(String(10))
    due_date = Column(Date)
    status = Column(String(20), default="출고완료")
    label_code = Column(String(9), nullable=True)
    collected_at = Column(DateTime, default=datetime.now)

    company = relationship("CompanyInfo", back_populates="releases")


class Dispatch(Base):
    __tablename__ = "dispatch"

    id = Column(Integer, primary_key=True, autoincrement=True)
    label_code = Column(String(9), nullable=True)
    company_id = Column(Integer, ForeignKey("company_info.id"), nullable=False)
    destination = Column(String(20), default="인천항")
    weight_kg = Column(DECIMAL(8, 1), nullable=True)
    due_date = Column(Date, nullable=True)
    pickup_date = Column(Date, nullable=True)
    status = Column(String(20), default="대기")
    created_at = Column(DateTime, default=datetime.now)

    company = relationship("CompanyInfo", back_populates="dispatches")


class InsightLog(Base):
    __tablename__ = "insight_log"

    id = Column(Integer, primary_key=True, autoincrement=True)
    insight_type = Column(String(50))
    content = Column(Text)
    related_code = Column(String(9), nullable=True)
    created_at = Column(DateTime, default=datetime.now)


class AgentReport(Base):
    __tablename__ = "agent_report"

    id = Column(Integer, primary_key=True, autoincrement=True)
    company_id = Column(Integer, ForeignKey("company_info.id"), nullable=False)
    company_name = Column(String(100))
    report_type = Column(String(20))          # schedule / reschedule / import
    item = Column(String(100), nullable=True)
    qty = Column(Integer, nullable=True)
    start_at = Column(String(30), nullable=True)
    estimated_completion = Column(String(30), nullable=True)
    status = Column(String(20), nullable=True)
    reason = Column(String(200), nullable=True)
    material = Column(String(50), nullable=True)
    arrival_date = Column(String(20), nullable=True)
    bl_number = Column(String(100), nullable=True)
    created_at = Column(DateTime, default=datetime.now)


class ReportMessage(Base):
    __tablename__ = "report_message"

    id = Column(Integer, primary_key=True, autoincrement=True)
    channel = Column(String(20), nullable=False)
    direction = Column(String(20), nullable=False)
    source_agent = Column(String(50), nullable=False)
    target_agent = Column(String(50), nullable=False)
    event_type = Column(String(50), nullable=False)
    related_code = Column(String(100), nullable=True)
    title = Column(String(100), nullable=False)
    summary = Column(Text, nullable=False)
    payload_json = Column(Text, nullable=True)
    status = Column(String(20), nullable=True)
    created_at = Column(DateTime, default=datetime.now)
