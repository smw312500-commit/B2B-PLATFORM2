from sqlalchemy import Column, Integer, String, Numeric, Date, DateTime, Text
from sqlalchemy.sql import func
from database import Base


class FabricStock(Base):
    __tablename__ = "fabric_stock"

    id = Column(Integer, primary_key=True, autoincrement=True)
    fabric_code = Column(String(1), nullable=False)   # C/P/L/W/M
    color_code = Column(String(2), nullable=False)    # BK/WH/NV/GY/BE/RD
    stock_qty = Column(Numeric(10, 1), nullable=False, default=0)
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())


class FabricOrder(Base):
    __tablename__ = "fabric_order"

    id = Column(Integer, primary_key=True, autoincrement=True)
    material_name = Column(String(50), nullable=False)   # 원사 종류
    order_qty = Column(Numeric(10, 1), nullable=False)   # 발주량 (kg)
    supplier = Column(String(100), nullable=False)
    order_date = Column(Date, nullable=False)
    due_date = Column(Date, nullable=False)
    status = Column(String(20), nullable=False, default="대기중")  # 대기중/입고완료/취소
    note = Column(Text)


class FabricRelease(Base):
    __tablename__ = "fabric_release"

    id = Column(Integer, primary_key=True, autoincrement=True)
    label_code = Column(String(9), nullable=False)      # 연동 라벨코드
    fabric_code = Column(String(1), nullable=False)     # C/P/L/W/M
    color_code = Column(String(2), nullable=False)
    release_qty = Column(Numeric(10, 1), nullable=False)  # 출고량 (야드)
    due_date = Column(Date, nullable=False)
    status = Column(String(20), nullable=False, default="생산중")  # 생산중/출고완료
    release_date = Column(Date, nullable=True)
    created_at = Column(DateTime, default=func.now())
