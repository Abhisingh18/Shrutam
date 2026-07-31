# Sutram — Document 13: Testing Strategy

## Table of Contents

1. Testing Philosophy & the Test Pyramid
2. Backend Testing Layers
3. RBAC / Permission Testing
4. Frontend Testing Layers
5. Data & Migration Testing
6. AI/ML Feature Testing
7. Multi-Tenancy & Security Testing
8. Performance & Load Testing
9. Accessibility Testing
10. Test Data & Environments
11. Quality Gates & CI Enforcement
12. Release Testing
13. Summary of Binding Decisions

---

## 1. Testing Philosophy & the Test Pyramid

### 1.1 Why Sutram cannot run a textbook pyramid

The classic pyramid — lots of unit tests, some integration tests, few E2E tests — assumes most bugs live inside a single function's logic. That assumption breaks down for Sutram in three specific, structural ways:

1. **Cross-module sagas are the dominant source of production risk, not individual functions.** The Admission Flow alone touches Students, Finance, Library, Hostel (optional), Transport (optional), ID-card, and Auth via the `student.admitted` event (Doc 08 §5). A unit test on the Finance module's fee-creation function proves the function is correct in isolation; it proves nothing about whether the event actually arrives, arrives once, arrives in a state the consumer can handle, or triggers the reconciliation-job fallback correctly when it doesn't. Saga-ordering, idempotency, and compensation bugs are *integration-shaped* bugs — a green unit-test suite can coexist with a broken saga.
2. **Multi-tenant isolation is enforced across two layers (application + Postgres RLS, Doc 04 §4) that must be tested as a stack, not separately.** A unit test that mocks the database cannot catch an RLS policy that was never applied to a new table, or a raw query that bypasses the ORM's tenant-scoping guard. Only a test running against a real Postgres instance, with real RLS policies active, proves isolation holds.
3. **~200+ of the ~415 screens (Doc 09 §4.4) share 4 page templates and one `DataTable` component.** This *inverts* the usual frontend cost curve: the highest-leverage frontend tests are template-level and component-level, not per-screen E2E tests. Testing `ListPageTemplate` once is worth more than testing 200 list screens individually, because a bug in the template is a bug in all 200 screens, and a passing template test is evidence for all 200.

None of this argues for *fewer* unit tests — business logic (fee calculation, grade-point computation, attendance-eligibility thresholds) is still unit-tested exhaustively, because unit tests are the cheapest way to pin down correctness of pure logic and the fastest to run in a tight edit loop. It argues for **deliberately over-investing in the integration and contract layers relative to a typical CRUD SaaS product**, because that is where Sutram's actual failure modes live.

### 1.2 The pyramid, by proportion and rationale

```
                    ▲
                   /E2E\              ~5% of test count
                  /-----\             ~10-12 critical journeys (Section 4.3)
                 / API/  \
                /Contract \           ~15% of test count
               /-----------\          Schemathesis fuzzing + event contracts (Section 2.3-2.4)
              / Integration  \
             /-----------------\      ~30% of test count  ← heavier than typical
            /   (real PG+Redis) \     Saga flows, RLS, permission matrix (Section 2.2, 3)
           /-----------------------\
          /       Unit tests         \  ~50% of test count
         /---------------------------\  Business logic, pure functions (Section 2.1)
```

| Layer | Typical SaaS proportion | Sutram proportion | Why the shift |
|---|---|---|---|
| Unit | ~70% | **~50%** | Still the majority by count (cheap, fast) but deliberately not dominant — a 70%-unit suite would systematically under-test the saga/RLS/permission surface where Sutram's real risk sits. |
| Integration (real Postgres + Redis) | ~20% | **~30%** | This is the layer that catches RLS gaps, saga-ordering bugs, and outbox/consumer idempotency failures — none of which a mocked-DB unit test can see. Explicitly budgeted as a first-class layer, not a thin afterthought between unit and E2E. |
| Contract (event bus + OpenAPI fuzzing) | rarely a named layer | **~15%, named explicitly** | With 7+ modules consuming events from a shared bus and a 400+ endpoint API surface (Doc 07), producer/consumer drift and schema fuzzing bugs are common enough to warrant a dedicated layer rather than being folded into integration tests. |
| E2E (Playwright) | ~10% | **~5%, tightly scoped** | E2E tests are the slowest and most flake-prone layer. Kept deliberately small — ~10-12 named journeys (Section 4.3) — and never used as a substitute for template/component coverage of the other 400+ screens. |

### 1.3 Guiding principles

- **Test the seam, not the implementation.** Unit tests assert behavior through public module interfaces; integration tests assert behavior through the real HTTP/event boundary. Refactoring internals should never break a passing test suite.
- **A saga is not "tested" until its failure paths are tested.** For every event-driven flow, the compensating/reconciliation path (Doc 08 §5.4) is tested with equal rigor to the happy path — an admission that fails at the Library step must leave the system in a recoverable state, and that recovery is a test, not an assumption.
- **Correctness bugs here have real consequences** (wrong grades, wrong fee charges, wrong attendance blocking exam eligibility, cross-tenant leakage) — so the layers that catch *systemic* bugs (RLS, permission matrix, contract tests) are treated as release-blocking, not optional nice-to-haves, even where they are slower or more expensive to run than unit tests.
- **Reuse-aware testing.** Wherever the architecture already deduplicates work (4 page templates, 1 `DataTable`, 1 RBAC engine, 1 event contract per topic), testing deduplicates the same way. Sutram never pays to re-verify the same logic 200 or 415 times.

---

## 2. Backend Testing Layers

### 2.1 Unit tests (pytest)

- **Scope:** per-module business logic — fee calculation, grade/GPA computation, attendance-eligibility thresholds, leave-balance accrual, seat-allocation ranking, permission-string parsing, event-payload construction. Anything expressible as a pure function or a class method with injectable dependencies.
- **What gets mocked: external boundaries only** — the payment gateway client, SMS/WhatsApp/email providers, the LLM Model Gateway (Doc 10 §3.1), object storage. **The database is never mocked in a unit test.** A test that mocks SQLAlchemy session behavior is testing the mock, not the code — Sutram's experience-informed rule is that DB-touching logic belongs in the integration layer (Section 2.2), and anything left in "unit" scope must be genuinely DB-free.
- **Structure:** colocated `test_*.py` per module (`modules/finance/tests/test_fee_calculation.py`), mirroring the module boundaries in Doc 08 §4 so ownership stays 1:1 with the module that owns the code.
- **Fixtures & data:** built with `factory_boy` factories per domain entity (`StudentFactory`, `InvoiceFactory`), not hand-rolled dicts — keeps tests readable and gives a single place to update when a schema field is added (Doc 03).
- **Style:** table-driven / parametrized (`@pytest.mark.parametrize`) for anything with more than 2-3 input variants — e.g., attendance-eligibility thresholds tested across a matrix of (attendance %, exam type, institution policy override) rather than one test per case written out longhand.
- **Speed target:** the full unit suite runs in under 3 minutes locally and in CI, since it runs on every commit and every local save-triggered watch run; anything touching the DB or network does not belong here precisely to protect this budget.

### 2.2 Integration tests (real Postgres + Redis via Testcontainers)

