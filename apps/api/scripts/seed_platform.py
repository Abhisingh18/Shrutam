"""
Seeds the platform-wide role catalog and a starter permission matrix.

Roles and permissions are platform-defined, not tenant-editable
(docs/04-rbac-security.md §1-§3), so this runs once per environment via the
owner/admin DB connection — the app's runtime `sutram_app` role only has
SELECT on these tables (see the RLS migration).

Run with:  .venv/Scripts/python.exe -m scripts.seed_platform
"""
import asyncio

from sqlalchemy import select
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from app.core.config import get_settings
from app.models.auth import Permission, Role, RolePermission, ROLE_SLUGS

ROLE_NAMES = {
    "super_admin": "Super Admin",
    "institution_admin": "Institution Admin",
    "principal": "Principal",
    "dean": "Dean",
    "registrar": "Registrar",
    "hod": "Head of Department",
    "faculty": "Faculty",
    "teaching_assistant": "Teaching Assistant",
    "researcher": "Researcher",
    "accountant": "Accountant",
    "hr_manager": "HR Manager",
    "hostel_warden": "Hostel Warden",
    "librarian": "Librarian",
    "placement_officer": "Placement Officer",
    "transport_manager": "Transport Manager",
    "student": "Student",
    "parent": "Parent",
    "guest": "Guest",
}

# Starter slice of the full 22-module x 18-role matrix from docs/04-rbac-security.md §3 —
# only the `students` module, enough to drive the first vertical slice end-to-end.
# Extend this table as each subsequent module ships.
STUDENT_MODULE_PERMISSIONS = {
    "students:profile:read": [
        "institution_admin",
        "principal",
        "dean",
        "registrar",
        "hod",
        "faculty",
        "teaching_assistant",
        "accountant",
    ],
    "students:profile:write": ["institution_admin", "registrar"],
    "students:profile:delete": ["institution_admin"],
}


async def main() -> None:
    settings = get_settings()
    engine = create_async_engine(settings.admin_database_url)
    Session = async_sessionmaker(engine, expire_on_commit=False)

    async with Session() as session:
        existing = {
            r.slug: r for r in (await session.execute(select(Role))).scalars().all()
        }
        for slug in ROLE_SLUGS:
            if slug not in existing:
                role = Role(slug=slug, name=ROLE_NAMES[slug])
                session.add(role)
                existing[slug] = role
        await session.flush()

        existing_perms = {
            p.key: p for p in (await session.execute(select(Permission))).scalars().all()
        }
        for key in STUDENT_MODULE_PERMISSIONS:
            if key not in existing_perms:
                module = key.split(":", 1)[0]
                perm = Permission(key=key, module=module)
                session.add(perm)
                existing_perms[key] = perm
        await session.flush()

        existing_links = {
            (rp.role_id, rp.permission_id)
            for rp in (await session.execute(select(RolePermission))).scalars().all()
        }
        for key, role_slugs in STUDENT_MODULE_PERMISSIONS.items():
            perm = existing_perms[key]
            for slug in role_slugs:
                role = existing[slug]
                if (role.id, perm.id) not in existing_links:
                    session.add(RolePermission(role_id=role.id, permission_id=perm.id))

        await session.commit()

    await engine.dispose()
    print(f"Seeded {len(ROLE_SLUGS)} roles and {len(STUDENT_MODULE_PERMISSIONS)} permissions.")


if __name__ == "__main__":
    asyncio.run(main())
