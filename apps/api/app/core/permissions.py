import uuid
from dataclasses import dataclass

from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_tenant_db
from app.core.security import JWTError, decode_token
from app.models.auth import Permission, Role, RolePermission, User, UserRole

bearer_scheme = HTTPBearer(auto_error=False)


@dataclass(frozen=True)
class CurrentUser:
    user_id: uuid.UUID
    tenant_id: uuid.UUID
    role_slug: str
    session_id: uuid.UUID
    scope: dict | None


def _unauthorized(detail: str) -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail={"error": {"code": "unauthorized", "message": detail}},
    )


async def get_current_user(
    request: Request,
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: AsyncSession = Depends(get_tenant_db),
) -> CurrentUser:
    if credentials is None:
        raise _unauthorized("Missing bearer token")

    try:
        payload = decode_token(credentials.credentials)
    except JWTError as exc:
        raise _unauthorized("Invalid or expired token") from exc

    if payload.get("type") != "access":
        raise _unauthorized("Not an access token")

    token_tenant_id = uuid.UUID(payload["tenant_id"])
    request_tenant_id = getattr(request.state, "tenant_id", None)
    if request_tenant_id is not None and token_tenant_id != request_tenant_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "error": {
                    "code": "tenant_mismatch",
                    "message": "Token tenant does not match request tenant",
                }
            },
        )

    user_id = uuid.UUID(payload["sub"])
    stmt = select(User).where(User.id == user_id, User.deleted_at.is_(None))
    user = (await db.execute(stmt)).scalar_one_or_none()
    if user is None or not user.is_active:
        raise _unauthorized("User not found or inactive")

    role_stmt = (
        select(UserRole)
        .where(UserRole.user_id == user_id, UserRole.deleted_at.is_(None))
        .limit(1)
    )
    user_role = (await db.execute(role_stmt)).scalar_one_or_none()
    if user_role is None:
        raise _unauthorized("User has no assigned role")

    role = await db.get(Role, user_role.role_id)

    return CurrentUser(
        user_id=user.id,
        tenant_id=token_tenant_id,
        role_slug=role.slug if role else payload["role"],
        session_id=uuid.UUID(payload["session_id"]),
        scope=user_role.scope,
    )


def require_permission(permission_key: str):
    """
    Dependency factory enforcing the `module:resource:action` permission grammar
    from docs/04-rbac-security.md §1/§3. `super_admin` bypasses (platform operator).
    """

    async def _check(
        current_user: CurrentUser = Depends(get_current_user),
        db: AsyncSession = Depends(get_tenant_db),
    ) -> CurrentUser:
        if current_user.role_slug == "super_admin":
            return current_user

        stmt = (
            select(Permission.key)
            .join(RolePermission, RolePermission.permission_id == Permission.id)
            .join(Role, Role.id == RolePermission.role_id)
            .where(Role.slug == current_user.role_slug, Permission.key == permission_key)
        )
        allowed = (await db.execute(stmt)).scalar_one_or_none()
        if allowed is None:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail={
                    "error": {
                        "code": "permission_denied",
                        "message": f"Role '{current_user.role_slug}' lacks '{permission_key}'",
                    }
                },
            )
        return current_user

    return _check
