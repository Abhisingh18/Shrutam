import re
import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_db
from app.core.security import hash_password
from app.models.auth import Role, User, UserRole
from app.models.tenancy import Institution, Tenant
from app.schemas.auth import TenantResolveResponse, TenantSignupRequest, TenantSignupResponse

router = APIRouter(prefix="/tenants", tags=["tenants"])


@router.get("/resolve", response_model=TenantResolveResponse)
async def resolve_tenant(slug: str, db: AsyncSession = Depends(get_db)) -> TenantResolveResponse:
    """
    Lets the login screen accept a human-friendly institution slug and turn it
    into the `X-Tenant-ID` every other call needs — docs/07-api-design.md §2
    (subdomain is the production equivalent; this scaffold logs in without
    real subdomain routing yet).
    """
    tenant = (await db.execute(select(Tenant).where(Tenant.slug == slug))).scalar_one_or_none()
    if tenant is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": {"code": "not_found", "message": "No institution with that slug"}},
        )
    return TenantResolveResponse(tenant_id=tenant.id, tenant_slug=tenant.slug, name=tenant.name)


def _slugify(name: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")
    return slug or uuid.uuid4().hex[:8]


@router.post("/signup", response_model=TenantSignupResponse, status_code=status.HTTP_201_CREATED)
async def signup_tenant(
    body: TenantSignupRequest, db: AsyncSession = Depends(get_db)
) -> TenantSignupResponse:
    """
    docs/06-ux-flows.md Onboarding flow, step 1: Signup -> Institution Name -> Plan ->
    Create Tenant -> Create Super Admin (here: institution_admin, the tenant-level owner).
    Payment step is intentionally out of scope for this initial scaffold.
    """
    base_slug = _slugify(body.institution_name)
    slug = base_slug
    suffix = 1
    while (await db.execute(select(Tenant).where(Tenant.slug == slug))).scalar_one_or_none():
        suffix += 1
        slug = f"{base_slug}-{suffix}"

    tenant = Tenant(slug=slug, name=body.institution_name, plan_tier=body.plan_tier)
    db.add(tenant)
    await db.flush()  # tenant.id now populated

    # RLS policies key off this session var — set it now that the tenant exists,
    # so the institution/user/user_role inserts below satisfy the same policy a
    # normal tenant-scoped request would. See docs/03-database-design.md §1.
    await db.execute(
        text("SELECT set_config('app.current_tenant_id', :tenant_id, true)"),
        {"tenant_id": str(tenant.id)},
    )

    institution = Institution(
        tenant_id=tenant.id,
        name=body.institution_name,
        institution_type=body.institution_type,
    )
    db.add(institution)

    role = (
        await db.execute(select(Role).where(Role.slug == "institution_admin"))
    ).scalar_one_or_none()
    if role is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"error": {"code": "role_catalog_missing", "message": "Run role seed script"}},
        )

    admin_user = User(
        tenant_id=tenant.id,
        email=body.admin_email,
        hashed_password=hash_password(body.admin_password),
        full_name=body.admin_full_name,
        is_active=True,
    )
    db.add(admin_user)
    await db.flush()

    db.add(UserRole(tenant_id=tenant.id, user_id=admin_user.id, role_id=role.id))

    await db.commit()

    return TenantSignupResponse(
        tenant_id=tenant.id,
        tenant_slug=tenant.slug,
        institution_id=institution.id,
        admin_user_id=admin_user.id,
    )
