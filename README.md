# Sutram

**Sutram** (Sanskrit for "thread" — that which connects everything together) is an AI-native, multi-tenant Education Operating System for schools, colleges, universities, coaching institutes and research labs, built by **Pragyaan Labs**.

Full product design docs (PRD, architecture, database, API, RBAC, AI feature, DevOps, testing, etc.) live in [`docs/`](docs/README.md).

## Monorepo layout

```
apps/
  web/    Next.js 16 (App Router) frontend — marketing site, auth, and the app shell
  api/    FastAPI backend — multi-tenant Postgres (Row-Level Security), JWT auth, RBAC
docs/     Product & architecture documentation (14 docs — see docs/README.md)
docker-compose.yml   Local Postgres + Redis
```

## Getting started (local dev)

**Prerequisites:** Node 20+, Python 3.11+, Docker Desktop.

```bash
# 1. Start Postgres + Redis
docker compose up -d

# 2. Backend
cd apps/api
python -m venv .venv
./.venv/Scripts/pip install -r requirements-dev.txt   # (Scripts/ on Windows, bin/ on macOS/Linux)
cp .env.example .env
./.venv/Scripts/python -m alembic upgrade head
./.venv/Scripts/python -m scripts.seed_platform        # seeds the 18-role catalog
./.venv/Scripts/python -m uvicorn app.main:app --reload --port 8000

# 3. Frontend (new terminal)
cd apps/web
npm install
npm run dev
```

Frontend: http://localhost:3000 · API: http://localhost:8000/api/v1/docs

## Status

**Phase 1 (MVP) and Phase 2 module scope are both implemented end-to-end**, each with real backend (tenant-scoped Postgres models + RBAC-gated FastAPI routers) and real frontend (pages built from four shared templates):

- **Platform:** tenant signup, JWT auth (login/refresh/logout), 18-role RBAC catalog, verified cross-tenant Row-Level Security isolation
- **Phase 1:** Students, Faculty, Academics (departments/subjects/programs/semesters/sections), Attendance (bulk mark + history), Examinations (+ marks entry), Fees & Finance (invoices + payments, auto status recomputation), Admissions (application → accept → convert-to-student)
- **Phase 2:** Library (issue/return with copy tracking), Hostel (room allocation/vacate with occupancy tracking), Transport (vehicles/routes/passes), HR (employees + leave approval), Communication (announcements, draft/publish), Analytics & Reports (live cross-module summary dashboard)

Remaining Phase 3 scope (Placement, Research, AI Assistant, Multi-campus, Settings, Alumni, Workflow Automation) has its nav entry and route wired but ships a "coming soon" stub — see [`docs/01-prd.md`](docs/01-prd.md) for the phase breakdown.

A native mobile app is intentionally out of scope for now — the web app is fully responsive.
