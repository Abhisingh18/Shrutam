import uuid
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.db import get_tenant_db
from app.core.permissions import CurrentUser, get_current_user
from app.core.security import (
    JWTError,
    create_access_token,
    create_refresh_token,
    decode_token,
    generate_reset_token,
    hash_password,
    hash_reset_token,
    verify_password,
)
from app.models.auth import Permission, Role, RolePermission, User, UserRole, UserSession
from app.models.tenancy import Institution
from app.schemas.auth import (
    ForgotPasswordRequest,
    ForgotPasswordResponse,
    LoginRequest,
    MeResponse,
    RefreshRequest,
    ResetPasswordRequest,
    TokenPairResponse,
)

router = APIRouter(prefix="/auth", tags=["auth"])
settings = get_settings()


def _invalid_credentials() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail={"error": {"code": "invalid_credentials", "message": "Incorrect email or password"}},
    )


def _account_locked(locked_until: datetime) -> HTTPException:
    minutes_left = max(1, int((locked_until - datetime.now(timezone.utc)).total_seconds() // 60) + 1)
    return HTTPException(
        status_code=status.HTTP_423_LOCKED,
        detail={
            "error": {
                "code": "account_locked",
                "message": f"Too many failed attempts. Try again in {minutes_left} minute(s).",
                "details": {"locked_until": locked_until.isoformat()},
            }
        },
    )


@router.post("/login", response_model=TokenPairResponse)
async def login(
    body: LoginRequest, request: Request, db: AsyncSession = Depends(get_tenant_db)
) -> TokenPairResponse:
    tenant_id = request.state.tenant_id
    if tenant_id is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error": {"code": "tenant_not_resolved", "message": "X-Tenant-ID required"}},
        )

    stmt = select(User).where(User.tenant_id == tenant_id, User.email == body.email)
    user = (await db.execute(stmt)).scalar_one_or_none()

    now = datetime.now(timezone.utc)
    if user is not None and user.locked_until is not None and user.locked_until > now:
        raise _account_locked(user.locked_until)

    if user is None or not verify_password(body.password, user.hashed_password):
        # Lock the account after too many *consecutive* failures — docs/04-rbac-security.md §5.
        # Only tracked when the account exists; a wrong email for a nonexistent
        # account can't lock anything, avoiding a user-enumeration-via-lockout side channel.
        if user is not None:
            user.failed_login_attempts += 1
            if user.failed_login_attempts >= settings.max_failed_login_attempts:
                user.locked_until = now + timedelta(minutes=settings.account_lockout_minutes)
            await db.commit()
        raise _invalid_credentials()
    if not user.is_active:
        raise _invalid_credentials()

    if user.failed_login_attempts or user.locked_until:
        user.failed_login_attempts = 0
        user.locked_until = None
        await db.commit()

    role_stmt = select(Role.slug).join(UserRole, UserRole.role_id == Role.id).where(
        UserRole.user_id == user.id, UserRole.deleted_at.is_(None)
    )
    role_slug = (await db.execute(role_stmt)).scalar_one_or_none()
    if role_slug is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"error": {"code": "no_role_assigned", "message": "User has no role"}},
        )

    session_id = uuid.uuid4()
    now = datetime.now(timezone.utc)
    refresh_token = create_refresh_token(user_id=user.id, session_id=session_id)
    refresh_jti = decode_token(refresh_token)["jti"]

    db.add(
        UserSession(
            id=session_id,
            tenant_id=tenant_id,
            user_id=user.id,
            refresh_token_jti=refresh_jti,
            created_at=now,
            expires_at=now + timedelta(days=settings.refresh_token_ttl_days),
        )
    )
    await db.commit()

    access_token = create_access_token(
        user_id=user.id, tenant_id=tenant_id, role=role_slug, session_id=session_id
    )
    return TokenPairResponse(access_token=access_token, refresh_token=refresh_token)


@router.post("/password/forgot", response_model=ForgotPasswordResponse)
async def forgot_password(
    body: ForgotPasswordRequest, request: Request, db: AsyncSession = Depends(get_tenant_db)
) -> ForgotPasswordResponse:
    """
    Always returns 200 with the same generic message whether or not the
    email exists — otherwise the response itself leaks which emails are
    registered (a classic account-enumeration side channel).
    """
    tenant_id = request.state.tenant_id
    if tenant_id is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error": {"code": "tenant_not_resolved", "message": "X-Tenant-ID required"}},
        )

    generic_message = "If that email has an account, a reset link has been sent."
    stmt = select(User).where(User.tenant_id == tenant_id, User.email == body.email)
    user = (await db.execute(stmt)).scalar_one_or_none()

    if user is None or not user.is_active:
        return ForgotPasswordResponse(message=generic_message)

    raw_token, token_hash = generate_reset_token()
    user.password_reset_token_hash = token_hash
    user.password_reset_expires_at = datetime.now(timezone.utc) + timedelta(
        minutes=settings.password_reset_ttl_minutes
    )
    await db.commit()

    # TODO(communication module): send `raw_token` via the email provider once
    # one is wired up (docs/12-devops.md notes this gap) — for now, dev/test
    # environments get the token back directly so the flow is actually usable
    # end-to-end without a real mailbox.
    dev_token = raw_token if settings.environment != "production" else None
    return ForgotPasswordResponse(message=generic_message, dev_reset_token=dev_token)


