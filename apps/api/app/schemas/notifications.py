import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict


class NotificationRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    title: str
    body: str | None
    link_url: str | None
    notification_type: str
    read_at: datetime | None
    created_at: datetime


class PaginationMeta(BaseModel):
    page: int
    page_size: int
    total: int


class NotificationListResponse(BaseModel):
    data: list[NotificationRead]
    meta: PaginationMeta


class UnreadCountResponse(BaseModel):
    count: int
