from sqlalchemy import Column, Integer, String, Decimal, Date, DateTime, Text
from sqlalchemy.sql import func
from database import Base


class ZipperStock(Base):
    __tablename__ = "zipper_stock"

    id = Column(Integer, primary_key=True, autoincrement=True)
    item_name = Column(String(50), nullable=False)   # 원목단추/플라스틱단추/금속단추/지퍼
    material = Column(String(20), nullable=False)    # 원목/플라스틱/금속/조립
    stock_qty = Column(Integer, default=0)           # 현재 재고량 (개)
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())


class ZipperOrder(Base):
    __tablename__ = "zipper_order"

    id = Column(Integer, primary_key=True, autoincrement=True)
    material_name = Column(String(50), nullable=False)  # 원자재명 (원목/플라스틱원료/금속원료/지퍼테이프)
    unit = Column(String(10), nullable=False)            # kg / m
    order_qty = Column(Decimal(10, 1), nullable=False)
    supplier = Column(String(100), nullable=True)
    order_date = Column(Date, nullable=False)
    due_date = Column(Date, nullable=True)
    status = Column(String(20), default="대기중")        # 대기중/입고완료/취소
    note = Column(Text, nullable=True)


class ZipperRelease(Base):
    __tablename__ = "zipper_release"

    id = Column(Integer, primary_key=True, autoincrement=True)
    label_code = Column(String(9), nullable=True)       # 연동 라벨코드 (9자리)
    item_name = Column(String(50), nullable=False)      # 단추/지퍼 종류 코드 (예: WOOD_BR)
    material = Column(String(20), nullable=False)       # 소재
    release_qty = Column(Integer, nullable=False)       # 출고량 (개)
    due_date = Column(Date, nullable=True)              # 납기일
    status = Column(String(20), default="생산중")       # 생산중/출고완료
    release_date = Column(Date, nullable=True)          # 실제 출고일
    created_at = Column(DateTime, server_default=func.now())


class RawMaterialStock(Base):
    """원자재 재고 테이블 (원목/플라스틱원료/금속원료/지퍼테이프)"""
    __tablename__ = "raw_material_stock"

    id = Column(Integer, primary_key=True, autoincrement=True)
    material_name = Column(String(50), nullable=False)   # 원목/플라스틱원료/금속원료/지퍼테이프
    unit = Column(String(10), nullable=False)            # kg / m
    stock_qty = Column(Decimal(10, 1), default=0)
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
