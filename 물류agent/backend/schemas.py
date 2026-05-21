from pydantic import BaseModel
from typing import Optional
from datetime import date, datetime


# Driver schemas
class DriverCreate(BaseModel):
    name: str
    phone: Optional[str] = None
    location_si: Optional[str] = None
    location_gu: Optional[str] = None
    status: str = "가용"


class DriverUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    location_si: Optional[str] = None
    location_gu: Optional[str] = None
    status: Optional[str] = None


class DriverOut(BaseModel):
    id: int
    name: str
    phone: Optional[str]
    location_si: Optional[str]
    location_gu: Optional[str]
    status: str

    class Config:
        from_attributes = True


# Vehicle schemas
class VehicleCreate(BaseModel):
    driver_id: int
    plate_no: str
    max_weight: Optional[float] = None
    vehicle_type: Optional[str] = None


class VehicleUpdate(BaseModel):
    driver_id: Optional[int] = None
    plate_no: Optional[str] = None
    max_weight: Optional[float] = None
    vehicle_type: Optional[str] = None


class VehicleOut(BaseModel):
    id: int
    driver_id: Optional[int]
    plate_no: str
    max_weight: Optional[float]
    vehicle_type: Optional[str]
    driver_name: Optional[str] = None

    class Config:
        from_attributes = True


# Delivery schemas
class DeliveryCreate(BaseModel):
    company_id: Optional[int] = None
    company_name: Optional[str] = None
    origin_si: Optional[str] = None
    origin_gu: Optional[str] = None
    destination: str
    cargo_detail: Optional[str] = None
    weight_kg: Optional[float] = None
    due_date: date
    driver_id: Optional[int] = None
    vehicle_id: Optional[int] = None


class DeliveryOut(BaseModel):
    id: int
    driver_id: Optional[int]
    vehicle_id: Optional[int]
    company_id: Optional[int]
    company_name: Optional[str]
    origin_si: Optional[str]
    origin_gu: Optional[str]
    destination: Optional[str]
    cargo_detail: Optional[str]
    weight_kg: Optional[float]
    due_date: Optional[date]
    pickup_date: Optional[date]
    complete_date: Optional[date]
    status: str
    empty_return: Optional[str]
    created_at: Optional[datetime]
    driver_name: Optional[str] = None
    vehicle_plate: Optional[str] = None

    class Config:
        from_attributes = True


# Platform signal (inbound from platform)
class PlatformSignal(BaseModel):
    company_id: int
    company_name: str
    origin_si: str
    origin_gu: str
    destination: str
    cargo_detail: str
    weight_kg: float
    due_date: date
    label_code: Optional[str] = None


# AI dispatch response
class AIDispatchResult(BaseModel):
    delivery_id: int
    driver_id: Optional[int]
    driver_name: Optional[str]
    pickup_date: Optional[date]
    round_trip: Optional[str]
    message: str
