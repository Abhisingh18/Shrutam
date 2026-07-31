# Sutram — Document 7: API Design

**Product**: Sutram by Pragyaan Labs — AI-powered, multi-tenant Education Operating System
**Scope**: Full web-app backend REST API (client-agnostic JSON over HTTPS; mobile-ready by construction, native mobile app itself out of scope for this document)
**Consistency baseline**: This document assumes and is consistent with Document 3 (Database Design) table/column names and Document 4 (RBAC & Security Architecture) role slugs, permission grammar, tenant-resolution model, and auth/session parameters. Where this document restates a security parameter (JWT TTL, rate limits, etc.), Document 4 remains the source of truth.

---

## Table of Contents

1. [API Design Principles](#1-api-design-principles)
2. [Base URL & Tenant Resolution](#2-base-url--tenant-resolution)
3. [Standard Request/Response Envelope](#3-standard-requestresponse-envelope)
4. [Auth & Session Endpoints](#4-auth--session-endpoints)
5. [Tenant / Institution Provisioning Endpoints](#5-tenant--institution-provisioning-endpoints)
6. [Full Endpoint Catalog — Modules](#6-full-endpoint-catalog--modules)
7. [Internal Event Bus / Webhook Design](#7-internal-event-bus--webhook-design)
8. [Outbound Webhooks — External Integrations](#8-outbound-webhooks--external-integrations)
9. [File Upload Endpoints](#9-file-upload-endpoints)
10. [Bulk Operations & Import/Export](#10-bulk-operations--importexport)
11. [Rate Limiting & Quotas by Pricing Tier](#11-rate-limiting--quotas-by-pricing-tier)
12. [Public API / API Marketplace (Phase 3)](#12-public-api--api-marketplace-phase-3)

---

## 1. API Design Principles

### 1.1 REST, resource-oriented

The API is **REST-first**, resource-oriented, and JSON-only (`Content-Type: application/json` on every request/response body; file bytes never flow through this API directly — see Section 9). Resources are nouns, plural, snake_case-free in URLs (kebab-free too — plain lowercase, hyphenated only where a resource name is naturally multi-word, e.g. `exam-schedules`), and map closely but not 1:1 to the Document 3 table names (some tables are internal/junction-only and are exposed only as nested sub-resources or fields, not top-level endpoints — e.g. `role_permissions`, `student_guardians` is exposed as `/students/:id/guardians`).

Standard verbs:

| HTTP method | Semantics |
|---|---|
| `GET` | Read a resource or collection. Never mutates state. Safe to retry, safe to cache (with appropriate headers). |
| `POST` | Create a resource, or invoke a non-idempotent/state-transition action (`/:id/publish`, `/:id/admit`). |
| `PATCH` | Partial update of a resource. Sutram uses `PATCH`, not `PUT`, for all updates — clients send only changed fields. |
| `DELETE` | Soft-delete (sets `deleted_at`) for primary entities with audit/compliance retention needs (students, faculty, invoices, etc.); hard-delete only for genuinely transient/draft resources explicitly marked as such in the endpoint catalog. |

Action endpoints that don't fit CRUD (`admit`, `publish-results`, `approve`, `waive`, `revoke`) are modeled as `POST /api/v1/{resource}/:id/{action}` — a deliberate, well-known REST pragmatism (avoids forcing every state transition into an artificial "update the status field" `PATCH`, which loses the semantic intent, the permission-check granularity, and the audit-log verb).

### 1.2 Versioning strategy

- URI path versioning: **`/api/v1/...`**. The version denotes the contract, not the deployment — multiple internal service versions can serve `v1` simultaneously during a rolling upgrade.
- **Backward-compatible changes** (new optional field, new endpoint, new enum value in a non-exhaustively-validated field) ship within `v1` without a version bump. Clients are contractually required to ignore unknown response fields and unknown enum values gracefully (documented in the API changelog / OpenAPI spec).
- **Breaking changes** (removing/renaming a field, changing a field's type or semantics, tightening validation, removing an endpoint) require a new version (`/api/v2/...`). The prior version is kept live for a **minimum 12-month deprecation window**, advertised via a `Sunset` response header (RFC 8594) and `Deprecation: true` once a replacement ships, plus advance notice to tenant admins and, for marketplace partners, to registered integration owners (Section 12).
- The OpenAPI 3.1 specification is the canonical, machine-readable contract per version, generated from the same schema definitions the gateway validates requests against (single source of truth — no hand-maintained doc drift).

### 1.3 Pagination

Default pagination is **offset/page-based**, uniform across all list endpoints:

```
GET /api/v1/students?page=2&per_page=25
```

- `page` — 1-indexed, default `1`.
- `per_page` — default `25`, max `100` (requests above max are clamped, not rejected).
- Response includes a `meta.pagination` block and RFC 8288-style `links` (Section 3.2).

**Cursor-based pagination** (`?cursor=<opaque>&limit=50`) is used instead of offset for a small set of high-volume, high-churn, or streaming-style endpoints where offset pagination would be unstable or slow at scale: `audit-logs`, `notifications`, `attendance` (bulk queries), and event-replay/webhook-delivery-log endpoints. These are called out explicitly in their catalog entries; everything else uses page/per_page.

### 1.4 Filtering & sorting

Uniform query-parameter grammar across all list endpoints:

- **Filtering**: `filter[field]=value`, repeatable and combinable (AND semantics across distinct fields). Range filters use `filter[field][gte]` / `filter[field][lte]`. Example: `GET /api/v1/invoices?filter[status]=overdue&filter[due_date][lte]=2026-08-31`.
- **Full-text search**: `q=` on endpoints that support it (name/email/roll-number style search), backed by trigram/GIN indexes per Document 3 (e.g. `idx_students_name_trgm`).
- **Sorting**: `sort=field1,-field2` — comma-separated, leading `-` denotes descending. Example: `sort=-created_at,last_name`.
- **Sparse fieldsets** (Phase 2): `fields=id,first_name,last_name` to trim payload on high-traffic list views; unimplemented fields are silently ignored in v1, reserved for forward compatibility.

### 1.5 Idempotency

Every `POST` that creates a resource or triggers a financial/state-changing action **accepts** an `Idempotency-Key` header (client-generated UUID); it is **mandatory** on payment-initiating and invoice-creating endpoints, optional-but-recommended elsewhere.

- The gateway stores `(tenant_id, endpoint, idempotency_key) → response` for **24 hours**.
- A repeated request with the same key and same request body within that window returns the **original response verbatim**, with header `Idempotency-Replayed: true`, and does **not** re-execute the operation (no duplicate invoice, no duplicate payment capture).
- A repeated key with a **different** request body is rejected with `422 idempotency_key_conflict` — the client is misusing the key, not legitimately retrying.
- This is the primary defense against duplicate submissions from flaky mobile networks and double-tap UI bugs, in addition to (not instead of) client-side debouncing.

### 1.6 Rate limiting

Every response carries:

```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 942
X-RateLimit-Reset: 1785600000
```

`429 Too Many Requests` responses additionally carry `Retry-After: <seconds>`. Full tier-based quota table in Section 11; enforcement mechanics (per-tenant, per-user, per-endpoint-class) are defined in Document 4 §10.1.

### 1.7 REST-primary, with narrow async/GraphQL supplements

- **Long-running operations** (bulk import/export, transcript batch generation, AI-driven analytics reports) do not block a synchronous request/response cycle. They return `202 Accepted` with a **job resource**, polled or event-notified to completion — see Section 10.
- **A read-only GraphQL endpoint** (`POST /api/v1/graphql`, Growth tier and above) supplements REST specifically for the **Analytics & Reports** module, where ad-hoc cross-entity queries (e.g. "attendance % by section, joined with fee-due status, filtered by campus") would otherwise require an unbounded number of bespoke REST endpoints. GraphQL is **query-only** in v1 — all mutations remain REST, so every write continues to pass through the same permission-check and audit-logging code path regardless of how the client reads data.
- **Webhooks** (both internal event-bus-driven cross-module workflows and outbound integration callbacks) supplement REST for anything event-driven rather than request/response-shaped — Sections 7 and 8.

---

## 2. Base URL & Tenant Resolution

Three equivalent ways to reach the same API, differing only in how `tenant_id` is resolved — the underlying gateway and services are identical (see Document 4 §4.1 for the security model this implements):

| Method | Example | Primary use |
|---|---|---|
| **Subdomain (primary, web)** | `https://greenwood.sutram.app/api/v1/students` | Sutram's own web app. Gateway resolves `tenant_slug` from the `Host` header, looks up `tenant_id`, attaches it to request context before any handler runs. |
| **Header-based** | `https://api.sutram.app/api/v1/students` + `X-Tenant-ID: 3f1e...` | Non-browser clients: future native mobile app, server-to-server integrations, API Marketplace partners (Section 12). |
| **Custom domain (Enterprise)** | `https://sis.greenwooduniversity.edu/api/v1/students` | Enterprise tenants with white-label/custom-domain add-on; CNAME'd to the gateway, resolved via a domain→tenant mapping table. |

**Cross-check enforcement**: every JWT access token embeds `tenant_id` as a signed claim. The gateway rejects (`400 tenant_mismatch`) any request where the resolved tenant (from subdomain, header, or custom domain) does not match the token's `tenant_id` claim — a JWT minted for Tenant A can never be honored against Tenant B's subdomain or an explicit `X-Tenant-ID` for Tenant B, regardless of which resolution method was used.

**Platform-level endpoints** (tenant provisioning, cross-tenant Super Admin operations) live under a distinct, non-tenant-resolved prefix: `https://api.sutram.app/api/v1/platform/...` — see Section 5.

### 2.1 Authentication header

```
Authorization: Bearer <jwt-access-token>
```

RS256 JWT, 15-minute TTL, claims `sub, tenant_id, role, session_id, iat, exp, jti` (Document 4 §5.5). Endpoints under `/auth/*` that issue or refresh tokens are the only ones callable without this header (plus a small set of explicitly public endpoints: `guest`-role admission-inquiry submission, SSO redirect entrypoints, outbound-webhook receivers under `/webhooks/*` which use signature verification instead of bearer auth).

### 2.2 Standard headers summary

| Header | Direction | Purpose |
|---|---|---|
| `Authorization: Bearer <jwt>` | Request | Auth |
| `X-Tenant-ID` | Request | Explicit tenant resolution (header-based clients) |
| `Idempotency-Key` | Request | Safe retry of POST (Section 1.5) |
| `Accept-Language` | Request | Response localization where supported |
| `X-Request-ID` | Request (optional, generated if absent) | Distributed tracing; echoed back in `meta.request_id` |
| `X-RateLimit-*`, `Retry-After` | Response | Rate-limit state (Section 1.6) |
| `Idempotency-Replayed` | Response | Marks a replayed idempotent response |
| `Sunset`, `Deprecation` | Response | Versioning lifecycle (Section 1.2) |
| `ETag`, `If-Match` | Response/Request (select endpoints) | Optimistic-concurrency guard on `PATCH` for high-contention resources (e.g. `invoices`, `marks`) — a stale `If-Match` returns `409 conflict` |

---

## 3. Standard Request/Response Envelope

### 3.1 Success — single resource

```json
{
  "data": {
    "id": "8f14e45f-ceea-4a1e-8f10-9d0e5b3c1a2b",
    "type": "student",
    "attributes": {
      "admission_number": "GRW-2026-00184",
      "first_name": "Ananya",
      "last_name": "Rao",
      "status": "active",
      "current_program_id": "b2d4...",
      "current_section_id": "a913...",
      "created_at": "2026-06-12T08:15:00Z",
      "updated_at": "2026-07-30T11:02:44Z"
    }
  },
  "meta": {
    "request_id": "req_9c3f2a1b",
    "timestamp": "2026-07-31T09:20:11Z"
  }
}
```

### 3.2 Success — paginated list

```json
{
  "data": [
    { "id": "8f14e45f-...", "type": "student", "attributes": { "first_name": "Ananya", "...": "..." } },
    { "id": "a02b7e91-...", "type": "student", "attributes": { "first_name": "Rohit", "...": "..." } }
  ],
  "meta": {
    "request_id": "req_1a7c8e02",
    "timestamp": "2026-07-31T09:20:11Z",
    "pagination": {
      "page": 2,
      "per_page": 25,
      "total_count": 532,
      "total_pages": 22
    }
  },
  "links": {
    "self": "https://greenwood.sutram.app/api/v1/students?page=2&per_page=25",
    "next": "https://greenwood.sutram.app/api/v1/students?page=3&per_page=25",
    "prev": "https://greenwood.sutram.app/api/v1/students?page=1&per_page=25"
  }
}
```

Cursor-paginated endpoints (Section 1.3) replace `pagination` with `{ "cursor": "...", "next_cursor": "eyJ0Ijoi...", "has_more": true }` and omit `total_count` (deliberately — computing exact totals on high-volume append-only tables like `audit_logs` is expensive and rarely needed).

### 3.3 Error envelope

```json
{
  "error": {
    "code": "validation_error",
    "message": "One or more fields failed validation.",
    "details": [
      { "field": "date_of_birth", "issue": "must be a valid past date" },
      { "field": "contact_email", "issue": "invalid email format" }
    ],
    "request_id": "req_4b8e0f31",
    "timestamp": "2026-07-31T09:22:03Z"
  }
}
```

`details` is present only for `validation_error` (and similar multi-field failures); other error codes carry just `message`.

### 3.4 Standard error code taxonomy

| `code` | HTTP status | Meaning |
|---|---|---|
| `validation_error` | 422 | Request body/params fail schema or business-rule validation |
| `authentication_required` | 401 | No/malformed `Authorization` header |
| `invalid_credentials` | 401 | Login failure (deliberately generic — never distinguishes "no such user" from "wrong password," Document 4 §10.2) |
| `token_expired` | 401 | Access token past `exp`; client should refresh |
| `token_revoked` | 401 | Token/session on the revocation denylist (Document 4 §5.5) |
| `mfa_required` | 401 | Valid credentials but step-up 2FA/OTP not yet completed |
| `permission_denied` | 403 | Authenticated, but role/scope lacks the required `module:resource:action` |
| `module_not_enabled` | 403 | Tenant has not enabled the module this endpoint belongs to (tier/config gating) |
| `tenant_mismatch` | 400 | Resolved tenant (subdomain/header/domain) conflicts with JWT `tenant_id` claim |
| `not_found` | 404 | Resource does not exist, or exists in a different tenant (same response either way — no tenant-existence leakage) |
| `conflict` | 409 | Version/state conflict (stale `If-Match`, duplicate unique key, invalid state transition) |
| `idempotency_key_conflict` | 422 | Same `Idempotency-Key` reused with a different request body |
| `account_locked` | 423 | Brute-force lockout in effect (Document 4 §10.2) |
| `payload_too_large` | 413 | Request body / file exceeds limit |
| `unsupported_media_type` | 415 | Wrong `Content-Type` |
| `rate_limited` | 429 | Quota exceeded (Section 11) |
| `internal_error` | 500 | Unhandled server-side fault; always logged with `request_id` for support correlation |
| `service_unavailable` | 503 | Downstream dependency (e.g. payment gateway, AI inference provider) temporarily unavailable |

---

## 4. Auth & Session Endpoints

All under `https://api.sutram.app/api/v1/auth/...` (also reachable tenant-subdomain-prefixed for the tenant-scoped ones). TTLs, OTP/2FA/SSO mechanics per Document 4 §5.

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/auth/signup` | Self-serve institution signup: creates a new `tenants` row (trial or Starter/Growth) + the first `institution_admin` user. Distinct from platform-provisioned Enterprise tenants (Section 5). |
| `POST` | `/auth/login` | Email/username + password login. Returns access + refresh token pair, or `mfa_required`/step-up OTP challenge for new-device/mandated-2FA roles. |
| `POST` | `/auth/refresh` | Exchanges a valid (unrevoked, non-reused) refresh token for a new access + refresh token pair. Rotation + reuse-detection per Document 4 §5.5. |
| `POST` | `/auth/logout` | Revokes the current session's refresh token and denylists the current access token's `jti`. |
| `POST` | `/auth/logout-all` | Revokes **all** sessions for the authenticated user ("log out all devices"). |
| `POST` | `/auth/otp/request` | Issues a 6-digit OTP to email/SMS for a given identifier + purpose (`login_step_up`, `password_reset`, `sensitive_action`). Rate-limited per Document 4 §5.2. |
| `POST` | `/auth/otp/verify` | Verifies an OTP code; on success either completes login (issuing tokens) or clears a step-up challenge for the in-flight sensitive action. |
| `GET` | `/auth/sso/:provider/redirect` | Begins SSO flow (`provider` ∈ `google`, `microsoft`, `saml`); redirects to the IdP. |
| `POST`/`GET` | `/auth/sso/:provider/callback` | IdP callback (SAML uses `POST` for the assertion; OIDC uses `GET` with `code`). Resolves to a Sutram identity via verified email-domain matching, JIT-provisions per tenant policy, issues tokens. |
| `POST` | `/auth/password/forgot` | Initiates password-reset flow (always returns `202` regardless of whether the email exists — no enumeration). Triggers mandatory OTP step per Document 4 §5.2. |
| `POST` | `/auth/password/reset` | Completes reset given a valid reset token/OTP + new password (checked against breached-password corpus and history-of-5). |
| `POST` | `/auth/password/change` | Authenticated in-session password change; triggers global session revocation on all *other* sessions. |
| `POST` | `/auth/2fa/setup` | Begins TOTP enrollment; returns provisioning URI/QR payload + 10 single-use backup codes. |
| `POST` | `/auth/2fa/verify` | Confirms enrollment (first code) or performs step-up verification (subsequent logins) for TOTP-mandated roles. |
| `POST` | `/auth/2fa/disable` | Disables TOTP (blocked entirely for roles where 2FA is tenant-mandated, per Document 4 §5.4). |
| `POST` | `/auth/2fa/backup-codes/regenerate` | Invalidates and reissues the 10 backup codes. |
| `GET` | `/auth/me` | Returns the authenticated user's profile, active role(s), tenant, and module-enablement flags — the primary bootstrap call the frontend makes on load. |
| `GET` | `/auth/sessions` | Lists the authenticated user's active sessions (device, IP-derived location, first/last-seen). |
| `DELETE` | `/auth/sessions/:id` | Remotely revokes a specific session (self-service, or Institution Admin acting on a tenant user). |

---

## 5. Tenant / Institution Provisioning Endpoints

### 5.1 Platform-level (Super Admin only, `super_admin` role, platform-prefixed — not tenant-resolved)

| Method | Path | Purpose | Permission |
|---|---|---|---|
| `GET` | `/platform/tenants` | List all tenants (search/filter by plan, status, segment) | `platform:tenants:read` |
| `POST` | `/platform/tenants` | Provision a new tenant (used internally by `/auth/signup` for self-serve, and directly by Pragyaan Labs ops for assisted Enterprise onboarding) | `platform:tenants:write` |
| `GET` | `/platform/tenants/:id` | Tenant detail (plan, usage, billing status) | `platform:tenants:read` |
| `PATCH` | `/platform/tenants/:id` | Update plan/tier, quotas, feature flags | `platform:tenants:write` |
| `POST` | `/platform/tenants/:id/suspend` | Suspend tenant access (billing failure, ToS violation) | `platform:tenants:approve` |
| `POST` | `/platform/tenants/:id/activate` | Reactivate a suspended tenant | `platform:tenants:approve` |
| `POST` | `/platform/tenants/:id/breakglass-session` | Open a time-boxed, reason-logged Super Admin support session into tenant data (Document 4 §4.2) | `platform:tenants:approve` |

### 5.2 Setup wizard (tenant-scoped, `institution_admin`)

Drives the guided first-run experience ("Institution Name" → working dashboard in under 15 minutes, per the product's onboarding target). Each step is independently callable/re-callable; `GET /setup/status` drives the wizard's progress UI.

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/setup/status` | Current wizard progress — which steps are complete |
| `POST` | `/setup/institution` | Basic institution profile: name, type (K-12/college/university/coaching), timezone, locale, currency |
| `POST` | `/setup/campuses` | Create initial campus(es) |
| `POST` | `/setup/academic-year` | Create the current `academic_years` record and term structure |
| `POST` | `/setup/departments-programs` | Bulk-seed initial departments/programs (or skip — can be done later under Section 6.3) |
| `POST` | `/setup/modules` | Enable/disable modules per the tenant's plan (`tenant_module_config`) |
| `POST` | `/setup/roles` | Invite initial staff (Principal/Registrar/Accountant/etc.) with role assignment |
| `POST` | `/setup/branding` | Logo, theme color, (Enterprise) custom domain request |
| `POST` | `/setup/complete` | Marks onboarding complete, unlocks the full dashboard |

### 5.3 Institution config (ongoing, tenant-scoped)

| Method | Path | Purpose | Permission |
|---|---|---|---|
| `GET`/`PATCH` | `/institutions/:id` | Institution profile | `settings:institution:read` / `write` |
| `GET`/`POST`/`PATCH`/`DELETE` | `/campuses`, `/campuses/:id` | Campus CRUD (multi-campus tenants) | `settings:campus:*` |
| `GET`/`POST`/`PATCH`/`DELETE` | `/academic-years`, `/academic-years/:id` | Academic year/term CRUD | `settings:academic_year:*` |
| `GET`/`PATCH` | `/settings/tenant` | Tenant-level config: locale, timezone, currency, grading scheme, week structure | `settings:tenant:read` / `write` |
| `GET`/`PATCH` | `/settings/modules` | Module enablement toggles within plan allowance | `settings:modules:write` |

---

## 6. Full Endpoint Catalog — Modules

Conventions used throughout this section:
- All paths are relative to `/api/v1`.
- Every list endpoint supports the pagination/filter/sort conventions of Section 1.3–1.4; omitted from each row for brevity.
- Permission strings follow the `module:resource:action` grammar with the closed action vocabulary `read | write | delete | approve | export | publish` (Document 4 §1.2). `write` covers both create and update — `POST`/`PATCH` on the same resource share a permission string unless a state-transition action warrants `approve`/`publish` instead.
- "Key fields" lists the fields most relevant to the operation, not the full schema (see Document 3 for complete column lists).

### 6.1 Students

| Method | Path | Purpose | Permission | Key request/response fields |
|---|---|---|---|---|
| `GET` | `/students` | List/search students | `students:profile:read` | filters: `status`, `program_id`, `section_id`, `campus_id`, `q` |
| `POST` | `/students` | Create a student record directly (non-admission-flow path, e.g. bulk migration) | `students:profile:write` | `first_name`, `last_name`, `date_of_birth`, `gender`, `admission_number`, `current_program_id`, `current_section_id`, `enrollment_date` |
| `GET` | `/students/:id` | Get student detail | `students:profile:read` | full `students` row + nested `guardians` summary |
| `PATCH` | `/students/:id` | Update student profile fields | `students:profile:write` | any mutable field except `status` (use action endpoints below) |
| `DELETE` | `/students/:id` | Soft-delete (retains for compliance retention) | `students:profile:delete` | — |
| `POST` | `/students/:id/admit` | Finalize admission from an `admissions` record; sets `status=active`, publishes `student.admitted` (Section 7) | `students:profile:approve` | `{ "admission_id": "...", "enrollment_date": "2026-08-01" }` |
| `POST` | `/students/:id/transfer` | Change program/section/campus mid-term | `students:profile:write` | `{ "new_section_id", "effective_date", "reason" }` |
| `POST` | `/students/:id/suspend` | Disciplinary/administrative suspension | `students:profile:approve` | `{ "reason", "effective_date", "review_date" }` |
| `POST` | `/students/:id/reinstate` | Reverses a suspension | `students:profile:approve` | `{ "reason" }` |
| `POST` | `/students/:id/graduate` | Marks `status=graduated`, triggers transcript finalization + `alumni` record creation | `students:profile:approve` | `{ "graduation_date" }` |
| `POST` | `/students/:id/create-login` | Provisions the `users` row + credential-setup invite (also fires automatically off `student.admitted`, Section 7) | `students:profile:write` | `{ "contact_email" }` → `{ "user_id", "invite_sent": true }` |
| `GET`/`POST` | `/students/:id/guardians` | List / link a guardian | `students:profile:read` / `write` | `relation_type`, `is_primary_contact`, `is_fee_payer` |
| `PATCH`/`DELETE` | `/students/:id/guardians/:guardian_id` | Update / unlink guardian relationship | `students:profile:write` / `delete` | — |
| `GET`/`POST` | `/students/:id/documents` | List / attach a document (paired with presigned upload, Section 9) | `students:profile:read` / `write` | `document_type`, `object_key`, `verification_status` |
| `DELETE` | `/students/:id/documents/:doc_id` | Remove a document | `students:profile:delete` | — |
| `GET` | `/students/:id/attendance-summary` | Rolled-up attendance % by subject/term | `students:profile:read` | — |
| `GET` | `/students/:id/fee-summary` | Cross-module read of invoice/payment status | `fees:invoice:read` | outstanding balance, next due date |
| `GET` | `/students/:id/id-card` | Current ID card record | `students:profile:read` | `card_number`, `qr_code_data`, `valid_until` |
| `POST` | `/students/:id/id-card/issue` | Issues/reissues the ID card | `students:profile:write` | — |
| `POST` | `/students/export` | Async bulk export (Section 10) | `students:profile:export` | filters as body → job resource |
| `POST` | `/students/import` | Async bulk CSV import (Section 10) | `students:profile:write` | file ref → job resource |

**Admissions** (feeds `students:profile:approve` via `/students/:id/admit`):

| Method | Path | Purpose | Permission |
|---|---|---|---|
| `GET`/`POST` | `/admissions` | List / submit an application (public `guest`-role submission uses a scoped, unauthenticated variant of `POST`) | `admissions:application:read` / `write` |
| `GET`/`PATCH` | `/admissions/:id` | Detail / edit an application | `admissions:application:read` / `write` |
| `POST` | `/admissions/:id/schedule-entrance` | Schedules entrance test/interview | `admissions:application:write` |
| `POST` | `/admissions/:id/shortlist` | Moves to `shortlisted` | `admissions:application:approve` |
| `POST` | `/admissions/:id/offer` | Moves to `offered` | `admissions:application:approve` |
| `POST` | `/admissions/:id/accept` \| `/reject` \| `/withdraw` | Applicant/registrar-side decision | `admissions:application:approve` |
| `POST` | `/admissions/:id/convert-to-student` | Creates the `students` row and chains into `/students/:id/admit` | `admissions:application:approve` |

### 6.2 Faculty

| Method | Path | Purpose | Permission |
|---|---|---|---|
| `GET` | `/faculty` | List/search faculty | `faculty:profile:read` |
| `POST` | `/faculty` | Create faculty record | `faculty:profile:write` |
| `GET` | `/faculty/:id` | Get detail | `faculty:profile:read` |
| `PATCH` | `/faculty/:id` | Update profile | `faculty:profile:write` |
| `DELETE` | `/faculty/:id` | Soft-delete | `faculty:profile:delete` |
| `POST` | `/faculty/:id/assign` | Assign to subject/section (`faculty_subject_sections`) | `faculty:profile:write` |
| `DELETE` | `/faculty/:id/assign/:assignment_id` | Remove an assignment | `faculty:profile:write` |
| `POST` | `/faculty/:id/resign` \| `/retire` | Status transition, sets `date_of_leaving` | `faculty:profile:approve` |
| `GET`/`POST` | `/faculty/:id/leaves` | List / apply for leave | `faculty:profile:read` / `write` |
| `POST` | `/faculty/:id/leaves/:leave_id/approve` \| `/reject` | HOD/HR sign-off | `faculty:profile:approve` |
| `GET`/`POST` | `/faculty/:id/performance-reviews` | List / record an appraisal cycle result | `faculty:profile:read` / `write` |
| `POST` | `/faculty/export` | Async bulk export | `faculty:profile:export` |
| `POST` | `/faculty/import` | Async bulk CSV import | `faculty:profile:write` |

### 6.3 Academics

| Method | Path | Purpose | Permission |
|---|---|---|---|
| `GET`/`POST`/`PATCH`/`DELETE` | `/departments`, `/departments/:id` | Department CRUD | `academics:department:*` |
| `GET`/`POST`/`PATCH`/`DELETE` | `/programs`, `/programs/:id` | Program CRUD | `academics:program:*` |
| `GET`/`POST`/`PATCH`/`DELETE` | `/courses`, `/courses/:id` | Course CRUD | `academics:course:*` |
| `GET`/`POST`/`PATCH`/`DELETE` | `/subjects`, `/subjects/:id` | Subject CRUD | `academics:subject:*` |
| `GET`/`POST`/`PATCH`/`DELETE` | `/sections`, `/sections/:id` | Section CRUD | `academics:section:*` |
| `GET`/`POST`/`PATCH`/`DELETE` | `/semesters`, `/semesters/:id` | Semester CRUD | `academics:semester:*` |
| `GET`/`POST`/`PATCH`/`DELETE` | `/curricula`, `/curricula/:id` | Curriculum version CRUD | `academics:curriculum:*` |
| `POST` | `/curricula/:id/publish` | `draft → active`, locks the version for the effective academic year | `academics:curriculum:publish` |
| `GET`/`POST`/`PATCH`/`DELETE` | `/timetables`, `/timetables/:id` | Timetable slot CRUD | `academics:timetable:*` |
| `POST` | `/timetables/generate` | AI-assisted conflict-free timetable draft generation (Document 2 IA reference) | `academics:timetable:write` |
| `POST` | `/timetables/validate` | Conflict-check a proposed timetable without saving | `academics:timetable:read` |

### 6.4 Attendance

| Method | Path | Purpose | Permission |
|---|---|---|---|
| `GET` | `/attendance` | Query attendance records (cursor-paginated, Section 1.3) | `attendance:record:read` |
| `POST` | `/attendance/mark` | Mark attendance for a section/date — accepts an array of `{ student_id, status }` | `attendance:record:write` |
| `PATCH` | `/attendance/:id` | Correct a single entry | `attendance:record:write` |
| `POST` | `/attendance/:id/approve` | Faculty/HOD sign-off on TA-marked entries (segregation of duties, Document 4 footnote 6) | `attendance:record:approve` |
| `GET` | `/attendance/summary` | Aggregate % by student/section/subject/date-range | `attendance:record:read` |
| `POST` | `/attendance/bulk-import` | CSV import (biometric-device export reconciliation), async (Section 10) | `attendance:record:write` |

### 6.5 Examinations

| Method | Path | Purpose | Permission |
|---|---|---|---|
| `GET`/`POST`/`PATCH`/`DELETE` | `/exams`, `/exams/:id` | Exam CRUD | `examinations:exam:*` |
| `POST` | `/exams/:id/schedule` | Creates `exam_schedules` rows (subject × section sittings) | `examinations:exam:write` |
| `POST` | `/exams/:id/generate-hall-tickets` | Bulk-generates `hall_tickets`, applies eligibility rules (fee/attendance/disciplinary blocks) | `examinations:hall_ticket:write` |
| `GET` | `/exams/:id/hall-tickets` | List generated hall tickets | `examinations:hall_ticket:read` |
| `POST` | `/exams/:id/publish-results` | Locks `marks`/`grades`, sets `exams.status=results_published`, publishes `exam.result.published` (Section 7) | `examinations:results:publish` |
| `GET` | `/exams/:id/results` | Results view (per-section/per-subject breakdown) | `examinations:results:read` |
| `GET`/`POST`/`PATCH`/`DELETE` | `/exam-schedules`, `/exam-schedules/:id` | Per-subject sitting CRUD | `examinations:schedule:*` |
| `GET`/`POST` | `/exam-schedules/:id/marks` | List / bulk-enter marks for a sitting | `examinations:marks:read` / `write` |
| `PATCH` | `/exam-schedules/:id/marks/:marks_id` | Correct a single mark entry (pre-publish only) | `examinations:marks:write` |
| `POST` | `/exam-schedules/:id/marks/:marks_id/moderate` | Faculty/HOD moderation sign-off on TA-entered marks | `examinations:marks:approve` |
| `POST` | `/marks/:id/revaluation-request` | Student self-service request (own-record scope) | `examinations:marks:write` |
| `POST` | `/marks/:id/revalue` | Records revaluation outcome | `examinations:marks:approve` |
| `GET`/`POST`/`PATCH`/`DELETE` | `/question-banks`, `/question-banks/:id` | Question bank CRUD | `examinations:question_bank:*` |
| `GET`/`POST`/`PATCH`/`DELETE` | `/question-papers`, `/question-papers/:id` | Question paper CRUD | `examinations:question_paper:*` |
| `POST` | `/question-papers/:id/approve` | `draft → approved` | `examinations:question_paper:approve` |
| `GET` | `/students/:id/transcript` | Latest/cumulative transcript | `examinations:transcript:read` |
| `POST` | `/students/:id/transcript/generate` | Computes SGPA/CGPA, generates PDF | `examinations:transcript:write` |

### 6.6 Fees & Finance

| Method | Path | Purpose | Permission |
|---|---|---|---|
| `GET`/`POST`/`PATCH`/`DELETE` | `/fee-structures`, `/fee-structures/:id` | Fee structure + line-item CRUD | `fees:structure:*` |
| `POST` | `/fee-structures/:id/publish` | `draft → active` | `fees:structure:publish` |
| `GET`/`POST` | `/invoices` | List / create invoices (usually system-generated off a fee structure, but directly creatable for ad hoc charges) | `fees:invoice:read` / `write` |
| `GET`/`PATCH` | `/invoices/:id` | Detail / edit (pre-payment only) | `fees:invoice:read` / `write` |
| `POST` | `/invoices/:id/approve` | Approves a manually-adjusted or waived invoice | `fees:invoice:approve` |
| `POST` | `/invoices/:id/waive` | Applies a full/partial waiver (scholarship linkage) | `fees:invoice:approve` |
| `POST` | `/invoices/:id/cancel` | Cancels an unpaid invoice | `fees:invoice:approve` |
| `GET` | `/invoices/:id/payments` | Payment history for an invoice | `fees:payment:read` |
| `POST` | `/payments` | Initiates a payment (creates a gateway payment intent/order) | `fees:payment:write` |
| `GET` | `/payments/:id` | Payment status/detail | `fees:payment:read` |
| `POST` | `/payments/:id/refund` | Initiates a refund | `fees:payment:approve` |
| `GET` | `/receipts/:id` \| `/receipts/:id/pdf` | Receipt detail / signed PDF | `fees:invoice:read` |
| `GET`/`POST` | `/scholarships` | List / award a scholarship | `fees:scholarship:read` / `write` |
| `POST` | `/scholarships/:id/approve` | Sign-off | `fees:scholarship:approve` |
| `POST` | `/invoices/export` \| `/payments/export` | Async bulk export | `fees:invoice:export` |
| `GET`/`POST` | `/payroll-runs` | List / create a payroll batch | `fees:payroll:read` / `write` (dual-owned with HR, Document 4 §3.3) |
| `POST` | `/payroll-runs/:id/process` | Computes payroll batch | `fees:payroll:write` |
| `POST` | `/payroll-runs/:id/approve` | Segregation-of-duties sign-off (HR/Institution Admin, not the preparing Accountant) | `fees:payroll:approve` |

### 6.7 Remaining modules — core CRUD + key actions

The following modules follow the identical CRUD shape (`GET` list, `POST` create, `GET /:id`, `PATCH /:id`, `DELETE /:id`) on their primary resource(s); only the resource set and special actions are listed.

**Library** (`librarian`-owned)

| Method | Path | Purpose | Permission |
|---|---|---|---|
| CRUD | `/library/books`, `/library/books/:id` | Catalog management | `library:catalog:*` |
| `POST` | `/library/circulation/issue` | Issue a book to a student/faculty member | `library:circulation:write` |
| `POST` | `/library/circulation/:id/return` | Process a return, computes fine if overdue | `library:circulation:write` |
| `POST` | `/library/circulation/:id/renew` | Extend due date | `library:circulation:write` |
| `GET` | `/library/circulation/overdue` | Overdue report | `library:circulation:read` |

**Hostel** (`hostel_warden`-owned)

| Method | Path | Purpose | Permission |
|---|---|---|---|
| CRUD | `/hostel/rooms`, `/hostel/rooms/:id` | Room/block inventory | `hostel:room:*` |
| CRUD | `/hostel/allocations`, `/hostel/allocations/:id` | Allocation records | `hostel:allocation:*` |
| `POST` | `/hostel/allocations/:id/vacate` | Ends an allocation | `hostel:allocation:write` |
| `GET` | `/hostel/occupancy-report` | Occupancy % by block | `hostel:room:read` |

**Transport** (`transport_manager`-owned)

| Method | Path | Purpose | Permission |
|---|---|---|---|
| CRUD | `/transport/routes`, `/transport/routes/:id` | Route/stop management | `transport:route:*` |
| CRUD | `/transport/vehicles`, `/transport/vehicles/:id` | Vehicle/driver assignment | `transport:route:*` |
| CRUD | `/transport/passes`, `/transport/passes/:id` | Student route-allocation passes | `transport:pass:*` |
| `POST` | `/transport/passes/:id/revoke` | Cancels a pass | `transport:pass:write` |

**HR** (`hr_manager`-owned)

| Method | Path | Purpose | Permission |
|---|---|---|---|
| CRUD | `/hr/employees`, `/hr/employees/:id` | Staff records (non-teaching + shared linkage with `faculty`) | `hr:employee:*` |
| CRUD | `/hr/job-postings`, `/hr/job-postings/:id` | Internal recruitment postings | `hr:recruitment:*` |
| `GET`/`POST` | `/hr/employees/:id/leaves` | Leave application | `hr:employee:read` / `write` |
| `POST` | `/hr/employees/:id/leaves/:leave_id/approve` | Sign-off | `hr:employee:approve` |

**Placement** (`placement_officer`-owned)

| Method | Path | Purpose | Permission |
|---|---|---|---|
| CRUD | `/placement/drives`, `/placement/drives/:id` | Company/drive management | `placement:drive:*` |
| `POST` | `/placement/drives/:id/publish` | Opens applications to eligible students | `placement:drive:publish` |
| CRUD | `/placement/applications`, `/placement/applications/:id` | Student applications | `placement:application:*` |
| `POST` | `/placement/applications/:id/shortlist` \| `/offer` | Selection stages | `placement:application:approve` |

**Research** (`researcher`-owned)

| Method | Path | Purpose | Permission |
|---|---|---|---|
| CRUD | `/research/projects`, `/research/projects/:id` | Research project management | `research:project:*` |
| `POST` | `/research/projects/:id/submit-for-approval` | Sends to institutional review | `research:project:write` |
| `POST` | `/research/projects/:id/approve` | Institutional sign-off | `research:project:approve` |
| CRUD | `/research/publications`, `/research/publications/:id` | Publication records (shared `author_id` linkage to faculty/researchers per Document 3) | `research:publication:*` |

**Communication**

| Method | Path | Purpose | Permission |
|---|---|---|---|
| CRUD | `/communication/announcements`, `/:id` | Institution/campus/section-scoped announcements | `communication:announcement:*` |
| `POST` | `/communication/announcements/:id/publish` | Publishes and fans out notifications | `communication:announcement:publish` |
| `POST` | `/communication/notifications/send` | Direct/targeted notification send (system or staff-initiated) | `communication:notification:write` |
| `GET` | `/communication/notifications` | Authenticated user's own inbox | `communication:notification:read` (self scope) |
| `POST` | `/communication/notifications/:id/mark-read` | Marks read | `communication:notification:write` (self scope) |

**AI Assistant**

| Method | Path | Purpose | Permission |
|---|---|---|---|
| `GET`/`POST` | `/ai/conversations` | List / start a conversation thread | `ai:assistant:read` / `write` |
| `POST` | `/ai/conversations/:id/messages` | Send a message (streaming response via SSE/chunked transfer) | `ai:assistant:write` |
| `GET`/`POST` | `/ai/insights` | List / trigger generation of a proactive insight (e.g. at-risk-student flag) | `ai:insight:read` / `write` |
| `POST` | `/ai/insights/:id/dismiss` | User feedback loop | `ai:insight:write` |

**Analytics & Reports**

| Method | Path | Purpose | Permission |
|---|---|---|---|
| `GET` | `/analytics/dashboards/:slug` | Pre-built role dashboard data | `analytics:report:read` |
| CRUD | `/analytics/reports`, `/analytics/reports/:id` | Custom report definitions | `analytics:report:*` |
| `GET` | `/analytics/reports/:id/run` | Executes and returns results | `analytics:report:read` |
| `POST` | `/analytics/reports/:id/export` | Async export (PDF/XLSX/CSV) | `analytics:report:export` |
| `POST` | `/graphql` | Ad-hoc read-only cross-entity querying (Section 1.7) | scoped per-field to the caller's existing `*:*:read` grants |

**Settings**

| Method | Path | Purpose | Permission |
|---|---|---|---|
| CRUD | `/settings/users`, `/settings/users/:id` | Tenant user/staff account management, role assignment (`user_roles`) | `settings:users:*` |
| `POST` | `/settings/users/:id/roles` | Assigns an additional role to a user | `settings:roles:write` |
| `DELETE` | `/settings/users/:id/roles/:role_id` | Revokes a role | `settings:roles:write` |
| `GET`/`PATCH` | `/settings/modules` | Module enablement | `settings:modules:write` |
| `GET` | `/settings/audit-logs` | Audit log query (cursor-paginated) | `settings:audit:read` (Institution Admin default; Compliance Officer grant per Document 4 §9.3) |
| CRUD | `/settings/custom-fields` | Tenant-defined custom fields (Enterprise, Phase 3) | `settings:custom_fields:*` |
| CRUD | `/settings/webhooks` | Outbound webhook subscriptions (Section 8) | `settings:webhooks:*` |

---

## 7. Internal Event Bus / Webhook Design

Cross-module workflows (like the Admission Flow) are **not** implemented as one service directly calling five others synchronously — that would couple every module to every other module's availability and create a request that blocks on the slowest downstream step. Instead, state-changing API operations publish **domain events** to an internal event bus; interested services subscribe and react independently, asynchronously, and idempotently. (Transport technology — Kafka, SNS/SQS, Redis Streams, etc. — is a Backend Architecture decision, Document 5; this document defines the **contract**: event names, envelope shape, and delivery guarantees, which is stable regardless of the underlying transport.)

### 7.1 Naming convention

```
{module}.{entity}.{action, past tense}
```

Examples: `student.admitted`, `fee.invoice.created`, `fee.paid`, `exam.result.published`, `attendance.marked`, `hostel.allocation.requested`, `library.account.created`, `payment.succeeded`, `user.created`.

### 7.2 Event envelope

```json
{
  "event_id": "evt_01J3ZK9Q7X8YB2C4D5E6F7G8H9",
  "event_type": "student.admitted",
  "event_version": 1,
  "tenant_id": "3f1e2a4b-...",
  "occurred_at": "2026-07-31T09:25:00Z",
  "actor": { "user_id": "d81a...", "role": "registrar" },
  "data": {
    "student_id": "8f14e45f-...",
    "admission_id": "c72b...",
    "program_id": "b2d4...",
    "section_id": "a913...",
    "campus_id": "e001...",
    "enrollment_date": "2026-08-01",
    "requested_services": { "hostel": true, "transport": false }
  }
}
```

- **Delivery guarantee**: at-least-once. Every consumer is required to be **idempotent** on `event_id` (dedup table/cache) — duplicate delivery must never double-create a fee invoice or double-send a welcome email.
- **Ordering**: guaranteed only within a single `event_type` + `tenant_id` partition, not globally — consumers must not assume cross-event-type ordering.
- **Versioning**: `event_version` increments on a breaking payload change to that event type; consumers pin to the version(s) they understand, mirroring the API's own versioning philosophy (Section 1.2).

### 7.3 Admission Flow — event chain

Maps directly to the foundational Admission Flow trigger chain (create student → fee record → library account → hostel/transport (optional) → ID card → student login):

| Step | Trigger (API call) | Event published | Subscriber(s) | Downstream effect |
|---|---|---|---|---|
| 1 | `POST /admissions/:id/convert-to-student` → `POST /students/:id/admit` | `student.admitted` | fee-service, library-service, hostel-service*, transport-service*, id-card-service, auth-service | fan-out begins |
| 2 | (async, fee-service) | `fee.invoice.created` | notification-service | Invoice-created email/SMS to guardian |
| 3 | (async, library-service) | `library.account.created` | notification-service | Library account confirmation |
| 4 | (async, hostel-service, only if `requested_services.hostel`) | `hostel.allocation.requested` | notification-service | Pending-allocation notice to Hostel Warden queue |
| 5 | (async, transport-service, only if `requested_services.transport`) | `transport.pass.requested` | notification-service | Pending-pass notice to Transport Manager queue |
| 6 | (async, id-card-service, waits on steps 1–5 reaching a terminal state via a saga/orchestration step) | `idcard.issued` | notification-service | ID card ready / print-queue entry |
| 7 | (async, auth-service, off `student.admitted` directly — not gated on the others) | `user.created` | notification-service | Credential-setup invite (email + OTP) sent to student/guardian |

`*` optional legs, gated on `data.requested_services` in the triggering event — a service that finds the flag `false`/absent simply no-ops (still consumes the event for observability/audit purposes, publishes nothing).

This event-driven fan-out is what lets each downstream module (fees, library, hostel, transport, ID cards, auth) evolve, deploy, and scale independently while the Admission Flow's end-to-end behavior stays consistent — and it's the same pattern used for the other lifecycle chains (`exam.result.published` → transcript-service regenerates transcripts + notification-service alerts guardians; `fee.paid` → library-service lifts any fee-hold on circulation, hostel-service lifts any fee-hold on room retention).

### 7.4 Representative event catalog

| Event | Publisher | Typical subscribers |
|---|---|---|
| `student.admitted` | students-service | fee, library, hostel, transport, id-card, auth, notification |
| `student.suspended` / `student.graduated` | students-service | auth (session revocation on suspend), notification, transcript (on graduate) |
| `fee.invoice.created` | fee-service | notification |
| `fee.paid` | fee-service (off `payment.succeeded`) | library (lift hold), hostel (lift hold), notification, analytics |
| `attendance.marked` | attendance-service | analytics (AI at-risk-student scoring) |
| `exam.result.published` | examinations-service | transcript-service, notification, analytics |
| `library.book.overdue` | library-service (scheduled job) | notification |
| `hostel.allocation.created` | hostel-service | notification, id-card (room number on card, if applicable) |
| `payment.succeeded` / `payment.failed` | payments-service (off gateway webhook, Section 8) | fee-service, notification, analytics |
| `user.created` | auth-service | notification |

---

## 8. Outbound Webhooks — External Integrations

Two distinct directions, not to be confused:

### 8.1 Inbound: third-party → Sutram (gateway callbacks)

External providers notify Sutram of asynchronous state changes via signed webhook receivers:

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/webhooks/payments/:gateway` | Payment gateway callback (Razorpay, Stripe, PayU, etc.) — signature-verified via the gateway's shared secret (never bearer-auth'd, since the caller is not a Sutram user). Maps gateway status to internal `payment.succeeded` / `payment.failed` events, which fee-service and notification-service consume. |
| `POST` | `/webhooks/messaging/:provider` | SMS/WhatsApp delivery-status callbacks (Twilio, Gupshup, MSG91, etc.) — updates the originating `notifications` row's delivery status (`sent`/`delivered`/`failed`/`read`), signature-verified per provider. |
| `POST` | `/webhooks/sso/:provider/slo` | (Enterprise SAML) Single Logout callback from the IdP. |

All inbound webhook receivers: verify signature first (reject unsigned/invalid before any processing), respond `200` fast (processing is handed off asynchronously to avoid provider-side timeout retries), and are themselves idempotent on the provider's own delivery-id to tolerate the provider's at-least-once redelivery behavior.

### 8.2 Outbound: Sutram → tenant-registered endpoints (Enterprise / Marketplace)

For Enterprise tenants and API Marketplace partners (Section 12) who want push notification of Sutram-side events into their own systems (e.g. a trust's central ERP wanting to know the instant a fee is paid across any of its member institutions):

| Method | Path | Purpose | Permission |
|---|---|---|---|
| `GET`/`POST` | `/settings/webhooks` | List / register a webhook subscription (`target_url`, `event_types[]`, `secret`) | `settings:webhooks:read` / `write` |
| `PATCH`/`DELETE` | `/settings/webhooks/:id` | Update / remove a subscription | `settings:webhooks:write` / `delete` |
| `GET` | `/settings/webhooks/:id/deliveries` | Delivery log (cursor-paginated): status, response code, latency, retry count | `settings:webhooks:read` |
| `POST` | `/settings/webhooks/:id/test` | Sends a synthetic test event | `settings:webhooks:write` |

**Delivery contract**: `POST` to `target_url` with the same event envelope as Section 7.2, header `X-Sutram-Signature: sha256=<hmac>` (HMAC-SHA256 over the raw body using the subscription's `secret`) and `X-Sutram-Event-Type`. Retry policy: exponential backoff over 24 hours (e.g. 1m, 5m, 30m, 2h, 6h, 24h), then the delivery is marked `failed` and surfaced in the deliveries log for the tenant to investigate — Sutram does not silently drop failed deliveries.

---

## 9. File Upload Endpoints

All binary content (documents, profile photos, generated PDFs) is stored in S3-compatible object storage, never proxied through the application API as raw bytes. The API only ever hands out **presigned URLs**.

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/uploads/presign` | Requests a presigned upload target. Body: `{ "entity_type": "student_document", "entity_id": "...", "file_name": "transfer_certificate.pdf", "content_type": "application/pdf", "purpose": "admission_document" }`. Returns `{ "upload_url", "upload_fields" (for POST-form-based S3 upload) or "headers" (for PUT-based), "object_key", "expires_in": 900 }`. |
| — | *(client uploads directly)* | Client `PUT`s/`POST`s the file bytes straight to the object store using the presigned URL — never touches the Sutram API gateway with the file payload. Short TTL (15 min) limits exposure of an unused presigned URL. |
| `POST` | `/uploads/:object_key/finalize` | Registers the completed upload as a `documents` (or entity-specific) row, triggers async virus scan + file-type/size validation; the record is `pending_verification` until the scan completes. |
| `GET` | `/documents/:id/download-url` | Returns a short-TTL (5 min) presigned **GET** URL for viewing/downloading a previously uploaded file — access-controlled by the same permission the underlying entity requires (e.g. a student document inherits `students:profile:read` scope). |
| `POST` | `/students/:id/photo/presign` \| `/faculty/:id/photo/presign` | Convenience wrappers around `/uploads/presign` scoped to `purpose: "profile_photo"`, with server-side constraints (image-only content types, max 5MB, auto-generates a thumbnail variant on finalize). |

Rejected/oversized/wrong-content-type finalize attempts return `422 validation_error`; a failed virus scan sets the document to `rejected` and never becomes downloadable.

---

## 10. Bulk Operations & Import/Export

Bulk operations follow a uniform **async job pattern** — the initiating call never blocks on the full operation, avoiding gateway timeouts on large files and giving the client a resumable, pollable, and webhook-notifiable handle.

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/students/import` \| `/faculty/import` | Accepts a CSV (via a prior presigned upload, Section 9, referenced by `object_key`) plus a column-mapping spec. Returns `202` + `{ "job_id", "status": "queued" }`. |
| `POST` | `/attendance/bulk-mark` | Synchronous for typical section-sized batches (≤300 rows); above that, accepts the same payload asynchronously via `/attendance/bulk-import`. |
| `POST` | `/exam-schedules/:id/marks/bulk-import` | CSV mark upload for a sitting. |
| `GET` | `/imports/:job_id` | Job status: `queued \| processing \| completed \| completed_with_errors \| failed`, `rows_processed`, `rows_failed`. |
| `GET` | `/imports/:job_id/errors` | Downloadable row-level error report (which rows failed, why — e.g. duplicate `admission_number`, invalid `date_of_birth`). |
| `POST` | `/students/export` \| `/faculty/export` \| `/invoices/export` \| `/payments/export` \| `/attendance/export` | Initiates an async export (filters as body). Returns `202` + job resource. |
| `GET` | `/exports/:job_id` | Job status; on `completed`, includes a short-TTL presigned `download_url` (CSV/XLSX). |

Completion of either job type also publishes an internal event (`import.completed`, `export.completed`) so the frontend can be pushed a real-time update (via the notification/websocket channel, Document 5) rather than requiring the client to poll — polling remains supported as the fallback/mobile-friendly path.

**Validation model for imports**: partial success is allowed by default (`completed_with_errors`) — valid rows are committed, invalid rows are reported individually, rather than an all-or-nothing transaction that would force re-uploading an entire 5,000-row file over one bad row. A `strict=true` flag on the import request opts into all-or-nothing behavior for tenants that require it.

---

## 11. Rate Limiting & Quotas by Pricing Tier

Enforced at the gateway (Document 4 §10.1); values below are the v1 baseline and are configurable per-tenant for negotiated Enterprise contracts.

| Dimension | Starter | Growth | Enterprise |
|---|---|---|---|
| Per-tenant requests/min | 300 | 1,000 | Custom (negotiated; typically 5,000+) |
| Per-user requests/min (standard roles) | 60 | 100 | 200 (configurable) |
| Bulk export/import — max concurrent jobs | 1 | 3 | 10+ |
| Bulk import — max rows per file | 5,000 | 25,000 | Unbounded (chunked processing) |
| AI Assistant — messages/month (platform default; Growth+ can add AI Assistant Pro) | Lightweight/rules-assisted only (per PRD tiering) | 2,000 pooled/tenant/month | Unlimited (fair-use monitored) |
| Analytics report executions/day | 20 | 200 | Unbounded (fair-use monitored) |
| Outbound webhook subscriptions | Not available | Not available | Up to 20 (Section 8.2) |
| GraphQL query complexity budget/request | — (module not enabled) | Standard | Elevated |
| API Marketplace API keys (Section 12) | Not available | Not available | Available, Phase 3 |

`429 rate_limited` responses include `Retry-After`; sustained/repeated violations escalate to temporary account/IP throttling beyond the standard window per Document 4 §10.1. Expensive endpoint classes (bulk export, report generation, AI inference) additionally carry their own stricter per-endpoint budget independent of the general per-user allowance, so a runaway report-generation script cannot starve a user's ordinary CRUD traffic.

---

## 12. Public API / API Marketplace (Phase 3)

Enterprise-tier feature (per the product tiering — API Marketplace ships alongside AI Assistant Pro, Placement, Research, and Multi-Campus console as part of the full Phase 3 platform). Not built in v1; this section captures the forward-compatible design intent so nothing in Sections 1–11 needs to change shape when it ships.

- **Audience**: Enterprise institutions building internal integrations (central ERP, legacy SIS data sync, custom BI), and eventually third-party partners (payment/ID-verification providers, regional government education-reporting systems) building on Sutram.
- **Authentication**: distinct from end-user JWTs. Partner/integration access uses **OAuth 2.0 client-credentials grant** — a registered API client (`client_id`/`client_secret` issued via a Developer Portal) exchanges credentials for a scoped, tenant-bound access token, same 15-minute TTL discipline as user JWTs, refreshed via the same client-credentials call (no refresh-token concept needed for machine clients).
- **Scopes**: coarser-grained than the internal `module:resource:action` permission strings, but drawn from the same vocabulary — e.g. a partner integration might be granted `students:profile:read` and `fees:invoice:read` only, never write/delete/approve scopes for a read-only reporting integration. Scope grants are configured per API client by the tenant's Institution Admin, and are additionally capped by what the platform allows a given partner-tier client to request (a marketplace-listed partner can't self-grant scopes beyond its approved integration category).
- **API keys**: for simpler server-to-server cases that don't need full OAuth (e.g. a webhook-only integration), a static API key (`Authorization: ApiKey <key>`) scoped identically, rotatable, revocable, and rate-limited independently from the tenant's normal user-traffic pool (Section 11) so partner integration load never competes with the tenant's own staff/student traffic.
- **Sandbox**: partners develop against a dedicated sandbox tenant with synthetic data before being approved for production tenant access — no partner integration is tested against real student/financial data.
- **Versioning & deprecation**: identical policy to Section 1.2, but marketplace partners additionally receive advance-notice emails and a dedicated changelog feed, given the higher cost of a partner integration breaking silently versus an internal frontend redeploying alongside a backend change.
- **Review/listing process**: partner integrations intended for the public marketplace listing (visible/installable by *other* Sutram tenants, not just the building tenant) go through a Pragyaan Labs review — security posture, scope minimality, data-handling terms — before public listing, distinct from private first-party integrations an Enterprise tenant builds solely for itself.
- **Rate limits**: separate pool from the tenant's own interactive traffic (Section 11), preventing a partner integration's polling behavior from ever degrading staff/student-facing UX.

---

*End of Document 7 — API Design. This document is the authoritative source for endpoint paths, permission-string-per-endpoint mapping, the response envelope shape, and the internal event-bus naming convention referenced by Document 5 (Backend Architecture) and Document 6/8 (Frontend Architecture).*
