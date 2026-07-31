# Sutram — Information Architecture & Master Sitemap
### Document 2 of the Sutram Design Documentation Set
**Product:** Sutram — AI-powered Education Operating System (multi-tenant SaaS)
**Company:** Pragyaan Labs
**Scope:** Full responsive web application. Native mobile apps (iOS/Android) are explicitly out of scope.
**Status:** Master reference sitemap — backbone for wireframes, RBAC matrix, and API design docs.

---

## 0. Conventions Used in This Document

### 0.1 Route Naming Convention

Sutram uses a flat, resource-oriented URL convention split across five top-level surfaces:

| Surface | Base path | Example |
|---|---|---|
| Public marketing site | `/` | `/pricing`, `/solutions/schools` |
| Signup / tenant provisioning | `/signup/*` | `/signup/plan` |
| Authentication | `/auth/*` | `/auth/login`, `/auth/reset-password/:token` |
| Institution setup wizard | `/setup/*` | `/setup/departments` |
| Authenticated application | `/app/*` | `/app/students/:id/edit` |
| Platform console (Super Admin only, cross-tenant) | `/app/platform/*` | `/app/platform/tenants/:id` |

**Canonical in-app resource pattern:** `/app/{module}/{resource}` with standard CRUD suffixes:

- List: `/app/{module}/{resource}`
- Create: `/app/{module}/{resource}/new`
- Detail/View: `/app/{module}/{resource}/:id`
- Edit: `/app/{module}/{resource}/:id/edit`
- Nested sub-resource: `/app/{module}/{resource}/:id/{sub-resource}`

Every authenticated tenant user lands on the single adaptive route `/app/dashboard`, whose rendered widgets/KPIs and sidebar are resolved server-side from the caller's role (see Section 6). Role is never encoded in the URL for shared routes — access is governed by RBAC on the backend, not by URL shape.

### 0.2 Screen "Type" Legend

| Type | Meaning |
|---|---|
| **Page** | Full-page route, own URL, appears in browser history |
| **Modal** | Overlay dialog, typically opened from a list/detail page, closes back to parent route |
| **Drawer** | Slide-in side panel (e.g. notifications, filters), non-blocking |
| **Wizard** | Multi-step guided flow, each step may or may not have its own URL |

### 0.3 Role Abbreviation Legend (18 roles)

| Code | Role |
|---|---|
| SA | Super Admin (Pragyaan Labs platform operator) |
| IA | Institution Owner/Admin (tenant-level admin) |
| PR | Principal |
| DN | Dean |
| RG | Registrar |
| HOD | Head of Department |
| FA | Faculty |
| TA | Teaching Assistant |
| RS | Researcher |
| AC | Accountant |
| HR | HR Manager |
| HW | Hostel Warden |
| LB | Librarian |
| PO | Placement Officer |
| TM | Transport Manager |
| ST | Student |
| PA | Parent |
| GU | Guest (prospective applicant, pre-enrollment) |

