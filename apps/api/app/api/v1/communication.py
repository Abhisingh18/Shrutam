import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_tenant_db
from app.core.permissions import CurrentUser, require_permission
from app.models.communication import Announcement
from app.schemas.communication import (
    AnnouncementCreate,
    AnnouncementListResponse,
    AnnouncementRead,
    PaginationMeta,
)

router = APIRouter(prefix="/communication", tags=["communication"])


@router.get("/announcements", response_model=AnnouncementListResponse)
async def list_announcements(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    audience: str | None = Query(default=None, max_length=32),
    published_only: bool = Query(default=False),
    current_user: CurrentUser = Depends(require_permission("communication:message:read")),
    db: AsyncSession = Depends(get_tenant_db),
) -> AnnouncementListResponse:
    stmt = select(Announcement).where(
        Announcement.tenant_id == current_user.tenant_id, Announcement.deleted_at.is_(None)
    )
    count_stmt = select(func.count()).select_from(Announcement).where(
        Announcement.tenant_id == current_user.tenant_id, Announcement.deleted_at.is_(None)
    )
    if audience:
        stmt = stmt.where(Announcement.audience == audience)
        count_stmt = count_stmt.where(Announcement.audience == audience)
    if published_only:
        stmt = stmt.where(Announcement.published_at.is_not(None))
        count_stmt = count_stmt.where(Announcement.published_at.is_not(None))

    total = (await db.execute(count_stmt)).scalar_one()
    stmt = (
        stmt.order_by(Announcement.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    announcements = (await db.execute(stmt)).scalars().all()

    return AnnouncementListResponse(
        data=[AnnouncementRead.model_validate(a) for a in announcements],
        meta=PaginationMeta(page=page, page_size=page_size, total=total),
    )


@router.post("/announcements", response_model=AnnouncementRead, status_code=status.HTTP_201_CREATED)
async def create_announcement(
    body: AnnouncementCreate,
    current_user: CurrentUser = Depends(require_permission("communication:message:write")),
    db: AsyncSession = Depends(get_tenant_db),
) -> AnnouncementRead:
    # published_at stays null — every announcement is created as a draft and
    # must be explicitly published via POST /announcements/{id}/publish.
    announcement = Announcement(
        tenant_id=current_user.tenant_id,
        created_by_user_id=current_user.user_id,
        **body.model_dump(),
    )
    db.add(announcement)
    # Flush (not commit) so RETURNING populates server defaults while the RLS
    # session GUC set by get_tenant_db is still in scope for *this* transaction —
    # `SET LOCAL`/`set_config(..., true)` resets on commit, so a refresh() after
    # commit() would run in a fresh, tenant-less transaction and be filtered out.
    await db.flush()
    response = AnnouncementRead.model_validate(announcement)
    await db.commit()
    return response


async def _get_announcement_or_404(
    announcement_id: uuid.UUID, tenant_id: uuid.UUID, db: AsyncSession
) -> Announcement:
    stmt = select(Announcement).where(
        Announcement.id == announcement_id,
        Announcement.tenant_id == tenant_id,
        Announcement.deleted_at.is_(None),
    )
    announcement = (await db.execute(stmt)).scalar_one_or_none()
    if announcement is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": {"code": "not_found", "message": "Announcement not found"}},
        )
    return announcement


@router.get("/announcements/{announcement_id}", response_model=AnnouncementRead)
async def get_announcement(
    announcement_id: uuid.UUID,
    current_user: CurrentUser = Depends(require_permission("communication:message:read")),
    db: AsyncSession = Depends(get_tenant_db),
) -> AnnouncementRead:
    announcement = await _get_announcement_or_404(announcement_id, current_user.tenant_id, db)
    return AnnouncementRead.model_validate(announcement)


@router.delete("/announcements/{announcement_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_announcement(
    announcement_id: uuid.UUID,
    current_user: CurrentUser = Depends(require_permission("communication:message:delete")),
    db: AsyncSession = Depends(get_tenant_db),
) -> None:
    announcement = await _get_announcement_or_404(announcement_id, current_user.tenant_id, db)
    announcement.deleted_at = datetime.now(timezone.utc)
    await db.commit()


@router.post("/announcements/{announcement_id}/publish", response_model=AnnouncementRead)
async def publish_announcement(
    announcement_id: uuid.UUID,
    current_user: CurrentUser = Depends(require_permission("communication:message:write")),
    db: AsyncSession = Depends(get_tenant_db),
) -> AnnouncementRead:
    announcement = await _get_announcement_or_404(announcement_id, current_user.tenant_id, db)
    announcement.published_at = datetime.now(timezone.utc)
    await db.flush()
    response = AnnouncementRead.model_validate(announcement)
    await db.commit()
    return response
