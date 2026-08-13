import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TenantScopedMixin, TimestampMixin, UUIDPrimaryKeyMixin


class Announcement(UUIDPrimaryKeyMixin, TimestampMixin, TenantScopedMixin, Base):
    """Communication module — this wave is an in-app announcements board only.
    No real email/SMS/WhatsApp gateway integration exists yet (future work);
    `audience` is a plain string (not an FK) so this stays a simple broadcast
    board rather than a full messaging/notification system."""

    __tablename__ = "announcements"

    title: Mapped[str] = mapped_column(String(255), nullable=False)
    body: Mapped[str] = mapped_column(String(4000), nullable=False)
    audience: Mapped[str] = mapped_column(String(32), nullable=False, default="all")
    created_by_user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=True
    )
    # null == still a draft; set once published (see POST /publish).
    published_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
