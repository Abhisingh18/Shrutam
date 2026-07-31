# Sutram — Document 4: RBAC & Security Architecture

**Product:** Sutram — AI-powered, Multi-Tenant Education Operating System
**Company:** Pragyaan Labs
**Document owner:** Platform Security & Architecture
**Status:** Baseline for engineering implementation and SOC 2 / ISO 27001 readiness review
**Scope:** Full web application (native mobile app out of scope for this revision; API design must remain client-agnostic to allow a future mobile client to reuse the same authorization model)

---

## Table of Contents

1. [RBAC Model Overview](#1-rbac-model-overview)
2. [Full Role Catalog](#2-full-role-catalog)
3. [Complete Permission Matrix](#3-complete-permission-matrix)
4. [Tenant Isolation Model](#4-tenant-isolation-model)
5. [Authentication Mechanisms](#5-authentication-mechanisms)
6. [Authorization Enforcement Points](#6-authorization-enforcement-points)
7. [Data Protection](#7-data-protection)
8. [Compliance](#8-compliance)
9. [Audit Logging](#9-audit-logging)
10. [Rate Limiting & Abuse Prevention](#10-rate-limiting--abuse-prevention)
11. [Incident Response](#11-incident-response)

---

## 1. RBAC Model Overview

### 1.1 Model choice: RBAC core + ABAC-lite scoping

Sutram uses **Role-Based Access Control (RBAC) as the primary authorization model**, with an **Attribute-Based Access Control (ABAC-lite) scoping layer** applied on top for roles whose data visibility cannot be expressed by role membership alone.

**Why not pure RBAC:** A pure RBAC model would require a combinatorial explosion of roles to express organizational structure — e.g. "Faculty of Computer Science teaching Section B" vs. "Faculty of Mechanical teaching Section A" would need distinct roles per department/section pairing. This does not scale across tenants with arbitrary department/section structures.

**Why not pure ABAC:** A pure attribute/policy-engine model (e.g. fully dynamic Rego/OPA policies per tenant) is more flexible but materially harder to reason about, audit, test, and explain to non-technical institution admins during onboarding and compliance review. It also slows down the common case (90% of checks are "does this role have this permission at all").

**Sutram's approach:**

- A fixed, platform-defined **role catalog** (Section 2) grants a fixed, versioned **permission set** per role. Roles are **not freely composable by tenants** in v1 — this keeps the model auditable and matches SOC 2 expectations of least-privilege-by-default. Institution Admins may only enable/disable module access per role at the tenant level (e.g. turn off Research module entirely), not redefine what a role *can* do within an enabled module.
- Every permission check additionally carries a **scope attribute** resolved at request time from the user's assignment records: `tenant_id`, `campus_id`, `department_id`, `section_ids[]`, `student_id` (for Parent), `own_user_id` (for self-service). This is the ABAC-lite layer: the role answers "can this action happen at all," the scope attributes answer "on which rows."
- This hybrid is expressed everywhere as: **Role → Permission Set (RBAC) → filtered by Scope Predicate (ABAC-lite) → Row-Level Security (data layer)**.

### 1.2 Permission string convention

Every permission is a colon-delimited string with a fixed 3-segment grammar:

```
module:resource:action
```

- **module** — one of the 22 platform modules (Section 3), e.g. `students`, `fees`, `exams`.
- **resource** — the sub-entity within the module, e.g. `profile`, `invoice`, `grades`, `structure`.
- **action** — one of a closed vocabulary: `read`, `write` (create/update), `delete`, `approve` (state-transition / sign-off), `export`, `publish` (make visible to downstream consumers, e.g. publishing results to students).

**Examples:**

| Permission string | Meaning |
|---|---|
| `students:profile:read` | View a student's profile record |
| `fees:invoice:approve` | Approve/waive/finalize a fee invoice |
| `exams:grades:write` | Enter or edit exam marks |
| `results:publish` | Release results to students/parents (2-segment form used for module-level actions with no distinct resource) |
| `hr:payroll:approve` | Approve a payroll run |
| `settings:roles:write` | Modify role-to-permission or role-to-module mappings for the tenant |

Permission strings are stored as rows in a `permissions` reference table (platform-seeded, versioned via migration, never tenant-editable) and mapped to roles via a `role_permissions` join table. A role's effective permission set is the union of its `role_permissions` rows, additionally gated by which modules the tenant has enabled in `tenant_module_config`.

### 1.3 Effective authorization decision

```
allow = has_role_permission(user.role, "module:resource:action")
        AND module_enabled_for_tenant(tenant_id, module)
        AND scope_predicate_matches(user.scope_attributes, target_resource)
        AND row.tenant_id == request.tenant_id   (hard RLS backstop, Section 4)
```

All four conditions are independently evaluated; failure of any one denies the request. This is intentional defense in depth (Section 6) — no single layer is trusted alone.

---

## 2. Full Role Catalog

18 roles across platform and tenant levels. Scope legend: **Platform** = spans all tenants (Pragyaan Labs staff only) · **Tenant** = entire institution · **Campus** = one campus/branch within a multi-campus tenant · **Department** = one academic department · **Section** = assigned class-sections/courses only · **Self** = own record (and, for Parent, linked children's records) · **Public** = unauthenticated.

| # | Role name | Slug | Scope | Description |
|---|---|---|---|---|
| 1 | Super Admin | `super_admin` | Platform | Pragyaan Labs internal staff. Operates the control plane: tenant provisioning, plan/billing management, platform configuration, and cross-tenant support access. Does **not** have standing access to any tenant's academic/financial data — access to tenant data is break-glass, time-boxed, and fully audit-logged (Section 4.2). |
| 2 | Institution Owner/Admin | `institution_admin` | Tenant | The top-level administrator for a tenant, created at signup completion. Full control over the tenant's configuration, role assignments, module enablement, billing/subscription for the tenant, and read/write access to every module within the tenant. Delegates day-to-day operational control to Principal/Dean/Registrar/etc. |
| 3 | Principal | `principal` | Campus | Senior academic/administrative head of a school or campus (primary role for K-12; also used for single-campus colleges). Full authority over admissions decisions, academic calendar, staff oversight, attendance/exam policy, and results publication within their campus. Read access to campus-level finance summaries; not a finance approver by default. |
| 4 | Dean | `dean` | Campus | Higher-ed equivalent of Principal, scoped to a school/faculty within a university (e.g. Dean of Engineering). Full authority over academic programs, course/curriculum approval, HOD oversight, and faculty performance within their school. Used in university/college tenant types; coexists with Principal in tenants that model a central campus head plus per-school deans. |
| 5 | Registrar | `registrar` | Tenant | Owns the academic system of record: admissions processing, enrollment, course/subject catalog integrity, exam scheduling, and official results/transcript publication. Full read-write across Students, Courses, Subjects, Exams, Results; read-only on Finance/HR. |
| 6 | HOD (Head of Department) | `hod` | Department | Manages a single academic department: assigns faculty to sections, approves department-level attendance/exam data, oversees department course/subject content and Teaching Assistant/Researcher assignments. Full control limited strictly to their own `department_id`. |
| 7 | Faculty | `faculty` | Section | Teaching staff. Marks attendance, enters exam marks, manages subject content and communication for their **assigned sections/courses only**. Read-only, self-scoped access to their own HR/payroll profile. |
| 8 | Teaching Assistant | `teaching_assistant` | Section | Supports Faculty within assigned sections: can mark attendance and enter draft marks, but cannot approve/publish grades or manage course structure — those require Faculty/HOD sign-off. |
| 9 | Researcher | `researcher` | Section (project) | Non-teaching or teaching-adjacent research staff/scholars. Full control of their own research projects, grants, and publications in the Research module; read-only elsewhere (Library, own profile). |
| 10 | Accountant | `accountant` | Tenant | Owns Fees and Finance modules: fee structures, invoicing, payment reconciliation, ledgers, budget tracking, and payroll disbursement (payroll *approval* authority sits with HR/Institution Admin per segregation-of-duties). Read-only on Students (for billing contact/enrollment status). |
| 11 | HR | `hr_manager` | Tenant | Owns the HR module: staff records, contracts, leave, payroll approval, recruitment. Read-only on Faculty/Staff academic assignments; no access to student academic/financial data. |
| 12 | Hostel Warden | `hostel_warden` | Campus (hostel block) | Manages hostel room allocation, occupancy, discipline logs, and mess/facility records for their assigned hostel block(s). Read-only on resident student profiles. |
| 13 | Librarian | `librarian` | Tenant | Owns the Library module: catalog, circulation (issue/return/fines), acquisitions. Read-only on Student/Faculty profiles for the purpose of lending eligibility checks. |
| 14 | Placement Officer | `placement_officer` | Tenant | Owns the Placement module: company/drive management, eligibility criteria, offer tracking. Read access to final-year/eligible student academic records for eligibility screening. |
| 15 | Transport Manager | `transport_manager` | Tenant | Owns the Transport module: routes, vehicles, driver assignment, student route allocation. Read-only on student contact/address data for route planning. |
| 16 | Student | `student` | Self | End-user learner. Full self-service read access to own academic record (attendance, exams, results, fees, library loans, hostel/transport allocation, placement applications) and write access to own profile (limited fields), fee payments, and placement applications. Cannot see other students' individual records. |
| 17 | Parent | `parent` | Self (linked children) | Guardian account linked to one or more Student records via a verified guardian relationship. Read access to linked children's attendance, results, fee status, and communications; can make fee payments on their behalf. No access to other students or institution-wide data. |
| 18 | Guest | `guest` | Public | Unauthenticated or pre-enrollment prospect. Can view public institution pages, course catalog, and submit an admissions inquiry/application. No access to any authenticated module. |

**Note on role composition:** A person can hold multiple roles simultaneously (e.g. a Faculty member who is also a Parent), each evaluated independently — permissions are unioned, scopes remain per-role. Multi-role accounts trigger the **Role Detect** step in the login flow (Document 3) to select an active context/dashboard, switchable without re-authentication.

---

## 3. Complete Permission Matrix

**Legend:** `—` No access · `R` Read-only · `RW` Read-Write (create/update within scope) · `F` Full (includes delete/approve/publish/finalize authority)

**Role column codes:** SA=`super_admin` · IA=`institution_admin` · PR=`principal` · DN=`dean` · RG=`registrar` · HD=`hod` · FA=`faculty` · TA=`teaching_assistant` · RS=`researcher` · AC=`accountant` · HRM=`hr_manager` · HW=`hostel_warden` · LB=`librarian` · PO=`placement_officer` · TM=`transport_manager` · ST=`student` · PA=`parent` · GU=`guest`

### 3.1 Academic Core

| Module — Resource | SA | IA | PR | DN | RG | HD | FA | TA | RS | AC | HRM | HW | LB | PO | TM | ST | PA | GU |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Admissions — Applications | R¹ | F | F | RW | F | R | — | — | — | — | — | — | — | — | — | RW³ | R⁴ | RW⁸ |
| Admissions — Offer/Approval | R¹ | F | F | RW | F | — | — | — | — | — | — | — | — | — | — | R³ | R⁴ | — |
| Students — Profile | R¹ | F | RW⁵ | RW⁵ | RW | R¹ | R² | R² | — | R | — | R | R | R | R | RW³ | R⁴ | — |
| Students — Academic Records | R¹ | F | RW⁵ | RW⁵ | F | R¹ | R² | R² | — | — | — | — | — | R | — | R³ | R⁴ | — |
| Faculty — Profile/HR Record | R¹ | F | RW⁵ | RW⁵ | R | R¹ | RW³ | RW³ | RW³ | — | RW | — | — | — | — | — | — | — |
| Departments — Management | R¹ | F | F | F | RW | RW¹ | R¹ | — | — | — | — | — | — | — | — | — | — | — |
| Courses — Catalog | R¹ | F | RW | F | F | RW¹ | R² | R² | — | — | — | — | — | R | — | R | — | R⁸ |
| Subjects — Curriculum/Syllabus | R¹ | F | RW | RW | RW | RW¹ | RW² | R² | — | — | — | — | — | — | — | R | — | — |

### 3.2 Academic Operations

| Module — Resource | SA | IA | PR | DN | RG | HD | FA | TA | RS | AC | HRM | HW | LB | PO | TM | ST | PA | GU |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Attendance — Marking | — | F | RW⁵ | RW⁵ | R | RW¹ | RW² | RW² | — | — | — | — | — | — | — | R³ | R⁴ | — |
| Attendance — Reports | R¹ | F | R⁵ | R⁵ | R | R¹ | R² | R² | — | — | — | — | — | — | — | R³ | R⁴ | — |
| Exams — Scheduling | R¹ | F | RW⁵ | RW⁵ | F | RW¹ | R² | R² | — | — | — | — | — | — | — | R³ | R⁴ | — |
| Exams — Grading/Marks Entry | — | F | RW⁵ | RW⁵ | F⁶ | RW¹ | RW² | RW²·⁶ | — | — | — | — | — | — | — | R³ | R⁴ | — |
| Results — Publish | R¹ | F | F⁵ | F⁵ | F | RW¹ | R² | — | — | — | — | — | — | R⁷ | — | R³ | R⁴ | — |

### 3.3 Finance & Administration

| Module — Resource | SA | IA | PR | DN | RG | HD | FA | TA | RS | AC | HRM | HW | LB | PO | TM | ST | PA | GU |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Fees — Structure/Invoice | R¹ | F | R⁵ | R⁵ | R | — | — | — | — | F | — | — | — | — | — | R³ | R⁴ | — |
| Fees — Payment Collection/Approval | — | F | R⁵ | R⁵ | — | — | — | — | — | F | — | — | — | — | — | RW³ | RW⁴ | — |
| Finance — Ledger/Accounting | — | F | R⁵ | R⁵ | — | — | — | — | — | F | R | — | — | — | — | — | — | — |
| Finance — Budget/Payroll Approval | — | F⁶ | R⁵ | R⁵ | — | — | — | — | — | RW⁶ | F⁶ | — | — | — | — | — | — | — |
| HR — Employee Records | — | F | R⁵ | R⁵ | — | R¹ | R³ | R³ | R³ | — | F | R³ | R³ | R³ | R³ | — | — | — |
| HR — Payroll | — | F | — | — | — | — | R³ | R³ | R³ | RW⁶ | F | R³ | R³ | R³ | R³ | — | — | — |
| Inventory — Assets/Stock | R¹ | F | RW⁵ | RW⁵ | — | RW¹ | R² | — | R¹⁰ | R | R | RW⁹ | RW | — | RW | — | — | — |

### 3.4 Campus Services

| Module — Resource | SA | IA | PR | DN | RG | HD | FA | TA | RS | AC | HRM | HW | LB | PO | TM | ST | PA | GU |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Library — Catalog/Circulation | R¹ | F | R⁵ | R⁵ | — | R¹ | R² | R² | R³ | — | — | — | F | — | — | R³ | R⁴ | R⁸ |
| Hostel — Allocation/Management | R¹ | F | R⁵ | R⁵ | — | — | — | — | — | R | — | F⁹ | — | — | — | R³ | R⁴ | — |
| Transport — Routes/Vehicles | R¹ | F | R⁵ | R⁵ | — | — | — | — | — | R | — | — | — | — | F | R³ | R⁴ | — |
| Placement — Drives/Companies | R¹ | F | R⁵ | R⁵ | — | R¹ | R² | — | — | — | — | — | — | F | — | R³ | — | — |
| Placement — Applications | — | F | R⁵ | R⁵ | — | — | — | — | — | — | — | — | — | F | — | RW³ | — | — |
| Research — Projects/Grants | R¹ | F | R⁵ | RW⁵ | — | RW¹ | RW² | R² | F¹⁰ | R | — | — | R | — | — | R³ | — | — |

### 3.5 Platform Services

| Module — Resource | SA | IA | PR | DN | RG | HD | FA | TA | RS | AC | HRM | HW | LB | PO | TM | ST | PA | GU |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Reports — Institutional Reports | R¹ | F | R⁵ | R⁵ | R | R¹ | R² | — | — | R | R | R⁹ | R | R | R | — | — | — |
| Analytics — Dashboards | R¹·⁷ | F | RW⁵ | RW⁵ | R | R¹ | R² | — | — | R | R | R⁹ | R | R | R | — | — | — |
| Communication — Announcements/Messaging | R¹ | F | RW⁵ | RW⁵ | RW | RW¹ | RW² | RW² | R³ | RW | RW | RW⁹ | RW | RW | RW | R³ | R⁴ | R⁸ |
| AI — Assistant/Insights | R¹·⁷ | F | RW⁵ | RW⁵ | R | R¹ | RW² | R² | RW³ | R | R | — | — | — | — | RW³ | R⁴ | — |
| Settings — Tenant Configuration | R¹ | F | R⁵ | R⁵ | — | — | — | — | — | — | — | — | — | — | — | — | — | — |
| Settings — Role & Permission Management | F (platform)¹¹ | F | — | — | — | — | — | — | — | — | — | — | — | — | — | — | — | — |

### 3.6 Footnotes

1. **Super Admin** access to tenant-scoped data is **break-glass only**: no standing permission. Requires an active, time-boxed support session opened with a documented reason, is fully audit-logged (Section 9), and is visible to the Institution Admin. Rows marked `R¹` reflect this exceptional-access path, not routine access.
2. **Faculty / Teaching Assistant** access is filtered to sections/courses the user is actively assigned to for the current academic term, resolved from the `section_assignments` table.
3. **Self-only**: the row/entity acted on must have `owner_user_id == requester.user_id` (or, for TA/Researcher HR self-view, their own employee record).
4. **Parent**: filtered to `student_id IN (guardian's linked children)`, verified via the guardian-relationship confirmation flow at enrollment (Document 3).
5. **Principal / Dean**: filtered to `campus_id` (Principal) or `school_id` (Dean) matching the user's assignment; Institution Admin is the only role with unscoped tenant-wide Full access alongside Super Admin's break-glass path.
6. **Approval requires segregation of duties**: a second, distinct role must sign off before the action finalizes (e.g. TA marks entry is provisional until Faculty/HOD approves; payroll entered by Accountant requires HR or Institution Admin approval before disbursement). This is enforced as a workflow state machine, not merely a permission bit.
7. **Read-only aggregate/anonymized view**: no access to individually identifiable records, only rolled-up metrics (e.g. Super Admin platform health dashboards, Researcher/AI-usage analytics without PII).
8. **Guest/public**: available without authentication, rate-limited more aggressively (Section 10), and — for Admissions Applications — creates a pending prospect record that converts to a Student record only after Institution processing.
9. **Hostel Warden**: scoped to `hostel_block_id` the warden is assigned to.
10. **Researcher**: scoped to `project_id` where the user is Principal Investigator or named collaborator.
11. **Settings — Role & Permission Management** at the **platform** level (defining the role catalog itself, permission string vocabulary, module list) is a Super Admin-only, code-reviewed, versioned-migration operation — not a runtime UI action. At the **tenant** level, Institution Admin may only assign platform-defined roles to users and toggle which modules are enabled for their tenant.

---

## 4. Tenant Isolation Model

Sutram is a hard multi-tenant system: every tenant's data must be unreachable to every other tenant under any application bug, and provably so under audit. Isolation is enforced at **three independent layers**, any one of which alone would prevent cross-tenant leakage.

### 4.1 Tenant resolution strategy

1. **Subdomain-based (primary, web)**: each tenant is provisioned a subdomain, e.g. `greenwood.sutram.app`. The edge/gateway resolves `tenant_slug` from the `Host` header on every request and attaches it to the request context before any handler executes.
2. **Header-based (API clients, future mobile)**: server-to-server integrations and non-browser clients pass `X-Tenant-ID` explicitly; the gateway validates this against the authenticated principal's tenant membership — a JWT minted for Tenant A can never be honored with `X-Tenant-ID` for Tenant B (Section 4.3).
3. **Custom domain mapping (Enterprise tier)**: Enterprise tenants may map a vanity domain (e.g. `portal.greenwooduniversity.edu`) via CNAME; the gateway maintains a domain→tenant lookup table refreshed on provisioning/deprovisioning.
4. Tenant resolution happens **once, at the edge**, and the resulting `tenant_id` is injected into every downstream call as a signed, non-forgeable context value (not re-derived from user-supplied fields at each layer) — this prevents "confused deputy" bugs where a service trusts a client-supplied tenant id.

### 4.2 Application-layer enforcement

- Every ORM/query-builder call is routed through a **tenant-scoped repository layer**: no raw query path exists that omits a `tenant_id` predicate. Code review and static-analysis lint rules block merges that construct a query against a tenant-scoped table without going through this layer.
- Every JWT access token embeds `tenant_id` as a signed claim (Section 5.4). Middleware rejects any request where the resolved-tenant (from subdomain/header) does not match the token's `tenant_id` claim, before the request reaches business logic.
- **Cross-tenant access is disallowed by default for every role**, including Institution Admin (who is bound to exactly one tenant). Only `super_admin` can act across tenants, and only through the **break-glass support flow**:
  - Requires an explicit support ticket/reason code.
  - Issues a short-lived (max 4-hour), single-tenant-scoped elevated token — never a standing cross-tenant credential.
  - Every read/write performed under this session is written to an **immutable audit stream** (Section 9), and a notification is sent to the tenant's Institution Admin.
  - Break-glass sessions cannot approve financial transactions or modify grades/results — only read, and write actions limited to platform-support-classified operations (e.g. unlocking an account, fixing a corrupted config row).

### 4.3 Database-layer enforcement (PostgreSQL Row-Level Security)

Application-layer checks are treated as necessary but **not sufficient** — RLS is the backstop that holds even if a service-layer bug omits a `tenant_id` filter.

- Every tenant-scoped table has `tenant_id UUID NOT NULL` and `ROW LEVEL SECURITY` enabled.
- A standard policy is applied per table:
  ```sql
  CREATE POLICY tenant_isolation ON students
    USING (tenant_id = current_setting('app.current_tenant_id')::uuid);
  ```
- `app.current_tenant_id` is set via `SET LOCAL` at the start of every transaction/connection checkout, sourced from the request's verified tenant context (never from a client-supplied header directly — it is set by the application after JWT/tenant validation, so RLS cannot be bypassed by spoofing a header).
- The database role used by the application (`sutram_app`) has **no `BYPASSRLS`** privilege. Only a separate, credential-vaulted migration/ops role can bypass RLS, used solely for schema migrations and platform-level maintenance — never for serving requests.
- Super Admin break-glass sessions still flow through RLS with `app.current_tenant_id` set to the specific tenant being supported — there is no "RLS bypass" mode reachable from application code, keeping the DB-layer guarantee absolute regardless of role.
- Shared/reference tables that are intentionally cross-tenant (e.g. the platform `permissions` catalog, `plans`) have no `tenant_id` column and are excluded from this policy by design, not by omission — tracked in a schema registry.

### 4.4 Storage & search isolation

- Object storage (documents, uploaded files, certificates) is partitioned by `tenant_id`-prefixed keys/buckets-per-Enterprise-tenant, with bucket policies denying cross-prefix access.
- Search/analytics indices (if a secondary search engine is used) are partitioned per tenant index or filtered by mandatory `tenant_id` term at query construction, mirroring the RLS backstop pattern.
- Background jobs/queues carry `tenant_id` in the job payload and re-validate scope on dequeue, not just on enqueue.

---

## 5. Authentication Mechanisms

### 5.1 Password policy

- Minimum length: **12 characters** (no maximum below 128).
- Must contain at least 3 of the 4 classes: uppercase, lowercase, digit, special character.
- Checked against a breached-password corpus (e.g. HaveIBeenPwned k-anonymity API) at signup and password change; matches are rejected.
- Hashing: **Argon2id** (preferred; memory-hard, GPU-resistant) with tuned parameters (e.g. memory=19 MiB, iterations=2, parallelism=1 as a starting baseline, tuned to target ~250ms verify time on production hardware). **bcrypt (cost factor 12)** is the accepted fallback for any component/library without Argon2id support. Plaintext passwords are never logged; hashing occurs server-side only, never client-side-only.
- Password history: last 5 hashes retained to block immediate reuse.
- Forced rotation is **not** imposed on users by default (per current NIST guidance) except where an Institution's compliance profile explicitly requires periodic rotation (configurable per tenant for Enterprise customers with such mandates).

### 5.2 OTP (email/SMS)

- 6-digit numeric code, cryptographically random.
- **TTL: 5 minutes.**
- Delivery: email always available; SMS available where the tenant has SMS provider configured (India: DLT-registered sender ID compliance).
- Max **5 verification attempts** per issued code; code invalidated after exceeding this or on TTL expiry.
- Resend cooldown: **30 seconds** between sends; rate-limited to **5 OTP requests per hour** per identifier (email/phone) and per source IP, to prevent SMS-bombing/enumeration abuse.
- OTP is optional per the login flow (Document 3) — used for step-up verification on new-device login, password reset, and sensitive actions (e.g. changing bank details), and mandatory for password reset regardless of tenant 2FA configuration.

### 5.3 SSO

- **Google Workspace** (OAuth 2.0 / OpenID Connect) — self-serve, available on all tiers, restricted to verified institutional Workspace domains.
- **Microsoft Entra ID / Azure AD** (OAuth 2.0 / OIDC) — self-serve, available on all tiers.
- **SAML 2.0** — Enterprise tier only, for institutions with an existing enterprise IdP (Okta, ADFS, PingFederate, etc.); supports SP-initiated and IdP-initiated flows, signed assertions required, tenant-specific metadata/certificate configuration managed by Institution Admin.
- SSO-authenticated users are still resolved to a Sutram identity via verified email-domain matching to the tenant, then mapped to an existing Sutram user record or provisioned per the tenant's auto-provisioning policy (JIT provisioning, opt-in per tenant, default role assignable by domain/group claim mapping for Enterprise SAML).
- SSO does not exempt a user from tenant-side role assignment — authentication (who you are) remains distinct from authorization (what you can do), per Section 1.

### 5.4 Two-Factor Authentication (TOTP)

- RFC 6238-compliant TOTP, 30-second step, 6-digit code, compatible with standard authenticator apps (Google Authenticator, Authy, Microsoft Authenticator, 1Password).
- **Mandatory** for roles with financial approval or platform-level authority: `super_admin`, `institution_admin`, `accountant`, `hr_manager` (configurable to extend mandate to any role at the tenant's discretion).
- **Optional but encouraged** for all other roles, surfaced during onboarding.
- 10 single-use backup codes issued at enrollment, regenerable; each use is audit-logged.
- TOTP secret stored encrypted at rest (Section 7.3, field-level encryption).

### 5.5 JWT design

- **Access token**: JWT (RS256), TTL **15 minutes**. Claims: `sub` (user id), `tenant_id`, `role`, `session_id`, `iat`, `exp`, `jti`. Kept deliberately short-lived and role/tenant-bound so a leaked access token has minimal blast radius.
- **Refresh token**: opaque, cryptographically random (not a JWT, to allow server-side revocation without relying on claim inspection), stored hashed in the database keyed by `session_id`. TTL **7 days** default, extendable to **30 days** for an explicit "remember this device" opt-in.
- **Rotation strategy**: refresh-token rotation on every use — each refresh call issues a new refresh token and immediately invalidates the previous one. **Reuse detection**: if a previously-invalidated refresh token is presented again, the entire session family is revoked and the user is forced to re-authenticate (signal of possible token theft).
- **Revocation**: a `revoked_sessions` table (Redis-backed for hot lookups, PostgreSQL-backed for durability) supports immediate access-token invalidation despite JWTs being otherwise stateless — access-token verification checks `jti`/`session_id` against this denylist for privileged actions (financial approvals, settings changes) and is checked opportunistically elsewhere; full enforcement is guaranteed within one access-token TTL window (≤15 min) even without the denylist check, bounding exposure.
- Signing keys are asymmetric (RS256/ES256), rotated on a scheduled basis via the KMS (Section 7.4), with `kid` header supporting overlapping validity during rotation.

### 5.6 Session management

- **Concurrent session limits**, role-tiered: Student/Parent/Guest — up to 3 devices; Faculty/staff roles — up to 2 devices; `institution_admin`/`super_admin` — 1 active session by default (configurable), to reduce standing risk on the highest-privilege accounts.
- Sessions are enumerable and remotely revocable by the user ("Active Sessions" self-service panel) and by Institution Admin for users within their tenant.
- **Device tracking**: each session records device fingerprint, user agent, approximate location (IP-derived), and first-seen/last-seen timestamps. Login from a previously unseen device triggers step-up verification (OTP) and a notification email.
- **Forced logout / global session revocation** is triggered automatically on: password change, 2FA enrollment/reset, role or permission change, account suspension, and explicit "log out all devices" action — all refresh tokens for the user are invalidated and outstanding access tokens are added to the revocation list.

---

## 6. Authorization Enforcement Points

Sutram enforces authorization redundantly at four layers (defense in depth) — a failure or bug in any single layer does not result in unauthorized access.

1. **API Gateway level**: validates JWT signature/expiry, resolves and cross-checks `tenant_id` (subdomain/header vs. token claim, Section 4.2), enforces coarse-grained checks (is this role even permitted to call this route family) and rate limits (Section 10), before the request reaches any service.
2. **Service level**: each service/module resolves the caller's effective permission set (`role → permissions`, module-enablement check) and evaluates the specific `module:resource:action` string required for the endpoint, plus the ABAC-lite scope predicate (Section 1.3) against the specific resource(s) targeted by the request. This is where "Faculty can grade, but only for their own section" is enforced.
3. **Database level**: PostgreSQL Row-Level Security (Section 4.3) as the non-bypassable backstop for tenant isolation and, where modeled, for row-level scope (e.g. `department_id` policies for HOD-scoped tables in addition to tenant policies).
4. **Frontend route guards**: the web client hides/disables UI affordances and blocks client-side route navigation for actions the current role/scope does not permit. This is a **UX layer only** — explicitly not trusted as a security boundary; every guarded action still passes through layers 1–3 server-side. Frontend guards exist to prevent confusing dead-end states, not to gate real access.

This layering means an attacker who bypasses the frontend (e.g. calling the API directly) is stopped at the gateway/service layer; a service-layer logic bug is stopped by RLS; a compromised or misconfigured gateway rule is stopped by service-layer checks. No layer is assumed sufficient on its own.

---

## 7. Data Protection

### 7.1 Encryption at rest

- Primary datastore (PostgreSQL) runs on infrastructure with **full-disk/volume encryption (AES-256)** at the storage layer (cloud-provider managed disk encryption or PostgreSQL TDE-equivalent via encrypted storage volumes, since community PostgreSQL lacks native TDE).
- Backups, snapshots, and object storage are encrypted at rest with the same standard, with independently managed encryption keys from the primary datastore.

### 7.2 Encryption in transit

- **TLS 1.3** enforced for all external traffic (client↔gateway, gateway↔third-party integrations); TLS 1.2 accepted only as a fallback for legacy integration partners with a deprecation timeline, never below.
- Internal service-to-service traffic within the VPC is also TLS-encrypted (mutual TLS for service mesh where deployed), not left in plaintext on the assumption of network isolation.
- HSTS enforced on all public endpoints; no plaintext HTTP endpoint is exposed externally (automatic redirect + HSTS preload for the apex/subdomains).

### 7.3 Field-level encryption for sensitive PII

Beyond volume-level encryption, specific highly sensitive fields receive **application-layer field encryption (AES-256-GCM, envelope encryption)** so that even a database-level compromise (e.g. leaked snapshot, malicious DBA) does not expose these values in plaintext:

- National ID equivalents: Aadhaar number, PAN, SSN, passport number.
- Banking details: bank account number, IFSC/routing number, payment instrument tokens (card data itself is never stored — tokenized via PCI-DSS-compliant payment processor).
- Medical/health records (student medical history, disability accommodations).
- TOTP secrets and backup codes (Section 5.4).
- Government-issued document scans (encrypted at the object-storage layer with per-file data keys).

Each field uses a per-tenant **Data Encryption Key (DEK)**, itself encrypted by a platform **Key Encryption Key (KEK)** held in the KMS — envelope encryption — so that tenant data keys can be rotated or (on tenant offboarding/erasure) destroyed independently without re-touching every other tenant's data.

### 7.4 Key management

- A managed **KMS** (cloud provider KMS, e.g. AWS KMS / Azure Key Vault, or self-hosted HashiCorp Vault for on-prem/Enterprise deployments) holds all KEKs; application code never has direct access to raw KEK material, only to encrypt/decrypt API calls scoped by IAM policy.
- DEKs are generated per tenant (and, for the most sensitive field classes, per-field-category within a tenant), cached briefly in memory by the service, never persisted unencrypted.
- Key rotation: KEKs rotated on a scheduled cadence (e.g. annually, or on-demand after a suspected exposure event); DEK rotation supported via re-encryption jobs without service downtime.
- Access to KMS key-management operations (create/rotate/destroy keys) is restricted to a small platform-operations group, itself subject to the same audit logging as Super Admin break-glass access.

---

## 8. Compliance

Sutram is designed to operate for institutions in India and globally, and must satisfy overlapping education- and privacy-specific regulatory regimes.

### 8.1 GDPR (EU)

- Legal bases documented per processing activity (contract performance for core SIS functions, consent for optional communications/marketing, legitimate interest for security logging).
- Data Subject Rights supported natively: access, rectification, erasure ("right to be forgotten"), portability (structured export), and objection/restriction — surfaced via an in-product **Privacy Center** for Institution Admins and directly for individual data subjects (students/parents/staff) for their own data.
- Data Processing Agreements (DPAs) available for Institution customers (Sutram/Pragyaan Labs as Processor, Institution as Controller).
- EU data residency option (Section 8.4) for tenants requiring in-region processing.

### 8.2 FERPA (US)

- "Education records" are treated as a protected category with stricter default access: only roles with a legitimate educational interest (Faculty for own sections, Registrar, Principal/Dean, Institution Admin) can access student academic records by default; access is logged per Section 9.
- Directory information (name, enrollment status) is configurable per-tenant as disclosable/non-disclosable per FERPA's directory-information exception.
- Parent/guardian access follows FERPA's age-of-majority transition: for tenants serving higher-ed (students ≥18), Parent role access requires the student's explicit consent grant rather than being automatic; for K-12 tenants, Parent access is automatic per standard guardian rights until the student reaches the applicable age of majority.
- Audit trail supports FERPA's requirement to be able to produce a record of who accessed a given student's education records.

### 8.3 India DPDP Act 2023

- Consent-based processing framework: explicit, itemized consent captured at signup/enrollment for defined purposes, with a granular consent-withdrawal mechanism.
- **Data Principal rights**: access, correction, erasure, and grievance redressal — surfaced through the same Privacy Center used for GDPR, unified rather than duplicated per-regulation.
- Special category treatment for children's data: since a large share of Sutram's data subjects are minors, **Verifiable Parental Consent** is required before processing a minor student's data beyond what's strictly necessary for the institution's core educational function (aligned with DPDP's specific minor-data provisions) — captured during the Parent-linking step of enrollment.
- Data Protection Officer / Grievance Officer contact details are published per tenant, and at the platform level for Pragyaan Labs itself, per Act requirements.
- Breach notification workflow (Section 11) aligned to the Act's mandated timelines to the Data Protection Board and affected Data Principals.

### 8.4 Data residency (Enterprise tier)

- Standard tier: data hosted in a default primary region (India), suitable for the majority of domestic institution customers.
- Enterprise tier: configurable regional hosting — **India**, **EU**, or **US** region — with tenant data, backups, and (where feasible) DEK material kept resident in the selected region, and cross-region replication for DR restricted to regions the tenant has explicitly approved.

### 8.5 Right-to-erasure / data export flows

- **Export**: self-service, role-gated structured export (JSON/CSV/PDF as appropriate) of an individual's own data (Student/Parent/Staff), and a bulk tenant-wide export path for Institution Admin (e.g. on off-boarding from Sutram), fulfilled asynchronously with a signed, time-limited download link and an audit record.
- **Erasure**: a formal request workflow (not a raw DELETE) — request → Institution Admin/DPO review (to reconcile against statutory retention obligations, e.g. financial records retention under local law, which can lawfully override an erasure request for a bounded period) → execution, which cascades a tenant-approved anonymization or hard-delete depending on record type, logged immutably (the erasure *event* is retained even though the underlying data is not, to prove compliance).
- Erasure of a tenant itself (full off-boarding) triggers destruction of that tenant's DEKs (Section 7.4) as the primary technical erasure mechanism for encrypted-at-rest data, backed by scheduled physical deletion from backups per the backup retention schedule.

### 8.6 Consent management for minors

- Every Student record below the tenant-configured age-of-majority threshold requires at least one linked, verified Parent/Guardian account before certain processing (e.g. enabling AI-personalization features, sharing data with third-party integrations like placement partners) is activated.
- Consent state (granted/withdrawn, purpose, timestamp, guardian identity) is itself an auditable record, versioned per policy-text version presented at the time of consent.

---

## 9. Audit Logging

### 9.1 What gets logged

An **append-only audit event** is recorded for, at minimum:

- **Authentication events**: login success/failure, logout, password reset request/completion, 2FA enrollment/reset/use, SSO login, OTP issuance/verification/failure, session revocation, new-device detection.
- **Authorization/permission changes**: role assigned/changed/removed, module enabled/disabled for a tenant, permission-catalog changes (platform level), break-glass Super Admin session open/close (Section 4.2).
- **Data exports**: any structured export of student/staff/financial data, including who, what scope, and destination (download vs. API).
- **Financial transactions**: fee invoice creation/edit, payment recorded, refund/waiver, payroll run creation/approval, ledger adjustments.
- **Grade/result changes**: every write to exam marks and every result publish/unpublish action, with before/after values.
- **Administrative/config changes**: tenant settings changes, user creation/deactivation, consent grant/withdrawal, erasure requests and their resolution.

Each entry captures: timestamp (UTC), actor (`user_id`, role, and — for break-glass — the underlying Super Admin identity), `tenant_id`, action (`module:resource:action` string where applicable), target resource id(s), source IP, session/device id, and a before/after diff where the event is a data mutation.

### 9.2 Retention & immutability

- Financial and academic (grades/results) audit records: retained a minimum of **7 years**, aligned to typical institutional financial-records and education-records retention obligations (exact figure adjustable per tenant's local statutory requirement).
- General access/authentication logs: retained a minimum of **1–2 years**, configurable upward for Enterprise/compliance-heavy tenants.
- Audit records are written to an **append-only store** — no `UPDATE`/`DELETE` grant exists on the audit table/stream for any application role, including `institution_admin`; the underlying storage is additionally hash-chained (each record includes a hash of the previous record) so tampering is cryptographically detectable, approximating WORM guarantees without requiring specialized WORM hardware. Long-term archival tiers may additionally use true object-lock/WORM cloud storage for the retention period.

### 9.3 Who can view audit logs

- **Super Admin**: platform-wide audit visibility, primarily for security operations and to review break-glass access by fellow platform staff (segregation of duties — a Super Admin's own break-glass sessions are reviewable by other Super Admins/security team, not self-auditable-only).
- **Institution Admin**: full audit log visibility **scoped strictly to their own tenant** — cannot see other tenants' logs, and is explicitly notified whenever a Super Admin break-glass session touches their tenant.
- No other tenant role has standing access to the audit log by default; Enterprise tenants may optionally grant a scoped "Compliance Officer" view (a permission grant on top of an existing role, e.g. Registrar, rather than a new role in the base catalog) for SOC 2 / internal-audit purposes.

---

## 10. Rate Limiting & Abuse Prevention

### 10.1 API rate limits

- **Per-tenant** limits, tiered by subscription plan (e.g. Starter: 300 req/min, Growth: 1000 req/min, Enterprise: custom/negotiated), enforced at the gateway to prevent one tenant's load from degrading others (noisy-neighbor protection in the shared multi-tenant infrastructure).
- **Per-user** limits (e.g. 100 req/min for standard roles) to contain runaway clients/scripts and compromised-credential abuse.
- **Per-endpoint** stricter limits for expensive operations (bulk export, report generation, AI inference calls) independent of the general per-user budget.
- Rate-limit responses use standard `429` with `Retry-After`, and repeated violations escalate to temporary IP/account throttling beyond the standard window.

### 10.2 Brute-force login protection

- Account lockout after **5 consecutive failed login attempts**, with **progressive backoff** (e.g. 15-minute lockout after the 5th failure, doubling on repeated cycles), scoped per-account and per-source-IP independently so an attacker can't rotate one dimension to bypass the other.
- **CAPTCHA** (challenge-based, e.g. reCAPTCHA/hCaptcha) triggered after the 3rd failed attempt on an account or from a given IP, and unconditionally on password-reset and signup endpoints to deter automated abuse.
- Failed-attempt counters and lockout state are tenant- and identity-aware but checked *before* tenant resolution completes where possible, to avoid leaking whether an email exists in a given tenant (generic error messaging on login failure: "invalid credentials," never "user not found").

### 10.3 WAF-level protections

- A Web Application Firewall in front of the gateway provides baseline protection against OWASP Top 10 patterns (SQLi, XSS, path traversal payloads), bot/scraper signature detection, and geo/IP reputation-based blocking, layered in front of (not instead of) application-level input validation and parameterized queries.
- Anomaly-based request throttling (e.g. sudden spike in export or search requests from a single account) feeds into the abuse-detection pipeline and can trigger automatic step-up authentication or temporary suspension pending review.

---

## 11. Incident Response

### 11.1 Breach notification workflow

1. **Detection** — via audit-log anomaly alerts, WAF/IDS signals, dependency vulnerability scanning, or external report (responsible disclosure).
2. **Triage & containment** — security on-call assesses scope (which tenant(s)/data classes affected), contains the vector (credential revocation, key rotation, patch deployment, network isolation as needed) within target initial-response SLAs defined in the incident-response runbook (not detailed in this document).
3. **Impact assessment** — determine affected tenants, data subjects, and data classes; classify severity.
4. **Notification** — affected Institution Admins are notified per the timeline committed in the Data Processing Agreement (typically within 72 hours of confirmed breach, aligned with GDPR's 72-hour supervisory-authority notification standard and used as the internal baseline for all regimes, then adapted per DPDP Act/FERPA specifics where they diverge); affected Data Principals notified per applicable law when the breach poses meaningful risk to them; regulators (Data Protection Board under DPDP, EU supervisory authority under GDPR, US Dept. of Education where FERPA-covered records are involved) notified per their respective mandated timelines.
5. **Remediation & post-incident review** — root cause fix, audit-log-driven forensic reconstruction of what was accessed, and a documented post-mortem retained for compliance evidence.

### 11.2 Security contact

- A published security contact (e.g. `security@pragyaanlabs.com`) is maintained for responsible disclosure and incident reporting, with a documented acknowledgment SLA, consistent with SOC 2 / ISO 27001 vendor-management expectations that customers and researchers can reach the security team directly.
- Each tenant's Institution Admin has a designated security/compliance point of contact captured during onboarding for direct incident communication.

### 11.3 Backup & restore security

- Backups are encrypted at rest (Section 7.1) with access-controlled, separately audited restore procedures — restore operations are themselves logged as privileged actions and require dual authorization (two distinct authorized platform staff) for any cross-tenant or bulk restore.
- Backup retention and restore-testing cadence are defined in the operational runbook; restore drills are performed on a recurring schedule to validate recovery objectives (RPO/RTO), tracked as part of the security program rather than assumed.
- Point-in-time recovery is scoped so a restore for one tenant does not require exposing or touching another tenant's data, consistent with the isolation model in Section 4.

---

*End of Document 4 — RBAC & Security Architecture. This document is the authoritative source for role slugs, permission-string grammar, and auth/session TTLs referenced by Document 2 (API Design) and Document 5 (Backend Architecture).*
