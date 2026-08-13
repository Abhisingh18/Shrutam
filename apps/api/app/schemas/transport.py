import uuid
from datetime import date

from pydantic import BaseModel, ConfigDict, Field


class PaginationMeta(BaseModel):
    page: int
    page_size: int
    total: int


# --- Vehicle (full CRUD) ---


class VehicleBase(BaseModel):
    registration_number: str = Field(min_length=1, max_length=32)
    vehicle_type: str = Field(min_length=1, max_length=32)
    capacity: int = Field(ge=1)
    driver_name: str | None = None
    driver_phone: str | None = None


class VehicleCreate(VehicleBase):
    pass


class VehicleUpdate(BaseModel):
    registration_number: str | None = Field(default=None, min_length=1, max_length=32)
    vehicle_type: str | None = Field(default=None, min_length=1, max_length=32)
    capacity: int | None = Field(default=None, ge=1)
    driver_name: str | None = None
    driver_phone: str | None = None


class VehicleRead(VehicleBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID


class VehicleListResponse(BaseModel):
    data: list[VehicleRead]
    meta: PaginationMeta


# --- Route (full CRUD) ---


class RouteBase(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    vehicle_id: uuid.UUID | None = None
    stops: str | None = None


class RouteCreate(RouteBase):
    pass


class RouteUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=255)
    vehicle_id: uuid.UUID | None = None
    stops: str | None = None


class RouteRead(RouteBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID


class RouteListResponse(BaseModel):
    data: list[RouteRead]
    meta: PaginationMeta


# --- Transport passes ---


class TransportPassCreate(BaseModel):
    student_id: uuid.UUID
    route_id: uuid.UUID
    valid_from: date
    valid_until: date | None = None


class TransportPassRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    student_id: uuid.UUID
    route_id: uuid.UUID
    valid_from: date
    valid_until: date | None = None
    status: str


class TransportPassListResponse(BaseModel):
    data: list[TransportPassRead]
    meta: PaginationMeta
