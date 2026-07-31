from collections.abc import AsyncGenerator

from fastapi import Request
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

from app.core.config import get_settings

settings = get_settings()

engine = create_async_engine(settings.database_url, pool_pre_ping=True, echo=False)

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    expire_on_commit=False,
    autoflush=False,
)


class Base(DeclarativeBase):
    """Shared declarative base — see docs/03-database-design.md for naming conventions."""


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """Plain session, no tenant scoping. Only for platform-level / pre-auth endpoints."""
    async with AsyncSessionLocal() as session:
        yield session


async def get_tenant_db(request: Request) -> AsyncGenerator[AsyncSession, None]:
    """
    Tenant-scoped session: sets the Postgres session GUC `app.current_tenant_id`
    that every Row-Level Security policy checks (docs/03-database-design.md §1,
    docs/04-rbac-security.md §4). Application-layer tenant_id filtering in queries
    is still required — RLS is the non-bypassable backstop, not the only guard.
    """
    tenant_id = getattr(request.state, "tenant_id", None)
    async with AsyncSessionLocal() as session:
        if tenant_id is not None:
            # `SET LOCAL` can't take a bind parameter over the wire protocol;
            # `set_config()` is a normal SQL function and can.
            await session.execute(
                text("SELECT set_config('app.current_tenant_id', :tenant_id, true)"),
                {"tenant_id": str(tenant_id)},
            )
        yield session