This is the layer explicitly over-weighted relative to a typical product (Section 1.2), because it is the only layer that exercises the real database with real RLS policies active, and the real event bus with real at-least-once delivery semantics.

- **Infrastructure:** `testcontainers-python` spins up a disposable Postgres 16 container (matching production version) and a Redis container per test session (or per-module, tuned for CI parallelism), with Alembic migrations applied fresh at container start — never a hand-maintained "test schema" that can drift from what Alembic actually produces. A `docker-compose.test.yml` variant is provided for local development where Testcontainers' Docker-in-Docker overhead is undesirable.
- **RLS policy tests — CRITICAL, non-negotiable layer:**
  - For **every** RLS-protected table (Doc 03 §1: every tenant-scoped table), there is an explicit test that: (1) creates rows for Tenant A and Tenant B in the same test transaction/session pattern the app uses, (2) sets `app.current_tenant_id` to Tenant A via `SET LOCAL`, (3) asserts a `SELECT *` against the table returns **only** Tenant A's rows, even with no `WHERE tenant_id = ...` clause in the query — proving the policy itself is the backstop, not application discipline.
  - A **crafted-request tenant-isolation suite** goes further than "the ORM behaves": it issues raw SQL through the same connection-pooling path the app uses (Doc 08 §6, the RLS session-variable wiring) attempting to read/update/delete Tenant B's row while authenticated as Tenant A — via (a) a manipulated `tenant_id` query parameter, (b) a spoofed JWT claim, (c) an ID from Tenant B guessed/enumerated in a path parameter for Tenant A's session. Every one of these must fail closed (empty result set or 403/404, never Tenant B's data).
  - This suite runs against **every** table added in a migration going forward — a new tenant-scoped table without a passing isolation test is a merge-blocking CI failure (Section 11), not a follow-up ticket, because a table that ships without this test is a table nobody has actually verified is isolated.
  - Explicit **super-admin break-glass path test** (Doc 04 §3.6 footnote 1): asserts that a Super Admin session with no active break-glass grant is subject to the *same* RLS denial as any other cross-tenant actor, and that an active, time-boxed break-glass session is both permitted and produces the required audit-log entry (Doc 04 §9).
- **Saga/event-flow tests:**
  - The Admission Flow saga (Doc 08 §5.3) is tested end-to-end against the real outbox table and a real Redis Stream: admit a student, assert the `outbox_events` row is written in the same transaction as the student row (by killing the process between the two in a fault-injection variant and asserting neither committed), assert the relay publishes it, assert Finance/Library/Hostel/Transport/ID-card/Auth consumers each perform their side effect exactly once even under simulated redelivery (Doc 08 §5.4 idempotency requirement).
  - **Idempotency tests are mandatory per consumer**: replay the same event twice and assert the second delivery is a no-op (not a duplicate fee record, not a duplicate library account) — since Redis Streams and the Phase 2/3 broker are both at-least-once, not exactly-once (Doc 08 §5.1).
  - **Reconciliation-job tests**: seed an admission with a deliberately "lost" event (consumer never ran) and assert the scheduled reconciliation job (Doc 08 §5.4) detects and alerts on the SLA-window breach — this is the layer that proves the defense-in-depth fallback actually works, not just exists on paper.
- **Speed/CI placement:** integration tests are slower than unit tests by design (real containers, real transactions) and run in a separate CI stage (Section 11), parallelized across modules, targeting well under 10 minutes total even as the suite grows, since they gate every PR.

### 2.3 Contract tests for the event bus

With 7+ consumers reading from a shared set of Redis Streams (Phase 1) — later RabbitMQ/Kafka (Doc 08 §5.2) — a producer changing an event's shape is invisible to that producer's own test suite unless a contract test exists.

- **Producer-side contract tests**: every event type (`student.admitted`, `fee.paid`, `exam.result.published`, etc., Doc 08 §5.3) has a JSON Schema (versioned alongside `event_version`, Doc 08 §5.3) that the producer's test suite validates every emitted payload against — a code change that silently drops or renames a field fails the producer's own CI before it ever reaches a consumer.
- **Consumer-side contract tests**: each consumer module ships a test asserting it can correctly handle (a) the current schema version and (b) at least one prior schema version still within its declared support window (Doc 08 §5.3's "consumers check the version and handle old + new shape during a migration window") — so a Finance-service upgrade doesn't silently break on an older-shaped event still in flight from before a producer deploy.
- **Schema registry as the enforcement mechanism**: schemas live in a shared `packages/event-contracts` (mirroring the OpenAPI-drift-detection pattern already used for the frontend API client, Doc 09 §5.3) checked into the monorepo; a producer or consumer test importing an out-of-date schema fails the build, and a PR that changes a schema without bumping `event_version` is flagged automatically.
- **Why this matters concretely**: this is exactly the mechanism that prevents the failure mode named in the task brief — a `student.admitted` schema change silently breaking the Finance consumer's fee-record auto-creation. Without a contract test, that failure surfaces in production as "a student was admitted but never got billed," discovered by an accountant weeks later, not by CI in minutes.

### 2.4 API / E2E backend tests (property-based fuzzing against the OpenAPI spec)

- **Tool: Schemathesis**, run against the live OpenAPI spec generated from the FastAPI app (Doc 07) — not a hand-maintained duplicate spec, so the fuzz target always matches what's actually deployed.
- **What it catches that hand-written tests don't**: Schemathesis generates adversarial inputs (boundary values, wrong types coerced where possible, missing optional fields, oversized strings/arrays, unexpected enum values) for every documented endpoint and asserts the API never 500s, always returns a response matching its declared schema, and — critically for Sutram — respects declared status codes for auth/permission failures (401/403) rather than leaking a 500 stack trace that could disclose internals.
- **Stateful fuzzing for critical flows**: Schemathesis's stateful testing mode chains related endpoints (create invoice → pay invoice → refund invoice) to catch bugs that only appear across a sequence of calls, not a single request in isolation — relevant given how many Sutram flows are inherently multi-step (admission, fee lifecycle, exam-to-result pipeline).
- **Run cadence**: a fast-fuzz subset (bounded example count per endpoint) runs on every PR touching backend API code; a deeper overnight run against a staging-like environment covers a larger example budget and is where genuinely rare edge cases tend to surface.
- **Authenticated fuzzing per role**: fuzz runs are parametrized across a representative sample of the 18 roles (Section 3), not just an admin token — since a permission bug is often only reachable from a specific role's scoped token, not from the most-privileged one.

---

## 3. RBAC / Permission Testing

A permission system with 18 roles across ~22 modules (Doc 04 §3, ~32 resource-level rows across 5 module groupings) cannot be safety-tested by hand-writing a test per role per screen — that is over 550 cells, most of which nobody will remember to re-check when a permission changes. Sutram tests the **matrix itself**, systematically.

### 3.1 The parametrized permission-matrix test

- The permission matrix in Doc 04 §3 is not just documentation — it is checked into the repo as a **machine-readable fixture** (`tests/fixtures/permission_matrix.yaml` or equivalent, generated from/validated against the same source of truth the RBAC engine loads at runtime), so the test suite and the documentation cannot silently drift apart.
- A single parametrized pytest suite iterates every `(role, module, resource, action)` cell in that fixture and asserts the API's actual authorization decision matches the documented `—`/`R`/`RW`/`F` value — one test function, hundreds of generated test cases, not hundreds of hand-written test functions. Adding a 19th role or a 23rd module extends the matrix and the test coverage automatically; it does not require writing new test code.
- **Scope-qualified cells are tested with both an in-scope and an out-of-scope fixture**: e.g. Faculty `RW` on Attendance-Marking (Doc 04 §3.2, footnote 2, "filtered to sections the user is actively assigned to") is tested both for a section the faculty member is assigned to (must succeed) and a section they are not (must be denied) — testing only the happy path here would miss the entire point of ABAC-lite scoping (Doc 04 §1).

### 3.2 Explicit negative tests

Positive-path coverage ("Accountant CAN create an invoice") is necessary but insufficient — Sutram requires an explicit negative assertion for every segregation-of-duties boundary named in Doc 04 §3.6 footnote 6 and every scope boundary, written as first-class named tests, not incidental byproducts of the matrix sweep:

- `test_faculty_cannot_approve_fee_refunds`
- `test_accountant_cannot_disburse_payroll_without_hr_approval` (segregation-of-duties workflow state machine, Doc 04 footnote 6 — tested as a state-machine test, asserting the provisional→approved transition requires the second distinct role)
- `test_teaching_assistant_cannot_publish_grades` (provisional-until-Faculty/HOD-approval boundary, Doc 04 §3.2)
- `test_parent_cannot_read_unlinked_students_data`
- `test_hostel_warden_cannot_access_rooms_outside_assigned_block`
- `test_student_cannot_read_other_students_records`
- `test_super_admin_has_no_standing_tenant_data_access_without_breakglass` (Section 2.2)
- `test_guest_cannot_reach_any_authenticated_endpoint`

These are maintained as a named, growing suite explicitly because a matrix sweep alone tends to under-emphasize the boundaries where a *wrong* "allow" is most damaging (financial approval, cross-tenant/cross-family data, grade publication) — the negative-test suite is where those get first-class, readable-in-a-failure-report attention.

### 3.3 Regression protection when permissions change

- Any PR that modifies the permission matrix fixture (Section 3.1) triggers a **diff report** in CI comparing old vs. new matrix cells, posted to the PR — a reviewer sees exactly which `(role, module, action)` cells changed, rather than having to infer it from a code diff to the RBAC engine.
- A permission-matrix change requires sign-off tagged in the PR template as a security-relevant change (Section 11.3's required-review policy), and the negative-test suite (Section 3.2) is run in full (not just the fast subset) on any PR touching `packages/rbac`, `modules/*/permissions.py`, or the matrix fixture itself.
- **Frontend permission-gating tests** (`packages/rbac`'s `hasPermission`/`nav.config` filtering, Doc 09 §11) are tested with the same matrix fixture via a shared, generated TypeScript constant — so a backend permission change that isn't mirrored in the frontend nav/gating config fails a cross-package consistency test rather than shipping as a UI that shows a button the API will 403 on.

---

## 4. Frontend Testing Layers

### 4.1 Component tests (Vitest + React Testing Library)

- **Tool and convention**: Vitest + React Testing Library, colocated as `Component.test.tsx` (Doc 09 §11) — asserting behavior (keyboard interaction, ARIA attributes, validation error surfacing, loading/empty/error state rendering) rather than implementation detail, so refactors that don't change behavior don't break tests.
- **Reuse-aware prioritization — the load-bearing decision for this layer**: given ~200+ of 415 screens compose from `ListPageTemplate` alone, and ~80% of all screens compose from one of the 4 templates (Doc 09 §4.4), the component-test investment is concentrated at the **template and shared-organism level**, not spread thin across every screen:
  - `ListPageTemplate`, `DetailPageTemplate`, `FormPageTemplate`, `WizardTemplate` each get an exhaustive test suite covering every documented structural behavior (permission-gated CTA visibility, virtualized `DataTable` rendering with the configured columns, pagination interaction, sectioned-form validation surfacing, wizard step persistence/resume) — once, at the template level.
  - Individual module screens (e.g. the Students list, the Fee Invoice list) then get a **thin config-level test** — assert the module's `*.config.ts` (Doc 09 §4.4, e.g. `studentListConfig`) is valid against the config schema and renders without error — because the template test already proves the *structural* behavior works; the module test only needs to prove the module wired its configuration correctly.
  - The ~20% genuinely bespoke screens (dashboard, Analytics charts, AI Assistant chat surface, Attendance Grid, Timetable builder — Doc 09 §4.4) get full, individual component test suites precisely because they don't inherit template-level coverage.
- **High-leverage pure-function tests**: `packages/rbac`'s `hasPermission`, the error-mapping table (Doc 09 §8.2), Zod validation schemas shared with the backend contract (Doc 09 §5.3) — tested directly and exhaustively, since these are imported by hundreds of screens and a bug here has the widest possible blast radius per line of test code written.

### 4.2 Visual regression testing

- **Tool**: Storybook (already the living spec surface for every atom/molecule/organism/template per Doc 09 §11) paired with **Chromatic** for automated visual-diff review on every PR — every story becomes a visual regression check for free, since the story catalog already exists as the Figma-to-implementation verification surface.
- **What this specifically catches at 200+ list-page-instance scale**: a shared-token or `DataTable`/`DataTableToolbar` change (Doc 09 §4.3) that shifts padding, breaks a dark-mode contrast ratio, or misaligns the virtualized-row layout is invisible to a behavioral RTL test (the DOM structure and ARIA attributes can be unchanged while the pixels are wrong) — Chromatic catches exactly this class of "technically still passes, visually broken across 200 screens" drift, flagging every story whose rendered output changed for human review before merge.
- **Scope discipline**: visual regression runs against the **design-system component/template layer** (atoms through templates, Doc 09 §4), not against all 415 individual pages — consistent with the same reuse-aware principle as Section 4.1: if the template's visual baseline is correct, every screen built from unmodified template usage inherits that correctness, and Chromatic's diff surfaces only genuine deviations.
- **Both themes, both key breakpoints**: every story snapshot runs in light and dark mode (Doc 09 §2.4/§7.3 token requirements) and at the desktop and mobile-collapse breakpoint (Doc 09 §10.2's `ListPageTemplate` stacked-card collapse), since a regression that only appears in dark mode or only below the `md` breakpoint is exactly the kind of thing a single-snapshot setup would miss.

### 4.3 E2E tests (Playwright) — critical user journeys

E2E tests are deliberately the smallest layer by test count (Section 1.2) and deliberately scoped to journeys where a failure represents genuine business/user harm if it reached production undetected — not a proxy for screen-count coverage. The following ~11 journeys are the fixed, enumerated E2E suite:

1. **Signup → tenant creation → Institution Setup Wizard completion** (Doc 02) — a new tenant can actually be provisioned end-to-end, including the async provisioning steps (Doc 08).
2. **Admission Flow, end-to-end** — from application intake through the full `student.admitted` saga (Doc 08 §5.3) landing correctly in Finance, Library, and (opt-in) Hostel/Transport, ID-card, and Auth — the single highest cross-module-risk journey in the product, run as a real E2E test in addition to its backend integration coverage (Section 2.2), because this journey also exercises the frontend wizard, async status polling/notification, and eventual-consistency UI states.
3. **Fee payment**, including the payment-gateway integration path (sandbox/mocked gateway in CI) and the resulting ledger/receipt state.
4. **Exam result publish → student/parent sees it**, covering the Registrar/Principal publish action (Doc 04 §3.2, `Results — Publish`) and the read side appearing correctly and promptly for both Student and Parent roles, including the FERPA-adjacent access-control boundary (only linked guardians see it).
5. **Attendance marking** by Faculty for an assigned section, including the eligibility-threshold downstream effect on exam eligibility (the specific "wrong attendance affects exam eligibility" risk named in this document's scope).
6. **Login / OTP / SSO**, covering password login, OTP-based login, and SSO (Doc 04 §5) as three distinct journeys sharing one spec with parametrized providers.
7. **Multi-role login → Role Detect → dashboard context switch** (Doc 04 §2 note on multi-role accounts) — a Faculty-who-is-also-Parent account resolves to the correct scoped dashboard and can switch without re-authenticating.
8. **Permission-denied redirect/UI behavior** — a role attempting to reach a route/action outside its permission gets the correct denied state (not a broken page, not a silent no-op, not leaked data before the redirect fires).
9. **Bulk student import** (WizardTemplate, Doc 09 §4.4) — CSV upload through validation-error surfacing through committed records, since bulk-import is a common real-world failure point (partial imports, silent row drops).
10. **AI Assistant tool-calling round trip** — a representative "ask a question that requires a tool call" conversation (e.g. a Faculty user asking their own Assistant for a section's attendance summary), verifying the full stack from chat UI through tool execution through RBAC-scoped response (Section 6.1 covers the deeper security testing of this path; this E2E test proves the UI/API/Assistant integration itself works).
11. **Cross-tenant isolation smoke check at the UI layer** — logging in as users from two different seeded tenants (Section 10.1) in the same test run and asserting neither can reach the other's data via direct URL manipulation in a real browser context — a UI-layer companion to the backend RLS suite (Section 2.2), catching any client-side state leakage (e.g. a cached query key not scoped by tenant) that a backend-only test can't see.
12. **Exam-result-publish-day load behavior** (functional correctness under the load-test scenario in Section 8.3) — verifying the UI degrades gracefully (loading states, no double-submission) rather than breaking outright when the backend is under the peak-concurrency load profile.

**Environment**: Playwright runs against a full staging-like environment (real backend, real Postgres/Redis, seeded synthetic tenants — Section 10.1), never against mocked API responses, since the entire point of this layer is proving the real stack integrates correctly. **Flake handling** is governed by the flaky-test policy in Section 11.2 — E2E is the layer most prone to timing-related flakiness and is held to a stricter quarantine discipline than unit/integration tests as a result.

---

## 5. Data & Migration Testing

Alembic migrations (Doc 08 §3.2) run against a live multi-tenant database holding financial and academic records — a bad migration is not a "revert and redeploy" problem the way a bad application code deploy is, because data may already have been transformed or lost by the time the problem is noticed.

- **Forward migration tests**: every migration is applied, in CI, against a **realistic-scale synthetic copy** of the schema (Section 10.1's synthetic seed generator scaled up — tens of thousands of student/invoice/attendance rows, not a handful of fixture rows) — both to catch correctness bugs invisible at small scale (a backfill query that times out or an index build that locks a table for an unacceptable duration at real row counts) and to produce a realistic migration-duration measurement that feeds the deploy-runbook's maintenance-window estimate.
- **Backward migration (downgrade) tests**: every migration's `downgrade()` is also executed in CI directly after its `upgrade()`, against the same realistic-scale copy, and the suite asserts the schema (and, for data-migrations, the data) returns to its prior verified state — Alembic migrations that are unwritten or untested in the downgrade direction are a known rollback trap (Doc 08's deploy path assumes rollback is viable), and this test is what keeps that assumption true rather than aspirational.
- **Expand/contract pattern testing (Doc 08 §3.2)** — the mandatory pattern for breaking changes (add nullable → backfill → make non-null/drop old, across separate deploys, so rolling deploys never run old code against a migrated-out column):
  - A dedicated test class simulates the **mixed-version window**: old application code (pinned to the pre-migration ORM model) and new application code (pinned to the post-migration model) both run read/write operations against the database **mid-expand** (new column added, backfill in progress, old column still present) and the suite asserts both code versions function correctly throughout — this is the test that actually proves "rolling K8s deploys never run old code against a migrated-out column" rather than just asserting it in a doc.
  - The same test repeats for the **contract** step (old column about to be dropped): asserts no code path — including background jobs and event consumers still processing older-enqueued messages — still reads/writes the column being dropped, before the drop migration is allowed to merge.
- **Per-module Alembic branch labels (Doc 08 §3.2)**: a CI check verifies every new migration file declares the correct module branch label and that branch histories don't silently cross-reference in a way that would break the "future extracted service's data migration story stays tractable" property Doc 08 relies on.
- **Migration review gate**: autogenerated migrations (Doc 08 §3.2) are never merged un-reviewed — a human-reviewed checklist (index concurrency, lock duration estimate at realistic scale, downgrade path present) is a required PR template section for any migration touching a table over a size threshold, backed by the automated forward/backward tests above rather than replacing them.

---

## 6. AI/ML Feature Testing

The two AI surfaces named in the foundational facts — LLM tool-calling (AI Assistant) and ML risk scoring — fail in ways ordinary CRUD tests don't anticipate (non-determinism, prompt manipulation, statistical drift), and get dedicated testing approaches rather than being squeezed into the CRUD test layers above.

### 6.1 AI Assistant (LLM tool-calling) testing

- **RBAC-parity testing — the critical security test for this entire feature.** Doc 10 §3.3 establishes the load-bearing guarantee that a tool call executes under the requesting user's own token and hits the exact same API/RLS stack as a manual UI action. This is tested directly, not assumed from architecture: for every tool in the catalog, a test drives the tool call through the Assistant and, in the same test, drives the equivalent direct API call under the identical user/role/scope, and asserts **the authorization outcome is identical** (both succeed with the same data, or both are denied identically) — for every role the tool is offered to, including deliberately attempting tools/arguments **outside** that role's scope (e.g., prompting the Assistant, as a Faculty user, to "show me attendance for section X" where X is not one of their assigned sections) and asserting the same 403 a manual crafted API call would get (Section 2.2's crafted-request tests), not a model that "politely declines" — the enforcement must be the API's, not the model's judgment.
- **Prompt-injection resistance tests**: a maintained corpus of adversarial inputs — instructions embedded in uploaded documents, retrieved knowledge-base text, and inbound WhatsApp/SMS messages (Doc 10 §3.5) attempting to (a) exfiltrate the system prompt or tool schemas, (b) convince the model to call a tool outside the current user's role-scoped catalog, (c) convince the model to skip the approval-queue gate for a medium/high-stakes actionable tool call (Doc 10 §1.2/§3.5) — run as a regression suite. **The pass criterion is layered, matching Doc 10 §3.5's defense-in-depth model**: even a successful injection (the model "agrees" to try) must still fail at the API permission check or land in the approval queue; a test only truly fails if data is disclosed or a record is actually mutated outside the user's authority. This suite is re-run on every Model Gateway provider change (Doc 10 §3.1) and every prompt-template change, since both can silently regress injection resistance.
- **Golden-set regression tests for response quality**: a curated, versioned set of representative conversations (per module — Student Assistant academic queries, Faculty Assistant grading/attendance queries, admissions inquiries) with expected tool-call sequences and acceptable-response criteria (not exact-string match, given LLM non-determinism, but assertions like "cites the correct fee balance figure," "does not fabricate a policy that doesn't exist," "correctly declines when the answer isn't retrievable"). Run on a schedule and on every prompt-template/model-provider change, with regressions requiring explicit sign-off before merge — this is the mechanism that catches "the Assistant got quietly worse" drift that no unit test structure would notice.
- **Output-filtering tests**: verify the response-scanning layer (Doc 10 §3.5) actually catches system-prompt leakage and credential-shaped strings in a response, using deliberately crafted model outputs (mocked at the Model Gateway boundary) rather than relying on the live model to reliably reproduce a leak on demand.

### 6.2 Predictive risk-scoring model testing

- **Offline evaluation on historical labeled data**: before any model version ships, precision/recall (and for imbalanced classes like dropout risk, precision-recall AUC over plain accuracy) are computed against a held-out historical dataset with known outcomes, gated at a minimum-performance threshold agreed with the academic stakeholders who consume the score — a model that regresses below the prior version's benchmark on the same held-out set does not ship.
- **Bias/fairness checks across student demographics**: the same offline evaluation is sliced by demographic attributes available in the data (gender, socioeconomic fee-category, hostel/day-scholar status, department) and checked for material disparities in false-positive/false-negative rates between groups — a risk model that systematically over-flags one demographic group as "at risk" is a fairness failure with real consequences (a student wrongly triaged into intervention, or wrongly *not* triaged), and this check runs on every model retrain, not just at initial launch.
- **Explainability requirement is tested, not just implemented**: Doc 10 §4's hard requirement that every `risk_scores` entry populates `contributing_factors` (Doc 03 §5.13) is enforced by a test asserting the field is never null/empty for any prediction the pipeline writes — a bare score without factors is treated as a bug at the data-contract level, matching Doc 10 §4's framing of this as a hard schema requirement.
- **Drift monitoring in production** (the ongoing counterpart to pre-release offline evaluation): scheduled jobs compare the live feature-value distributions and prediction-score distributions against the training-time baseline, alerting when either drifts past a threshold — this is a monitoring signal, not a pre-merge test, but it is specified here because it closes the loop the offline tests alone cannot: an offline-validated model can still degrade in production as the underlying student population or institutional policy shifts over a school year. Sustained drift routes to a scheduled model-retrain-and-re-evaluate cycle, re-entering the offline evaluation gate above before the retrained model replaces the live one.
- **Human-in-the-loop boundary is tested**: consistent with Doc 10 §5, a test asserts that an `advisory`-tagged prediction (a risk score) never triggers an automatic record change or outbound message on its own — it is display-only until a human actor takes an explicit action, and this boundary is tested the same way an RBAC boundary is (Section 3.2's negative-test discipline): `test_risk_score_generation_never_triggers_auto_intervention`.

---

## 7. Multi-Tenancy & Security Testing

### 7.1 Dedicated cross-tenant isolation suite — run on every PR

The RLS policy tests, crafted-request tenant-isolation tests, and AI RAG tenant-filter tests described in Sections 2.2, 4.3 (#11), and 6.1 are consolidated into one **named, dedicated cross-tenant isolation suite** — not scattered as incidental cases inside other suites — because a security-critical guarantee needs a single, unmissable place a reviewer or auditor can point to and say "this is where isolation is proven." This suite:

- Runs on **every PR** that touches a tenant-scoped table, RLS policy, connection-pooling/session-variable wiring (Doc 08 §6), the vector-store retrieval layer (Doc 10 §3.2), or the AI tool-call layer — treated as a required check (Section 11.3), never optional or skippable.
- Also runs in full, unconditionally, on a nightly schedule against the full current schema, independent of what changed that day — catching isolation regressions introduced by something indirect (a caching layer change, a new background job that queries without going through the tenant-scoped repository layer, Doc 04 §4.2).
- Failure of this suite blocks merge and pages the on-call security owner if it fails on the nightly run against a schema that was previously passing — a cross-tenant leak is treated with the same urgency as a production incident, because it effectively is one waiting to happen.

### 7.2 Penetration testing cadence

- **Annual third-party penetration test**, scoped explicitly to include multi-tenant isolation bypass attempts, RBAC privilege-escalation attempts, and the AI Assistant's tool-calling boundary (Section 6.1) as named focus areas — not a generic web-app pentest that happens to run against Sutram, but one briefed on Sutram's specific architecture (RLS + ABAC-lite + LLM tool-calling) so testers target the guarantees this document claims to make.
- Findings are triaged with the same severity/SLA framework as the incident-response process (Doc 04 §11), and a critical finding (any confirmed cross-tenant data access or privilege escalation) blocks the next release until remediated and re-verified, not merely logged for a future sprint.
- **Continuous automated scanning** runs between annual pentests rather than leaving a year-long gap: authenticated DAST scanning (e.g. OWASP ZAP in authenticated-crawl mode) against a staging environment on a recurring schedule, covering the OWASP Top 10 class of issues that don't require a human tester's creativity to find.

### 7.3 Dependency vulnerability scanning gate in CI

- **Backend**: `pip-audit` (or equivalent, matching the Python 3.12 toolchain) runs in CI on every PR and on a daily schedule against `main`, gated to fail the build on any newly introduced **critical/high**-severity vulnerability with a known fix available; lower-severity or fix-unavailable findings are tracked but non-blocking, to avoid the gate becoming noise that gets routinely overridden.
- **Frontend**: equivalent scanning (`npm audit` / `pnpm audit` or a dedicated SCA tool) integrated into the same CI stage, respecting the Turborepo monorepo's workspace boundaries (Doc 09 §3) so a vulnerable dependency is attributed to the specific package that pulled it in.
- **Container/base-image scanning**: the backend and frontend deploy images are scanned (e.g. Trivy or equivalent) as part of the CI pipeline's build stage (lint → typecheck → unit → build → integration → security scan → preview deploy — this stage), before a preview deploy is ever created, so a vulnerable base image never reaches even a preview environment.
- **Secrets scanning**: a pre-commit and CI-level secrets scanner (e.g. gitleaks) runs against every diff, blocking merge on any detected credential/key pattern — cheap, high-value, and specifically relevant given the multi-tenant JWT/session-signing keys and payment-gateway credentials this system handles.

---

## 8. Performance & Load Testing

### 8.1 Target SLOs

| Metric | Target | Rationale |
|---|---|---|
| API p95 latency, CRUD reads (list/detail endpoints) | < 300 ms | Consistent with the DataTable-heavy, list-screen-dominant UI (Doc 09 §9.3) — a slow list endpoint is felt on the majority of the app's screens. |
| API p95 latency, CRUD writes | < 500 ms | Writes reasonably tolerate more overhead (validation, RLS, outbox write) than reads, but must stay well under a "did that actually save?" perception threshold. |
| API p99 latency, all endpoints | < 1.5 s | A wider tail budget acknowledges heavier report/analytics endpoints exist, while still bounding worst-case UX. |
| Dashboard initial load | < 2 s | Matches the role-adaptive dashboard's centrality (Doc 09) as the first screen nearly every session lands on. |
| DataTable virtualized scroll frame time (10,000+ row roster) | < 16 ms/frame (60fps) | Directly tests the virtualization strategy in Doc 09 §9.3 under the realistic large-institution roster size it was designed for. |
| Event-consumer lag (outbox → consumer side-effect complete) | p95 < 5 s under normal load | Bounds how long an admission's downstream side effects (fee record, library account, etc.) take to materialize, relevant to support-ticket "why hasn't X shown up yet" volume. |

### 8.2 Tooling: k6

**k6** is the load-testing tool of choice — scriptable in JavaScript (a natural fit alongside the Playwright/TypeScript frontend tooling already in the stack), with first-class support for scenario-based load shapes (ramping, spike, soak) needed for the peak-event scenario below, and clean CI integration for regression-gating performance budgets over time (not just ad hoc manual runs).

- **Baseline/regression load tests** run against staging on a recurring schedule (not every PR — too expensive/slow to gate every merge on) and compare against the SLO table above and the prior run's baseline, flagging regressions before they compound release over release.
- **Scripts are organized per critical journey**, reusing the same ~11 flows named in Section 4.3 where applicable (login, admission submission, fee payment, attendance marking, result viewing) so load-test coverage and E2E-journey coverage stay conceptually aligned rather than diverging into two separately-maintained flow catalogs.

### 8.3 Peak-load scenario: exam-result-publish day

This is Sutram's canonical worst-case traffic shape and is modeled explicitly, not left to a generic ramping profile: a Registrar/Principal publishes results (Doc 04 §3.2, `Results — Publish`) and a large fraction of an institution's students and parents check simultaneously within a short window — a spike load shape, not a gradual ramp.

- **Scenario construction**: seed a synthetic tenant at realistic large-institution scale (Section 10.1), publish results for one large cohort, and drive a k6 spike scenario simulating thousands of concurrent Student/Parent sessions hitting the results-read endpoint and the notification-triggered dashboard load within a compressed time window (e.g. 5,000 virtual users ramping to peak over 30 seconds, sustained for several minutes) — sized to a specific large-tenant profile agreed with the PRD's target institution sizes (Doc 01).
- **What's asserted**: the SLO table above holds under this specific spike (not just under steady-state average load), the event-driven notification fan-out (Communication module, Doc 08 §4) doesn't itself become the bottleneck, and — critically — that degradation under overload is *graceful* (queuing/backpressure, informative loading states per Section 4.3 journey #12) rather than cascading failure (connection pool exhaustion taking down unrelated endpoints in the same modular monolith process).
- **Database connection-pool behavior** under this scenario is explicitly monitored, given the shared-monolith, PgBouncer-pooled architecture (Doc 08 §6) — a spike concentrated on one module's read path must not starve other modules' connections in the same pool.

### 8.4 DataTable virtualization performance testing

- A dedicated k6/browser-level (Playwright + Chrome DevTools Protocol tracing) test seeds a roster of 10,000+ students in a synthetic tenant and drives the Students `ListPageTemplate` through scroll, sort, filter, and search interactions, asserting frame times stay within the 60fps budget (Section 8.1) and that memory usage stays bounded (proving only visible rows + overscan actually mount, per Doc 09 §9.3's virtualization design) rather than growing linearly with dataset size, which would indicate the virtualization contract silently broke.
- This test is re-run whenever `DataTable`/`@tanstack/react-virtual` versions are upgraded or the shared `DataTableToolbar` changes, since a regression here silently degrades all ~200+ list-page-template instances at once (Section 4.2's same reuse-aware rationale, applied to performance rather than visual correctness).

---

## 9. Accessibility Testing

Accessibility is a binding WCAG 2.1 AA target across all 415 screens (Doc 09 §10.1), operationalized here with the same reuse-aware logic used throughout this document: automate what can be automated at the template/component level, and schedule manual audits where automation structurally cannot reach.

### 9.1 Automated testing (axe-core)

- **Component/story level**: axe-core runs via the Storybook accessibility addon (Doc 09 §11) against every atom/molecule/organism/template story in CI — this is the floor referenced in Doc 09 §10.1, catching missing ARIA roles/labels, insufficient contrast, and focus-order issues at the point of authorship, before a component is even composed into a page.
- **Integration/E2E level**: `axe-core` (via `@axe-core/playwright`) runs as an assertion within the critical-journey E2E suite (Section 4.3) — catching page-level accessibility issues that only manifest in composition (e.g. a modal's focus trap interacting incorrectly with a page-level skip link) that isolated Storybook stories can't surface.
- **CI gate**: any new/changed component or template with a critical or serious axe violation fails the PR — this is enforced as a hard gate specifically at the template/shared-component layer (Section 4.1's same 4-templates-plus-shared-organisms leverage point), since a violation there is inherited by every one of the 415 screens built on it.

### 9.2 Manual audits

- Automation catches roughly the same 30-40% of WCAG issues industry-wide that automated tooling is known to reliably catch (contrast, missing labels, structural ARIA) — it structurally cannot verify screen-reader narrative coherence, logical focus order across a full task flow, or whether an alternative interaction pattern (Doc 09 §10.1's `AttendanceGrid` matrix-input accessible-alternative, `DataTable` sort/filter keyboard pattern) is actually usable, not just technically present.
- **Manual audit cadence**: scheduled per phase (aligned to Doc 10's phasing) against the **highest-traffic templates and flows** first — `ListPageTemplate`/`DetailPageTemplate` (the majority of daily usage), the login/OTP/SSO flow, the Admission Flow wizard, the Attendance Grid, and the AI Assistant chat surface — using screen-reader (NVDA/VoiceOver) and keyboard-only walkthroughs performed by a tester following a documented task script, not an ad hoc click-around.
- Findings are triaged against WCAG 2.1 AA success criteria explicitly (not just "feels off"), logged with a severity and success-criterion reference, and a Level A/AA blocker on a highest-traffic template blocks that phase's release the same way a critical security finding would (Section 7.2's severity framing).

---

## 10. Test Data & Environments

### 10.1 Synthetic multi-tenant seed data generator

- A shared seed-data generator (Python, reusing the `factory_boy` factories from Section 2.1 at bulk scale) produces **multiple realistic synthetic tenants** — varying institution type (K-12, university, per Doc 04's role catalog covering both), size (small single-campus through large multi-campus), and module enablement — each with internally consistent fake students, guardians, faculty, courses, sections, attendance history, exam/results history, fee ledgers, and library/hostel/transport records, generated with a fixed seed for reproducibility across CI runs.
- **Always at least two tenants seeded together** in any environment where isolation matters (integration tests, staging, E2E) — a single-tenant test environment can never exercise the cross-tenant isolation suite (Section 7.1) meaningfully, so "seed at least Tenant A and Tenant B" is a structural rule for every non-unit test environment, not a special case.
- **Scale variants**: a "large institution" seed profile (10,000+ students, matching Section 8.4's virtualization test and Section 8.3's peak-load scenario) is maintained alongside a "small/fast" profile used for everyday CI runs where full scale would slow the loop unnecessarily — the generator is parametrized by scale, not duplicated as separate scripts.
- **Realistic-but-obviously-fake data**: names, addresses, and identifiers are generated (via `Faker`, region-appropriate locales given Sutram's target market, Doc 09 §10.3's Hindi/regional-language roadmap) to be structurally realistic (valid-shaped phone numbers, plausible Indian names/addresses) while being unmistakably synthetic (a fixed, documented fake-data namespace/domain) — good enough to catch real formatting/validation bugs, never mistakable for real PII.

### 10.2 Test data isolation between test runs

- **Unit tests**: each test function gets a fresh, isolated in-memory-scale fixture set via `factory_boy`; no shared mutable state between tests, enforced by pytest's fixture scoping (function-scoped by default, session-scoped only for genuinely read-only reference data).
- **Integration tests**: each test (or test class, where setup cost warrants batching) runs inside a database transaction that is rolled back at teardown, or against a Testcontainers instance recycled per test session — either way, no test's data is visible to another test, and CI parallelism (running multiple integration test workers concurrently) is safe because each worker gets its own container/transaction scope, never a shared mutable database.
- **E2E/staging**: synthetic tenants (Section 10.1) are namespaced per test run (e.g. a run-ID suffix on tenant slugs) and torn down (or simply left as disposable, regenerated-next-run seed data in an ephemeral preview environment) rather than accumulating state that makes later runs non-reproducible or slower over time.
- **Preview deployments** (Doc 08/CI pipeline's preview-deploy stage) get their own freshly-seeded database per PR, never a shared long-lived staging database mutated by every open PR simultaneously — this is what makes E2E runs against a preview deploy reproducible and PR-isolated.

### 10.3 Anonymization approach for any production-derived test data

Sutram's default and strongly preferred posture is **never to use production-derived data for testing** — the synthetic generator (Section 10.1) is designed to be realistic enough that this is rarely necessary. For the narrow cases where reproducing a production-only bug genuinely requires production-shaped data (e.g. a data-distribution edge case the synthetic generator doesn't happen to produce):

- **FERPA/DPDP compliance framing**: any production-derived dataset used for testing is treated as an education record / personal data export subject to the exact same access-control, retention, and audit requirements as production itself (Doc 04 §8) — "it's just for testing" is explicitly not an exemption from these obligations.
- **Anonymization is applied before the data leaves the production security boundary**, not after: irreversible pseudonymization/tokenization of direct identifiers (name, contact details, government ID numbers, guardian relationships) and either generalization or synthetic replacement of quasi-identifiers that could enable re-identification via linkage (exact date of birth → age band, exact address → district-level only), with academic/financial values (grades, fees, attendance patterns) preserved in distribution-shape but not tied back to a real identity.
- **Requires explicit, logged approval** from the data-protection owner named in Doc 04 §8's compliance section for each specific use, time-boxed, and the resulting anonymized dataset is itself subject to the same retention limits as any other test data (Section 10.2) — not retained indefinitely once the specific debugging need is resolved.
- **Never used in any environment with broader access than production itself** — an anonymized-but-still-sensitive dataset in a low-security test environment would defeat the purpose of anonymizing it in the first place, so it is scoped to the same access tier as the production data it was derived from, tighter if practical.

---

## 11. Quality Gates & CI Enforcement

### 11.1 Coverage thresholds — realistic, per layer

Sutram deliberately does **not** target 100% coverage everywhere — a uniform 100% target incentivizes low-value tests (trivial getters, framework boilerplate) that inflate the number without reducing real risk, and slows the team down chasing coverage on code that doesn't warrant it. Instead, thresholds are set per layer, calibrated to how much correctness risk that layer actually carries:

| Layer | Coverage threshold | Rationale |
|---|---|---|
| Backend business logic (fee calc, grading, attendance eligibility, permission resolution, event payload construction) | **80% line, 90% branch** on the specific modules flagged as business-logic-bearing | Where wrong output = wrong grade/fee/eligibility. Branch coverage weighted higher than line coverage here specifically because the risk is in untested *conditions* (edge-case thresholds), not untested lines. |
| RLS / tenant-isolation suite (Section 2.2, 7.1) | **100% of tenant-scoped tables** | Not a percentage-of-lines target — a completeness target: every tenant-scoped table must have a passing isolation test, full stop, enforced by the CI check described in Section 2.2, not a coverage percentage that could technically pass while missing an entire table. |
| Permission matrix (Section 3.1) | **100% of matrix cells** | Same completeness logic — the matrix fixture defines the full cell set, and the parametrized suite covers all of it by construction; "80% of the permission matrix tested" is not a meaningful or acceptable target for a system this security-sensitive. |
| Backend integration/API layer generally | **70% endpoint coverage** by Schemathesis + integration tests combined | High-value but with acceptable diminishing returns on rarely-hit administrative/reporting endpoints. |
| Frontend components (atoms/molecules/organisms) | **75% line coverage** on `packages/ui` | Below business-logic thresholds deliberately — much of this layer is presentational, where visual regression testing (Section 4.2) is a better-fit signal than line coverage. |
| Frontend page templates (4 templates) | **90%+ behavioral coverage** (every documented structural behavior in Doc 09 §4.4 has an asserting test) | The single highest-leverage frontend surface (Section 4.1) — under-testing here is under-testing ~80% of the app's screens at once. |
| AI/ML feature code (Section 6) | No blanket line-coverage number; gated instead on **golden-set pass rate, RBAC-parity suite pass rate (100%, no exceptions), and offline-eval metric thresholds** | Line coverage is a poor proxy for LLM/ML correctness; the layer-appropriate gates (Section 6) are the actual quality signal. |

Coverage is measured and reported per-package in the Turborepo monorepo (not one repo-wide number that hides which package is under-tested), and a PR that drops a package below its threshold fails CI — but raising a threshold's *ceiling* further (chasing marginal percentage gains past these targets) is explicitly not a goal in itself.

### 11.2 Flaky-test policy

- A test that fails intermittently without a code change is **quarantined, not ignored and not left red**: it is tagged (`@pytest.mark.flaky` / Playwright's `test.fixme` equivalent with a linked tracking issue) and excluded from the blocking gate within a bounded window (a sprint, or a hard cap of quarantined tests per suite, whichever is tighter), with an owner assigned at quarantine time.
- **Quarantine is not a place tests go to die**: a dashboard tracks quarantined-test age, and a test quarantined past its window without resolution escalates — either it's fixed, or it's deleted as genuinely not testing anything reliable (with the underlying behavior gap explicitly acknowledged, not silently dropped).
- E2E (Playwright) tests, being the most flake-prone layer structurally (Section 1.2), get automatic retry-once-on-failure in CI before a failure is treated as real, but a test that only passes on retry more than an agreed rate of the time is itself flagged for quarantine review — retries are a noise-reduction tool, not a way to hide a genuinely flaky test's signal.

### 11.3 Branch protection & required checks

- `main` (and any long-lived release branch) requires: **at least one approving review** from a code owner of the touched package(s) (Turborepo workspace-based CODEOWNERS), **all required CI checks passing** (lint → typecheck → unit → build → integration → security scan, per the pipeline named in Doc 08/09), and — specifically for this document's scope — the **cross-tenant isolation suite (Section 7.1)** and, where the diff touches `packages/rbac`/permission code, the **full negative-permission-test suite (Section 3.2)** as additionally named required checks, not folded silently into a generic "integration tests" bucket that could pass while a specific security suite within it is skipped or mis-scoped.
- **Security-relevant PRs** (permission-matrix changes, RLS policy changes, auth/session code, AI tool-catalog changes) require a second reviewer with security/RBAC context specifically, per the sign-off requirement in Section 3.3 — a single generalist approval is insufficient for this class of change.
- Force-pushing past a failing required check, or merging with an admin override, is logged and requires a documented justification — consistent with this document's overall stance that the RLS/permission/contract layers are release-blocking by design, not advisory.

---

## 12. Release Testing

### 12.1 Staging smoke tests pre-production

- Before any production deploy, a **fast smoke suite** (a curated subset of the critical-journey E2E tests, Section 4.3 — login across auth methods, one full admission, one fee payment, one result publish/view cycle, the cross-tenant isolation smoke check) runs against staging with production-equivalent configuration (same migration state, same feature flags as the release candidate) and must pass before promotion proceeds.
- The smoke suite is deliberately small and fast (targeting single-digit minutes) so it functions as a true pre-flight gate, not a full regression run duplicating the PR-time CI suite — its job is to catch environment/configuration drift between staging and the release candidate, not to re-prove correctness already proven at merge time.

### 12.2 Canary monitoring as a testing signal

- Consistent with the canary rollout strategy owned by the DevOps/Infrastructure document (Document 14), the canary phase of a production rollout is treated as a **live extension of the test suite**, not purely an operational concern: the same SLO thresholds from Section 8.1 (p95 API latency, error rate) and the cross-tenant isolation suite's monitoring-equivalent (an automated synthetic-tenant probe hitting the canary slice on the same schedule as the nightly isolation suite, Section 7.1) are evaluated automatically against canary traffic before it is promoted to full rollout.
- Golden-set AI regression checks (Section 6.1) and risk-model drift monitoring (Section 6.2) are included in the canary evaluation window for releases that touch those subsystems, since both are the kind of regression that a pre-deploy test suite can validate in isolation but that benefits from a final real-traffic confirmation before full exposure.

### 12.3 Rollback triggers tied to automated signals

Rollback is triggered automatically (paging on-call and halting further canary promotion, per the DevOps document's rollout automation) — not left to manual judgment alone — on any of:

- SLO breach on the canary slice beyond the thresholds in Section 8.1, sustained past a defined grace window (avoiding rollback-on-noise from a single slow request).
- **Any failure of the cross-tenant isolation probe** (Section 7.1) — this trigger has no grace window and no severity threshold below "immediate rollback," consistent with this document's position that a cross-tenant leak is treated as an active incident the instant it's detected, canary or not.
- A statistically significant error-rate increase on the canary slice relative to the pre-deploy baseline, specifically including a spike in 403/401 responses (a proxy for a permission-matrix regression, Section 3.3, that staging smoke tests didn't happen to exercise) and 5xx responses on event-consumer endpoints (a proxy for a saga/contract regression, Sections 2.2-2.3).
- Golden-set AI regression failure or a risk-model drift-monitor breach (Section 6.2) beyond its agreed threshold, for releases touching those subsystems specifically.

A rollback is followed by the same PR-gate discipline as any other change reaching main: the root cause gets a regression test added at the appropriate layer identified above **before** the fix is allowed to re-attempt release — a production rollback with no corresponding new test is treated as an incomplete resolution.

---

## 13. Summary of Binding Decisions

| Area | Decision |
|---|---|
| Test pyramid shape | Unit ~50%, Integration ~30%, Contract/API-fuzz ~15%, E2E ~5% — integration/contract deliberately over-weighted vs. typical SaaS given saga/RLS/permission risk (Section 1) |
| Backend unit tests | pytest, `factory_boy` fixtures, external boundaries mocked, **DB never mocked** (Section 2.1) |
| Backend integration tests | Testcontainers (real Postgres 16 + Redis), explicit RLS + crafted-request tenant-isolation tests per table, saga/idempotency/reconciliation tests (Section 2.2) |
| Event contract tests | Versioned JSON Schemas in `packages/event-contracts`, producer + consumer side, CI-enforced (Section 2.3) |
| API fuzzing | Schemathesis against live OpenAPI spec, stateful mode for multi-step flows, run per-role (Section 2.4) |
| RBAC testing | Parametrized full-matrix sweep (100% of cells) from a checked-in fixture + explicit named negative tests + PR-time diff report on matrix changes (Section 3) |
| Frontend component tests | Vitest + React Testing Library, concentrated at the 4-template layer, thin config-level tests per module screen (Section 4.1) |
| Visual regression | Storybook + Chromatic, design-system/template layer, light+dark × desktop+mobile (Section 4.2) |
| E2E | Playwright, ~11-12 fixed critical journeys, run against full staging-like stack (Section 4.3) |
| Migration testing | Alembic forward + backward tests at realistic scale in CI; dedicated expand/contract mixed-version-window tests (Section 5) |
| AI Assistant testing | RBAC-parity tests (tool call vs. manual API call, identical outcome, 100% required), prompt-injection corpus, golden-set regression (Section 6.1) |
| Risk-model testing | Offline precision/recall + bias/fairness slicing pre-release; production drift monitoring post-release (Section 6.2) |
| Cross-tenant isolation suite | Dedicated, named, required on every PR + nightly full run, pages on-call on nightly failure (Section 7.1) |
| Security testing | Annual third-party pentest + continuous authenticated DAST + CI dependency/secrets scanning gate (Section 7.2-7.3) |
| Load testing | k6; SLOs incl. p95 CRUD read < 300ms, dashboard < 2s; explicit exam-result-publish-day spike scenario; DataTable 10k+ row virtualization test (Section 8) |
| Accessibility testing | axe-core in CI at component/template + E2E level; manual audits per phase on highest-traffic templates against WCAG 2.1 AA (Section 9) |
| Test data | Synthetic multi-tenant generator (min. 2 tenants seeded together always), per-run isolation, anonymization-with-approval only as a rare fallback (Section 10) |
| Coverage thresholds | 80%/90% branch on business logic; 100% completeness (not %) on RLS tables and permission matrix; 75% on UI components; 90%+ behavioral on templates; AI/ML gated on golden-set + RBAC-parity instead of line coverage (Section 11.1) |
| Flaky tests | Quarantine with owner + expiry, never silently ignored; E2E gets one auto-retry, not unlimited (Section 11.2) |
| Branch protection | Required review + required checks incl. named isolation and permission-negative suites as distinct gates; second reviewer for security-relevant PRs (Section 11.3) |
| Release testing | Fast staging smoke suite pre-promotion; canary phase treated as a live test extension; automatic rollback on isolation-probe failure (no grace window) and SLO/error-rate/AI-regression breaches (Section 12) |

*End of Document 13. Referenced forward: Document 14 (DevOps & Infrastructure) owns the canary rollout mechanics and CI pipeline infrastructure this document's gates (Section 11) and release-testing triggers (Section 12) plug into.*
