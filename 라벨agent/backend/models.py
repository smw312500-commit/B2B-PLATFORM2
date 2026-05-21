from sqlalchemy import Column, Integer, String, Date, DateTime, Text, DECIMAL
from sqlalchemy.sql import func
from database import Base


class LabelStock(Base):
    __tablename__ = "label_stock"

    id = Column(Integer, primary_key=True, autoincrement=True)
    material_name = Column(String(50), nullable=False)  # 라벨원단 / 잉크
    unit = Column(String(10), nullable=False)            # m / 통
    stock_qty = Column(DECIMAL(10, 1), nullable=False, default=0)
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())


class LabelOrder(Base):
    __tablename__ = "label_order"

    id = Column(Integer, primary_key=True, autoincrement=True)
    material_name = Column(String(50), nullable=False)
    order_qty = Column(DECIMAL(10, 1), nullable=False)
    supplier = Column(String(100), nullable=True)
    order_date = Column(Date, nullable=False)
    due_date = Column(Date, nullable=False)
    status = Column(String(20), nullable=False, default="대기중")  # 대기중/입고완료/취소
    note = Column(Text, nullable=True)


class LabelRelease(Base):
    __tablename__ = "label_release"

    id = Column(Integer, primary_key=True, autoincrement=True)
    label_code = Column(String(9), nullable=False)   # 라벨코드 9자리 (핵심 키)
    release_qty = Column(Integer, nullable=False)
    due_date = Column(Date, nullable=False)
    status = Column(String(20), nullable=False, default="생산중")  # 생산중/출고완료
    release_date = Column(Date, nullable=True)
    created_at = Column(DateTime, server_default=func.now())
