import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_tenant_db
from app.core.permissions import CurrentUser, get_current_user
from app.models.notification import Notification
from app.schemas.notifications import (
    NotificationListResponse,
    NotificationRead,
    PaginationMeta,
    UnreadCountResponse,
)

# This module is SELF-scoped, not role-permission-gated: every authenticated user
# manages only their own notifications, so routes depend on `get_current_user`
# directly rather than `require_permission(...)`. Every query below filters by
# BOTH Notification.user_id == current_user.user_id AND
# Notification.tenant_id == current_user.tenant_id — that pair is the actual
# security boundary for this module.
router = APIRouter(prefix="/notifications", tags=["notifications"])


async def create_notification(
    db: AsyncSession,
    *,
    tenant_id: uuid.UUID,
    user_id: uuid.UUID,
    title: str,
    body: str | None,
    notification_type: str,
    link_url: str | None = None,
) -> Notification:
    """
    Integration point for other modules (e.g. Communication, wiring in
    "publish an announcement creates notifications" separately) to raise an
    in-app notification for a user.

    Usage:
        from app.api.v1.notifications import create_notification
        await create_notification(
            db,
            tenant_id=current_user.tenant_id,
            user_id=recipient_user_id,
            title="New announcement",
            body=announcement.body,
            notification_type="announcement",
            link_url=f"/app/communication/{announcement.id}",
        )

    Only flushes — does not commit. The caller's own transaction (its own
    `await db.commit()`) is what persists the row, so this can be composed
    freely inside another endpoint's existing unit of work.
    """
    notification = Notification(
        tenant_id=tenant_id,
        user_id=user_id,
        title=title,
        body=body,
        notification_type=notification_type,
        link_url=link_url,
    )
    db.add(notification)
    await db.flush()
    return notification


@router.get("", response_model=NotificationListResponse)
async def list_notifications(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    unread_only: bool = Query(default=False),
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_tenant_db),
) -> NotificationListResponse:
    filters = [
        Notification.user_id == current_user.user_id,
        Notification.tenant_id == current_user.tenant_id,
        Notification.deleted_at.is_(None),
    ]
    if unread_only:
        filters.append(Notification.read_at.is_(None))

    stmt = select(Notification).where(*filters)
    count_stmt = select(func.count()).select_from(Notification).where(*filters)

    total = (await db.execute(count_stmt)).scalar_one()
    stmt = (
        stmt.order_by(Notification.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    notifications = (await db.execute(stmt)).scalars().all()

    return NotificationListResponse(
        data=[NotificationRead.model_validate(n) for n in notifications],
        meta=PaginationMeta(page=page, page_size=page_size, total=total),
    )


@router.get("/unread-count", response_model=UnreadCountResponse)
async def get_unread_count(
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_tenant_db),
) -> UnreadCountResponse:
    stmt = (
        select(func.count())
        .select_from(Notification)
        .where(
            Notification.user_id == current_user.user_id,
            Notification.tenant_id == current_user.tenant_id,
            Notification.deleted_at.is_(None),
            Notification.read_at.is_(None),
        )
    )
    count = (await db.execute(stmt)).scalar_one()
    return UnreadCountResponse(count=count)


async def _get_notification_or_404(
    notification_id: uuid.UUID, current_user: CurrentUser, db: AsyncSession
) -> Notification:
    stmt = select(Notification).where(
        Notification.id == notification_id,
        Notification.user_id == current_user.user_id,
        Notification.tenant_id == current_user.tenant_id,
        Notification.deleted_at.is_(None),
    )
    notification = (await db.execute(stmt)).scalar_one_or_none()
    if notification is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": {"code": "not_found", "message": "Notification not found"}},
        )
    return notification


@router.post("/{notification_id}/read", response_model=NotificationRead)
async def mark_notification_read(
    notification_id: uuid.UUID,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_tenant_db),
) -> NotificationRead:
    notification = await _get_notification_or_404(notification_id, current_user, db)
    if notification.read_at is None:
        notification.read_at = datetime.now(timezone.utc)
        await db.flush()
    response = NotificationRead.model_validate(notification)
    await db.commit()
    return response


@router.post("/read-all")
async def mark_all_notifications_read(
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_tenant_db),
) -> dict[str, int]:
    now = datetime.now(timezone.utc)
    stmt = (
        update(Notification)
        .where(
            Notification.user_id == current_user.user_id,
            Notification.tenant_id == current_user.tenant_id,
            Notification.deleted_at.is_(None),
            Notification.read_at.is_(None),
        )
        .values(read_at=now)
    )
    result = await db.execute(stmt)
    await db.commit()
    return {"updated": result.rowcount}
