# Sutram — Document 6: UX Flows

**Product:** Sutram — AI-powered, Multi-Tenant Education Operating System
**Company:** Pragyaan Labs
**Document owner:** Product Design
**Status:** Baseline for frontend implementation, backend service-call sequencing, and notification/API design
**Scope:** Full responsive web application. Native mobile app out of scope for this revision.
**Depends on:** Document 2 (Information Architecture & Sitemap), Document 4 (RBAC & Security)

---

## Table of Contents

1. [Conventions Used in This Document](#1-conventions-used-in-this-document)
2. [Onboarding: Signup → Tenant Creation → Setup Wizard → First Login](#2-onboarding-signup--tenant-creation--setup-wizard--first-login)
3. [Authentication Flows](#3-authentication-flows)
4. [Cross-Module Workflows](#4-cross-module-workflows)
5. [Daily-Use Persona Flows](#5-daily-use-persona-flows)
6. [Global Search & Quick Actions](#6-global-search--quick-actions)
7. [Error-State & Empty-State UX Principles](#7-error-state--empty-state-ux-principles)
8. [Notification Flow](#8-notification-flow)
9. [Notes for Downstream Documents](#9-notes-for-downstream-documents)

---

## 1. Conventions Used in This Document

### 1.1 Flow notation

Every flow is a numbered sequence of steps in the form:

```
N. [Screen/Route] → (User Action) → {System Response / State Change} → Next: [Screen/Route]
```

- **[Screen/Route]** — the screen the user is looking at, using the exact route from Document 2.
- **(User Action)** — what the user does: click, type, submit, wait.
- **{System Response / State Change}** — what the backend does: validation, record creation/update, service calls, notification dispatch. Where a step creates or mutates data, the affected module and table-level entity (per Document 3's schema naming) is named explicitly.
- **Branches** are labeled `Na.`, `Nb.`, etc., attached under the step where the fork occurs, and always terminate either by rejoining the main flow at a named step or by ending the flow (e.g. "user stays on screen, form intact").
- **{Notify: ...}** marks a notification dispatch point and is always followed by `(channel: recipient — trigger)`. See Section 8 for the full trigger taxonomy this shorthand refers to.

### 1.2 Roles referenced

Role slugs match Document 4 exactly: `super_admin`, `institution_admin`, `principal`, `dean`, `registrar`, `hod`, `faculty`, `teaching_assistant`, `researcher`, `accountant`, `hr_manager`, `hostel_warden`, `librarian`, `placement_officer`, `transport_manager`, `student`, `parent`, `guest`.

### 1.3 What this document does not cover

Visual layout, spacing, and component styling (wireframe doc, not yet written) are out of scope here — this document is the *behavioral* contract: what happens, in what order, and what state changes as a result. Field-level validation rules beyond "required/format" are deferred to the API/schema docs; this document notes *that* validation happens and *what* branch it produces, not the full rule set.

---

## 2. Onboarding: Signup → Tenant Creation → Setup Wizard → First Login

### 2.1 Signup & Tenant Provisioning (`/signup/*`)

1. `/signup` (Account Basics) → (User enters full name, work email, password, org name; clicks "Continue") → {Client-side validation: email format, password strength (min 8 chars, 1 number, 1 symbol); on submit, backend checks email not already tied to an active tenant account} → Next: `/signup/institution`
   - 1a. If email already registered to a tenant → {Inline error: "An account already exists for this email"} → link to `/auth/login`; user stays on screen.
   - 1b. If password fails strength check → {Inline error under field, live-updated per keystroke}; user stays on screen.

2. `/signup/institution` (Institution Name & Type) → (User enters institution legal name, selects institution type from {School, College, University, Coaching Institute, Research Institute}, selects country/state for locale defaults; clicks "Continue") → {Client validation only at this step; no backend write yet — signup wizard state is held client-side/session until payment confirms, to avoid orphaned tenant rows from abandoned signups} → Next: `/signup/plan`
   - 2a. If user navigates back from a later step → prior answers are retained (session-persisted wizard state).

3. `/signup/plan` (Select Plan) → (User selects a plan tier: Starter/Growth/Enterprise; toggles monthly/annual billing; sees module inclusions per plan) → {Client computes price; no backend write} → Next: `/signup/payment`
   - 3a. If user selects "Enterprise" (custom pricing) → {Redirects to `/contact` sales-assisted flow instead of proceeding to payment}; onboarding via self-serve wizard ends here for that path.

4. `/signup/payment` (Payment Details) → (User enters payment method via embedded payment gateway widget — card or UPI/net-banking depending on locale; clicks "Pay & Continue") → {Client tokenizes payment method with the gateway; backend has still not created any tenant/user rows} → Next: `/signup/payment/confirm`
   - 4a. If gateway declines the payment → {Inline error: "Payment failed — [gateway reason code, human-readable]"}; user remains on `/signup/payment` with method cleared, may retry with a different method.
   - 4b. If gateway times out → {Error banner: "We couldn't confirm your payment. If you were charged, it will be refunded automatically within 5–7 days."}; retry button shown.

5. `/signup/payment/confirm` (Payment Confirmation) → (System auto-advances after gateway webhook confirms charge; no user action required beyond a brief spinner) → {Backend now performs the first real writes, in order: (1) create `tenants` row with status=`provisioning`, (2) create `subscriptions` row linked to the selected plan and payment method, (3) create `billing_invoices` row for this charge} → Next: `/signup/provisioning`

6. `/signup/provisioning` (Tenant Provisioning — progress screen) → (User waits; screen shows a checklist-style progress indicator: "Setting up your workspace… Configuring database… Applying institution defaults… Almost there") → {Backend asynchronously: provisions tenant-scoped schema/row-level-security context, seeds default role catalog (Document 4 §2) into `role_permissions` for this tenant, seeds default module enablement per selected plan into `tenant_module_config`, sets `tenants.status = active`} → Next: auto-redirect to `/signup/admin` on completion (typically 5–15 seconds)
   - 6a. If provisioning fails (rare — infra error) → {Error screen: "Something went wrong setting up your workspace. Our team has been notified."} {Notify: internal ops alert (channel: PagerDuty/Slack — provisioning_failure)}; user given a "Retry" button that re-attempts idempotently against the same `tenant_id`.

7. `/signup/admin` (Create Super Admin / Institution Admin Account) → (User confirms/edits their name, sets final login password if not already set, accepts Terms of Service checkbox; clicks "Create Account") → {Backend creates `users` row with role=`institution_admin`, `tenant_id` = the newly provisioned tenant, `email_verified = false`; creates the guardian session; sends verification email} → {Notify: email to signup email — welcome + verify-email link} → Next: `/signup/complete`
   - 7a. If Terms checkbox not accepted → (Continue button disabled) — no backend call attempted.

8. `/signup/complete` (Signup Complete) → (Auto-redirect after 2–3 seconds, or user clicks "Go to Setup") → {Session established as `institution_admin`; onboarding flag `tenant.setup_completed = false` checked} → Next: `/setup/institution`

**State created by end of Section 2.1:** 1 `tenants` row, 1 `subscriptions` row, 1 `billing_invoices` row, 1 `users` row (institution_admin), seeded `role_permissions` and `tenant_module_config` rows.

### 2.2 Institution Setup Wizard (`/setup/*`, one-time, `institution_admin` only)

The wizard is resumable — each step writes on "Next," so an abandoned session can resume at the last incomplete step via `tenant.setup_progress`. Every step other than the first can be skipped ("Skip for now") except where explicitly noted as blocking; skipped steps show a "Setup incomplete" nudge banner on `/app/dashboard` until completed.

1. `/setup/institution` (Institution Details) → (User enters/confirms institution name, address, phone, official email, academic year start month, timezone; uploads logo optionally) → {Writes `institutions` row (or updates the stub created at signup); logo upload → object storage + `institutions.logo_url`} → Next: `/setup/campus`

2. `/setup/campus` (Campus Setup) → (User adds one or more campuses: name, address, is primary; for single-campus tenants, one default campus is pre-filled and this step is a single confirm) → {Writes `campuses` row(s)} → Next: `/setup/departments`

3. `/setup/departments` (Departments Setup) → (User adds departments: name, code, assigns to a campus; can bulk-add via a repeatable row or CSV) → {Writes `departments` rows} → Next: `/setup/calendar`
   - 3a. If skipped → default single department "General" is auto-created so downstream Course/Subject steps have a valid parent.

4. `/setup/calendar` (Academic Calendar) → (User sets academic year date range, marks holidays/vacation blocks) → {Writes `academic_calendar` rows} → Next: `/setup/semester`

5. `/setup/semester` (Semester/Term Setup) → (User defines term structure: Semester/Trimester/Annual; adds term names and date ranges) → {Writes `semesters`/`terms` rows} → Next: `/setup/courses`

6. `/setup/courses` (Course Setup) → (User adds initial courses/programs: name, department, duration, intake capacity) → {Writes `courses` rows} → Next: `/setup/faculty`
   - 6a. If skipped → user may add courses later from `/app/academics/courses/new`; onboarding nudge persists.

7. `/setup/faculty` (Faculty Onboarding) → (User bulk-invites initial faculty via CSV upload or manual add: name, email, department, designation) → {Writes `users` rows with role=`faculty`, status=`invited`; sends invite emails} → {Notify: email to each invited faculty — account-invite with set-password link} → Next: `/setup/admins`
   - 7a. If CSV has validation errors (duplicate email, missing required column) → {Inline per-row error table shown; valid rows proceed, invalid rows flagged for correction and re-upload}; user may continue with partial success.

8. `/setup/admins` (Initial Admin Users) → (User adds additional admin-tier staff: Principal/Registrar/HOD/Accountant etc., assigning role per person) → {Writes `users` rows with the selected role, status=`invited`} → {Notify: email to each invited admin — account-invite} → Next: `/setup/students-import`

9. `/setup/students-import` (Student Import) → (User bulk-imports students via CSV template, or chooses "Skip, add later") → {Writes `students` rows + linked `users` rows (role=`student`, status=`invited`) + auto-triggers a lightweight version of the Admission state cascade (Section 4.1) for each imported student: fee record stub, library account stub — since these students are not going through the Admissions pipeline} → {Notify: batch summary email to institution_admin — "N students imported, M errors"} → Next: `/setup/branding`
   - 9a. If CSV validation errors → same per-row correction UX as step 7a.

10. `/setup/branding` (Branding & Logo) → (User sets primary/accent brand colors, confirms logo, uploads favicon) → {Writes `institutions.branding_config`} → Next: `/setup/email-config`

11. `/setup/email-config` (Email Configuration) → (User connects sending domain/SMTP or accepts Sutram's default shared sending domain; verifies via DNS TXT record check or one-click default) → {Writes `tenant_email_config`} → Next: `/setup/complete`
    - 11a. If custom domain DNS verification fails → {Inline error with retry + "Use default domain for now" fallback option} — non-blocking, user can proceed with default and revisit at `/app/settings/email`.

12. `/setup/complete` (Setup Complete) → (User clicks "Go to Dashboard") → {Sets `tenant.setup_completed = true`; clears onboarding nudge state} → Next: `/app/dashboard`

**State created by end of Section 2.2:** `institutions`, `campuses`, `departments`, `academic_calendar`, `semesters`, `courses` rows; `users` rows for all invited faculty/admins/students (status=`invited`); stub `students`, fee, and library records for any imported students.

### 2.3 First Login (post-setup)

1. `/setup/complete` → auto-redirect → `/app/dashboard` → {institution_admin dashboard renders with an "Onboarding Checklist" widget summarizing any skipped setup steps (Section 2.2) and a "Complete Setup" CTA per incomplete step} → Terms Acceptance modal (if not yet accepted at this tenant's current ToS version) fires as an overlay on first render.

2. Invited faculty/admin/student first login (separate from the institution_admin who ran the wizard): user clicks the set-password link from their invite email → `/auth/reset-password/:token` → (User sets password) → {Validates token not expired (default 7-day expiry); sets `users.status = active`, `email_verified = true`} → Next: `/auth/login` (pre-filled email) → standard login flow (Section 3.1) → `/app/dashboard` rendered per their role.
   - 2a. If invite token expired → {Error: "This invite link has expired."} → "Resend invite" button, which re-triggers the invite email {Notify: email to user — account-invite, refreshed token}.

3. First login for any role also triggers, once per user: Onboarding Tour Tooltip overlay (role-specific 3–5 step spotlight of primary nav items) — dismissible, never blocks navigation, tracked via `users.tour_seen_at` so it does not repeat.

---

## 3. Authentication Flows

Base route: `/auth/*`. All flows begin at `/auth/login` unless otherwise noted.

### 3.1 Happy path

1. `/auth/login` → (User enters email + password, clicks "Log In") → {Backend validates credentials against `users` table (hashed password compare), checks `users.status = active` and tenant status = active} → Next: `/app/dashboard` directly if the tenant has no 2FA/OTP policy enabled and the user holds exactly one role
   - If tenant enforces OTP → Next: `/auth/otp` (Section 3.5)
   - If user holds multiple roles (e.g. faculty + parent) → Next: Role Detect (server-side, non-visual) → if ambiguous, a lightweight role-picker prompt renders inline on `/app/dashboard` load, letting the user switch context without re-authenticating (per Document 4 §2 note on multi-role accounts).

### 3.2 Wrong password

1. `/auth/login` → (User submits incorrect password) → {Backend rejects; increments `users.failed_login_attempts`; logs attempt to audit log (Document 4 §9)} → {Inline error: "Incorrect email or password"} → user remains on `/auth/login`, email field retained, password field cleared.
   - 1a. Repeats up to a configurable threshold (default 5 attempts within 15 minutes) → on the threshold-crossing attempt, Next: `/auth/locked` (Section 3.3) instead of the inline error.
   - Note: the error message is deliberately generic ("incorrect email or password," not "wrong password") to avoid user-enumeration; this applies identically when the email itself doesn't exist.

### 3.3 Locked account

1. `/auth/locked` → (Screen renders automatically after threshold breach; no login form shown) → {Backend sets `users.locked_until = now() + lockout_window` (default 30 min); logs a security event} → {Notify: email to account owner — "Unusual sign-in activity / account temporarily locked," including an unlock-early link and a "this wasn't me" report link} → screen shows countdown timer and a "Reset your password instead" CTA.
   - 1a. User clicks "Reset your password instead" → Next: `/auth/forgot-password` (Section 3.4) — successful password reset clears the lock immediately regardless of countdown.
   - 1b. User waits out the countdown → lock auto-clears server-side; screen offers "Try logging in again" → Next: `/auth/login`.
   - 1c. Repeated lockouts within a short window (e.g. 3 lockouts in 24h) escalate: {Notify: internal alert to `institution_admin` for that tenant — possible credential-stuffing pattern} and may trigger a mandatory password reset on next successful login.

### 3.4 Forgot password

1. `/auth/login` → (User clicks "Forgot password?") → Next: `/auth/forgot-password`
2. `/auth/forgot-password` → (User enters email, clicks "Send Reset Link") → {Backend always returns the same success state regardless of whether the email exists (anti-enumeration); if it exists, generates a time-boxed reset token (default 1-hour expiry) and stores it against the `users` row} → {Notify: email to the address entered — password-reset link, only sent if the account actually exists} → screen shows: "If an account exists for this email, we've sent a reset link."
3. User opens email, clicks link → `/auth/reset-password/:token` → (User enters new password twice) → {Validates token unexpired and unused; validates password strength and confirm-match; on success, updates `users.password_hash`, invalidates the token, invalidates all existing sessions for that user (forces re-login everywhere)} → {Notify: email to account owner — "Your password was changed" confirmation, with a "wasn't me" link} → Next: `/auth/login`
   - 3a. If token expired or already used → {Error screen: "This link is no longer valid."} → CTA back to `/auth/forgot-password` to request a new one.
   - 3b. If passwords don't match or fail strength check → inline error, user stays on screen.

### 3.5 OTP (second factor at login)

1. `/auth/login` (credentials accepted) → Next: `/auth/otp` → {Backend generates a 6-digit OTP, sends via the tenant's configured channel (SMS or email, tenant-configurable default), stores hashed OTP with 5-minute expiry} → {Notify: SMS or email to the user — login OTP code}
2. `/auth/otp` → (User enters the 6-digit code, clicks "Verify") → {Backend validates code + expiry + attempt count} → Next: `/app/dashboard` (or Role Detect, then dashboard)
   - 2a. If code incorrect → {Inline error, remaining attempts shown ("2 attempts remaining")}; after 5 wrong attempts → forces a fresh OTP send and a short cooldown.
   - 2b. If code expired → {Inline error with "Resend code" link} → resend regenerates and re-sends per the same trigger.
   - 2c. User can select "Trust this device for 30 days" checkbox → {Sets a signed device-trust cookie; subsequent logins from that device/browser skip OTP until expiry or explicit revoke from `/app/settings/security`}.

### 3.6 SSO (Google / Microsoft)

1. `/auth/login` → (User clicks "Continue with Google" or "Continue with Microsoft") → {Redirects to the provider's OAuth consent screen} → Next: `/auth/sso/google` or `/auth/sso/microsoft` (callback route)
2. Provider callback → (User has approved consent on the provider's screen) → {Backend receives the OAuth token, resolves provider email; if a `users` row with that email exists in a tenant that has SSO enabled for that provider, logs in; if no matching user exists, and the tenant allows SSO self-provisioning for a given domain, creates a new `users` row scoped to that tenant with a default low-privilege role (typically `student` or `guest`, tenant-configurable) pending admin approval} → Next: `/app/dashboard`, or `/auth/otp` if the tenant additionally requires OTP even after SSO (stackable, tenant policy)
   - 2a. If provider email doesn't match any tenant and self-provisioning is disabled → {Error screen: "No Sutram account found for this email. Contact your institution admin."} → link back to `/auth/login`.
   - 2b. If the email matches a user in a *different* tenant than the one the SSO link was initiated from (multi-tenant email collision edge case) → {Error: "This email is registered to a different institution's workspace."} — no session created.
   - 2c. If provider consent is denied/cancelled by the user → redirect back to `/auth/login` with a neutral "Sign-in was cancelled" toast, no error logged as a security event.

### 3.7 Session expiry (cross-cutting, referenced by all above)

1. Any `/app/*` screen → (User is idle past the session timeout window, default 30 minutes, tenant-configurable) → {Session Timeout Warning modal fires 2 minutes before expiry, offering "Stay logged in"} → if no response, {backend invalidates session} → Next: `/auth/session-expired` on next interaction → CTA "Log in again" → `/auth/login`, with the originally-intended destination route preserved so login returns the user there rather than to `/app/dashboard`.

---

## 4. Cross-Module Workflows

Each flow below states, per step, what gets created/updated in which module's tables and who is notified — this is the section the backend architecture and notification/API docs should treat as authoritative for service-call sequencing.

### 4.1 Admission Flow

**Trigger:** A `guest`/prospect submits an application, or staff manually creates one, and it is carried through to a fully provisioned student.

1. `/app/admissions/apply` (New Application intake, public-facing for `guest`) → (Applicant fills personal details, selects course/program, uploads documents, submits) → {Admissions module: creates `admission_applications` row, status=`submitted`} → {Notify: email to applicant — application received; in-app notification to `registrar`/`principal` — new application} → Next: applicant sees a confirmation screen with an application reference number; staff sees it appear in `/app/admissions/applications`.

2. `/app/admissions/applications/:id` (staff review) → (Registrar/Principal reviews, optionally scores via `/app/admissions/applications/:id/review`, schedules entrance test via `/app/admissions/tests` if required) → {Admissions module: updates `admission_applications.status` through `under_review` → `test_scheduled`/`shortlisted`} → {Notify: email/SMS to applicant — status update at each transition}

3. `/app/admissions/merit-list` (Merit List Generation) → (Registrar generates ranked merit list from scored applications) → {Admissions module: creates `merit_list` entries linked to applications} → Next: `/app/admissions/offers`

4. `/app/admissions/offers` (Offer Letter Management) → (Registrar issues offer to selected applicants) → {Admissions module: updates `admission_applications.status = offered`; generates offer letter document} → {Notify: email to applicant — offer letter + accept/decline link + payment deadline}

5. `/app/admissions/applications/:id/confirm` (Fee Acceptance & Seat Confirmation, applicant-facing modal) → (Applicant accepts offer and pays the admission/seat-confirmation fee via embedded payment gateway) → {Admissions module: `admission_applications.status = accepted`; Finance module: **creates first `fee_invoices` / `payments` row** for the admission fee, marked paid} → {Notify: email receipt to applicant; in-app notification to registrar — seat confirmed} → Next: `/app/admissions/applications/:id/convert`
   - 5a. If applicant declines → `admission_applications.status = declined`, flow ends, seat released back to merit list pool.
   - 5b. If payment fails → applicant stays on the confirm modal with a retry option; status remains `offered` until payment succeeds or the acceptance deadline lapses (auto-transitions to `expired`).

6. `/app/admissions/applications/:id/convert` (Convert Application → Student, registrar action) → (Registrar clicks "Convert to Student," confirms auto-mapped fields — course, department, intake batch) → {This single action fans out across modules, in order:
   - **Students module:** creates `students` row (status=`active`), links to the source `admission_applications` row via `admission_id`, creates linked `users` row (role=`student`, status=`invited`).
   - **Finance module:** creates the full-year `fee_invoices` schedule for the student based on the course's fee structure (`/app/finance/fee-structures`), separate from the one-off admission fee already paid in step 5.
   - **Library module:** creates a `library_members` row for the student (borrowing privileges active, zero current loans).
   - **Hostel module (optional, if the applicant requested hostel in their application):** creates a `hostel_allocation_requests` row in a pending state at `/app/hostel/allocation`, does not auto-allocate a room — warden action required.
   - **Transport module (optional, same condition):** creates a `transport_pass_requests` row pending at `/app/transport/passes`, route assignment requires transport manager action.
   - **Students module:** ID Card record created (queued for print) at `/app/students/:id/id-card`.
   - **Auth:** the invited `users` row from Students module triggers an account-invite email with set-password link (this *is* "Student Login Created").}
   → {Notify: email to new student — "Welcome to [Institution], set up your account"; email to parent/guardian contact on file (if captured during application) — "Your child's application has been converted, here's how to link your Parent account"; in-app notification to accountant — new fee schedule created; in-app notification to hostel_warden/transport_manager if optional modules were requested} → Next: registrar is redirected to `/app/students/:id` (the new student profile).

**State-changes-per-module summary for Admission Flow** (for backend/API cross-reference):
| Module | Table(s) | Action |
|---|---|---|
| Admissions | `admission_applications`, `merit_list` | create → status transitions submitted → under_review → shortlisted → offered → accepted |
| Finance | `fee_invoices`, `payments` | create (admission fee, paid) at acceptance; create (full fee schedule) at conversion |
| Students | `students`, `users` (role=student) | create at conversion |
| Library | `library_members` | create at conversion |
| Hostel | `hostel_allocation_requests` | create (pending) at conversion, only if requested |
| Transport | `transport_pass_requests` | create (pending) at conversion, only if requested |
| Students (ID) | `id_cards` (or equivalent) | create (queued) at conversion |
| Communication/Notifications | `notifications` | fired at each status transition and at conversion fan-out |

### 4.2 Faculty Flow

**Trigger:** HR/institution_admin adds a new faculty member; flow follows them from hire to active teaching/research participation.

1. `/app/faculty/new` (Add Faculty, HR/institution_admin) → (User enters personal details, department, designation, joining date, employment type, salary band; submits) → {HR module: creates `employees`/`faculty` row, status=`onboarding`; creates linked `users` row (role=`faculty`, status=`invited`)} → {Notify: email to new faculty — account-invite + onboarding checklist link} → Next: `/app/faculty/:id`

2. `/app/faculty/:id/payroll` (HR/Accountant sets up compensation) → (User configures salary structure, bank details on file) → {Finance/HR module: creates `payroll_config` row linked to the employee; first payroll run picks this up automatically at `/app/hr/payroll`} → {Notify: none at setup; payroll disbursement notifications occur at each run, see Section 8}

3. `/app/academics/timetable` (Registrar/HOD assigns teaching load) → (HOD assigns the faculty member to specific sections/subjects) → {Academics module: creates `faculty_section_assignments` rows; Faculty module: `faculty.assigned_sections` view reflects this at `/app/faculty/:id/timetable` and `/app/faculty/:id/subjects`} → {Notify: in-app + email to faculty — "You've been assigned to teach [Subject] for [Section]"} → Next: faculty's `/app/dashboard` now surfaces their timetable widget.

4. `/app/attendance/mark` (Faculty, once term is live) → (Faculty marks attendance for an assigned class session) → {Attendance module: creates `attendance_records` for the session} — this is the faculty's first live-data touchpoint; detailed in Section 5.2.

5. `/app/faculty/:id/research` (optional, Researcher-tagged faculty) → (Faculty logs a research project or publication) → {Research module: creates `research_projects`/`publications` row, linked to `faculty_id`} → {Notify: in-app to HOD/Dean — new publication logged, feeds into Faculty Analytics} 

6. `/app/ai/faculty-assistant` (Faculty Portal — AI Assistant, Phase 3) → (Faculty interacts with the AI assistant for lesson planning, grading assistance, or admin queries) → {AI module: logs `ai_usage` events against the faculty's account for cost/usage analytics at `/app/ai/usage`} → this is the terminus of the "Portal" stage in the flow — ongoing daily use rather than a one-time state transition.

**State-changes-per-module summary:** HR (`employees`, `users`) → Finance (`payroll_config`, later `payroll_runs`) → Academics (`faculty_section_assignments`) → Attendance (`attendance_records`, ongoing) → Research (`research_projects`, `publications`, optional) → AI (`ai_usage`, Phase 3, ongoing).

### 4.3 Fee Payment Flow

**Trigger:** A student or parent pays an outstanding invoice.

1. `/app/finance/invoices` (Student or Parent) → (User views outstanding invoices, selects one, clicks "Pay Now") → Next: `/app/finance/payments/new`

2. `/app/finance/payments/new` → (User confirms amount — full or partial if the fee structure allows installments — selects payment method) → (Clicks "Proceed to Pay") → Next: `/app/finance/payments/checkout` (modal)

3. `/app/finance/payments/checkout` (Payment Gateway Checkout, embedded) → (User completes payment via the gateway widget — card/UPI/netbanking) → {Gateway processes charge, sends a webhook back to Sutram} → 
   - **On success:** {Finance module: creates `payments` row (status=`success`), updates the linked `fee_invoices.status` to `paid` (or `partially_paid`), appends an entry to `student_ledger`} → {Notify: SMS + email to student — payment receipt; email to linked parent(s) — "Fee payment received for [Student]"; in-app notification to accountant — payment received} → Next: `/app/finance/payments/:id/receipt` (auto-generated, downloadable/printable receipt)
   - **On failure (3a):** {Finance module: creates `payments` row (status=`failed`) for audit trail; `fee_invoices.status` unchanged} → {Inline error: "Payment failed — [reason]"} → user remains on checkout, may retry with a different method; no notification sent for failed attempts (avoids alert fatigue), but failed attempts are visible to accountant in `/app/finance/payments` for reconciliation.
   - **On gateway timeout with ambiguous outcome (3b):** {System marks `payments.status = pending_verification`, schedules an automatic reconciliation job against the gateway's transaction API within minutes} → user sees "We're confirming your payment, this page will update automatically" → resolves to success or failure path above once confirmed; if unresolved after a set window, routes to accountant's manual reconciliation queue at `/app/finance/payments`.

4. Ledger & downstream visibility → {Finance module: `student_ledger` entry immediately reflected on `/app/finance/ledger` (accountant view) and `/app/students/:id/fees` (student/parent/staff view)} — no separate user action required; this is a state propagation, not a new screen.

**State-changes-per-module summary:** Finance (`payments` create, `fee_invoices` update, `student_ledger` append) is the only module with a write in the happy path; Communication module fires the receipt/parent notifications as a side effect, not a data owner.

### 4.4 Exam Flow

**Trigger:** Registrar schedules an exam through to published, transcript-ready results.

1. `/app/exams/schedule/new` (Create Exam, Registrar) → (Registrar selects exam type, subjects, sections, defines date/time slots) → {Examinations module: creates `exams` row, status=`scheduled`; creates `exam_timetable_entries` rows} → {Notify: in-app + email to affected faculty — "You've been scheduled to invigilate/administer [Exam] on [date]"; in-app to students/parents — exam schedule published} → Next: `/app/exams/hall-tickets`

2. `/app/exams/hall-tickets` (Registrar generates hall tickets) → (Registrar triggers bulk generation for all eligible/registered students) → {Examinations module: creates `hall_tickets` rows linked to each `student_id` + `exam_id`} → {Notify: email/in-app to each student — "Your hall ticket is ready" with link to `/app/exams/hall-tickets/:id`} → Next: exam proceeds offline/online per institution process (outside app scope).

3. `/app/exams/marks-entry` (Faculty/TA, post-exam) → (Faculty enters marks per student per subject) → {Examinations module: creates/updates `exam_marks` rows, status=`draft`} → Next: `/app/exams/marks-entry/:examId/approve`
   - 3a. Faculty can save as draft and resume later — no downstream effect until submitted for approval.

4. `/app/exams/marks-entry/:examId/approve` (HOD/Registrar approval) → (Reviewer checks marks distribution, approves or sends back for correction) → {Examinations module: `exam_marks.status = approved`} → {Notify: in-app to faculty — "Marks approved" or "Marks sent back for review" with reviewer comments}
   - 4a. If sent back → status reverts to `draft`, faculty is notified with the specific flagged entries, loop returns to step 3.

5. Grade calculation (automatic, system-triggered on approval) → {Examinations module: applies the tenant's `grading-rules` (`/app/exams/grading-rules`) to approved marks, computes letter grades and grade points, writes `student_grades` rows} → no dedicated screen/user action; a background computation.

6. CGPA update (automatic, cascades from step 5) → {Examinations module: recomputes `/app/exams/cgpa` aggregate for each affected student, updating `student_cgpa` rows} → no dedicated screen/user action.

7. `/app/exams/results` (Result Publication, Registrar/Principal) → (Reviewer clicks "Publish Results" for the exam) → {Examinations module: `exams.results_published = true`; makes `/app/exams/results/:studentId` and `/app/students/:id/results` visible to student/parent roles (previously hidden even though computed, per the RBAC `publish` action gate — Document 4 §1.2)} → {Notify: SMS + email + in-app to students — "Your results for [Exam] are now available"; email to linked parents — same} → Next: `/app/exams/transcripts` becomes eligible for generation.

8. `/app/exams/transcripts` (Registrar generates transcript, typically end-of-term/program) → (Registrar triggers transcript generation for a student or batch) → {Examinations module: compiles all published `student_grades`/`student_cgpa` history into a `transcripts` document row} → {Notify: email to student — transcript ready, downloadable} → Next: student views via `/app/exams/transcripts/:studentId`, also surfaced on `/app/students/:id/results` and the student's `/app/dashboard`.

**State-changes-per-module summary:** Examinations owns every write in this flow (`exams`, `exam_timetable_entries`, `hall_tickets`, `exam_marks`, `student_grades`, `student_cgpa`, `transcripts`); Communication fires notifications at four points (schedule published, hall ticket ready, marks approved/rejected, results published, transcript ready); no other module's tables are mutated, though Students' dashboard/results views are read surfaces over Examinations data.

---

## 5. Daily-Use Persona Flows

### 5.1 Institution Admin — Morning Review Flow

1. `/app/dashboard` (institution_admin) → (Login, or returning session) → {Dashboard renders: overnight admissions count, fee collection vs. target, attendance anomalies flagged, pending approvals queue (leave, scholarships, corrections), AI Insights feed if enabled} → Next: user scans widgets.

2. Pending Approvals widget → (Clicks into a pending item, e.g. a leave request or scholarship approval) → {Navigates to the relevant module's approval screen — e.g. `/app/finance/scholarships/:id/approve`} → (Reviews, approves/rejects) → {Relevant module updates status} → {Notify: requester notified of decision} → returns to dashboard via breadcrumb/back.

3. Notification Center (bell icon, drawer) → (Clicks bell) → {Drawer opens showing unread notifications: new admissions, payment failures needing reconciliation, system alerts} → (Clicks an item) → navigates to the source screen; item marked read.

4. Analytics glance → `/app/analytics/executive` (Phase 3) or module-level analytics tabs → (Reviews KPI trends: enrollment, revenue, attendance rate) → no state change, read-only.

5. Global Search (Cmd/Ctrl+K) → (Admin searches for a specific student/staff/invoice by name) → jumps directly to that record — see Section 6.

6. If Onboarding Checklist still has incomplete items → widget nudge → clicking resumes the relevant `/setup/*` step directly.

This flow has no fixed end point — it is a scan-and-triage loop the admin repeats each morning, branching out to whichever module needs attention and returning to `/app/dashboard` between actions.

### 5.2 Faculty — Mark Attendance → Enter Marks Flow

1. `/app/dashboard` (faculty) → (Sees "Today's Classes" widget) → (Clicks the current/next scheduled session) → Next: `/app/attendance/mark`

2. `/app/attendance/mark` → (Faculty sees the section's roster pre-loaded for the current session slot; toggles each student Present/Absent/Late, or uses "Mark all present" then flags exceptions) → (Clicks "Submit Attendance") → {Attendance module: creates `attendance_records` for the session, one row per student} → {Notify: in-app/SMS to parents of any student marked absent (tenant-configurable, typically same-day digest rather than instant per-absence)} → Next: confirmation toast, returns to `/app/dashboard`.
   - 2a. If faculty tries to submit with the session already marked (duplicate) → {Warning: "Attendance already submitted for this session — edit instead?"} offers edit-in-place, which requires HOD approval if beyond a same-day edit window (routes to `/app/attendance/corrections`).

3. Later (post-exam), `/app/dashboard` → ("Pending Marks Entry" widget shows exams awaiting entry) → (Clicks through) → Next: `/app/exams/marks-entry`

4. `/app/exams/marks-entry` → (Faculty selects the exam/subject/section, enters marks per student in a grid — supports keyboard tab-through for speed, inline range validation against max marks) → (Clicks "Save Draft" repeatedly as they go, then "Submit for Approval" when complete) → {Examinations module: `exam_marks` rows created/updated, status draft → submitted} → {Notify: in-app to HOD/Registrar — marks submitted, awaiting approval} → Next: `/app/dashboard`, with a "Awaiting approval" status shown until HOD acts (Section 4.4 steps 4–4a).
   - 4a. If faculty enters a mark exceeding the subject's max marks → {Inline validation error on that cell}, row highlighted, submission blocked until corrected.

### 5.3 Student — Check Result & Pay Fee Flow

1. `/app/dashboard` (student) → (Sees "New Result Available" notification badge, or "Fee Due" widget) → (Clicks result notification) → Next: `/app/exams/results/:studentId`

2. `/app/exams/results/:studentId` → (Views subject-wise marks, grade, and updated CGPA) → (Optionally clicks through to `/app/exams/cgpa` for the full trend, or `/app/exams/transcripts/:studentId` if eligible) → read-only, no state change.
   - 2a. If unsatisfied with a mark → (Clicks "Request Revaluation" if the tenant/exam allows it) → Next: `/app/exams/revaluation` → (Submits revaluation request with reason) → {Examinations module: creates `revaluation_requests` row} → {Notify: in-app to registrar — new revaluation request}.

3. Back on `/app/dashboard` → ("Fee Due" widget) → (Clicks) → Next: `/app/finance/invoices` → (Selects the due invoice) → Next: `/app/finance/payments/new` → follows the Fee Payment Flow (Section 4.3) exactly, ending at `/app/finance/payments/:id/receipt`.

4. Post-payment → `/app/dashboard` → widget clears, ledger reflects paid status immediately (`/app/students/:id/fees` self-view).

### 5.4 Parent — Track Child & Pay Fee Flow

1. `/app/dashboard` (parent) → (If linked to multiple children, a child-switcher control at the top of the dashboard lets the parent select which child's data is shown — all subsequent widgets are scoped to the selected `student_id`) → {Dashboard renders: attendance summary for selected child, latest results, fee due, recent communications}

2. `/app/students/:id/attendance` (child view) → (Parent reviews recent attendance, sees any flagged absences) → read-only.

3. `/app/exams/results/:studentId` (child view) → (Parent reviews latest results) → read-only; identical screen to the student's own view, rendered with `parent` role scope restricted to their linked child(ren) only (Document 4 §2, role 17).

4. `/app/finance/invoices` (child view) → (Parent sees outstanding fee for the selected child) → (Clicks "Pay Now") → follows the identical Fee Payment Flow (Section 4.3), with the payer recorded as the parent's `user_id` against the student's invoice — receipt and ledger entry both reference the paying parent for audit purposes, while the invoice itself remains attached to the student.

5. `/app/communication/notifications` (drawer) → (Parent checks recent school communications/announcements relevant to their child's section/campus) → read-only.

6. If parent has more than one child enrolled, switching the child-switcher control re-scopes every widget on the dashboard and every subsequent navigation without requiring re-login — this is the parent persona's one structurally distinct interaction pattern versus the student persona.

---

## 6. Global Search & Quick Actions

**Trigger:** `Cmd/Ctrl+K` from any authenticated `/app/*` screen, or clicking the search icon in the top nav. Modal type, per Document 2 §8 item 2.

1. Any `/app/*` screen → (User presses Cmd/Ctrl+K) → {Quick Search modal opens with focus in the input, a blinking cursor, and a "Recent" list of the user's last 5 visited records shown by default before any input} → Next: modal stays open, awaiting input.

2. (User types a query, e.g. a student name, roll number, invoice number, or a command like "add student") → {Debounced (~200ms) search fires against a scoped index: results are filtered server-side to only entities the user's role/scope can see — a Faculty member searching "Priya" only sees students in their assigned sections, not the whole tenant} → {Results render grouped by entity type: Students, Faculty, Invoices, Applications, Courses, Settings pages, and "Actions" (e.g. "New Student," "Mark Attendance") — each group capped at ~3–5 results with a "see all" expansion} → Next: modal stays open, list updates live per keystroke.
   - 2a. If query matches a recognized command pattern (e.g. starts with "new," "add," "go to") → {Actions group is promoted to the top, e.g. typing "new student" surfaces "Create New Student" as the first result, which — if the user's role has `students:profile:write` — navigates directly to `/app/students/new`; if not permitted, the action is omitted from results entirely rather than shown-then-blocked}.
   - 2b. If no results match → {Empty state within the modal: "No results for '[query]'. Try a different name, ID, or keyword."} — no dead-end links, search remains editable.

3. (User selects a result via click or arrow-keys + Enter) → {Modal closes; router navigates to that entity's canonical route, e.g. `/app/students/:id`} → Next: the target screen, with the search modal state cleared (fresh search next time it opens, aside from the "Recent" list which persists per-user).

4. (User presses Escape at any point) → {Modal closes with no navigation} → user remains on the screen they started from.

5. Keyboard-first design note: the palette supports full arrow-key navigation and Enter-to-select without ever touching the mouse, consistent with the "command palette pattern" — this is the same modal instance used for both lookup ("find this record") and action-dispatch ("do this thing"), unified so users don't need to learn two separate shortcuts.

---

## 7. Error-State & Empty-State UX Principles

These principles apply uniformly across all ~300 Page-type screens in Document 2 §7 rather than being re-specified per screen.

### 7.1 Empty states (list screens with zero records)

Every list screen (e.g. `/app/students`, `/app/finance/invoices`, `/app/library/books`) follows the same empty-state contract:

- **First-time empty** (module never populated, e.g. a brand-new tenant's `/app/library/books` before any book is added): illustration/icon + one-line explanation of what this list is for + a primary CTA button that opens the corresponding "New" flow (e.g. "Add your first book" → `/app/library/books/new`). If the user's role lacks write permission, the CTA is omitted and the copy instead reads "No books have been added yet. Contact your librarian."
- **Filtered-to-empty** (records exist, but the active filter/search excludes all of them, e.g. "Status: Overdue" with no overdue invoices): distinct copy — "No results match your filters" — plus a "Clear filters" action, never the "add new" CTA, since the absence is a filter artifact, not a true empty dataset.
- **Search-to-empty**: same pattern as global search (Section 6, step 2b) — "No results for '[query]'."

### 7.2 Permission-denied handling

Two distinct cases, deliberately handled differently:

- **Whole-route denial** (user's role has zero access to a module/screen, e.g. `student` navigating directly to `/app/hr/payroll` via a guessed URL): server-side route guard intercepts before render, redirects to `/403` (Document 2 §8.1), which shows a plain "You don't have access to this page" message with a link back to `/app/dashboard` — no partial UI leaks (no sidebar item, no data flash).
- **Field/action-level denial** (user has read access to a screen but not a specific action, e.g. Faculty viewing a student profile but lacking edit rights): the screen renders normally but the disabled action is either (a) hidden entirely if its mere existence would leak sensitive context, or (b) shown disabled with a tooltip ("Only Registrar can edit this field") if its presence is informative and non-sensitive. Document 4 §3's permission matrix is the source of truth for which case applies per field/action.
- Both cases are logged to the audit trail (Document 4 §9) when the denial follows an explicit user action (e.g. attempting a disallowed API call directly), but a routine hidden-button case is not logged as a security event — only actual bypass attempts are.

### 7.3 Offline / slow-network handling

- **Detection**: the app maintains a lightweight connectivity heartbeat; on loss of connectivity, a persistent, non-blocking top banner appears ("You're offline — changes will be saved once you're back online" or, for read-only content, "You're offline — showing last-loaded data from [time]").
- **In-flight actions during connectivity loss**: form submissions (e.g. marking attendance, entering marks) are queued client-side with an optimistic UI update marked visually as "pending sync" (subtle dot/badge on the affected rows) rather than either silently failing or blocking the user; on reconnection, queued actions auto-submit in order, and the user is shown a toast summarizing the sync result ("12 attendance records synced" or, on conflict, "3 records couldn't be synced — review").
- **Full page loss of connectivity mid-session** (not just a blip): if a critical action can't be queued safely (e.g. payment submission — never queued/replayed automatically, to avoid double-charging), the user is blocked from submitting with a clear inline message rather than allowed to proceed into an ambiguous state; payment flows specifically re-check connectivity before enabling the "Pay Now" button.
- **Slow network** (connectivity present but degraded): actions that take longer than ~2 seconds show a skeleton/spinner state rather than appearing frozen; anything past ~10 seconds surfaces a "This is taking longer than usual" message with the option to keep waiting or retry, never a silent hang.
- **True offline landing** (user opens the app with no connectivity at all, e.g. cold-loading a bookmark) → routes to `/offline` (Document 2 §8.1) — a static, cached shell explaining the app requires a connection, with an automatic retry poll that redirects to the originally requested route once connectivity returns.

---

## 8. Notification Flow

### 8.1 The trigger pattern

Every notification in Sutram follows one canonical event-driven pattern, used consistently across all flows in Sections 2–5 above:

```
Domain Event (state change committed in a module's table)
  → Notification Rule Match (event type × tenant config × recipient role/preference)
  → Fan-out to enabled channels per recipient (in-app, email, SMS, WhatsApp)
  → Delivery (async, queued, retried on transient failure)
  → Read/Delivery-state tracked back on the notification record
```

- **Domain Event**: notifications are never fired directly from a UI action — they are fired from the backend *after* the state change that action caused is durably committed (e.g. the "results published" notification in Section 4.4 step 7 fires only after `exams.results_published = true` is committed, not when the Registrar clicks the button). This guarantees a notification is never sent for a change that ultimately failed to persist, and is the pattern the backend/API doc should implement as domain events emitted from each module's write path, consumed by a single central Notification Service rather than each module hand-rolling its own delivery logic.
- **Notification Rule Match**: a per-tenant, per-event-type configuration determines which roles get notified for a given event (e.g. "fee payment received" notifies the paying student/parent always, and the accountant by default but tenant-configurable off), and which channels are enabled for that event/role pair.
- **Channel fan-out**: in-app (always generated, feeds the Notification Center drawer and dashboard badges), email, SMS, and WhatsApp (Phase 3) are each independently toggleable per event category, not just globally — see 8.2.
- **User-level override**: within whatever the tenant permits, individual users can further narrow (never broaden beyond tenant policy) their own channel preferences per category.

### 8.2 Where users manage preferences

- **Tenant-level defaults** (which events fire to which roles, on which channels, tenant-wide): `/app/settings/email`, `/app/settings/sms`, `/app/settings/whatsapp` (Phase 3) configure channel connectivity/credentials; the event-to-recipient-to-channel rule matrix itself lives alongside these under Settings, surfaced to `institution_admin`/`super_admin` only.
- **User-level preferences** (an individual toggling email/SMS on or off for categories like "Attendance alerts," "Fee reminders," "Announcements," within what the tenant allows): Profile Menu → "Notification Preferences" (a sub-panel reached from the User Profile Menu dropdown, Document 2 §8 item 4) — not a top-level route, but a settings panel scoped to the logged-in user's own account. Categories map 1:1 to the domain event types in 8.3.
- **In-app history**: `/app/communication/notifications` (Notification Center drawer) is the durable, searchable log of everything sent to the current user regardless of channel; email/SMS/WhatsApp are "push" copies of the same underlying notification record, and `/app/communication/email`, `/app/communication/sms`, `/app/communication/whatsapp` (staff-facing) are the outbound history/audit views for admin roles who composed or triggered bulk sends.

### 8.3 Notification trigger inventory (cross-referenced to the flows above)

| Event | Fired from (module → table commit) | Recipients | Default channels |
|---|---|---|---|
| Admission application received | Admissions → `admission_applications` insert | Applicant, Registrar/Principal | Email, in-app |
| Admission status change (shortlisted/offered/declined/expired) | Admissions → `admission_applications` status update | Applicant | Email, SMS |
| Seat confirmed / admission fee paid | Admissions + Finance → `payments` insert | Applicant, Registrar | Email, in-app |
| Student converted / account created | Students → `users` insert | New student, linked parent (if captured) | Email |
| Faculty/staff invited | HR/Faculty → `users` insert | Invitee | Email |
| Teaching assignment made | Academics → `faculty_section_assignments` insert | Faculty | Email, in-app |
| Attendance marked absent | Attendance → `attendance_records` insert | Parent (digest), Student (in-app) | SMS/WhatsApp (digest), in-app |
| Exam scheduled | Examinations → `exams` insert | Faculty (invigilation), Student/Parent | Email, in-app |
| Hall ticket ready | Examinations → `hall_tickets` insert | Student | Email, in-app |
| Marks submitted for approval | Examinations → `exam_marks` status update | HOD/Registrar | In-app |
| Marks approved/rejected | Examinations → `exam_marks` status update | Faculty | In-app |
| Results published | Examinations → `exams.results_published` update | Student, Parent | Email, SMS, in-app |
| Transcript ready | Examinations → `transcripts` insert | Student | Email |
| Fee payment received | Finance → `payments` insert (success) | Student, Parent, Accountant | Email, SMS, in-app |
| Fee payment failed | Finance → `payments` insert (failed) | (none — visible in reconciliation queue only) | — |
| Fee due reminder (scheduled, not event-triggered) | Finance → `fee_invoices` due-date proximity, cron-evaluated | Student, Parent | Email, SMS |
| Login OTP | Auth → session challenge issued | The logging-in user | SMS/email (tenant default) |
| Password reset requested / changed | Auth → token issued / `password_hash` update | Account owner | Email |
| Account locked | Auth → `locked_until` set | Account owner; institution_admin on repeated pattern | Email; internal alert |
| Leave/correction/scholarship approval decision | Respective module → status update | Requester | In-app, email |
| Announcement/event published | Communication → `announcements`/`events` insert | Audience per targeting rule (campus/section/role) | In-app, email (opt-in) |
| Tenant provisioning failure | Platform → `tenants.status` stuck/failed | Internal ops (Pragyaan Labs) | PagerDuty/Slack (internal, not tenant-facing) |

This table is the seed list for the Notification Service's event catalog; the backend/API doc should treat each row as one domain event type with a stable event-name constant (e.g. `admission.status_changed`, `fee.payment_succeeded`, `exam.results_published`) rather than ad hoc per-caller strings.

---

## 9. Notes for Downstream Documents

- **Backend/API design doc**: Section 4's per-flow "state-changes-per-module" tables are the authoritative service-call sequencing reference — each numbered step corresponds to one API call/transaction boundary. The Admission Flow's conversion step (4.1, step 6) is the widest fan-out in the product (7 module writes from one user action) and should be implemented as a single orchestrated transaction/saga, not sequential independent calls, so a partial failure (e.g. library account creation fails) doesn't leave a student with no fee schedule.
- **Notification/Communication service doc**: Section 8.1's event-driven pattern (fire only after commit, single central Notification Service, per-tenant rule matrix, per-user channel override within tenant policy) is the contract to implement against; Section 8.3's table is the seed event catalog.
- **Wireframe doc**: Section 7's empty/error/offline principles apply to every Page-type screen in Document 2 §7 by default — wireframes should show at minimum the populated state, the first-time-empty state, and (for any form/payment screen) the offline/failure state, rather than only the happy path.
- **RBAC doc**: Section 7.2's permission-denied UX (whole-route vs. field-level) should be cross-checked against Document 4 §3's permission matrix per screen to determine which screens need the hidden-vs-disabled treatment for each role.
- **QA/test-plan doc**: Sections 3 (auth) and 4 (cross-module) enumerate the branch conditions (3a, 3b, etc.) that should map directly to test cases — each lettered branch in this document is a distinct scenario, not a stylistic aside.
