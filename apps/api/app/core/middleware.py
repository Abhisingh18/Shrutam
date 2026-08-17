import uuid

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse

from app.core.config import get_settings

settings = get_settings()

# Endpoints that don't require a resolved tenant (platform-level / pre-tenant flows).
# See docs/07-api-design.md §2 and §5.
TENANT_EXEMPT_PATH_PREFIXES = (
    f"{settings.api_v1_prefix}/health",
    f"{settings.api_v1_prefix}/docs",
    f"{settings.api_v1_prefix}/openapi.json",
    f"{settings.api_v1_prefix}/tenants/signup",
    f"{settings.api_v1_prefix}/tenants/resolve",
    f"{settings.api_v1_prefix}/auth/login",
    f"{settings.api_v1_prefix}/auth/refresh",
)


class TenantResolutionMiddleware(BaseHTTPMiddleware):
    """
    Resolves the tenant for the request from the `X-Tenant-ID` header (dev/API clients)
    or a `tenant` subdomain (browser clients in production). Docs/07-api-design.md §2,
    docs/04-rbac-security.md §4.

    Only *parses* the tenant identifier here — the DB lookup + RLS session var happens
    in app.core.db.get_tenant_db, once we're inside a request-scoped DB session.
    """

    async def dispatch(self, request: Request, call_next):
        path = request.url.path
        if path == "/":
            return await call_next(request)

        # CORS preflight requests never carry the app's custom headers (browsers
        # send them only on the real request) — must always pass through so
        # CORSMiddleware can answer them, otherwise the browser blocks the real
        # request entirely and every API call from the frontend silently fails.
        if request.method == "OPTIONS":
            return await call_next(request)

        tenant_id_raw = request.headers.get(settings.default_tenant_header)
        if not tenant_id_raw:
            host = request.headers.get("host", "")
            subdomain = host.split(".")[0] if "." in host else None
            if subdomain and subdomain not in ("localhost", "api", "www"):
                request.state.tenant_slug = subdomain

        if tenant_id_raw:
            try:
                request.state.tenant_id = uuid.UUID(tenant_id_raw)
            except ValueError:
                if not path.startswith(TENANT_EXEMPT_PATH_PREFIXES):
                    return JSONResponse(
                        status_code=400,
                        content={
                            "error": {
                                "code": "invalid_tenant_header",
                                "message": f"{settings.default_tenant_header} must be a valid UUID",
                            }
                        },
                    )
        else:
            request.state.tenant_id = None

        if request.state.tenant_id is None and not path.startswith(TENANT_EXEMPT_PATH_PREFIXES):
            return JSONResponse(
                status_code=400,
                content={
                    "error": {
                        "code": "tenant_not_resolved",
                        "message": (
                            f"Request could not be resolved to a tenant. "
                            f"Send the {settings.default_tenant_header} header."
                        ),
                    }
                },
            )

        return await call_next(request)
