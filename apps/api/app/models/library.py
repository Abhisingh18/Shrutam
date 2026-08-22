import enum
import uuid
from datetime import date

from sqlalchemy import Boolean, Date, Enum, ForeignKey, Integer, Numeric, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TenantScopedMixin, TimestampMixin, UUIDPrimaryKeyMixin


class Book(UUIDPrimaryKeyMixin, TimestampMixin, TenantScopedMixin, Base):
    __tablename__ = "books"
    __table_args__ = (
        UniqueConstraint("tenant_id", "isbn", name="uq_books_tenant_isbn"),
    )

    title: Mapped[str] = mapped_column(String(255), nullable=False)
    author: Mapped[str] = mapped_column(String(255), nullable=False)
    isbn: Mapped[str | None] = mapped_column(String(32), nullable=True)
    total_copies: Mapped[int] = mapped_column(Integer, nullable=False)
    available_copies: Mapped[int] = mapped_column(Integer, nullable=False)
    category: Mapped[str | None] = mapped_column(String(128), nullable=True)
    fine_per_day: Mapped[Numeric] = mapped_column(Numeric(8, 2), default=5, nullable=False)


class BookIssueStatus(str, enum.Enum):
    issued = "issued"
    returned = "returned"
    overdue = "overdue"


class BookIssue(UUIDPrimaryKeyMixin, TimestampMixin, TenantScopedMixin, Base):
    __tablename__ = "book_issues"

    book_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("books.id"), nullable=False, index=True
    )
    student_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("students.id"), nullable=False, index=True
    )
    issued_date: Mapped[date] = mapped_column(Date, nullable=False)
    due_date: Mapped[date] = mapped_column(Date, nullable=False)
    returned_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    status: Mapped[BookIssueStatus] = mapped_column(
        Enum(BookIssueStatus, name="book_issue_status"),
        default=BookIssueStatus.issued,
        nullable=False,
    )
    # Computed at return time as days-overdue * Book.fine_per_day — null while
    # still issued or if returned on/before the due date.
    fine_amount: Mapped[Numeric | None] = mapped_column(Numeric(8, 2), nullable=True)
    fine_paid: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
