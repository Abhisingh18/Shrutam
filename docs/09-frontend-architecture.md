# Sutram — Document 9: Frontend Architecture

**Product:** Sutram — AI-powered, Multi-Tenant Education Operating System
**Company:** Pragyaan Labs
**Document owner:** Frontend/Platform Architecture
**Status:** Baseline for engineering implementation
**Scope:** Full responsive web application (`/`, `/signup/*`, `/auth/*`, `/setup/*`, `/app/*`). Native mobile app is explicitly out of scope for this revision — every screen must be built mobile-web-responsive (phone-browser usable) since there is no native app to fall back on. This document assumes and stays consistent with Document 2 (Information Architecture — ~415 screens, route convention, module list), Document 4 (RBAC & Security — 18 roles, `module:resource:action` permission strings), and the REST API described in the backend design set (`/api/v1/...`, standard JSON envelope, JWT access + refresh).

---

## Table of Contents

1. [Framework & Rendering Strategy](#1-framework--rendering-strategy)
2. [Styling System](#2-styling-system)
3. [Project & Folder Structure](#3-project--folder-structure)
4. [Atomic Design & Component Layering](#4-atomic-design--component-layering)
5. [State Management](#5-state-management)
6. [Role-Adaptive Rendering](#6-role-adaptive-rendering)
7. [Multi-Tenant Theming](#7-multi-tenant-theming)
8. [Data Fetching & API Integration Layer](#8-data-fetching--api-integration-layer)
9. [Performance Strategy](#9-performance-strategy)
10. [Accessibility & Internationalization](#10-accessibility--internationalization)
11. [Testing Approach (Frontend Layer)](#11-testing-approach-frontend-layer)
12. [Build/Deploy Pipeline Touchpoints](#12-builddeploy-pipeline-touchpoints)
13. [Summary of Binding Decisions](#13-summary-of-binding-decisions)

---

## 1. Framework & Rendering Strategy

### 1.1 Choice: Next.js (App Router) + React 18 + TypeScript

Sutram's frontend is built on **Next.js (App Router), React, and TypeScript**, strict mode on, across all four route surfaces (`/`, `/signup/*`, `/auth/*`, `/setup/*`, `/app/*`). This is a single framework decision applied with **different rendering strategies per surface**, not a one-size-fits-all choice.

### 1.2 Per-surface rendering strategy

| Surface | Strategy | Why |
|---|---|---|
| `/` Public marketing site | **SSR + ISR (mostly SSG)** | SEO is existential here — institutions discover Sutram via organic search ("student management software for schools India"), and search engines must see fully rendered HTML on first response. Marketing pages (Home, Pricing, Solutions/*, Blog, Docs) are largely static content that changes on a content-publish cadence, not per-request — Incremental Static Regeneration serves cached HTML with periodic background revalidation. |
| `/signup/*` | **SSR shell + client-heavy forms** | Needs SEO for the entry step (`/signup` itself is a marketing-adjacent conversion page) but the multi-step flow (Account → Institution → Plan → Payment → Provisioning) is inherently stateful and interactive — rendered as a client component tree after an SSR shell. |
| `/auth/*` | **SSR shell + client forms, middleware-gated** | Login/OTP/2FA/SSO screens are simple but security-sensitive: redirect-if-already-authenticated and tenant resolution must happen **before** any client JS runs, which requires server-side middleware, not a client-side route guard that flashes the login form first. |
| `/setup/*` | **CSR-heavy, server actions for persistence** | Runs once per tenant, post-signup, always behind auth. No SEO need. Optimized for a guided, stateful wizard experience — each step is a client component; data is persisted via server actions / API calls against `/api/v1/setup/*`. |
| `/app/*` | **CSR-heavy SPA-like shell within the App Router** | The authenticated product is data-dense, interactive, and role-adaptive — tables, filters, drawers, real-time attendance grids, chart-heavy analytics. None of it needs to be indexed by search engines. Next.js is still used (not a bare Vite SPA) specifically for its **server-side middleware layer**, which resolves tenant + auth + role *before* the client bundle for `/app/*` ever loads (Section 1.3). Individual pages use React Server Components only for the outer shell (layout, nav skeleton) — the interactive data surface (tables, forms, charts) is client components fetching through TanStack Query against `/api/v1/...`. |

### 1.3 Why not a pure SPA (e.g. Vite + React Router)

A pure client-side SPA was considered and rejected for the authenticated app, for reasons specific to Sutram's multi-tenant, role-gated nature:

- **Tenant resolution must happen before paint.** Sutram resolves the active tenant from subdomain (`stmarys.sutram.io`) or custom domain (`portal.stmarys.edu`) on every request (Section 7). In a pure SPA, the app would have to boot generically, fetch tenant config client-side, then re-theme/re-brand — producing a visible flash of unbranded or wrong-tenant UI. Next.js `middleware.ts` runs at the edge, resolves the tenant, and can inject branding/redirect *before* any HTML reaches the browser.
- **Auth guarding without flicker.** A client-only guard (check token in `useEffect`, redirect if absent) always renders *something* first, then redirects — a flash of protected UI or a login-form flash on an authenticated user hitting `/auth/login`. Server-side middleware checks the JWT/refresh cookie and issues an HTTP redirect before the page ships.
- **SEO for the one surface that needs it.** The public site and signup entry funnel are how institutions find and evaluate Sutram; a pure SPA would require a separate SSR solution for marketing alone, which is exactly what Next.js already provides — better to have one framework doing both than to bolt Next.js onto an SPA later.
- **Shared framework, shared team.** One React/Next.js skill set covers marketing, signup, auth, setup, and app — no context-switch between a static site generator and a separate SPA framework, and no duplicate build tooling.

The trade-off is accepted deliberately: the `/app/*` surface does **not** get static generation or meaningful SSR data-fetching benefit for its interactive pages — it is functionally client-rendered once past the middleware/auth gate, same as a SPA would be, just wrapped in a framework that also solves marketing SEO and edge-level tenant/auth resolution.

### 1.4 Middleware responsibilities (`middleware.ts`)

Runs at the edge on every request to `/app/*`, `/setup/*`, and `/auth/*`:

1. Resolve tenant from `Host` header (subdomain or mapped custom domain) → attach `x-tenant-id` to the request.
2. Validate JWT access token from cookie; if expired, attempt silent refresh; if refresh fails, redirect to `/auth/login?returnTo=...`.
3. If authenticated and hitting `/auth/*`, redirect to `/app/dashboard`.
4. If hitting `/app/platform/*` and role is not `super_admin`, redirect to `/app/dashboard` (coarse guard; fine-grained permission checks happen at page level, Section 6.3).
5. Attach resolved `tenant_id`, `user_id`, `role` as request headers consumed by the RSC layout to seed the initial nav/permission state, avoiding a client-side waterfall fetch on every navigation.

---

## 2. Styling System

### 2.1 Tailwind CSS as the styling foundation

**Tailwind CSS** is the sole styling mechanism — no CSS-in-JS runtime (styled-components/Emotion), to keep the client bundle free of runtime style-injection cost across 415 screens. Utility classes are composed via `class-variance-authority` (CVA) for components with variants (Button's `variant`/`size` props, Badge's `intent` prop), keeping variant logic co-located with the component rather than scattered across call sites.

### 2.2 Headless primitive layer: shadcn/ui on Radix UI

Rather than a pre-styled component library (MUI, Ant Design) or building every interactive primitive from scratch, Sutram uses **Radix UI primitives** (unstyled, accessible: Dialog, Dropdown, Popover, Tabs, Select, Tooltip, Checkbox, RadioGroup, Switch, Toast) wrapped via the **shadcn/ui pattern** — components are generated into the codebase (`packages/ui/src/primitives/`) rather than pulled in as an opaque `node_modules` dependency, so they can be freely restyled to Sutram's design tokens and extended for education-domain needs (e.g. a `Combobox` for section/subject pickers with 500+ options, a `DateRangePicker` for academic terms).

**Why this over a full pre-styled kit:** MUI/Ant Design ship their own design language that fights Tailwind's utility model and is expensive to re-skin per tenant (Section 7 — every screen must support tenant-branded primary colors). Radix gives WAI-ARIA-correct behavior (focus trapping, keyboard nav, roving tabindex) for free — critical given the WCAG 2.1 AA target (Section 10) — while leaving 100% of visual styling to Tailwind + tokens.

### 2.3 Design-token-driven theming

All colors, spacing, radii, shadows, and typography scale are defined as **design tokens**, not hardcoded Tailwind values, so the eventual Figma design system (Document 10) and the codebase share one source of truth:

```
packages/ui/src/tokens/
├── colors.tokens.json      # semantic tokens: --color-primary, --color-surface, --color-danger...
├── spacing.tokens.json     # 4px base scale: --space-1 … --space-24
├── radius.tokens.json
├── typography.tokens.json  # font stacks, type scale, line-heights
└── shadow.tokens.json
```

Tokens are authored as **CSS custom properties**, consumed by `tailwind.config.ts` via `theme.extend` referencing `var(--color-primary)` etc., rather than literal hex values. This indirection is what makes multi-tenant branding (Section 7) possible without a second theming system: tenant branding *overrides the same CSS variables* at runtime, Tailwind classes (`bg-primary`, `text-primary`) never change.

Recommended token pipeline: design tokens authored/maintained in Figma via Tokens Studio → exported as JSON → transformed by Style Dictionary into the `*.tokens.json`/CSS files above. This keeps Document 10 (Figma Design System) and this document mechanically in sync rather than manually re-typed.

### 2.4 Dark mode

Dark mode is planned architecture from day one (even if Phase 1 ships light-only by default) since it is far cheaper to design for now than retrofit across 415 screens later:

- Class-based strategy (`class="dark"` on `<html>`) via `next-themes`, not the `prefers-color-scheme` media-query-only strategy — needed because dark mode must be a **per-user preference stored server-side** (persisted on the user profile), not just an OS setting, and must combine correctly with per-tenant brand color overrides (a tenant's primary color must still pass contrast in both light and dark surfaces — validated against the token contrast-check step in the design system doc).
- Every semantic token has a light and dark value (`--color-surface: {light} / {dark}`); components never hardcode a light-mode-only color.

---

## 3. Project & Folder Structure

### 3.1 Monorepo: Turborepo

Sutram is developed as a **Turborepo monorepo**, even though at launch the public marketing site and the authenticated app are served from the same domain under the routing convention set in Document 2 (`/` vs `/app/*` on one Next.js deployment). The monorepo is chosen now, ahead of the split, for three reasons:

1. **Independent build/deploy cadence.** The marketing site changes constantly (content/campaigns) with a near-zero-risk blast radius; the authenticated app changes behind feature flags and review gates. A monorepo with Turborepo's task caching lets each app build/deploy independently without duplicating shared packages.
2. **Shared packages without publishing overhead.** The UI kit, API client, validation schemas, and permission-checking utilities are consumed by both the marketing site (e.g. pricing calculator, demo request form) and the app — a monorepo shares them via workspace `file:` references, no internal npm registry needed.
3. **Future-proofing the split explicitly named in scope.** If Sutram later spins the public site, the authenticated app, and the platform admin console into genuinely separate deployments (e.g. platform console on a locked-down internal domain for SOC 2 reasons), Next.js **Multi-Zones** (edge-level path-based routing/rewrites across independently deployed Next.js apps) lets that happen without changing the public URL structure defined in Document 2 — `/app/platform/*` can be lifted out to its own deployment behind the same domain with a rewrite, no route renumbering.

```
sutram/
├── apps/
│   ├── marketing/            # / — SSR/ISR, public site, signup entry funnel
│   ├── app/                  # /signup/*, /auth/*, /setup/*, /app/* — the product
│   └── storybook/            # design-system documentation site (Section 11)
├── packages/
│   ├── ui/                   # atoms/molecules/organisms + design tokens (Section 4)
│   ├── api-client/           # typed client generated from OpenAPI spec (Section 8)
│   ├── validation/           # Zod schemas mirroring backend validation (Section 5.3)
│   ├── rbac/                 # nav.config.ts, permission hooks/guards (Section 6)
│   ├── config/               # eslint, tsconfig, tailwind preset — shared build config
│   └── i18n/                 # locale message catalogs, t() setup (Section 10)
├── turbo.json
└── package.json
```

### 3.2 Feature/module-based structure inside `apps/app`

With ~415 screens, a flat `pages/` and `components/` split (the default Next.js "pages by URL, components by nothing in particular" pattern) collapses under its own weight — a `components/` folder with 400+ loosely related files is unnavigable and invites duplicate one-off components per screen. Sutram instead organizes `apps/app` **by module first**, mirroring the 18 sidebar modules from Document 2, and only *then* by screen type:

```
apps/app/src/
├── app/                                # Next.js App Router route tree (thin — composition only)
│   ├── (public)/auth/...
│   ├── (public)/signup/...
│   ├── setup/...
│   └── app/
│       ├── dashboard/page.tsx
│       ├── students/
│       │   ├── page.tsx                # list  → composes ListPageTemplate
│       │   ├── new/page.tsx            # create → composes FormPageTemplate
│       │   ├── [id]/page.tsx           # detail → composes DetailPageTemplate
│       │   └── [id]/edit/page.tsx      # edit   → composes FormPageTemplate
│       ├── fees/...
│       ├── attendance/...
│       └── ...(one folder per module, matching Doc 2's module list 1:1)
│
├── modules/                            # ← where the actual screen logic lives
│   ├── students/
│   │   ├── components/                 # organisms specific to Students only
│   │   │   ├── StudentProfileCard.tsx
│   │   │   ├── StudentListFilters.tsx
│   │   │   └── AdmissionStatusBadge.tsx
│   │   ├── hooks/                      # useStudents(), useStudent(id), useAdmitStudent()
│   │   ├── schemas/                    # Zod schemas for Student forms
│   │   └── config/                     # column defs, list-page config (Section 4.3)
│   ├── fees/
│   ├── attendance/
│   └── ...(one folder per module)
│
├── components/                         # ONLY cross-module shared composites (not module-owned)
│   ├── layout/                         # AppShell, Sidebar, Topbar, Breadcrumbs
│   └── templates/                      # the 4 reusable page templates (Section 4.4)
│
└── lib/                                 # cross-cutting: auth, tenant, query-client setup
```

**Rule of thumb:** `packages/ui` holds anything reusable across *any* Sutram surface (marketing site included) — pure atoms/molecules with zero business meaning (Button, Badge, DataTable shell). `apps/app/src/components` holds composites shared across *modules within the app* but still domain-aware (AppShell, the 4 page templates). `apps/app/src/modules/{module}` holds everything that only makes sense for one module (StudentProfileCard belongs to Students, FeeInvoiceTable belongs to Fees) — this is the layer that prevents the "one giant components folder" failure mode at 400+ screens.

The `app/` route folder is intentionally kept thin (routing + data-loading glue only) — every route file's job is to pick the right template from `components/templates`, feed it module config from `modules/{module}/config`, and render. This is what makes ~80% of the 415 screens buildable by composition instead of bespoke construction (Section 4.4).

---

## 4. Atomic Design & Component Layering

Sutram follows **Atomic Design** (atoms → molecules → organisms → templates → pages), chosen specifically because it gives a vocabulary for reuse at the scale of 415 screens — without it, "component" becomes a meaningless catch-all and duplication creeps in module by module.

### 4.1 Atoms (`packages/ui/src/atoms`)

Smallest, purely presentational, no business/domain knowledge, no data fetching. Built on the Radix/shadcn primitive layer (Section 2.2).

Examples: `Button`, `Input`, `Textarea`, `Select`, `Checkbox`, `RadioGroup`, `Switch`, `Badge`, `Avatar`, `Spinner`, `Skeleton`, `Icon`, `Tooltip`, `Label`, `Tag`.

### 4.2 Molecules (`packages/ui/src/molecules`)

Small compositions of atoms with a single UI responsibility, still domain-agnostic.

Examples: `FormField` (Label + Input/Select + error message, wired to React Hook Form), `DataTableRow`, `DataTableToolbar` (search + filter trigger + bulk-action bar), `StatCard` (KPI number + trend + icon, used across every module's dashboard widgets), `Pagination`, `EmptyState`, `ConfirmDialog`, `FileUploadDropzone`, `SearchCombobox`.

### 4.3 Organisms (`apps/app/src/modules/{module}/components`, promoted to `packages/ui` only if truly cross-module)

Domain-aware, composed of molecules/atoms, often data-connected (accept data via props from a hook, not fetch internally, to stay testable/Storybook-able).

Examples: `StudentProfileCard`, `FeeInvoiceTable`, `AttendanceGrid`, `ExamScheduleTimeline`, `FacultyWorkloadPanel`, `HostelRoomAllocationBoard`, `PlacementDriveCard`. A small number of organisms are genuinely cross-module (e.g. `AuditTrailPanel`, `CommentThread`, `DocumentViewer`, `NotificationBell`) and live in `packages/ui/src/organisms` instead.

### 4.4 Templates — the 4 reusable page templates

This is the layer that makes 415 screens tractable. Document 2 establishes that every module follows the same CRUD resource pattern (`/app/{module}/{resource}`, `/new`, `/:id`, `/:id/edit`) — which means the *structural shape* of most screens repeats far more than their content does. Sutram defines **four canonical page templates**, living in `apps/app/src/components/templates/`, that roughly 80% of the 415 screens compose from by supplying module-specific configuration rather than bespoke layout code:

| Template | Structural shape | Composed by |
|---|---|---|
| **`ListPageTemplate`** | Page header + `DataTableToolbar` (search, filters, saved views, bulk actions) + virtualized `DataTable` (Section 9.3) + `Pagination` + "New" CTA gated by permission | Every module's list/index screen — Students list, Fee Invoices list, Faculty list, Library Catalog, Hostel Rooms, Placement Drives, Audit Log, etc. |
| **`DetailPageTemplate`** | Page header with identity block (avatar/name/status badges) + tab strip + tab-panel content area + a right-rail "related info" panel + contextual action buttons gated by permission | Every module's `:id` detail/profile screen — Student Profile, Faculty Profile, Fee Invoice Detail, Hostel Room Detail, Placement Drive Detail. |
| **`FormPageTemplate`** | Page header + sectioned form (collapsible groups for long forms) + sticky save/cancel action bar + inline validation surfaced from Zod/RHF | Every module's `new` and `:id/edit` screens — Add Student, Edit Faculty, Create Fee Structure, Edit Course. |
| **`WizardTemplate`** | Step indicator + single-step content pane + back/next/skip footer + persisted step state (resumable) | Multi-step flows outside plain CRUD — Signup flow, Setup Wizard (Document 2 §"Institution Setup Wizard"), Admissions Application, Bulk Student Import. |

The remaining ~20% of screens are genuinely bespoke (the adaptive `/app/dashboard`, Analytics & Reports chart-heavy pages, the AI Assistant conversational surface, the Attendance Grid's matrix-entry UI, the Timetable builder) and are treated as one-off pages composed directly from organisms/molecules rather than forced into a template that doesn't fit — templates are a productivity tool, not a mandate to distort screens that need a different shape.

Each template is configuration-driven: a `ListPageTemplate` for Students is `<ListPageTemplate config={studentListConfig} />` where `studentListConfig` (living in `modules/students/config/list.config.ts`) declares columns, filters, row actions, and the required permission string — new list screens for a new module are typically a config file, not new component code.

### 4.5 Pages

Thin Next.js route files (`app/app/students/page.tsx`) that resolve server-side data/permission context and render exactly one template instance. See Section 3.2.

---

## 5. State Management

Sutram splits state into three explicitly separate mechanisms, each matched to what it's good at — a common failure mode at this scale is using one global store (typically Redux/Context) for everything, which conflates cache-with-server semantics with pure UI toggles and makes both harder to reason about.

### 5.1 Server state — TanStack Query (React Query)

All data that originates from `/api/v1/...` is owned by **TanStack Query**. Components never hold server data in `useState`/Context — they call a module-scoped hook (`useStudents(filters)`, `useStudent(id)`, `useAdmitStudent()`) that wraps `useQuery`/`useMutation`.

**Query key convention** (enforced via a lint rule / factory function, not ad hoc arrays), scoped by tenant to prevent cross-tenant cache bleed on shared-pool deployments:

```ts
// packages/api-client/src/queryKeys.ts
export const queryKeys = {
  students: {
    list: (tenantId: string, filters: StudentFilters) =>
      ['tenant', tenantId, 'students', 'list', filters] as const,
    detail: (tenantId: string, id: string) =>
      ['tenant', tenantId, 'students', 'detail', id] as const,
  },
  // ...one namespace per module, mirroring Document 2's module list
};
```

**Cache invalidation tied to backend event names.** The backend emits domain events (`student.admitted`, `attendance.marked`, `invoice.approved`, `results.published` — same event vocabulary used by the notification/webhook system in the backend design docs). The frontend maintains an **event-to-invalidation map** so real-time updates (delivered over the app's WebSocket/SSE connection, see Document 8/Realtime doc) invalidate the right query keys without every feature re-deriving this logic:

```ts
// packages/api-client/src/eventInvalidationMap.ts
export const eventInvalidationMap: Record<string, (payload: any, tenantId: string) => QueryKey[]> = {
  'student.admitted': (p, t) => [queryKeys.students.list(t, {}), queryKeys.admissions.list(t, {})],
  'attendance.marked': (p, t) => [queryKeys.attendance.list(t, { sectionId: p.sectionId })],
  'invoice.approved': (p, t) => [queryKeys.fees.detail(t, p.invoiceId), queryKeys.fees.list(t, {})],
  'results.published': (p, t) => [queryKeys.exams.results(t, p.examId)],
};
```

A single `RealtimeQuerySync` provider at the app shell level subscribes to the socket, looks up the incoming event name in this map, and calls `queryClient.invalidateQueries` — new modules register their events here instead of each screen writing its own subscription.

### 5.2 Client/UI state — Zustand (+ narrow React Context)

Ephemeral, client-only state that has no server counterpart uses **Zustand**: sidebar collapsed/expanded, active tenant theme mode (light/dark), command-palette open state, active dashboard-widget layout preference, table column visibility preference (persisted to `localStorage` via Zustand's `persist` middleware). Zustand is chosen over Redux for this layer because it needs no boilerplate (actions/reducers/providers) for what is fundamentally a handful of small, independent stores — `useSidebarStore`, `useUIPreferencesStore` — and over plain Context because Context re-renders the whole subscribed tree on every change, which matters once the dashboard shell has many descendants.

React Context is still used, narrowly, for **tree-local, low-frequency state** that doesn't warrant a global store — e.g. the current step index inside a `WizardTemplate` instance, or the active tab inside a `DetailPageTemplate`. The rule: if the state is read/written from more than one route or needs to survive navigation, it's Zustand; if it's scoped to one template instance's lifetime, it's Context/local state.

### 5.3 Form state — React Hook Form + Zod

Every form (all `FormPageTemplate` instances, all modal/drawer forms, all wizard steps) uses **React Hook Form** for field state/validation orchestration and **Zod** for schema validation, via `@hookform/resolvers/zod`.

Zod schemas live in `packages/validation/src/schemas/{module}.ts` and are written to **mirror the backend's validation rules field-for-field** (same required/optional, same string length/format constraints, same enum values as the backend's request-body validation) so that:

- Client-side validation never accepts something the server will reject (bad UX otherwise — pass client, fail server, confusing error).
- The `validation_error` mapping in Section 8.2 can attach backend field errors to the same field names RHF already knows about, since both sides share the field vocabulary.

Where the backend exposes its request/response contracts via OpenAPI (Section 8.1), schema drift is caught in CI by a script that diffs `packages/validation` schemas against the generated OpenAPI types and fails the build on mismatch, rather than relying on manual sync discipline across a 400+ screen surface.

---

## 6. Role-Adaptive Rendering

### 6.1 Principle: one shared layout, config-driven — not per-role component duplication

`/app/dashboard` and the surrounding `AppShell` (sidebar + topbar) are **single, shared components** for all 18 roles. Sutram explicitly rejects building `PrincipalDashboard.tsx`, `FacultyDashboard.tsx`, `StudentDashboard.tsx`, etc. as separate components — that pattern duplicates layout code 18 times and guarantees drift (a sidebar fix applied to one role's copy and forgotten in another). Instead, role-adaptivity is **data**, not code: a config object keyed by role slug drives what the same component renders.

### 6.2 `nav.config.ts` — the sidebar/navigation source of truth

Lives in `packages/rbac/src/nav.config.ts`. One entry per module in the canonical sidebar order from Document 2 (Platform Admin · Dashboard · Admissions · Students · … · Settings), each entry declaring the **permission string** (Document 4's `module:resource:action` grammar) required to see it:

```ts
// packages/rbac/src/nav.config.ts
export const navConfig: NavSection[] = [
  {
    id: 'platform-admin',
    label: 'Platform Admin',
    href: '/app/platform',
    icon: 'shield',
    requiredPermission: 'platform:tenants:read',   // only super_admin holds this
  },
  { id: 'dashboard', label: 'Dashboard', href: '/app/dashboard', icon: 'home', requiredPermission: null },
  {
    id: 'admissions', label: 'Admissions', href: '/app/admissions', icon: 'clipboard-list',
    requiredPermission: 'admissions:applications:read',
    children: [
      { id: 'admissions-applications', label: 'Applications', href: '/app/admissions/applications', requiredPermission: 'admissions:applications:read' },
      { id: 'admissions-offers', label: 'Offers', href: '/app/admissions/offers', requiredPermission: 'admissions:offers:read' },
    ],
  },
  // ... one entry per module, in the fixed sidebar order
  {
    id: 'settings', label: 'Settings', href: '/app/settings', icon: 'settings', requiredPermission: 'settings:general:read',
  },
];
```

The `AppShell`'s `<Sidebar />` renders by mapping over `navConfig` and calling `hasPermission(userPermissions, entry.requiredPermission)` per entry (and recursively for `children`) — a role sees fewer or more items purely because their permission set (resolved at login from Document 4's role→permission mapping and cached on the client, e.g. in the `/api/v1/auth/me` response) satisfies fewer or more `requiredPermission` checks. Adding an 18th... err, a 19th role, or changing what Librarian can see, is a backend permission-matrix change plus zero frontend deploys — the nav already reacts to it.

Dashboard widgets follow the identical pattern: `dashboard.widgets.config.ts` maps widget → `requiredPermission` (+ optional role-priority ordering, e.g. Fee Collection Summary widget ranks high for `accountant`, low for `faculty`), and `/app/dashboard`'s page component filters+orders the shared widget registry per the logged-in user's permission set — again, one component, data-driven.

### 6.3 Route guards — layout level and page level, both required

Hiding a nav item is a UX convenience, **not** a security boundary — Document 4 is explicit that the backend enforces authorization independently (Section 6 of Document 4, "no single layer is trusted alone"). The frontend mirrors that defense-in-depth posture at two levels:

1. **Layout level (hide, don't just disable):** `nav.config.ts` filtering (Section 6.2) means a role never sees a link they can't use — reduces confusion, avoids "why is this greyed out" support tickets.
2. **Page level (block direct URL access):** every route under `/app/*` that maps to a permission-gated resource wraps its content in a `<RequirePermission perm="students:profile:read">` boundary (or the RSC-equivalent server-side check in the page's data loader) so that typing the URL directly, deep-linking, or a stale bookmark cannot render protected content even for a split second. This check re-reads the permission from the server-resolved session (via the middleware-attached headers, Section 1.4, or a `/me` call), not from client-cached state alone, to avoid a stale/tampered client store granting a false positive.

```tsx
// apps/app/src/modules/students/components/RequirePermission usage
export default function StudentDetailPage({ params }: { params: { id: string } }) {
  return (
    <RequirePermission perm="students:profile:read" fallback={<PermissionDeniedScreen />}>
      <DetailPageTemplate config={studentDetailConfig} recordId={params.id} />
    </RequirePermission>
  );
}
```

`PermissionDeniedScreen` is a single, friendly, reusable 403 component (illustration + "You don't have access to this. Contact your institution admin." + a link back to `/app/dashboard`) — not a raw error dump — reused everywhere a permission check fails, consistent with the system pages already scoped in Document 2 (`/403`).

### 6.4 Multi-role accounts

Per Document 4 §2 ("Note on role composition"), a user can hold multiple roles (e.g. Faculty who is also a Parent). The frontend's permission set is simply the **union** already computed server-side in the `/me` payload — `hasPermission()` doesn't need role-awareness at all, only the flattened permission-string set, which keeps the nav/guard logic identical regardless of how many roles a user holds. The **Role Detect** active-context switcher (Document 2/3) writes the selected context to the Zustand UI store (Section 5.2) purely to drive *dashboard widget framing/labeling* ("Viewing as: Parent"), not to alter what's technically permitted — permission checks always use the full union, scope predicates (Document 4 §1.1) narrow the data.

---

## 7. Multi-Tenant Theming

### 7.1 What's tenant-brandable

Per-institution branding covers: logo (light/dark variants), primary/accent color, and (Enterprise tier) a custom domain (`portal.stmarys.edu` mapped to the tenant instead of `stmarys.sutram.io`).

### 7.2 Resolution flow

1. `middleware.ts` (Section 1.4) resolves `tenant_id` from `Host` header.
2. Middleware fetches (edge-cached, short TTL, keyed by tenant) the tenant's branding config from `/api/v1/tenants/{id}/branding` — a lightweight, publicly-cacheable payload (`{ logoUrl, logoUrlDark, primaryColor, accentColor, fontFamily }`) — deliberately separate from the full tenant settings object so it can be fetched fast and cached aggressively without touching sensitive config.
3. The resolved values are injected as **inline CSS custom properties on the root layout's `<html>` tag**, server-rendered — never a client-side `useEffect` re-theme, which would flash default branding first:

```tsx
// apps/app/src/app/layout.tsx (simplified)
export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const branding = await getTenantBranding(); // reads x-tenant-id set by middleware
  return (
    <html
      lang="en"
      style={{
        '--tenant-primary': branding.primaryColor,
        '--tenant-accent': branding.accentColor,
      } as React.CSSProperties}
    >
      <body>{children}</body>
    </html>
  );
}
```

4. Tailwind's `primary`/`accent` theme colors resolve to `var(--tenant-primary)`/`var(--tenant-accent)` (Section 2.3's token indirection) — every component using `bg-primary`/`text-primary`/`ring-primary` picks up the tenant's color with zero per-component tenant-awareness.
5. Logo swap uses the same server-resolved `branding.logoUrl` passed into the shared `<AppShell logo={...} />` — one component, tenant-supplied asset, not a per-tenant component variant.

### 7.3 Contrast safety

Because tenants supply an arbitrary brand color that Sutram's UI must remain accessible against (Section 10, WCAG AA), the branding save flow (Settings → Branding, an Institution Admin screen) runs a contrast-ratio check against both light and dark surface tokens at save time and warns ("This color has low contrast on white backgrounds; text may be hard to read") rather than silently accepting a color that breaks accessibility across the tenant's entire instance.

---

## 8. Data Fetching & API Integration Layer

### 8.1 Typed API client generated from OpenAPI

The backend exposes an OpenAPI 3.x spec for `/api/v1/...`. Sutram generates a **fully typed TypeScript client** from that spec (`openapi-typescript` for types + a thin fetch wrapper, or `orval`/`ts-rest` depending on final backend tooling choice) into `packages/api-client/src/generated/`, checked into the repo and regenerated via a CI step whenever the backend spec version bumps — not hand-written per endpoint. This is what keeps 415 screens' worth of API calls from drifting out of sync with backend contract changes: a breaking backend change fails TypeScript compilation at the call site instead of failing silently at runtime.

Every generated call is wrapped by a single `apiClient` (`packages/api-client/src/client.ts`) responsible for:

- Injecting the JWT access token header and `x-tenant-id`.
- Silent refresh-token rotation on a 401 (queuing concurrent requests during the refresh, replaying them after, per the 15-minute access token lifetime established in the backend design docs).
- Unwrapping the standard JSON envelope (`{ success, data, error, meta }`) so hooks/components work with plain typed data, not the envelope shape.

### 8.2 Error mapping: backend error codes → UI treatment

The backend's standard error envelope carries a machine-readable `error.code`. The frontend maintains one central mapping so error handling is consistent across all 415 screens rather than reinvented per form/page:

| Backend error code | UI treatment |
|---|---|
| `validation_error` | Field-level: `error.details[].field` mapped to `setError(field, ...)` on the active React Hook Form instance — inline, under the offending input. No toast (avoids double-reporting the same problem). |
| `permission_denied` | Toast ("You don't have permission to do that.") + if triggered by a direct page load rather than an in-page action, render `PermissionDeniedScreen` (Section 6.3). |
| `not_found` | Inline empty/not-found state within the template (e.g. `DetailPageTemplate` shows "Record not found or has been removed" instead of a blank/broken UI). |
| `conflict` (e.g. duplicate enrollment number) | Inline field error where attributable, else toast with a "view existing record" action link where the API supplies one. |
| `rate_limited` | Toast with retry-after messaging; mutation is left in a retryable state, not silently dropped. |
| `tenant_module_disabled` | Redirect to a friendly "This feature isn't enabled for your institution" screen rather than a generic error — distinct from `permission_denied` because the fix is an admin action (enable module), not a role change. |
| `server_error` / unmapped | Generic toast ("Something went wrong, please try again") + reported to the frontend error-monitoring pipeline (Sentry or equivalent) with request correlation ID for support triage. |

This mapping is implemented once, at the `apiClient`/TanStack Query global `onError` level, with per-call opt-out for screens needing bespoke handling — not copy-pasted per screen.

### 8.3 Optimistic updates for common high-frequency actions

For actions where latency directly affects perceived responsiveness and the failure rate is low (validated server-side anyway), Sutram uses TanStack Query's `onMutate`/rollback pattern:

- **Mark attendance** — toggling a student's status in the `AttendanceGrid` updates the local cache immediately; on server error, the specific cell reverts with a visible error indicator rather than the whole grid re-fetching.
- **Approve invoice / approve leave request** — the row's status badge flips immediately (e.g. Pending → Approved) with a subtle "saving" affordance; rollback on failure restores Pending and surfaces the mapped error (Section 8.2).
- **Toggle read/unread on notifications, bulk-select actions in list templates.**

Optimistic updates are **not** used for financial-amount edits, grade/marks entry final submission, or anything state-transition-irreversible on the backend (e.g. results publish) — those wait for server confirmation given the correctness stakes, showing a pending/spinner state instead.

---

## 9. Performance Strategy

A 415-screen, data-dense app fails on performance by default unless code-splitting and virtualization are structural decisions, not afterthoughts.

### 9.1 Code splitting

Next.js App Router gives **route-based code splitting automatically** — each `/app/{module}/...` segment ships its own JS chunk, so a Faculty user who never opens Fees & Finance never downloads that module's bundle. On top of the automatic split:

- Heavy, infrequently-loaded-per-session libraries are additionally lazy-loaded with `next/dynamic`: the chart library (Analytics & Reports, dashboard widgets), the rich-text editor (Communication, Subject content), the AI Assistant chat surface, PDF/document viewers.
- Shared `packages/ui` atoms/molecules are tree-shaken per usage — a module importing only `Button` and `Badge` doesn't pull in `DateRangePicker`'s dependency weight.

### 9.2 Bundle size budgets

Enforced via CI (`@next/bundle-analyzer` + a size-limit check that fails the PR, not just warns):

| Bundle | Budget (gzipped) |
|---|---|
| `/app` shell (layout + sidebar + auth/session bootstrap, loaded on every authenticated route) | ≤ 150 KB |
| Per-module route chunk (e.g. `/app/students`) | ≤ 80 KB |
| Public marketing homepage | ≤ 100 KB |
| Largest third-party dependency added to any shared chunk | flagged for review over 30 KB |

### 9.3 Virtualization for large rosters/lists

Any list rendering an unbounded-in-principle dataset (student rosters that can run into the thousands per institution, faculty lists, fee transaction logs, library catalog, attendance history) uses **virtualized rendering** (`@tanstack/react-virtual`, paired with `@tanstack/react-table` for the table logic) inside `ListPageTemplate`'s `DataTable` — only visible rows (+ overscan buffer) mount to the DOM regardless of result-set size. Combined with server-side pagination/filtering (the API paginates by default, per the standard envelope's `meta` block), the client never attempts to hold an entire institution's student roster in memory or DOM at once.

### 9.4 Image optimization

`next/image` for every raster asset — tenant logos, student/faculty profile photos, document thumbnails — with a configured `remotePatterns` allowlist covering the tenant asset storage domain (object storage / CDN). Automatic responsive `srcset` generation matters specifically for the mobile-web-responsive requirement (Section 10 note on phone browsers) where bandwidth and viewport size vary widely across the target market.

### 9.5 Additional structural performance practices

- React Server Components for static/rarely-changing shell pieces (sidebar chrome, page headers) to keep client JS scoped to what's actually interactive.
- `loading.tsx`/route-level Suspense boundaries per module so navigating into a heavy module (e.g. Analytics) shows a skeleton immediately rather than blocking on the full data fetch.
- TanStack Query's `staleTime`/`gcTime` tuned per data volatility (tenant branding: long stale time; attendance-in-progress: short) rather than one global default, to cut redundant refetches across a screen-heavy nav pattern (users bouncing between list/detail/edit constantly).

---

## 10. Accessibility & Internationalization

### 10.1 Accessibility target: WCAG 2.1 AA

Sutram serves K-12 through university populations — including students and staff using assistive technology, and institutions for whom accessibility compliance is a procurement requirement, not a nice-to-have. **WCAG 2.1 Level AA** is the binding target across all 415 screens, operationalized as:

- Radix UI primitives (Section 2.2) provide correct ARIA roles, keyboard interaction patterns (roving tabindex in menus/tabs, focus trap in dialogs/drawers, `Esc` to close), and focus-return-on-close behavior by default — this is precisely why a headless-primitives approach was chosen over hand-rolled dropdowns/modals at this screen count.
- Color tokens (Section 2.3) are contrast-validated (4.5:1 body text, 3:1 large text/UI components) in both light and dark mode as part of the design-token pipeline, and tenant brand colors are contrast-checked at save time (Section 7.3).
- All interactive elements are keyboard-reachable and operable without a mouse — validated as a template-level requirement (if `ListPageTemplate` is keyboard-accessible, every list screen built from it inherits that, which is the leverage point at this scale).
- Semantic HTML and landmark regions (`<nav>`, `<main>`, skip-to-content link) in `AppShell`, applied once at the layout level.
- Data-dense organisms with a specific accessibility burden (`AttendanceGrid`'s matrix input, `DataTable` sorting/filtering) get an explicit accessible-alternative interaction pattern (e.g. keyboard shortcuts documented, ARIA live regions announcing async status changes like "Attendance saved") rather than being treated as inherently exempt because they're "complex."
- Automated checks (`axe-core` via `jest-axe`/Storybook a11y addon, Section 11) run at the component level in CI as a baseline floor — manual screen-reader/keyboard audits are scheduled per phase for the highest-traffic templates, not assumed to be replaced by automation alone.

### 10.2 Mobile-web responsiveness (no native app)

Since native mobile is explicitly out of scope, every screen — including data-dense organisms like `AttendanceGrid` and `FeeInvoiceTable` — must degrade to a usable phone-browser layout, not merely "not be broken." Practically: `ListPageTemplate` collapses its `DataTable` to a stacked-card layout below the `md` breakpoint (a wide multi-column table is not usable at 375px width); `DetailPageTemplate`'s right-rail panel moves below the main content rather than beside it; the `AppShell` sidebar collapses to a bottom-nav/hamburger pattern on mobile. This is defined once per template (Section 4.4), so responsiveness is inherited by every screen composed from it instead of solved 415 times.

### 10.3 Internationalization readiness

Phase 1 ships **English only**, but the codebase is i18n-ready from day one — retrofitting `t()` calls across 415 already-shipped screens later is far more expensive than writing them that way from the start:

- All user-facing strings route through a translation function (`next-intl`, chosen for its App Router-native support for both server and client components) — `t('students.list.title')` — never hardcoded JSX text, enforced by an ESLint rule flagging raw string literals in JSX within `apps/app` and `apps/marketing`.
- Message catalogs live in `packages/i18n/src/messages/{locale}.json`, structured by module to mirror the folder structure in Section 3.2, keeping translation work assignable/reviewable per module rather than one giant flat file.
- Given Sutram's target market, the locale roadmap beyond English (Phase 3+, market-driven) anticipates **Hindi and regional Indian languages** (e.g. Marathi, Tamil, Telugu, Kannada, Bengali) — the type system for message keys is generated from the English catalog so a missing key in any other locale fails typecheck rather than silently falling back at runtime in production.
- Locale is resolved from **user profile preference** (stored server-side, consistent with how dark mode is handled in Section 2.4) with `Accept-Language` as an unauthenticated fallback, not a URL locale prefix — this preserves the exact route convention already fixed in Document 2 (`/app/{module}/{resource}`) without inserting a `/[locale]/` segment that would require renumbering every route in that document.
- Date/number/currency formatting uses `Intl` APIs throughout (never manual string formatting), since fee amounts, academic calendars, and attendance percentages must localize correctly by locale even while only English ships.

---

## 11. Testing Approach (Frontend Layer)

Full detail — coverage targets, E2E strategy, CI gating, test-data strategy — is owned by the dedicated Testing Strategy document. At the frontend-architecture level, two conventions are load-bearing enough to fix here because they shape how components are built, not just how they're verified later:

- **Component testing:** Atoms/molecules/organisms (Section 4) are unit/component-tested with **Vitest + React Testing Library**, asserting behavior (keyboard interaction, ARIA attributes, form validation surfacing) rather than implementation detail — colocated as `Component.test.tsx` next to the component. `packages/rbac`'s `hasPermission`/`nav.config` filtering logic (Section 6) and the error-mapping table (Section 8.2) are pure-function-tested directly, since they're the highest-leverage, most-reused logic in the frontend.
- **Storybook for the design system:** Every atom, molecule, and organism in `packages/ui` (plus the 4 page templates, Section 4.4) gets a Storybook story, run from `apps/storybook`. This is the living counterpart to the Figma Design System document (Document 10) — Figma defines the intended visual/interaction spec, Storybook is where that spec is verified as actually implemented, in isolation, per component, including all variants/states (loading, error, empty, disabled) and both light/dark themes. Storybook's accessibility addon (`axe-core`-based) runs against every story in CI as the automated a11y floor referenced in Section 10.1.

---

## 12. Build/Deploy Pipeline Touchpoints

Full detail — CI/CD pipeline design, infra-as-code, monitoring/alerting, rollback procedure — is owned by the dedicated DevOps document. The architecture-relevant touchpoints that constrain frontend decisions made above:

- **Hosting:** **Vercel** is the default target for `apps/marketing` and `apps/app` — native fit for Next.js's middleware/edge functions (Section 1.4, tenant/auth resolution at the edge) and per-PR preview deployments, which matter given how much of this document's role-adaptive/multi-tenant behavior needs to be reviewed in a live preview rather than just read as a diff. For enterprise tenants requiring **self-hosted/on-prem or VPC-isolated deployment** (a plausible contractual requirement for large public-sector or university customers), the same Next.js codebase builds to a **containerized standalone output** (`next build` with `output: 'standalone'`, Docker image) deployable to any container runtime — this is why Vercel-specific APIs are avoided in application code beyond the `middleware.ts`/edge-runtime boundary, keeping the container path a real fallback rather than theoretical.
- **Environment config per tenant tier:** Shared multi-tenant pool deployments (Starter/Growth plans) run one deployment serving all tenants, tenant-resolved at request time (Section 7). Enterprise-tier tenants requiring dedicated infrastructure run a separate deployment from the same build artifact, parameterized by environment variables (API base URL, allowed custom domains) — the frontend never bakes a tenant identity into the build, only into runtime request resolution, so the same artifact serves both deployment models.
- **OpenAPI-generated client (Section 8.1) as a CI gate:** the `packages/api-client` regeneration step runs in CI against the backend's published spec version; a spec change that breaks generated types fails the frontend build before merge, not in production.

---

## 13. Summary of Binding Decisions

| Area | Decision |
|---|---|
| Framework | Next.js (App Router) + React 18 + TypeScript, strict mode |
| Rendering | SSR/ISR for `/` (SEO), SSR-gated shell + CSR-heavy for `/auth`, `/setup`, `/app/*` |
| Styling | Tailwind CSS + CVA, shadcn/ui components on Radix UI primitives |
| Theming | CSS custom properties as design tokens; tenant branding overrides the same variables at request time |
| Dark mode | `next-themes`, class-based, per-user preference stored server-side |
| Monorepo | Turborepo — `apps/marketing`, `apps/app`, `apps/storybook`; `packages/ui`, `api-client`, `validation`, `rbac`, `config`, `i18n` |
| Component model | Atomic Design — atoms/molecules/organisms/templates/pages |
| Page templates (mirror in Figma design system doc) | `ListPageTemplate`, `DetailPageTemplate`, `FormPageTemplate`, `WizardTemplate` (~80% of screens); bespoke pages for Dashboard/Analytics/AI Assistant/Attendance Grid/Timetable |
| Server state | TanStack Query, tenant-scoped query keys, event-name-driven cache invalidation (`student.admitted`, etc.) |
| Client/UI state | Zustand (cross-route ephemeral state) + narrow React Context (tree-local state) |
| Form state | React Hook Form + Zod, schemas mirrored from backend validation |
| Role-adaptive rendering | `nav.config.ts` keyed by permission string, one shared `AppShell`/dashboard — no per-role component duplication |
| Route guards | Layout-level (hide nav) + page-level (`RequirePermission`, server-checked) + shared `PermissionDeniedScreen` |
| Data layer | Typed API client generated from backend OpenAPI spec; centralized backend-error-code → UI-treatment map; optimistic updates for low-risk, high-frequency actions only |
| Performance | Route-based code splitting, virtualized tables (`@tanstack/react-virtual`), bundle budgets enforced in CI, `next/image` |
| Accessibility | WCAG 2.1 AA, Radix-derived semantics, `axe-core` in CI, template-level responsibility for inheritance across 415 screens |
| i18n | `next-intl`, string-catalog-from-day-one even for English-only Phase 1, locale via profile preference not URL prefix |
| Testing (frontend) | Vitest + React Testing Library for components; Storybook (with a11y addon) as the living counterpart to the Figma design system doc |
| Deploy | Vercel primary; containerized standalone Next.js fallback for on-prem/VPC enterprise tenants; one build artifact, tenant resolved at runtime |

---

*End of Document 9. Next in sequence: Document 10 — Figma Design System (should mirror the token structure in Section 2.3 and the four page templates named in Section 4.4/13), and the Testing Strategy and DevOps documents referenced in Sections 11–12.*