A role listed as "self" means the record owner only (e.g. Faculty sees their own payroll, not a colleague's).

### 0.4 Phase Legend

- **Phase 1** — MVP launch surface (auth, setup, core academic workflow, minimal admin)
- **Phase 2** — Growth release (HR, Library, Hostel, Transport, Communication, Reports, Parent Portal)
- **Phase 3** — Mature platform (AI, Placement, Research, Alumni, multi-campus, Inventory, API Marketplace, Workflow Automation, Custom Forms, Audit & Compliance)

Phase tags mark **when a screen is introduced**; it remains available in all later phases.

---

## 1. Sitemap Overview (Text Tree)

```
sutram.io/
│
├── PUBLIC MARKETING SITE  (/)
│   ├── Home, Features, Solutions/*, Pricing, Demo, Customers, Resources
│   ├── Documentation, Careers, Blog, Contact, About, Security, Privacy
│   ├── Terms, Roadmap, FAQ, Login (redirect), Get Started (redirect)
│
├── SIGNUP / TENANT PROVISIONING  (/signup/*)
│   └── Account → Institution → Plan → Payment → Provisioning → Super Admin → Complete
│
├── AUTHENTICATION  (/auth/*)
│   └── Login → OTP → [Role Detect] → /app/dashboard
│       (+ Verify Email, Forgot/Reset Password, 2FA, SSO, Locked, Session Expired)
│
├── INSTITUTION SETUP WIZARD  (/setup/*)  [runs once, post-signup]
│   └── Institution → Campus → Departments → Calendar → Semester → Courses
│       → Faculty → Admins → Student Import → Branding → Email Config → Complete
│
└── APPLICATION  (/app/*)  [authenticated, role-aware]
    ├── /app/dashboard                     (adaptive per role)
    ├── /app/platform/*                    (Super Admin — cross-tenant console)
    ├── /app/admissions/*
    ├── /app/students/*
    ├── /app/faculty/*
    ├── /app/academics/*                   (Departments, Courses, Programs, Subjects,
    │                                        Curriculum, Timetable, Sections, Semesters, Calendar)
    ├── /app/attendance/*
    ├── /app/exams/*                       (Examinations + Results)
    ├── /app/finance/*                     (Fees + Finance)
    ├── /app/library/*
    ├── /app/hostel/*
    ├── /app/transport/*
    ├── /app/hr/*
    ├── /app/placement/*
    ├── /app/research/*
    ├── /app/communication/*
    ├── /app/ai/*
    ├── /app/analytics/*
    ├── /app/inventory/*                   (Phase 3)
    ├── /app/campuses/*                    (Phase 3, multi-campus)
    ├── /app/settings/*
    └── System pages: /404 /403 /500 /maintenance /offline
```

---

## 2. Public Website Pages

| # | Screen | Route | Type | Phase |
|---|---|---|---|---|
| 1 | Home | `/` | Page | 1 |
| 2 | Features | `/features` | Page | 1 |
| 3 | Solutions Overview | `/solutions` | Page | 1 |
| 4 | Solutions — Schools | `/solutions/schools` | Page | 1 |
| 5 | Solutions — Colleges | `/solutions/colleges` | Page | 1 |
| 6 | Solutions — Universities | `/solutions/universities` | Page | 1 |
| 7 | Solutions — Coaching Institutes | `/solutions/coaching` | Page | 1 |
| 8 | Solutions — Research Institutes | `/solutions/research-institutes` | Page | 2 |
| 9 | Pricing | `/pricing` | Page | 1 |
| 10 | Book a Demo | `/demo` | Page | 1 |
| 11 | Customers | `/customers` | Page | 2 |
| 12 | Customer Story Detail | `/customers/stories/:slug` | Page | 2 |
| 13 | Resources Hub | `/resources` | Page | 2 |
| 14 | Documentation Portal | `/docs` | Page | 1 |
| 15 | Careers | `/careers` | Page | 2 |
| 16 | Blog Index | `/blog` | Page | 2 |
| 17 | Blog Post | `/blog/:slug` | Page | 2 |
| 18 | Contact | `/contact` | Page | 1 |
| 19 | Login (marketing entry, redirects) | `/login` | Page | 1 |
| 20 | Get Started (marketing entry, redirects) | `/get-started` | Page | 1 |
| 21 | About | `/about` | Page | 1 |
| 22 | Security & Trust | `/security` | Page | 1 |
| 23 | Privacy Policy | `/privacy` | Page | 1 |
| 24 | Terms of Service | `/terms` | Page | 1 |
| 25 | Roadmap | `/roadmap` | Page | 2 |
| 26 | FAQ | `/faq` | Page | 1 |

**Subtotal: 26 screens** (all GU-accessible, no auth required).

---

## 3. Signup / Tenant Provisioning Flow

Screen-by-screen, strictly linear wizard leading into account creation.

| # | Screen | Route | Type | Roles | Phase |
|---|---|---|---|---|---|
| 1 | Account Basics (email, org name) | `/signup` | Wizard step | GU | 1 |
| 2 | Institution Name & Type | `/signup/institution` | Wizard step | GU | 1 |
| 3 | Select Plan | `/signup/plan` | Wizard step | GU | 1 |
| 4 | Payment Details | `/signup/payment` | Wizard step | GU | 1 |
| 5 | Payment Confirmation | `/signup/payment/confirm` | Page | GU | 1 |
| 6 | Tenant Provisioning (progress screen) | `/signup/provisioning` | Page | GU | 1 |
| 7 | Create Super Admin / Institution Admin Account | `/signup/admin` | Wizard step | GU | 1 |
| 8 | Signup Complete → redirects to `/setup/institution` | `/signup/complete` | Page | IA | 1 |

**Subtotal: 8 screens.**

---

## 4. Authentication Flow Screens

| # | Screen | Route | Type | Roles | Phase |
|---|---|---|---|---|---|
| 1 | Login | `/auth/login` | Page | All | 1 |
| 2 | OTP Verification (optional 2nd factor at login) | `/auth/otp` | Page | All | 1 |
| 3 | Email Verification | `/auth/verify-email` | Page | All | 1 |
| 4 | Forgot Password | `/auth/forgot-password` | Page | All | 1 |
| 5 | Reset Password | `/auth/reset-password/:token` | Page | All | 1 |
| 6 | 2FA Setup (authenticator app enrollment) | `/auth/2fa/setup` | Page | All | 1 |
| 7 | 2FA Verify | `/auth/2fa/verify` | Page | All | 1 |
| 8 | SSO — Google callback | `/auth/sso/google` | Page | All | 2 |
| 9 | SSO — Microsoft callback | `/auth/sso/microsoft` | Page | All | 2 |
| 10 | Account Locked | `/auth/locked` | Page | All | 1 |
| 11 | Session Expired | `/auth/session-expired` | Page | All | 1 |

Role Detect is a server-side redirect (Login → OTP → Role Detect → `/app/dashboard`), not a rendered screen.

**Subtotal: 11 screens.**

---

## 5. Institution Setup Wizard (post-signup, one-time)

| # | Step | Route | Type | Roles | Phase |
|---|---|---|---|---|---|
| 1 | Institution Details | `/setup/institution` | Wizard step | IA | 1 |
| 2 | Campus Setup | `/setup/campus` | Wizard step | IA | 1 |
| 3 | Departments Setup | `/setup/departments` | Wizard step | IA | 1 |
| 4 | Academic Calendar | `/setup/calendar` | Wizard step | IA | 1 |
| 5 | Semester/Term Setup | `/setup/semester` | Wizard step | IA | 1 |
| 6 | Course Setup | `/setup/courses` | Wizard step | IA | 1 |
| 7 | Faculty Onboarding | `/setup/faculty` | Wizard step | IA | 1 |
| 8 | Initial Admin Users | `/setup/admins` | Wizard step | IA | 1 |
| 9 | Student Import | `/setup/students-import` | Wizard step | IA | 1 |
| 10 | Branding & Logo | `/setup/branding` | Wizard step | IA | 1 |
| 11 | Email Configuration | `/setup/email-config` | Wizard step | IA | 1 |
| 12 | Setup Complete → `/app/dashboard` | `/setup/complete` | Page | IA | 1 |

**Subtotal: 12 screens.**

---

## 6. Role → Dashboard → Sidebar Mapping (all 18 roles)

All roles land on the single route `/app/dashboard`; content and sidebar are resolved by role. Canonical top-level sidebar module order (used consistently for every role that has access to a given module):

**Dashboard · Admissions · Students · Faculty · Academics · Attendance · Examinations · Fees & Finance · Library · Hostel · Transport · HR · Placement · Research · Communication · AI Assistant · Analytics & Reports · Settings · Platform Admin** *(SA only)*

| Role | Sidebar Modules Visible (in canonical order) | Notes |
|---|---|---|
| **Super Admin (SA)** | Platform Admin, Dashboard, Admissions, Students, Faculty, Academics, Attendance, Examinations, Fees & Finance, Library, Hostel, Transport, HR, Placement, Research, Communication, AI Assistant, Analytics & Reports, Settings | Only role with Platform Admin (cross-tenant) console; full access within any tenant it manages/impersonates. |
| **Institution Owner/Admin (IA)** | Dashboard, Admissions, Students, Faculty, Academics, Attendance, Examinations, Fees & Finance, Library, Hostel, Transport, HR, Placement, Research, Communication, AI Assistant, Analytics & Reports, Settings | Full tenant-level access, no Platform Admin. |
| **Principal (PR)** | Dashboard, Admissions, Students, Faculty, Academics, Attendance, Examinations, Fees & Finance (view), Library, Hostel, Transport, HR (view), Placement, Research (view), Communication, Analytics & Reports, Settings (limited) | Institution-wide oversight, mostly view + approve. |
| **Dean (DN)** | Dashboard, Students, Faculty, Academics, Examinations, Research, Communication, Analytics & Reports, Settings (limited) | Cross-department academic oversight (college/university scope). |
| **Registrar (RG)** | Dashboard, Admissions, Students, Academics, Examinations, Communication, Analytics & Reports, Settings (academic config) | Owns admissions pipeline, records, curriculum config, exams admin. |
| **HOD** | Dashboard, Students (dept), Faculty (dept), Academics (dept), Attendance, Examinations, Research, Communication, Analytics & Reports (dept) | Department-scoped view of most modules. |
| **Faculty (FA)** | Dashboard, Students (assigned classes), Academics (my courses/timetable), Attendance (mark), Examinations (marks entry), Research, Communication, AI Assistant (Faculty Assistant) | Self/class-scoped. |
| **Teaching Assistant (TA)** | Dashboard, Students (assigned), Attendance (mark), Examinations (assist marks entry), Communication | Reduced-permission variant of Faculty. |
| **Researcher (RS)** | Dashboard, Research, Communication, AI Assistant, Analytics & Reports (research) | May be faculty or dedicated research staff. |
| **Accountant (AC)** | Dashboard, Students (fee-linked view), Fees & Finance, Analytics & Reports (finance), Communication | Owns Fees & Finance module. |
| **HR Manager (HR)** | Dashboard, Faculty (employment data), HR, Analytics & Reports (HR), Communication | Owns HR module; overlaps Faculty for employment records. |
| **Hostel Warden (HW)** | Dashboard, Students (hostel residents), Hostel, Communication | Owns Hostel module. |
| **Librarian (LB)** | Dashboard, Students (borrowing history), Library, Communication | Owns Library module. |
| **Placement Officer (PO)** | Dashboard, Students (eligible/final-year), Placement, Analytics & Reports (placement), Communication | Owns Placement module. |
| **Transport Manager (TM)** | Dashboard, Students (transport users), Transport, Communication | Owns Transport module. |
| **Student (ST)** | Dashboard, Academics (my courses/timetable), Attendance (my), Examinations (hall ticket, results), Fees & Finance (my fees), Library (my books), Hostel (my room), Transport (my pass), Placement (if eligible), Communication, AI Assistant (Student Assistant) | Self-service only; no admin sub-items. |
| **Parent (PA)** | Dashboard, Students (my child), Attendance (child), Examinations (child results), Fees & Finance (child, pay), Communication | Read-only + fee payment for their linked child/children. |
| **Guest (GU)** | Admissions (Apply), Communication (Inquiries) | Pre-enrollment prospect; not logged into the tenant app proper — served from `/signup` and `/app/admissions/apply` intake surface. |

---

## 7. Full Screen Inventory Per Module

Each table: **Screen Name | Route | Type | Roles with Access | Phase**. Route bases below all sit under `/app/*` unless noted.

### 7.1 Platform Admin (Super Admin only) — base `/app/platform`

| Screen | Route | Type | Roles | Phase |
|---|---|---|---|---|
| Tenant List | `/app/platform/tenants` | Page | SA | 1 |
| Tenant Detail | `/app/platform/tenants/:id` | Page | SA | 1 |
| Create Tenant (manual provisioning) | `/app/platform/tenants/new` | Page | SA | 1 |
| Subscription Plans Management | `/app/platform/plans` | Page | SA | 1 |
| Platform Billing & Invoicing | `/app/platform/billing` | Page | SA | 2 |
| Platform Analytics | `/app/platform/analytics` | Page | SA | 2 |
| Support Tickets | `/app/platform/support` | Page | SA | 2 |
| System Health & Uptime | `/app/platform/system-health` | Page | SA | 2 |
| Feature Flags | `/app/platform/feature-flags` | Page | SA | 3 |
| Platform Audit Log | `/app/platform/audit-log` | Page | SA | 2 |
| Impersonate Tenant Admin | `/app/platform/tenants/:id/impersonate` | Modal | SA | 2 |

**11 screens.**

### 7.2 Admissions — base `/app/admissions`

| Screen | Route | Type | Roles | Phase |
|---|---|---|---|---|
| Admissions Dashboard | `/app/admissions` | Page | SA, IA, PR, RG | 1 |
| Applications List | `/app/admissions/applications` | Page | SA, IA, PR, RG | 1 |
| New Application (intake) | `/app/admissions/apply` | Page | GU | 1 |
| Application Detail | `/app/admissions/applications/:id` | Page | SA, IA, PR, RG | 1 |
| Application Review & Scoring | `/app/admissions/applications/:id/review` | Page | RG, PR | 2 |
| Entrance Test Scheduling | `/app/admissions/tests` | Page | RG | 2 |
| Merit List Generation | `/app/admissions/merit-list` | Page | RG, PR | 2 |
| Offer Letter Management | `/app/admissions/offers` | Page | RG | 2 |
| Fee Acceptance & Seat Confirmation | `/app/admissions/applications/:id/confirm` | Modal | RG, GU | 2 |
| Convert Application → Student | `/app/admissions/applications/:id/convert` | Modal | RG | 1 |
| Admissions Analytics | `/app/admissions/analytics` | Page | SA, IA, PR | 3 |

**11 screens.**

### 7.3 Students — base `/app/students`

| Screen | Route | Type | Roles | Phase |
|---|---|---|---|---|
| Student List | `/app/students` | Page | SA, IA, PR, DN, RG, HOD, FA, AC, HW, LB, PO, TM | 1 |
| Add Student | `/app/students/new` | Wizard | SA, IA, RG | 1 |
| Student Profile (overview) | `/app/students/:id` | Page | Scoped staff, ST (self), PA | 1 |
| Edit Student | `/app/students/:id/edit` | Page | SA, IA, RG | 1 |
| Student Documents | `/app/students/:id/documents` | Page | SA, IA, RG, ST, PA | 1 |
| Upload Document | `/app/students/:id/documents/upload` | Modal | SA, IA, RG | 1 |
| Parents/Guardians | `/app/students/:id/parents` | Page | SA, IA, RG, PA | 1 |
| Add Parent/Guardian | `/app/students/:id/parents/new` | Modal | SA, IA, RG | 1 |
| Student Attendance | `/app/students/:id/attendance` | Page | SA, IA, FA, HOD, ST, PA | 1 |
| Student Fees | `/app/students/:id/fees` | Page | AC, SA, IA, ST, PA | 1 |
| Student Results | `/app/students/:id/results` | Page | SA, IA, FA, HOD, ST, PA | 1 |
| Admission Record (linked) | `/app/students/:id/admission` | Page | RG, SA | 1 |
| Course Registration | `/app/students/:id/registration` | Page | RG, ST | 1 |
| Student ID Card Generation | `/app/students/:id/id-card` | Modal | SA, RG | 1 |
| Certificates | `/app/students/:id/certificates` | Page | SA, IA, RG, ST | 2 |
| Generate Certificate | `/app/students/:id/certificates/new` | Modal | RG | 2 |
| Hostel Allocation (student view) | `/app/students/:id/hostel` | Page | HW, ST, PA | 2 |
| Transport Assignment (student view) | `/app/students/:id/transport` | Page | TM, ST, PA | 2 |
| Medical Records | `/app/students/:id/medical` | Page | HW, SA, ST, PA | 2 |
| Disciplinary Records | `/app/students/:id/disciplinary` | Page | PR, HOD, SA | 2 |
| Add Disciplinary Record | `/app/students/:id/disciplinary/new` | Modal | PR, HOD | 2 |
| Scholarship | `/app/students/:id/scholarship` | Page | AC, RG, ST, PA | 2 |
| Apply for Scholarship | `/app/students/:id/scholarship/apply` | Modal | ST, RG | 2 |
| Migration/Transfer Certificate | `/app/students/:id/transfer` | Page | RG, SA | 2 |
| Bulk Import Students | `/app/students/import` | Wizard | SA, IA, RG | 2 |
| Alumni Directory | `/app/students/alumni` | Page | SA, IA, PO | 3 |
| Alumni Profile | `/app/students/alumni/:id` | Page | SA, IA, PO | 3 |
| Graduation & Convocation | `/app/students/:id/graduation` | Page | RG, SA | 3 |
| Student Analytics | `/app/students/analytics` | Page | SA, IA, PR, DN | 3 |

**29 screens.**

### 7.4 Faculty — base `/app/faculty`

| Screen | Route | Type | Roles | Phase |
|---|---|---|---|---|
| Faculty List | `/app/faculty` | Page | SA, IA, PR, DN, HOD, HR | 1 |
| Add Faculty | `/app/faculty/new` | Wizard | SA, IA, HR | 1 |
| Faculty Profile | `/app/faculty/:id` | Page | Scoped staff, FA (self) | 1 |
| Edit Faculty | `/app/faculty/:id/edit` | Page | SA, IA, HR | 1 |
| Faculty Timetable | `/app/faculty/:id/timetable` | Page | HOD, FA, SA | 1 |
| Faculty Subjects | `/app/faculty/:id/subjects` | Page | HOD, FA | 1 |
| Faculty Classes | `/app/faculty/:id/classes` | Page | HOD, FA | 1 |
| Faculty Leave | `/app/faculty/:id/leave` | Page | HR, FA, HOD | 2 |
| Apply Leave | `/app/faculty/:id/leave/new` | Modal | FA | 2 |
| Faculty Payroll | `/app/faculty/:id/payroll` | Page | HR, AC, FA (self) | 2 |
| Faculty Attendance | `/app/faculty/:id/attendance` | Page | HR, HOD, SA | 2 |
| Faculty Performance Review | `/app/faculty/:id/performance` | Page | HR, HOD, DN | 2 |
| Faculty Recruitment Pipeline | `/app/faculty/recruitment` | Page | HR | 2 |
| Recruitment Candidate Detail | `/app/faculty/recruitment/:id` | Page | HR | 2 |
| Faculty Bulk Import | `/app/faculty/import` | Wizard | SA, HR | 2 |
| Faculty Onboarding Checklist | `/app/faculty/:id/onboarding` | Page | HR | 2 |
| Faculty Research | `/app/faculty/:id/research` | Page | RS, DN, FA | 3 |
| Faculty Publications | `/app/faculty/:id/publications` | Page | RS, DN, FA | 3 |
| Add Publication | `/app/faculty/:id/publications/new` | Modal | FA, RS | 3 |
| Faculty Promotion | `/app/faculty/:id/promotion` | Page | HR, DN, PR | 3 |
| Faculty Analytics | `/app/faculty/analytics` | Page | SA, IA, PR, DN, HR | 3 |

**21 screens.**

### 7.5 Academics — base `/app/academics`

| Screen | Route | Type | Roles | Phase |
|---|---|---|---|---|
| Departments List | `/app/academics/departments` | Page | SA, IA, PR, DN, RG | 1 |
| Add Department | `/app/academics/departments/new` | Modal | SA, IA | 1 |
| Department Detail | `/app/academics/departments/:id` | Page | SA, IA, DN, HOD | 1 |
| Edit Department | `/app/academics/departments/:id/edit` | Page | SA, IA | 1 |
| Courses List | `/app/academics/courses` | Page | SA, IA, RG, HOD | 1 |
| Add Course | `/app/academics/courses/new` | Page | SA, IA, RG | 1 |
| Course Detail | `/app/academics/courses/:id` | Page | Scoped academic staff | 1 |
| Edit Course | `/app/academics/courses/:id/edit` | Page | SA, IA, RG | 1 |
| Subjects List | `/app/academics/subjects` | Page | SA, IA, RG, HOD, FA | 1 |
| Add Subject | `/app/academics/subjects/new` | Modal | RG, HOD | 1 |
| Timetable Builder | `/app/academics/timetable` | Page | RG, HOD | 1 |
| Timetable View (per section) | `/app/academics/timetable/:sectionId` | Page | FA, ST, HOD | 1 |
| Sections List | `/app/academics/sections` | Page | RG, HOD | 1 |
| Semester/Term Management | `/app/academics/semesters` | Page | RG, SA | 1 |
| Academic Calendar | `/app/academics/calendar` | Page | All internal roles | 1 |
| Programs List | `/app/academics/programs` | Page | SA, IA, RG, DN | 2 |
| Add/Edit Program | `/app/academics/programs/new` | Page | SA, IA, RG | 2 |
| Credits & Grading Scheme | `/app/academics/credits` | Page | RG, SA | 2 |
| Curriculum Builder | `/app/academics/curriculum` | Page | RG, HOD, DN | 2 |

**19 screens.**

### 7.6 Attendance — base `/app/attendance`

| Screen | Route | Type | Roles | Phase |
|---|---|---|---|---|
| Attendance Dashboard | `/app/attendance` | Page | SA, IA, PR, HOD | 1 |
| Mark Attendance (class session) | `/app/attendance/mark` | Page | FA, TA | 1 |
| Attendance Register | `/app/attendance/register` | Page | FA, HOD, RG | 1 |
| Attendance Correction Requests | `/app/attendance/corrections` | Page | FA, HOD | 2 |
| Approve Correction | `/app/attendance/corrections/:id/approve` | Modal | HOD | 2 |
| Leave/Absence Requests (student) | `/app/attendance/leave-requests` | Page | ST, FA, HOD | 2 |
| Attendance Reports | `/app/attendance/reports` | Page | SA, IA, PR, HOD, PA | 2 |
| Biometric/RFID Device Sync | `/app/attendance/devices` | Page | SA, IA | 3 |

**8 screens.**

### 7.7 Examinations — base `/app/exams`

| Screen | Route | Type | Roles | Phase |
|---|---|---|---|---|
| Exam Types | `/app/exams/types` | Page | RG, SA | 1 |
| Exam Schedule | `/app/exams/schedule` | Page | RG, FA, HOD | 1 |
| Create Exam | `/app/exams/schedule/new` | Wizard | RG | 1 |
| Hall Ticket Generation | `/app/exams/hall-tickets` | Page | RG | 1 |
| Hall Ticket View | `/app/exams/hall-tickets/:id` | Page | ST, PA | 1 |
| Marks Entry | `/app/exams/marks-entry` | Page | FA, TA | 1 |
| Marks Approval | `/app/exams/marks-entry/:examId/approve` | Page | HOD, RG | 1 |
| Grade Calculation Rules | `/app/exams/grading-rules` | Page | RG, SA | 1 |
| Result Publication | `/app/exams/results` | Page | RG, PR | 1 |
| Result Detail (student) | `/app/exams/results/:studentId` | Page | ST, PA, FA | 1 |
| Seating Plan | `/app/exams/seating-plan` | Page | RG | 2 |
| Question Bank | `/app/exams/question-bank` | Page | FA, HOD, RG | 2 |
| Add Question | `/app/exams/question-bank/new` | Modal | FA | 2 |
| Question Paper Builder | `/app/exams/question-papers` | Page | FA, HOD | 2 |
| Question Paper Detail | `/app/exams/question-papers/:id` | Page | FA, HOD, RG | 2 |
| CGPA Calculator/View | `/app/exams/cgpa` | Page | RG, ST | 2 |
| Transcript Generation | `/app/exams/transcripts` | Page | RG | 2 |
| Transcript View | `/app/exams/transcripts/:studentId` | Page | ST, RG | 2 |
| Revaluation Requests | `/app/exams/revaluation` | Page | ST, RG | 2 |
| Certificate Generation (degree/marksheet) | `/app/exams/certificates` | Page | RG | 2 |
| Exam Analytics | `/app/exams/analytics` | Page | SA, IA, PR, DN, HOD | 3 |

**21 screens.**

### 7.8 Fees & Finance — base `/app/finance`

| Screen | Route | Type | Roles | Phase |
|---|---|---|---|---|
| Fee Structure List | `/app/finance/fee-structures` | Page | AC, SA, IA | 1 |
| Add/Edit Fee Structure | `/app/finance/fee-structures/new` | Page | AC, SA | 1 |
| Student Payments List | `/app/finance/payments` | Page | AC, ST, PA | 1 |
| Make Payment | `/app/finance/payments/new` | Page | ST, PA | 1 |
| Payment Gateway Checkout | `/app/finance/payments/checkout` | Modal | ST, PA | 1 |
| Payment Receipt | `/app/finance/payments/:id/receipt` | Page | AC, ST, PA | 1 |
| Invoices List | `/app/finance/invoices` | Page | AC, ST, PA | 1 |
| Invoice Detail | `/app/finance/invoices/:id` | Page | AC, ST, PA | 1 |
| Scholarships Admin | `/app/finance/scholarships` | Page | AC, RG | 2 |
| Scholarship Approval | `/app/finance/scholarships/:id/approve` | Modal | AC, RG | 2 |
| Refunds | `/app/finance/refunds` | Page | AC | 2 |
| Process Refund | `/app/finance/refunds/new` | Modal | AC | 2 |
| Student Ledger | `/app/finance/ledger` | Page | AC | 2 |
| Salary/Payroll Runs | `/app/finance/payroll` | Page | AC, HR | 2 |
| Payroll Run Detail | `/app/finance/payroll/:id` | Page | AC, HR | 2 |
| Expenses | `/app/finance/expenses` | Page | AC | 2 |
| Add Expense | `/app/finance/expenses/new` | Modal | AC | 2 |
| GST/Tax Configuration | `/app/finance/tax` | Page | AC, SA | 2 |
| Financial Reports | `/app/finance/reports` | Page | AC, IA, SA | 2 |
| Fee Reminders Configuration | `/app/finance/reminders` | Page | AC | 2 |
| Late Fee/Penalty Rules | `/app/finance/penalties` | Page | AC, SA | 2 |
| Budget Planning | `/app/finance/budget` | Page | AC, IA, SA | 3 |
| Finance Analytics | `/app/finance/analytics` | Page | SA, IA, AC | 3 |

**23 screens.**

### 7.9 Library — base `/app/library`

| Screen | Route | Type | Roles | Phase |
|---|---|---|---|---|
| Book Catalog | `/app/library/books` | Page | LB, ST, FA | 2 |
| Add Book | `/app/library/books/new` | Modal | LB | 2 |
| Book Detail | `/app/library/books/:id` | Page | LB, ST, FA | 2 |
| Edit Book | `/app/library/books/:id/edit` | Page | LB | 2 |
| Issue Book | `/app/library/issue` | Page | LB | 2 |
| Return Book | `/app/library/return` | Page | LB | 2 |
| Fines | `/app/library/fines` | Page | LB, ST, PA | 2 |
| Pay Fine | `/app/library/fines/:id/pay` | Modal | ST, PA | 2 |
| Library Inventory / Stock Audit | `/app/library/inventory` | Page | LB | 2 |
| My Borrowed Books | `/app/library/my-books` | Page | ST, FA | 2 |
| Library Member Directory | `/app/library/members` | Page | LB | 2 |
| Barcode Management | `/app/library/barcodes` | Page | LB | 3 |
| RFID Management | `/app/library/rfid` | Page | LB | 3 |
| Digital Library / E-books | `/app/library/digital` | Page | LB, ST, FA | 3 |
| Library Analytics | `/app/library/analytics` | Page | LB, SA, IA | 3 |

**15 screens.**

### 7.10 Hostel — base `/app/hostel`

| Screen | Route | Type | Roles | Phase |
|---|---|---|---|---|
| Rooms List | `/app/hostel/rooms` | Page | HW, SA | 2 |
| Add Room | `/app/hostel/rooms/new` | Modal | HW | 2 |
| Room Detail | `/app/hostel/rooms/:id` | Page | HW | 2 |
| Room Allocation | `/app/hostel/allocation` | Page | HW, ST | 2 |
| Allocate Room | `/app/hostel/allocation/new` | Modal | HW | 2 |
| Mess Management | `/app/hostel/mess` | Page | HW | 2 |
| Mess Menu (student view) | `/app/hostel/mess/menu` | Page | ST, HW | 2 |
| Visitor Log | `/app/hostel/visitors` | Page | HW | 2 |
| Register Visitor | `/app/hostel/visitors/new` | Modal | HW | 2 |
| Complaints | `/app/hostel/complaints` | Page | HW, ST | 2 |
| File Complaint | `/app/hostel/complaints/new` | Modal | ST | 2 |
| Maintenance Requests | `/app/hostel/maintenance` | Page | HW | 2 |
| Hostel Fee Linkage | `/app/hostel/fees` | Page | HW, AC | 2 |
| Hostel Inventory | `/app/hostel/inventory` | Page | HW | 3 |
| Hostel Analytics | `/app/hostel/analytics` | Page | HW, SA, IA | 3 |

**15 screens.**

### 7.11 Transport — base `/app/transport`

| Screen | Route | Type | Roles | Phase |
|---|---|---|---|---|
| Vehicle List | `/app/transport/vehicles` | Page | TM, SA | 2 |
| Add Vehicle | `/app/transport/vehicles/new` | Modal | TM | 2 |
| Vehicle Detail | `/app/transport/vehicles/:id` | Page | TM | 2 |
| Driver List | `/app/transport/drivers` | Page | TM | 2 |
| Add Driver | `/app/transport/drivers/new` | Modal | TM | 2 |
| Routes List | `/app/transport/routes` | Page | TM, ST | 2 |
| Add/Edit Route | `/app/transport/routes/new` | Page | TM | 2 |
| Transport Attendance | `/app/transport/attendance` | Page | TM | 2 |
| Transport Passes | `/app/transport/passes` | Page | TM, ST, PA | 2 |
| Issue Pass | `/app/transport/passes/new` | Modal | TM | 2 |
| Transport Fee Linkage | `/app/transport/fees` | Page | TM, AC | 2 |
| Live GPS Tracking | `/app/transport/gps` | Page | TM, ST, PA | 3 |
| Transport Analytics | `/app/transport/analytics` | Page | TM, SA, IA | 3 |

**13 screens.**

### 7.12 HR — base `/app/hr`

| Screen | Route | Type | Roles | Phase |
|---|---|---|---|---|
| Employee Directory | `/app/hr/employees` | Page | HR, SA, IA | 2 |
| Add Employee | `/app/hr/employees/new` | Wizard | HR | 2 |
| Employee Profile | `/app/hr/employees/:id` | Page | HR, SA | 2 |
| Edit Employee | `/app/hr/employees/:id/edit` | Page | HR | 2 |
| Recruitment Pipeline | `/app/hr/recruitment` | Page | HR | 2 |
| Job Posting | `/app/hr/recruitment/jobs/new` | Page | HR | 2 |
| Candidate Detail | `/app/hr/recruitment/:id` | Page | HR | 2 |
| Payroll Configuration | `/app/hr/payroll-config` | Page | HR, AC | 2 |
| Payroll Runs | `/app/hr/payroll` | Page | HR, AC | 2 |
| Leave Management (org-wide) | `/app/hr/leave` | Page | HR | 2 |
| Leave Policy Configuration | `/app/hr/leave/policies` | Page | HR | 2 |
| Performance Reviews | `/app/hr/performance` | Page | HR | 2 |
| Employee Onboarding Checklist | `/app/hr/onboarding` | Page | HR | 2 |
| Promotion & Increment Records | `/app/hr/promotions` | Page | HR | 3 |
| Training Programs | `/app/hr/training` | Page | HR | 3 |
| Training Enrollment | `/app/hr/training/:id/enroll` | Modal | HR, FA | 3 |
| Employee Offboarding | `/app/hr/offboarding` | Page | HR | 3 |
| Organization Chart | `/app/hr/org-chart` | Page | HR, SA, IA | 3 |
| HR Analytics | `/app/hr/analytics` | Page | HR, SA, IA | 3 |

**19 screens.**

### 7.13 Placement — base `/app/placement`

| Screen | Route | Type | Roles | Phase |
|---|---|---|---|---|
| Companies List | `/app/placement/companies` | Page | PO, SA | 3 |
| Add Company | `/app/placement/companies/new` | Modal | PO | 3 |
| Company Detail | `/app/placement/companies/:id` | Page | PO | 3 |
| Job/Drive Postings | `/app/placement/jobs` | Page | PO, ST | 3 |
| Add Job Posting | `/app/placement/jobs/new` | Page | PO | 3 |
| Job Detail | `/app/placement/jobs/:id` | Page | PO, ST | 3 |
| Applications List | `/app/placement/applications` | Page | PO, ST | 3 |
| Application Detail | `/app/placement/applications/:id` | Page | PO | 3 |
| Interview Scheduling | `/app/placement/interviews` | Page | PO, ST | 3 |
| Interview Feedback | `/app/placement/interviews/:id/feedback` | Modal | PO | 3 |
| Offer Letters | `/app/placement/offers` | Page | PO, ST | 3 |
| Generate/Upload Offer | `/app/placement/offers/new` | Modal | PO | 3 |
| Student Eligibility Criteria | `/app/placement/eligibility` | Page | PO | 3 |
| Resume Bank | `/app/placement/resumes` | Page | PO, ST | 3 |
| Placement Analytics | `/app/placement/analytics` | Page | PO, SA, IA, DN | 3 |

**15 screens.**

### 7.14 Research — base `/app/research`

| Screen | Route | Type | Roles | Phase |
|---|---|---|---|---|
| Research Projects List | `/app/research/projects` | Page | RS, DN, FA | 3 |
| Add Project | `/app/research/projects/new` | Page | RS | 3 |
| Project Detail | `/app/research/projects/:id` | Page | RS, DN | 3 |
| Funding & Grants | `/app/research/funding` | Page | RS, AC | 3 |
| Add Grant | `/app/research/funding/new` | Modal | RS | 3 |
| Research Groups | `/app/research/groups` | Page | RS, DN | 3 |
| Group Detail | `/app/research/groups/:id` | Page | RS | 3 |
| Labs | `/app/research/labs` | Page | RS, SA | 3 |
| Lab Detail | `/app/research/labs/:id` | Page | RS | 3 |
| Publications | `/app/research/publications` | Page | RS, FA, DN | 3 |
| Add Publication | `/app/research/publications/new` | Modal | RS, FA | 3 |
| Patents | `/app/research/patents` | Page | RS, DN | 3 |
| Add Patent | `/app/research/patents/new` | Modal | RS | 3 |
| Conferences | `/app/research/conferences` | Page | RS, FA | 3 |
| Journals | `/app/research/journals` | Page | RS, FA | 3 |
| Research Analytics | `/app/research/analytics` | Page | RS, DN, SA, IA | 3 |

**16 screens.**

### 7.15 Communication — base `/app/communication`

| Screen | Route | Type | Roles | Phase |
|---|---|---|---|---|
| Shared Calendar | `/app/communication/calendar` | Page | All internal | 1 |
| Notification Center | `/app/communication/notifications` | Drawer | All | 1 |
| Email Composer | `/app/communication/email/new` | Page | SA, IA, RG, HOD, FA | 2 |
| Email History | `/app/communication/email` | Page | SA, IA, RG | 2 |
| SMS Composer | `/app/communication/sms/new` | Page | SA, IA, RG | 2 |
| SMS History | `/app/communication/sms` | Page | SA, IA, RG | 2 |
| Push Notification Composer | `/app/communication/push/new` | Page | SA, IA | 2 |
| Announcements List | `/app/communication/announcements` | Page | All internal | 2 |
| Create Announcement | `/app/communication/announcements/new` | Page | SA, IA, PR, HOD | 2 |
| Events List | `/app/communication/events` | Page | All internal | 2 |
| Create Event | `/app/communication/events/new` | Page | SA, IA, PR | 2 |
| WhatsApp Composer | `/app/communication/whatsapp/new` | Page | SA, IA, RG | 3 |
| WhatsApp History | `/app/communication/whatsapp` | Page | SA, IA, RG | 3 |

**13 screens.**

### 7.16 AI — base `/app/ai`

| Screen | Route | Type | Roles | Phase |
|---|---|---|---|---|
| AI Chatbot (general assistant) | `/app/ai/chatbot` | Page | All internal, ST | 3 |
| Student Assistant | `/app/ai/student-assistant` | Page | ST | 3 |
| Faculty Assistant | `/app/ai/faculty-assistant` | Page | FA | 3 |
| Predictive Analytics Dashboard | `/app/ai/predictive` | Page | SA, IA, PR, DN | 3 |
| Risk / Dropout Prediction | `/app/ai/dropout-risk` | Page | PR, HOD, RG | 3 |
| Attendance Prediction | `/app/ai/attendance-prediction` | Page | HOD, FA | 3 |
| Placement Prediction | `/app/ai/placement-prediction` | Page | PO, DN | 3 |
| AI Report Generator | `/app/ai/report-generator` | Page | SA, IA, PR | 3 |
| Document AI (OCR/extraction) | `/app/ai/document-ai` | Page | RG, SA | 3 |
| Voice AI | `/app/ai/voice-assistant` | Page | SA, IA, FA | 3 |
| AI Insights Feed | `/app/ai/insights` | Drawer | SA, IA, PR, DN | 3 |
| AI Settings & Model Configuration | `/app/ai/settings` | Page | SA | 3 |
| AI Usage & Cost Analytics | `/app/ai/usage` | Page | SA, IA | 3 |

**13 screens.**

### 7.17 Analytics & Reports — base `/app/analytics`

Cross-module, executive-level rollups (distinct from the per-module analytics tab embedded in each module, e.g. `/app/students/analytics`).

| Screen | Route | Type | Roles | Phase |
|---|---|---|---|---|
| Student Analytics (rollup) | `/app/analytics/students` | Page | SA, IA, PR, DN, RG | 2 |
| Finance Analytics (rollup) | `/app/analytics/finance` | Page | SA, IA, AC | 2 |
| Attendance Analytics (rollup) | `/app/analytics/attendance` | Page | SA, IA, PR, HOD | 2 |
| Revenue Analytics | `/app/analytics/revenue` | Page | SA, IA, AC | 2 |
| Admissions Analytics (rollup) | `/app/analytics/admissions` | Page | SA, IA, PR, RG | 2 |
| Export Center | `/app/analytics/exports` | Page | SA, IA, AC, RG | 2 |
| Executive Dashboard | `/app/analytics/executive` | Page | SA, IA, PR, DN | 3 |
| Faculty Analytics (rollup) | `/app/analytics/faculty` | Page | SA, IA, PR, DN, HR | 3 |
| Placement Analytics (rollup) | `/app/analytics/placement` | Page | SA, IA, PO, DN | 3 |
| Research Analytics (rollup) | `/app/analytics/research` | Page | SA, IA, DN, RS | 3 |
| AI Insights Analytics | `/app/analytics/ai-insights` | Page | SA, IA | 3 |
| Custom Report Builder | `/app/analytics/custom-reports` | Page | SA, IA, PR | 3 |
| Scheduled Reports | `/app/analytics/scheduled-reports` | Page | SA, IA | 3 |

**13 screens.**

### 7.18 Settings — base `/app/settings`

| Screen | Route | Type | Roles | Phase |
|---|---|---|---|---|
| Institution Profile | `/app/settings/institution` | Page | SA, IA | 1 |
| Users List | `/app/settings/users` | Page | SA, IA | 1 |
| Add User | `/app/settings/users/new` | Modal | SA, IA | 1 |
| User Detail | `/app/settings/users/:id` | Page | SA, IA | 1 |
| Roles List | `/app/settings/roles` | Page | SA, IA | 1 |
| Role Detail / Permission Matrix | `/app/settings/roles/:id` | Page | SA, IA | 1 |
| Email Configuration | `/app/settings/email` | Page | SA, IA | 1 |
| Payment Gateway Integration | `/app/settings/integrations/payment` | Page | SA, IA | 1 |
| Security Settings | `/app/settings/security` | Page | SA | 1 |
| Billing & Subscription (tenant's own plan) | `/app/settings/billing` | Page | IA, SA | 1 |
| Branding Configuration | `/app/settings/branding` | Page | SA, IA | 1 |
| General Preferences | `/app/settings/preferences` | Page | SA, IA | 1 |
| Permissions Configuration | `/app/settings/permissions` | Page | SA | 2 |
| SMS Configuration | `/app/settings/sms` | Page | SA, IA | 2 |
| Third-Party Integrations | `/app/settings/integrations` | Page | SA, IA | 2 |
| Integration Detail | `/app/settings/integrations/:id` | Page | SA, IA | 2 |
| Backup & Restore | `/app/settings/backup` | Page | SA | 2 |
| Audit Log | `/app/settings/audit-log` | Page | SA, IA | 2 |
| Campus Management | `/app/settings/campuses` | Page | SA, IA | 3 |
| WhatsApp Configuration | `/app/settings/whatsapp` | Page | SA, IA | 3 |
| API Marketplace | `/app/settings/api-marketplace` | Page | SA, IA | 3 |
| API Keys Management | `/app/settings/api-keys` | Page | SA | 3 |
| Workflow Automation Builder | `/app/settings/workflows` | Page | SA, IA | 3 |
| Custom Forms Builder | `/app/settings/custom-forms` | Page | SA, IA | 3 |
| Compliance & Data Privacy | `/app/settings/compliance` | Page | SA | 3 |

**25 screens.**

### 7.19 Inventory & Procurement — base `/app/inventory` (Phase 3)

| Screen | Route | Type | Roles | Phase |
|---|---|---|---|---|
| Inventory Items List | `/app/inventory/items` | Page | SA, IA, AC | 3 |
| Add Item | `/app/inventory/items/new` | Modal | SA, IA | 3 |
| Item Detail | `/app/inventory/items/:id` | Page | SA, IA | 3 |
| Stock Adjustments | `/app/inventory/stock-adjustments` | Page | SA, IA | 3 |
| Purchase Requests | `/app/inventory/purchase-requests` | Page | SA, IA, AC | 3 |
| Create Purchase Request | `/app/inventory/purchase-requests/new` | Page | HOD, SA | 3 |
| Purchase Orders | `/app/inventory/purchase-orders` | Page | AC, SA | 3 |
| Vendors List | `/app/inventory/vendors` | Page | AC, SA | 3 |
| Add Vendor | `/app/inventory/vendors/new` | Modal | AC | 3 |
| Asset Register | `/app/inventory/assets` | Page | SA, IA | 3 |
| Inventory Analytics | `/app/inventory/analytics` | Page | SA, IA, AC | 3 |

**11 screens.**

### 7.20 Multi-Campus — base `/app/campuses` (Phase 3)

| Screen | Route | Type | Roles | Phase |
|---|---|---|---|---|
| Campus List | `/app/campuses` | Page | SA, IA | 3 |
| Campus Detail | `/app/campuses/:id` | Page | SA, IA | 3 |
| Cross-Campus Student Transfer | `/app/campuses/transfers` | Page | RG, SA | 3 |
| Cross-Campus Analytics | `/app/campuses/analytics` | Page | SA, IA | 3 |
| Campus-wise Resource Allocation | `/app/campuses/resources` | Page | SA, IA | 3 |

**5 screens.**

### 7.21 Dashboards — one per role, base `/app/dashboard` (single adaptive route)

| Dashboard Variant | Roles | Phase |
|---|---|---|
| Super Admin Dashboard | SA | 1 |
| Institution Admin Dashboard | IA | 1 |
| Principal Dashboard | PR | 1 |
| Accountant Dashboard | AC | 1 |
| Registrar Dashboard | RG | 1 |
| HOD Dashboard | HOD | 1 |
| Faculty Dashboard | FA | 1 |
| Student Dashboard | ST | 1 |
| Dean Dashboard | DN | 2 |
| Teaching Assistant Dashboard | TA | 2 |
| HR Manager Dashboard | HR | 2 |
| Hostel Warden Dashboard | HW | 2 |
| Librarian Dashboard | LB | 2 |
| Transport Manager Dashboard | TM | 2 |
| Parent Dashboard | PA | 2 |
| Researcher Dashboard | RS | 3 |
| Placement Officer Dashboard | PO | 3 |
| Guest Landing (intake, not a true dashboard) | GU | 3 |

**18 screens** (rendered from one route, counted individually since each has distinct widgets/KPIs per the spec).

---

## 8. Modals & Popups Inventory (Cross-Cutting)

These are not tied to a single module — they appear wherever the pattern applies (e.g. Confirm Delete opens from any list screen's row menu).

| # | Component | Typical Trigger Points | Type | Phase |
|---|---|---|---|---|
| 1 | Confirm Delete | Any list/detail screen with delete action | Modal | 1 |
| 2 | Quick Search (global, Cmd/Ctrl+K) | Top nav, all app screens | Modal | 1 |
| 3 | Notification Center | Top nav bell icon | Drawer | 1 |
| 4 | User Profile Menu | Top nav avatar | Dropdown | 1 |
| 5 | Change Password | Profile menu | Modal | 1 |
| 6 | Session Timeout Warning | Idle timer | Modal | 1 |
| 7 | File Preview | Documents, certificates, publications | Modal | 1 |
| 8 | File/Image Upload | Documents, avatars, book covers, receipts | Modal | 1 |
| 9 | Filter Panel | Any list screen | Drawer | 1 |
| 10 | Date Range Picker | Reports, analytics, attendance | Modal | 1 |
| 11 | Bulk Import (CSV) | Students, Faculty, Employees, Books | Modal | 2 |
| 12 | Bulk Export | Any list screen | Modal | 2 |
| 13 | Print Preview | Receipts, hall tickets, certificates, ID cards | Modal | 2 |
| 14 | Share Link | Reports, documents | Modal | 2 |
| 15 | Comment / Note Add | Applications, disciplinary records, tickets | Modal | 2 |
| 16 | Approve/Reject Workflow Action | Leave, scholarship, corrections, admissions | Modal | 2 |
| 17 | Assign To (user picker) | Support tickets, purchase requests, complaints | Modal | 2 |
| 18 | Column Customization | Any data table | Drawer | 2 |
| 19 | Help/Support Widget | Global footer | Drawer | 2 |
| 20 | Onboarding Tour Tooltip | First login per role | Overlay | 3 |
| 21 | What's New / Release Notes | Post-login (after deploy) | Modal | 3 |
| 22 | Feedback/Rating Widget | Global footer | Modal | 3 |
| 23 | Cookie Consent | Public marketing site | Banner | 1 |
| 24 | Terms Acceptance (first login) | Onboarding | Modal | 1 |

**24 cross-cutting components.**

### 8.1 System / Error Pages

| Screen | Route | Phase |
|---|---|---|
| 404 Not Found | `/404` | 1 |
| 403 Access Denied | `/403` | 1 |
| 500 Server Error | `/500` | 1 |
| Maintenance Mode | `/maintenance` | 1 |
| Offline | `/offline` | 1 |

**5 screens.**

---

## 9. Total Screen Count Reconciliation

### 9.1 Subtotals by section

| Section | Screens |
|---|---|
| 2. Public Website | 26 |
| 3. Signup / Provisioning | 8 |
| 4. Authentication | 11 |
| 5. Institution Setup Wizard | 12 |
| 7.1 Platform Admin | 11 |
| 7.2 Admissions | 11 |
| 7.3 Students | 29 |
| 7.4 Faculty | 21 |
| 7.5 Academics | 19 |
| 7.6 Attendance | 8 |
| 7.7 Examinations | 21 |
| 7.8 Fees & Finance | 23 |
| 7.9 Library | 15 |
| 7.10 Hostel | 15 |
| 7.11 Transport | 13 |
| 7.12 HR | 19 |
| 7.13 Placement | 15 |
| 7.14 Research | 16 |
| 7.15 Communication | 13 |
| 7.16 AI | 13 |
| 7.17 Analytics & Reports | 13 |
| 7.18 Settings | 25 |
| 7.19 Inventory & Procurement | 11 |
| 7.20 Multi-Campus | 5 |
| 7.21 Dashboards (18 roles) | 18 |
| 8. Modals & Popups (cross-cutting) | 24 |
| 8.1 System/Error Pages | 5 |
| **GRAND TOTAL** | **415** |

This lands within the 200–500+ full-product target, and specifically within the "Phase 3: ~250–400+" range once phasing is applied (see below) — the total including all cross-cutting and system screens is 415.

### 9.2 Cumulative screens by phase

| Phase | Screens introduced (incremental) | Cumulative total | Founder's original estimate | Notes |
|---|---|---|---|---|
| **Phase 1** | 155 | 155 | ~40–50 | See 9.3 — the founder's figure covers the *core academic workflow slice only* (Auth, Dashboard, Students, Faculty, Attendance, Fees, Exams, Results); a shippable Phase 1 SaaS launch also requires the public marketing site, signup, setup wizard, base Settings/RBAC, and system/error pages, which the narrow estimate didn't itemize. |
| **Phase 2** | 143 | 298 | ~120–150 | Incremental Phase 2 build (HR, Library, Hostel, Transport, Communication, Parent-facing screens, Reports) is 143 new screens, in line with the founder's target; cumulative total is higher because Phase 1's true baseline (155) was already larger than the founder's narrow estimate. |
| **Phase 3** | 117 | 415 | ~250–400+ | Adds AI, Placement, Research, Alumni, multi-campus, Inventory, API Marketplace, Workflow Automation, Custom Forms, Audit & Compliance. Final cumulative total (415) sits inside the overall 200–500+ mature-product target. |

### 9.3 Core academic workflow slice (narrow MVP, for direct comparison to founder's "~40-50" figure)

If we isolate just the modules the founder named for Phase 1 — Auth, core Dashboards, Students, Faculty, Attendance, Fees, Exams, Results — and count only their Phase-1-tagged screens:

| Module | Phase 1 screens |
|---|---|
| Authentication | 11 |
| Core Dashboards (SA, IA, PR, AC, RG, HOD, FA, ST) | 8 |
| Students (Phase 1 subset) | 14 |
| Faculty (Phase 1 subset) | 7 |
| Attendance (Phase 1 subset) | 3 |
| Fees & Finance (Phase 1 subset) | 8 |
| Examinations incl. Results (Phase 1 subset) | 10 |
| **Core workflow subtotal** | **61** |

This 61-screen "narrow slice" is a close match to the founder's ~40–50 estimate (modestly larger because each list/add/detail/edit is broken out as its own screen per the brief's instruction, rather than counted as one line item). The full 155-screen Phase 1 in Section 9.2 is the realistic *shippable* MVP once public site, signup, setup wizard, and baseline admin/settings are included — none of which a SaaS product can launch without.

### 9.4 Screens by type (all phases)

| Type | Approx. count | % of total |
|---|---|---|
| Page | ~300 | 72% |
| Modal | ~85 | 21% |
| Wizard (multi-step flows, counted as their constituent steps above) | ~20 | 5% |
| Drawer | ~10 | 2% |

---

## 10. Notes for Downstream Documents

- **RBAC/Permissions doc**: use Section 6 (role → sidebar mapping) and the per-screen "Roles with Access" columns in Section 7 as the source of truth for the permission matrix.
- **Wireframe doc**: use Section 7's Type column (Page/Modal/Drawer/Wizard) to determine which screens need full layouts vs. overlay patterns.
- **API design doc**: the `/app/{module}/{resource}` route convention (Section 0.1) should map 1:1 to REST/GraphQL resource naming for consistency between frontend routes and backend endpoints.
- **Navigation/component doc**: the canonical sidebar module order (Section 6 preamble) must be used verbatim across all role dashboards to keep muscle memory consistent for users who hold multiple roles (e.g. a Dean who is also teaching Faculty).
