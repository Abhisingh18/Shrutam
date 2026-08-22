import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.tenancy import Institution


async def get_institution_name(tenant_id: uuid.UUID, db: AsyncSession) -> str:
    """Best-effort institution display name for PDF headers — falls back to a
    generic label rather than failing a document render over missing setup data."""
    stmt = select(Institution.name).where(
        Institution.tenant_id == tenant_id, Institution.deleted_at.is_(None)
    )
    name = (await db.execute(stmt)).scalar_one_or_none()
    return name or "Sutram Institution"
