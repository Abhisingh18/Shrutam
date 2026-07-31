# Sutram — Design & Architecture Documentation

**Product:** Sutram, by Pragyaan Labs — an AI-native, multi-tenant Education Operating System for Schools, Colleges, Universities, Coaching Institutes, and Research Labs.

**Current scope:** Full responsive web application (all role dashboards, all modules). A native mobile app is explicitly deferred — out of scope for now.

This folder contains the complete design/architecture spec for Sutram, produced as 14 documents. They're numbered in dependency order — each later document was written with the key decisions from earlier ones as fixed ground truth, so names (tables, routes, roles, events) stay consistent across the set.

## Documents

| # | Document | Covers |
|---|---|---|
| 01 | [PRD](01-prd.md) | Vision, business model, pricing tiers, competitive analysis, USP, Phase 1/2/3 scope |
| 02 | [Information Architecture](02-information-architecture.md) | Full sitemap — ~415 screens across public site, signup, auth, setup wizard, and all 18 role dashboards |
| 03 | [Database Design](03-database-design.md) | Multi-tenancy model, ER diagrams, full table definitions per module |
| 04 | [RBAC & Security](04-rbac-security.md) | 18-role permission matrix, auth/JWT design, tenant isolation, compliance (GDPR/FERPA/DPDP) |
| 05 | [User Personas](05-user-personas.md) | Detailed personas for all 18 roles, buyer vs. user, segment relevance |
| 06 | [UX Flows](06-ux-flows.md) | Screen-by-screen flows for onboarding, auth, and the 4 cross-module workflows |
| 07 | [API Design](07-api-design.md) | REST API catalog, response envelope, event-bus naming, webhooks |
| 08 | [Backend Architecture](08-backend-architecture.md) | Modular monolith design, tech stack, event-driven backbone, scaling path |
| 09 | [Frontend Architecture](09-frontend-architecture.md) | Next.js/React structure, page templates, state management, RBAC-driven rendering |
| 10 | [AI Features](10-ai-features.md) | AI Assistant architecture, predictive analytics, per-module AI feature catalog, phasing |
| 11 | [Figma Design System](11-figma-design-system.md) | Color/type/spacing tokens, component specs, page templates, Figma file structure |
| 12 | [DevOps](12-devops.md) | CI/CD pipeline, IaC, rollout strategy, observability, secrets management |
| 13 | [Testing Strategy](13-testing-strategy.md) | Test pyramid, RBAC/tenant-isolation testing, AI/ML testing, quality gates |
| 14 | [Deployment & Scaling](14-deployment-scaling.md) | Phase 1/2/3 infra topology, capacity planning, scaling triggers, DR |

## Key decisions locked across all documents

- **Multi-tenancy:** shared database, shared schema, `tenant_id` + PostgreSQL Row-Level Security (dedicated-isolation option reserved for large Enterprise tenants).
- **Roles (18):** `super_admin`, `institution_admin`, `principal`, `dean`, `registrar`, `hod`, `faculty`, `teaching_assistant`, `researcher`, `accountant`, `hr_manager`, `hostel_warden`, `librarian`, `placement_officer`, `transport_manager`, `student`, `parent`, `guest`.
- **Stack:** Python/FastAPI (modular monolith) + PostgreSQL + Redis + S3 on the backend; Next.js/React/TypeScript/Tailwind + shadcn/ui on the frontend; Docker/Kubernetes, Terraform, Argo CD.
- **Pricing tiers:** Starter → Growth → Enterprise, gating Phase 1 → Phase 2 → Phase 3 feature scope respectively.
- **Phasing:** Phase 1 (~155 screens, MVP core academic workflow), Phase 2 (~298 screens, adds HR/Library/Hostel/Transport/Analytics), Phase 3 (~415 screens, adds AI Assistant/Placement/Research/Multi-campus).

## Suggested reading order

- **Founders/business:** 01 → 05 → 10
- **Designers:** 02 → 05 → 06 → 11
- **Backend engineers:** 03 → 04 → 07 → 08 → 12 → 13 → 14
- **Frontend engineers:** 02 → 09 → 11 → 06

## Not yet covered

- Native mobile app (Android/iOS) — deferred by product decision, not designed in this set.
