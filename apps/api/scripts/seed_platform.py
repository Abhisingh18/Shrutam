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

# Progressive slice of the full 22-module x 18-role matrix from
# docs/04-rbac-security.md §3, covering every module built so far. Student/
# parent self-scoped access (e.g. "see only your own attendance") needs the
# ABAC scope predicate from docs/04-rbac-security.md §1 which isn't wired at
# the API layer yet — that's future work, so those two roles are deliberately
# absent from most of this matrix rather than granted overly-broad access.
MODULE_PERMISSIONS: dict[str, list[str]] = {
    # Students — docs/03-database-design.md §5.1
    "students:profile:read": [
        "institution_admin", "principal", "dean", "registrar", "hod",
        "faculty", "teaching_assistant", "accountant",
    ],
    "students:profile:write": ["institution_admin", "registrar"],
    "students:profile:delete": ["institution_admin"],

    # Admissions
    "admissions:application:read": ["institution_admin", "principal", "dean", "registrar"],
    "admissions:application:write": ["institution_admin", "registrar"],
    "admissions:application:delete": ["institution_admin"],
    "admissions:application:convert": ["institution_admin", "registrar"],

    # Academics (Departments/Programs/Subjects/Semesters/Sections) — permission
    # prefix is `courses:` to match the reserved nav.config.ts entry.
    "courses:catalog:read": [
        "institution_admin", "principal", "dean", "registrar", "hod",
        "faculty", "teaching_assistant",
    ],
    "courses:catalog:write": ["institution_admin", "registrar", "hod"],
    "courses:catalog:delete": ["institution_admin"],

    # Faculty
    "faculty:profile:read": [
        "institution_admin", "principal", "dean", "registrar", "hod", "hr_manager",
    ],
    "faculty:profile:write": ["institution_admin", "hr_manager", "registrar"],
    "faculty:profile:delete": ["institution_admin"],

    # Attendance
    "attendance:record:read": [
        "institution_admin", "principal", "dean", "registrar", "hod",
        "faculty", "teaching_assistant",
    ],
    "attendance:record:write": ["institution_admin", "faculty", "teaching_assistant", "registrar"],

    # Examinations
    "exams:schedule:read": [
        "institution_admin", "principal", "dean", "registrar", "hod",
        "faculty", "teaching_assistant",
    ],
    "exams:schedule:write": ["institution_admin", "registrar", "hod"],
    "exams:schedule:delete": ["institution_admin"],
    "exams:marks:write": ["institution_admin", "faculty", "teaching_assistant", "hod"],
    "exams:results:publish": ["institution_admin", "registrar", "principal"],

    # Fees & Finance
    "fees:invoice:read": ["institution_admin", "principal", "accountant", "registrar"],
    "fees:invoice:write": ["institution_admin", "accountant"],
    "fees:invoice:delete": ["institution_admin"],
    "fees:structure:read": ["institution_admin", "accountant", "principal"],
    "fees:structure:write": ["institution_admin", "accountant"],
    "fees:payment:write": ["institution_admin", "accountant"],

    # Library
    "library:book:read": ["institution_admin", "principal", "librarian", "faculty", "teaching_assistant"],
    "library:book:write": ["institution_admin", "librarian"],
    "library:book:delete": ["institution_admin", "librarian"],
    "library:issue:read": ["institution_admin", "librarian"],
    "library:issue:write": ["institution_admin", "librarian"],

    # Hostel
    "hostel:room:read": ["institution_admin", "principal", "hostel_warden"],
    "hostel:room:write": ["institution_admin", "hostel_warden"],
    "hostel:room:delete": ["institution_admin"],
    "hostel:allocation:read": ["institution_admin", "hostel_warden"],
    "hostel:allocation:write": ["institution_admin", "hostel_warden"],

    # Transport
    "transport:vehicle:read": ["institution_admin", "transport_manager"],
    "transport:vehicle:write": ["institution_admin", "transport_manager"],
    "transport:vehicle:delete": ["institution_admin"],
    "transport:route:read": ["institution_admin", "transport_manager", "principal"],
    "transport:route:write": ["institution_admin", "transport_manager"],
    "transport:route:delete": ["institution_admin"],
    "transport:pass:read": ["institution_admin", "transport_manager"],
    "transport:pass:write": ["institution_admin", "transport_manager"],

    # HR (non-teaching staff — Faculty module covers teaching staff separately)
    "hr:employee:read": ["institution_admin", "principal", "hr_manager"],
    "hr:employee:write": ["institution_admin", "hr_manager"],
    "hr:employee:delete": ["institution_admin"],
    "hr:leave:read": ["institution_admin", "hr_manager"],
    "hr:leave:write": ["institution_admin", "hr_manager"],
    "hr:leave:approve": ["institution_admin", "hr_manager", "principal"],

    # Communication
    "communication:message:read": [
        "institution_admin", "principal", "dean", "registrar", "hod",
        "faculty", "teaching_assistant",
    ],
    "communication:message:write": ["institution_admin", "principal", "registrar"],
    "communication:message:delete": ["institution_admin"],

    # Analytics & Reports
    "analytics:dashboard:read": ["institution_admin", "principal", "dean", "accountant", "registrar"],

    # Documents (student/faculty file uploads)
    "documents:file:read": [
        "institution_admin", "principal", "dean", "registrar", "hod",
        "faculty", "teaching_assistant", "hr_manager",
    ],
    "documents:file:write": ["institution_admin", "registrar", "hr_manager"],
    "documents:file:delete": ["institution_admin"],

    # Timetable (nested under Academics in the UI)
    "timetable:slot:read": [
        "institution_admin", "principal", "dean", "registrar", "hod",
        "faculty", "teaching_assistant",
    ],
    "timetable:slot:write": ["institution_admin", "registrar", "hod"],
    "timetable:slot:delete": ["institution_admin", "registrar"],

    # Notifications are self-scoped (every authenticated user manages only
    # their own) — no role-permission entries needed, see app/api/v1/notifications.py.
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
        for key in MODULE_PERMISSIONS:
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
        for key, role_slugs in MODULE_PERMISSIONS.items():
            perm = existing_perms[key]
            for slug in role_slugs:
                role = existing[slug]
                if (role.id, perm.id) not in existing_links:
                    session.add(RolePermission(role_id=role.id, permission_id=perm.id))

        await session.commit()

    await engine.dispose()
    print(f"Seeded {len(ROLE_SLUGS)} roles and {len(MODULE_PERMISSIONS)} permissions.")


if __name__ == "__main__":
    asyncio.run(main())
