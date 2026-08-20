from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_name: str = "Sutram API"
    environment: str = Field(default="development")
    api_v1_prefix: str = "/api/v1"

    # Runtime app connection: a non-owner role so PostgreSQL RLS (FORCE ROW LEVEL
    # SECURITY) actually applies to it — table owners/superusers bypass RLS.
    # See alembic/versions/*_rls_policies.py and docs/03-database-design.md §1.
    database_url: str = Field(
        default="postgresql+asyncpg://sutram_app:sutram_app_dev_password@localhost:5432/sutram"
    )
    # Migrations run as the table-owning role so DDL/CREATE ROLE/RLS setup works.
    admin_database_url: str = Field(
        default="postgresql+asyncpg://sutram:sutram_dev_password@localhost:5432/sutram"
    )
    redis_url: str = Field(default="redis://localhost:6379/0")

    jwt_algorithm: str = "HS256"  # dev default; prod uses RS256 keypair per docs/04-rbac-security.md
    jwt_secret: str = Field(default="dev-only-secret-change-me")
    access_token_ttl_minutes: int = 15
    refresh_token_ttl_days: int = 7

    cors_origins: list[str] = Field(default_factory=lambda: ["http://localhost:3000"])

    default_tenant_header: str = "X-Tenant-ID"

    # Login hardening — docs/04-rbac-security.md §5.
    max_failed_login_attempts: int = 5
    account_lockout_minutes: int = 15
    password_reset_ttl_minutes: int = 30


@lru_cache
def get_settings() -> Settings:
    return Settings()
