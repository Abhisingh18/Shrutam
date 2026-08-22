import enum
import uuid
from datetime import date

from sqlalchemy import Date, Enum, ForeignKey, Numeric, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TenantScopedMixin, TimestampMixin, UUIDPrimaryKeyMixin


class FeeFrequency(str, enum.Enum):
    one_time = "one_time"
    monthly = "monthly"
    quarterly = "quarterly"
    annual = "annual"


class FeeStructure(UUIDPrimaryKeyMixin, TimestampMixin, TenantScopedMixin, Base):
    """Fees & Finance module — this wave covers fee structure definitions, invoice
    CRUD, and manual/offline payment recording only. No payment-gateway integration —
    see docs/06-ux-flows.md §4.3 (Fee Payment Flow); the gateway checkout/webhook leg
    is future work. See docs/03-database-design.md §5.5 for the full future model
    (fee_structure_items, invoice_items, receipts, ledger_entries)."""

    __tablename__ = "fee_structures"

    name: Mapped[str] = mapped_column(String(255), nullable=False)
    amount: Mapped[Numeric] = mapped_column(Numeric(12, 2), nullable=False)
    frequency: Mapped[FeeFrequency] = mapped_column(
        Enum(FeeFrequency, name="fee_frequency"), default=FeeFrequency.one_time, nullable=False
    )
    academic_year_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("academic_years.id"), nullable=True
    )
    # Flat per-day penalty applied (on the fly, never persisted onto the invoice
    # itself) to invoices raised off this structure once they go past due_date.
    late_fee_per_day: Mapped[Numeric] = mapped_column(Numeric(8, 2), default=0, nullable=False)


class InvoiceStatus(str, enum.Enum):
    pending = "pending"
    paid = "paid"
    partially_paid = "partially_paid"
    overdue = "overdue"
    cancelled = "cancelled"


class Invoice(UUIDPrimaryKeyMixin, TimestampMixin, TenantScopedMixin, Base):
    __tablename__ = "invoices"
    __table_args__ = (
        UniqueConstraint("tenant_id", "invoice_number", name="uq_invoices_tenant_number"),
    )

    student_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("students.id"), nullable=False
    )
    fee_structure_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("fee_structures.id"), nullable=True
    )
    amount: Mapped[Numeric] = mapped_column(Numeric(12, 2), nullable=False)
    due_date: Mapped[date] = mapped_column(Date, nullable=False)
    status: Mapped[InvoiceStatus] = mapped_column(
        Enum(InvoiceStatus, name="invoice_status"), default=InvoiceStatus.pending, nullable=False
    )
    invoice_number: Mapped[str] = mapped_column(String(32), nullable=False)


class PaymentMethod(str, enum.Enum):
    cash = "cash"
    bank_transfer = "bank_transfer"
    card = "card"
    upi = "upi"
    cheque = "cheque"
    other = "other"


class Payment(UUIDPrimaryKeyMixin, TimestampMixin, TenantScopedMixin, Base):
    __tablename__ = "payments"

    invoice_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("invoices.id"), nullable=False
    )
    amount: Mapped[Numeric] = mapped_column(Numeric(12, 2), nullable=False)
    payment_date: Mapped[date] = mapped_column(Date, nullable=False)
    method: Mapped[PaymentMethod] = mapped_column(
        Enum(PaymentMethod, name="payment_method"), nullable=False
    )
    reference_number: Mapped[str | None] = mapped_column(String(64), nullable=True)