@router.post("/password/reset", status_code=status.HTTP_204_NO_CONTENT)
async def reset_password(
    body: ResetPasswordRequest, request: Request, db: AsyncSession = Depends(get_tenant_db)
) -> None:
    tenant_id = request.state.tenant_id
    if tenant_id is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error": {"code": "tenant_not_resolved", "message": "X-Tenant-ID required"}},
        )

    token_hash = hash_reset_token(body.token)
    stmt = select(User).where(
        User.tenant_id == tenant_id, User.password_reset_token_hash == token_hash
    )
    user = (await db.execute(stmt)).scalar_one_or_none()

    invalid_token = HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail={
            "error": {
                "code": "invalid_or_expired_token",
                "message": "This reset link is invalid or has expired — request a new one.",
            }
        },
    )
    if user is None or user.password_reset_expires_at is None:
        raise invalid_token
    if user.password_reset_expires_at < datetime.now(timezone.utc):
        raise invalid_token

    user.hashed_password = hash_password(body.new_password)
    user.password_reset_token_hash = None
    user.password_reset_expires_at = None
    # A password reset is also a reasonable moment to clear any lockout —
    # the person proved mailbox ownership, which is a stronger signal than
    # the password itself.
    user.failed_login_attempts = 0
    user.locked_until = None
    await db.commit()


@router.post("/refresh", response_model=TokenPairResponse)
async def refresh(
    body: RefreshRequest, request: Request, db: AsyncSession = Depends(get_tenant_db)
) -> TokenPairResponse:
    try:
        payload = decode_token(body.refresh_token)
    except JWTError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"error": {"code": "invalid_token", "message": "Invalid refresh token"}},
        ) from exc
    if payload.get("type") != "refresh":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"error": {"code": "invalid_token", "message": "Not a refresh token"}},
        )

    session_id = uuid.UUID(payload["session_id"])
    user_session = await db.get(UserSession, session_id)
    if (
        user_session is None
        or user_session.revoked_at is not None
        or user_session.refresh_token_jti != payload["jti"]
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"error": {"code": "session_revoked", "message": "Session no longer valid"}},
        )

    user = await db.get(User, uuid.UUID(payload["sub"]))
    if user is None or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"error": {"code": "invalid_token", "message": "User no longer valid"}},
        )

    role_stmt = select(Role.slug).join(UserRole, UserRole.role_id == Role.id).where(
        UserRole.user_id == user.id, UserRole.deleted_at.is_(None)
    )
    role_slug = (await db.execute(role_stmt)).scalar_one_or_none()

    # Rotation with reuse-detection — docs/04-rbac-security.md §5.
    new_refresh_token = create_refresh_token(user_id=user.id, session_id=session_id)
    user_session.refresh_token_jti = decode_token(new_refresh_token)["jti"]
    await db.commit()

    access_token = create_access_token(
        user_id=user.id, tenant_id=user_session.tenant_id, role=role_slug, session_id=session_id
    )
    return TokenPairResponse(access_token=access_token, refresh_token=new_refresh_token)


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_tenant_db),
) -> None:
    user_session = await db.get(UserSession, current_user.session_id)
    if user_session is not None and user_session.revoked_at is None:
        user_session.revoked_at = datetime.now(timezone.utc)
        await db.commit()


@router.get("/me", response_model=MeResponse)
async def me(
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_tenant_db),
) -> MeResponse:
    user = await db.get(User, current_user.user_id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    perm_stmt = (
        select(Permission.key)
        .join(RolePermission, RolePermission.permission_id == Permission.id)
        .join(Role, Role.id == RolePermission.role_id)
        .where(Role.slug == current_user.role_slug)
    )
    permissions = (await db.execute(perm_stmt)).scalars().all()

    institution_stmt = select(Institution).where(Institution.tenant_id == current_user.tenant_id)
    institution = (await db.execute(institution_stmt)).scalar_one_or_none()

    return MeResponse(
        user_id=user.id,
        tenant_id=current_user.tenant_id,
        email=user.email,
        full_name=user.full_name,
        role=current_user.role_slug,
        permissions=list(permissions),
        institution_name=institution.name if institution else None,
        institution_type=institution.institution_type.value if institution else None,
    )
