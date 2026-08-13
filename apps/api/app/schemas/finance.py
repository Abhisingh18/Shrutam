import uuid
from datetime import date
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field


class PaginationMeta(BaseModel):
    page: int
    page_size: int
    total: int


class FeeStructureBase(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    amount: Decimal
    frequency: str = Field(
        default="one_time", pattern="^(one_time|monthly|quarterly|annual)$"
    )
    academic_year_id: uuid.UUID | None = None


class FeeStructureCreate(FeeStructureBase):
    pass


class FeeStructureRead(FeeStructureBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID


class FeeStructureListResponse(BaseModel):
    data: list[FeeStructureRead]
    meta: PaginationMeta


class InvoiceBase(BaseModel):
    student_id: uuid.UUID
    fee_structure_id: uuid.UUID | None = None
    amount: Decimal
    due_date: date


class InvoiceCreate(InvoiceBase):
    invoice_number: str | None = Field(default=None, max_length=32)


class InvoiceUpdate(BaseModel):
    amount: Decimal | None = None
    due_date: date | None = None
    status: str | None = Field(
        default=None, pattern="^(pending|paid|partially_paid|overdue|cancelled)$"
    )


class InvoiceRead(InvoiceBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    invoice_number: str
    status: str


class InvoiceListResponse(BaseModel):
    data: list[InvoiceRead]
    meta: PaginationMeta


class PaymentCreate(BaseModel):
    amount: Decimal
    payment_date: date
    method: str = Field(pattern="^(cash|bank_transfer|card|upi|cheque|other)$")
    reference_number: str | None = Field(default=None, max_length=64)


class PaymentRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    invoice_id: uuid.UUID
    amount: Decimal
    payment_date: date
    method: str
    reference_number: str | None = None
