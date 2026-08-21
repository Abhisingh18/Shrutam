import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TenantScopedMixin, TimestampMixin, UUIDPrimaryKeyMixin


class Notification(UUIDPrimaryKeyMixin, TimestampMixin, TenantScopedMixin, Base):
    __tablename__ = "notifications"

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True
    )

    title: Mapped[str] = mapped_column(String(255), nullable=False)
    body: Mapped[str | None] = mapped_column(String(4000), nullable=True)
    # Where clicking the notification should navigate, e.g. /app/communication/{id}.
    link_url: Mapped[str | None] = mapped_column(String(2048), nullable=True)
    # Plain string (not a strict enum) so new trigger sources — e.g. "announcement",
    # "leave_request", "system" — can invent their own type strings later without a
    # migration.
    notification_type: Mapped[str] = mapped_column(String(64), nullable=False)
    read_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
