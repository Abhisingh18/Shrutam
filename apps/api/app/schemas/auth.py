import uuid

from pydantic import BaseModel, EmailStr, Field


class TenantSignupRequest(BaseModel):
    """docs/06-ux-flows.md Onboarding flow: Signup -> Institution Name -> Plan -> ... """

    institution_name: str = Field(min_length=2, max_length=255)
    institution_type: str = Field(pattern="^(school|college|university|coaching|research_lab)$")
    plan_tier: str = Field(pattern="^(starter|growth|enterprise)$", default="starter")
    admin_full_name: str = Field(min_length=2, max_length=255)
    admin_email: EmailStr
    admin_password: str = Field(min_length=10, max_length=128)


class TenantSignupResponse(BaseModel):
    tenant_id: uuid.UUID
    tenant_slug: str
    institution_id: uuid.UUID
    admin_user_id: uuid.UUID


class TenantResolveResponse(BaseModel):
    tenant_id: uuid.UUID
    tenant_slug: str
    name: str


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ForgotPasswordResponse(BaseModel):
    message: str
    # Only populated when settings.environment != "production" — there's no
    # email/SMS provider wired up yet (docs/12-devops.md notes this as
    # future work), so dev/test environments get the link directly instead
    # of silently going nowhere. Never populated outside development.
    dev_reset_token: str | None = None


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str = Field(min_length=10, max_length=128)


class TokenPairResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class RefreshRequest(BaseModel):
    refresh_token: str


class MeResponse(BaseModel):
    user_id: uuid.UUID
    tenant_id: uuid.UUID
    email: EmailStr
    full_name: str
    role: str
    permissions: list[str] = Field(default_factory=list)
    institution_name: str | None = None
    institution_type: str | None = None
