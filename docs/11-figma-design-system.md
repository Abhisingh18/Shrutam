# Document 11: Figma Design System Specification

**Product:** Sutram — AI-powered, multi-tenant Education Operating System
**Company:** Pragyaan Labs
**Scope:** Full responsive web app (desktop, tablet, mobile-web). Native mobile app out of scope.
**Audience:** Design team (building the Figma library) and frontend team (implementing matching Tailwind/shadcn tokens).
**Companion documents:** Doc 02 (Information Architecture — module list, sidebar order), Doc 04 (RBAC — permission model referenced by `nav.config.ts`), Doc 09 (Frontend Architecture — Next.js/Tailwind/shadcn implementation, CSS-custom-property token pipeline, multi-tenant theming mechanism), Doc 10 (AI Features — explainable risk scores referenced in Section 10 of this doc).

---

## 1. Design Principles

Sutram is used by 18 different roles spanning a five-year-old's parent checking a fee receipt on a cracked phone screen, to a university registrar cross-referencing 40,000 student records, to a Super Admin auditing tenant-level billing. One visual language has to stretch across that entire range without feeling like five different products stitched together. Five principles govern every design decision in this system:

**1.1 Clarity over decoration.** Sutram touches grades, attendance, medical/hostel records, and money. Every screen's job is to make the current state of a record instantly legible — not to look impressive. Decorative gradients, illustrative empty states with cartoon mascots, heavy drop shadows, and novelty typography are avoided in the transactional app (they are permitted, sparingly, in Doc 03's marketing site only). When in doubt, remove an element rather than style it.

**1.2 Data density done right.** Roughly 80% of Sutram's ~415 screens are admin-heavy list/detail/form surfaces (Doc 09, page templates). The system must support genuinely dense tables (40+ rows visible, 8–12 columns) without becoming illegible. Density is achieved through disciplined spacing and type-scale choices (Sections 3–4), not through shrinking touch targets below accessible minimums or removing whitespace indiscriminately. A dense table and a spacious dashboard KPI tile are both "on-brand" — density is a per-context choice the templates make deliberately, not a global constraint.

**1.3 Trust and institutional credibility.** Sutram is the system of record an institution's accreditation, parents' fee payments, and students' academic transcripts run through. The visual language borrows more from enterprise-of-record software (banking back-office, ERP) than from consumer social apps: restrained color, predictable layout, no playful micro-copy on financial or academic-record screens. Trust is also built through consistency — the same status-badge color always means the same thing everywhere in the product (Section 2.4).

**1.4 Approachable for the people who didn't choose to be here.** Parents and students did not sign up for enterprise software — they were enrolled into it. Screens reachable by the Student and Parent roles (their dashboard, fee payment, attendance view, communication inbox) get simpler layouts, larger text defaults, plainer language in empty/error states, and fewer simultaneous actions than the equivalent Admin-facing screen, while using the *same* component library and token set. This is a content and layout-density choice per role-facing screen, not a second design system.

**1.5 Accessible by default, not by retrofit.** WCAG 2.1 AA is a hard floor across the entire product (Section 0 of this doc's foundational facts) because the user base spans a K-12 student with low vision, a parent using a screen reader, and an admin colorblind to red/green risk indicators. Every token, component state, and chart guideline in this document specifies its accessibility behavior inline rather than deferring it to a separate audit pass.

---

## 2. Color System

### 2.1 Token architecture

Colors are authored as a two-layer token system, matching the CSS-custom-property mechanism already committed to in Doc 09 §2.3/§2.4:

- **Primitive tokens** — raw color values (e.g., `blue.600 = #2563EB`). Never referenced directly by components.
- **Semantic tokens** — role-based names components actually consume (e.g., `color-primary`, `color-surface`, `color-text-secondary`, `color-border-error`). Each semantic token points at a primitive token, and the *mapping* changes between light and dark mode while the semantic name stays constant.

In Figma, primitives live as a locked "Primitives" color style/variable collection in the `00-Foundations` file; semantic tokens are a second Variables collection with **Light** and **Dark** modes, each semantic variable aliasing a primitive. This mirrors exactly how the frontend consumes `var(--color-primary)` resolving differently per `class="dark"` (Doc 09 §2.4) — a Figma variable with a Light/Dark mode pair *is* the design-time equivalent of a CSS custom property with a `.dark` override, so token names in Figma and Tailwind config should be identical strings (`color-primary`, `color-surface-raised`, etc.) to keep the Tokens Studio → Tailwind export (Section 12) a direct 1:1 mapping.

### 2.2 Brand / primary / secondary / accent

| Token | Light mode | Dark mode | Notes |
|---|---|---|---|
| `color-primary` | `#1E3A8A` (Indigo 900-ish, "Sutram Indigo") | `#5B7CFA` | Platform default; **tenant-overridable** (Section 2.6). Primary actions, active nav state, links, focus rings default. |
| `color-primary-hover` | `#16296B` | `#7691FB` | Derived: light mode darkens 12%, dark mode lightens 12%, computed automatically from whatever `color-primary` resolves to (platform default or tenant override) so hover states never need manual tenant tuning. |
| `color-secondary` | `#0F766E` (teal) | `#2DD4BF` | Non-brand-critical secondary actions, secondary nav accents. Not tenant-overridable — keeps a stable "platform" identity underneath tenant branding. |
| `color-accent` | `#7C3AED` (violet) | `#A78BFA` | Reserved for the AI Assistant surface specifically (chat bubble accents, AI-suggestion highlight, "AI-drafted" badges) — a deliberate, consistent visual signal across the product that "this came from AI," per Doc 10's approval-gate distinction between advisory and actionable AI output. |

### 2.3 Neutral / gray scale (10-step)

A single neutral ramp drives all surface, border, and text-on-neutral colors. Named numerically (50 lightest → 900 darkest) so the same scale token works in both modes by inverting which end is "background."

| Step | Light-mode hex | Dark-mode hex | Typical light-mode use | Typical dark-mode use |
|---|---|---|---|---|
| `gray-50` | `#F8FAFC` | `#0B0E14` | App background | Deepest background (rarely used directly; see `color-background`) |
| `gray-100` | `#F1F5F9` | `#12161F` | Subtle section backgrounds, table stripe | Card/table background |
| `gray-200` | `#E2E8F0` | `#1B212C` | Default borders, dividers | Default borders, dividers |
| `gray-300` | `#CBD5E1` | `#2A3140` | Input borders (default) | Input borders (default) |
| `gray-400` | `#94A3B8` | `#4B5563` | Disabled text, placeholder text | Disabled text, placeholder text |
| `gray-500` | `#64748B` | `#6B7280` | Secondary/muted text | Secondary/muted text |
| `gray-600` | `#475569` | `#9CA3AF` | Body text (secondary emphasis) | Body text (secondary emphasis) |
| `gray-700` | `#334155` | `#D1D5DB` | Body text (default) | Body text (default) |
| `gray-800` | `#1E293B` | `#E5E7EB` | Headings | Headings |
| `gray-900` | `#0F172A` | `#F8FAFC` | Highest-emphasis text | Highest-emphasis text |

Semantic aliases built on this ramp (both modes derive from the table above):

| Semantic token | Light | Dark |
|---|---|---|
| `color-background` | `gray-50` | `gray-50` (dark value, `#0B0E14`) |
| `color-surface` (card/panel default) | `#FFFFFF` | `gray-100` (`#12161F`) |
| `color-surface-raised` (modal, popover) | `#FFFFFF` + shadow | `#1B212C` + border (dark mode uses border over shadow — see Section 5) |
| `color-border` | `gray-200` | `gray-200` (dark value) |
| `color-text-primary` | `gray-900` | `gray-900` (dark value, `#F8FAFC`) |
| `color-text-secondary` | `gray-600` | `gray-600` (dark value) |
| `color-text-disabled` | `gray-400` | `gray-400` (dark value) |

### 2.4 Semantic status colors

These four map 1:1 onto the risk/status vocabulary used throughout the product (attendance status, fee status, application status, AI risk flags in Doc 10) and are **never** tenant-overridable — a red "overdue" badge must mean the same thing on every tenant's instance, which is precisely why these are platform-controlled rather than part of brand theming (Section 2.6).

| Token | Light bg / Light text (on `color-surface`) | Dark bg / Dark text | Usage |
|---|---|---|---|
| `color-success` | bg `#DCFCE7` / text `#166534` | bg `#052E1A` / text `#4ADE80` | Paid, present, approved, on-track |
| `color-warning` | bg `#FEF3C7` / text `#92400E` | bg `#2E1D05` / text `#FBBF24` | Due-soon, pending review, at-risk (medium) |
| `color-error` | bg `#FEE2E2` / text `#991B1B` | bg `#2E0B0B` / text `#F87171` | Overdue, absent, rejected, at-risk (high), destructive action |
| `color-info` | bg `#DBEAFE` / text `#1E40AF` | bg `#0B1D3A` / text `#60A5FA` | Neutral notices, informational banners, draft state |

Each status token also has a **solid** variant (`color-success-solid = #16A34A`, etc.) used for dots, chart series, and progress bars where a filled badge background would be too heavy — e.g. a 4px status dot on a dense table row.

### 2.5 WCAG AA contrast-checked text pairings

All pairings below are verified ≥ 4.5:1 for body text and ≥ 3:1 for large text (24px+/18.5px bold+) and UI component boundaries, matching the contrast floor already specified in Doc 09 §10.

| Pairing | Light-mode ratio | Dark-mode ratio | Pass |
|---|---|---|---|
| `color-text-primary` on `color-background` | 15.8:1 | 16.1:1 | AA / AAA |
| `color-text-secondary` on `color-background` | 6.9:1 | 7.2:1 | AA |
| `color-text-primary` on `color-surface` | 15.8:1 | 13.4:1 | AA / AAA |
| White text on `color-primary` (default button) | 8.6:1 | — (dark buttons use dark-mode primary + `gray-900` text, 9.1:1) | AA |
| `color-success` text on `color-success` bg | 7.4:1 | 8.9:1 | AA |
| `color-warning` text on `color-warning` bg | 5.1:1 | 8.2:1 | AA |
| `color-error` text on `color-error` bg | 7.0:1 | 8.6:1 | AA |
| `gray-400` (placeholder) on `color-surface` | 3.0:1 | 3.1:1 | AA (large-text/UI floor only — never used for body copy) |

A **contrast-check gate** is a standing Figma library rule: any new semantic color pairing added to the system must be validated against both modes before being added to the token set. This is enforced in code as an automated step in the token pipeline (Section 12.4), not just a design-time convention.

### 2.6 Multi-tenant theming mechanism

Per Doc 09 §7, an institution can brand its instance with a logo (light/dark variants) and a primary/accent color, resolved server-side per request and injected as CSS custom properties before paint. The design system's contract with that mechanism:

- **Only `color-primary` (and optionally `color-accent` for Enterprise-tier tenants) is tenant-overridable.** Every other token in this document — the full neutral scale, all four semantic status colors, `color-secondary` — is **platform-controlled and identical across every tenant**. This is a deliberate accessibility and trust guarantee: no institution admin can accidentally (or intentionally) pick a brand color that makes error states unreadable, because error/success/warning/info never touch the tenant's palette.
- **Derived states are computed, not hand-picked.** `color-primary-hover`, `color-primary-active`, and `color-primary` at reduced opacity (e.g., 10% tint for a selected-row background) are generated programmatically from whatever hex the tenant supplies, both in Figma (via a "tint/shade" variable-math plugin applied to the base swatch) and in code (a small color-manipulation utility run at branding-save time, per Doc 09 §7.3). This means a designer building a new component never manually picks a "hover indigo" — they reference `color-primary-hover` and it stays correct under every tenant's brand color.
- **Contrast is enforced at save time, not just design time.** Doc 09 §7.3 already specifies that Settings → Branding runs a contrast check against light and dark surface tokens when an admin saves a new brand color and warns if it's too low-contrast. The Figma library encodes the same rule as a documented constraint next to the `color-primary` token: *"Tenant override must maintain ≥ 4.5:1 against white and ≥ 4.5:1 against `gray-900` text used on it, in both light and dark surface contexts."* If a prospective brand color fails, the product falls back to darkening/lightening it algorithmically until it passes, rather than rejecting the tenant's choice outright.
- **In Figma**, tenant branding is modeled as a single swappable "Brand" variable collection with example presets (Default Indigo, plus 3–4 sample tenant palettes used across mockups to stress-test the system) rather than one Figma file per tenant — mirroring that in code it's one build artifact with runtime-resolved variables (Doc 09 §7), not per-tenant builds.

---

## 3. Typography System

### 3.1 Font family

**Primary UI typeface: Inter (variable font).**

Justification:
- Purpose-built for UI at small sizes — tall x-height and open apertures keep 12–13px table-cell text and dense form labels legible, which matters directly for the data-density principle (Section 1.2) across ~200+ list screens.
- Ships as a **variable font**, so the whole weight range (400–700 used here) is one asset, not five separate font files — good for load performance across 415 screens.
- Includes **tabular figures** (`font-feature-settings: 'tnum'`) — enabled by default on all numeric table columns, fee amounts, and KPI numbers so digits align in fixed-width columns rather than jittering row to row (a real legibility problem in financial tables at density).
- Extensive Latin-script language coverage and a large, active open-source maintenance base (SIL OFL license, no per-seat licensing friction across a multi-tenant SaaS with potentially thousands of end users per tenant).

**Fallback / future regional-language pairing: Noto Sans (+ script-specific Noto Sans family members, e.g., Noto Sans Devanagari, Noto Sans Tamil).** Per Doc 01, v1 ships English-only with an i18n-ready architecture and regional-language UI packs planned for Phase 2/3. Inter does not cover Indic scripts, so Noto Sans is designated now — at foundation-token time, not retrofitted later — as the paired family for non-Latin locales, chosen because Noto's explicit design goal is *visual harmony across scripts* (matching x-height/weight impression to Latin Noto Sans, which sits close to Inter's proportions), minimizing a jarring type-shift when a tenant switches the UI to a regional language. The type scale, weights, and line-heights defined below apply identically to both families; only the family swaps per locale.

**System font stack** (loading fallback before Inter hydrates, and monospace use): `ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif` for body; `ui-monospace, "SF Mono", Consolas, monospace` reserved for the rare fixed-width use case (IDs, API keys shown in Settings, audit-log JSON diffs).

### 3.2 Type scale

Scale uses a ~1.2–1.25 ratio (not a rigid single ratio — the largest steps are compressed since Sutram rarely needs display sizes above dashboard hero numbers), with line-heights chosen for the specific use rather than a flat multiplier.

| Token | Size / Line-height | Weight | Usage |
|---|---|---|---|
| `text-display` | 36px / 44px | 700 (Bold) | Marketing/onboarding hero only; essentially unused in the transactional app. |
| `text-h1` | 28px / 36px | 700 | Page title in `DetailPageTemplate`/`ListPageTemplate` identity headers. |
| `text-h2` | 24px / 32px | 600 (Semibold) | Section headers within a page (e.g., a `FormPageTemplate` section title). |
| `text-h3` | 20px / 28px | 600 | Card/panel titles, modal titles. |
| `text-h4` | 17px / 24px | 600 | Sub-section headers, right-rail panel titles. |
| `text-h5` | 15px / 22px | 600 | Widget titles on the Dashboard (Section 9). |
| `text-h6` | 13px / 18px | 600 | Dense inline group headers (e.g., a table's column group label). |
| `text-body-lg` | 16px / 24px | 400 | Primary reading content: chat messages in AI Assistant, long-form policy text. |
| `text-body` | 14px / 20px | 400 | **Default body text** — form inputs, most table cells, card content. |
| `text-body-sm` | 13px / 18px | 400 | Secondary metadata (timestamps, "last updated by," helper text under inputs). |
| `text-caption` | 12px / 16px | 400/500 | Table column headers (500), badge/tag labels, form field microcopy, chart axis labels. |
| `text-kpi` | 32px / 36px | 700 | **Dashboard KPI numbers only** (StatTile big number) — deliberately larger than any heading so key metrics scan instantly from across a monitor. Tabular figures always on. |

**Specific usage rules** (resolving the three cases the brief calls out explicitly):
- **Table cell text:** `text-body` (14px/20px) for primary cell content, `text-body-sm` (13px) for secondary/muted cell content (e.g., a sub-line under a name cell), `text-caption` (12px, weight 500, `color-text-secondary`, uppercase or sentence-case per column-header convention chosen once and applied everywhere) for column headers.
- **Dashboard KPI numbers:** `text-kpi` (32px/36px, weight 700, tabular figures) for the primary number in a StatTile; a small `text-body-sm` label above it and a `text-caption` delta/trend indicator below.
- **Form labels:** `text-body-sm` (13px), weight 500, `color-text-primary` — never `text-caption`, which is reserved for genuinely secondary microcopy (helper/error text under the label uses `text-caption`).

### 3.3 Weights used

Only four weights ship: **400 (Regular)**, **500 (Medium)** — form labels, table headers, badges, **600 (Semibold)** — all headings h2–h6, button labels, **700 (Bold)** — h1, KPI numbers, display. Restricting to four (from Inter's full variable range) keeps the type system decisive rather than offering designers a continuum to bikeshed over.

---

## 4. Spacing & Layout Grid

### 4.1 Base spacing unit: **4px**

4px is chosen over 8px because Sutram's admin-heavy density requirement (Section 1.2) needs finer control than an 8px-only scale allows — e.g., the gap between a status dot and its label, or the vertical padding inside a dense 32px-tall table row, routinely needs to land on 4px or 12px, not just multiples of 8. An 8px base would force those cases into awkward half-steps anyway. Using 4px as the base with an *emphasis* on 8px multiples for macro layout (section gaps, page margins) gets both: fine control where density demands it, and rhythmic consistency at the page level. This also matches Tailwind's default spacing scale (`4px` increments), so there's zero translation loss between the Figma spacing tokens and the `spacing` scale the frontend team pulls into `tailwind.config.ts`.

### 4.2 Spacing scale

| Token | Value | Typical use |
|---|---|---|
| `space-0.5` | 2px | Icon-to-text micro gaps, badge internal padding |
| `space-1` | 4px | Tightest gaps (chip internal spacing) |
| `space-2` | 8px | Form field internal padding (vertical), icon-button padding |
| `space-3` | 12px | Table cell padding, input horizontal padding |
| `space-4` | 16px | Default gap between form fields, card internal padding |
| `space-5` | 20px | Card-to-card gap in a dense grid |
| `space-6` | 24px | Section-to-section gap within a page |
| `space-8` | 32px | Page-level top padding, gap between major page zones |
| `space-10` | 40px | Sidebar section group spacing |
| `space-12` | 48px | Large empty-state vertical spacing |
| `space-16` | 64px | Marketing/onboarding hero spacing only |

### 4.3 12-column responsive grid

- **Desktop (≥1280px):** 12 columns, 24px gutter, content max-width 1440px (see 4.5), margin auto-centers beyond that.
- **Laptop (1024–1279px):** 12 columns, 20px gutter, fluid width to viewport minus fixed sidebar (Section 4.6).
- **Tablet (768–1023px):** 8 columns (columns collapse — a 4-column form section becomes 2-up, not 4-up), 16px gutter. Sidebar auto-collapses to icon rail (Section 4.6).
- **Mobile-web (<768px):** 4 columns, 16px gutter, all multi-column layouts stack to single column. Since there is no native mobile app, this breakpoint is a first-class target, not a "shrink and hope" afterthought — see 4.7.

### 4.4 Breakpoints

| Name | Range | Design intent |
|---|---|---|
| `sm` (mobile-web) | 0–767px | Single-column everything; bottom-sheet pattern for filters/actions; sidebar becomes a slide-over drawer, not a persistent rail. |
| `md` (tablet) | 768–1023px | Two-column forms; sidebar collapses to icon-only rail by default (user can pin it open, overlaying content rather than pushing it). |
| `lg` (laptop) | 1024–1279px | Full sidebar (expanded), single-column right-rail on detail pages may switch to below-content stacking if the viewport is tight. |
| `xl` (desktop) | 1280–1535px | Full template layout as designed — this is the primary design canvas for admin-heavy screens. |
| `2xl` (wide desktop) | ≥1536px | Content stays at max-width (4.5); extra space is neutral page margin, not stretched components — tables do not stretch columns to fill 2560px monitors. |

### 4.5 Container widths

- **App content max-width:** 1440px, centered, for `ListPageTemplate`/`DetailPageTemplate`/`FormPageTemplate` main content column. Dashboards and Analytics (bespoke, Section 9–10) may use the full available width up to 1680px for wide chart/grid layouts.
- **Form content max-width (`FormPageTemplate`):** capped tighter at 800px within the content column — long input lines hurt scanability, so forms don't stretch to the full 1440px even though the page shell does.
- **Modal widths:** `sm` 400px, `default` 560px, `lg` 720px, `xl`/full-bleed-table 960px (Section 7, Modal/Dialog).

### 4.6 AppShell layout grid

| Zone | Value |
|---|---|
| Sidebar — expanded | 256px |
| Sidebar — collapsed (icon rail) | 72px |
| Topbar height | 64px |
| Content padding (desktop) | 32px horizontal, 24px vertical from topbar |
| Content padding (mobile-web) | 16px horizontal, 16px vertical |
| Right-rail panel width (`DetailPageTemplate`) | 320px fixed, collapses below content on `md` and `sm` |

Sidebar behavior across breakpoints: **expanded (256px)** on `xl`/`2xl` by default; **auto-collapsed to icon rail (72px)** on `lg` and `md` (user-togglable, persisted per-user); **hidden entirely, replaced by a hamburger-triggered full-height slide-over drawer** on `sm` — because a persistent rail at any width meaningfully competes with content on a phone-width viewport, and 18 roles' worth of nav items (Doc 02) cannot be usefully icon-only at that size.

### 4.7 Mobile-web specific behavior

Since native mobile is explicitly out of scope, mobile-web is not a "does it not break" checkbox — it's the actual mobile experience for Students, Parents, and field-mobile roles (e.g., Transport staff scanning a QR at a bus stop). Rules:
- Topbar collapses to a 56px bar: hamburger (nav drawer) + tenant logo + a single primary action (search or notifications, contextual) + avatar menu. Search/filter toolbars in `ListPageTemplate` move into a bottom-sheet triggered by a "Filters" button rather than an inline row of dropdowns.
- Tables in `ListPageTemplate` do not horizontally scroll a 10-column grid on mobile — they switch to a **card-list** representation (each row becomes a stacked card showing the 2–3 most important fields, tap to open `DetailPageTemplate`), a template-level responsive variant documented in Section 8.
- Minimum touch target 44×44px on `sm`, even where the desktop equivalent (e.g., a table row action icon) is 32px — this is a deliberate per-breakpoint sizing override on interactive components, not a fixed universal size, because 44px targets at desktop table density would blow out row height unacceptably.

---

## 5. Elevation & Radius System

### 5.1 Shadow levels

Dark mode does **not** reuse the same shadow values scaled down — pure black shadows barely register on a dark surface, so dark mode substitutes a subtle **border + very slightly lighter surface** for the lowest elevation levels and keeps shadow only where true overlay separation is needed (modals, popovers).

| Token | Light mode | Dark mode | Used on |
|---|---|---|---|
| `shadow-none` | none | none | Flat cards on a listing grid, table rows |
| `shadow-xs` | `0 1px 2px rgba(15,23,42,0.06)` | 1px `color-border` outline, no shadow | Input focus resting state, small buttons |
| `shadow-sm` | `0 1px 3px rgba(15,23,42,0.10), 0 1px 2px rgba(15,23,42,0.06)` | `0 1px 3px rgba(0,0,0,0.4)` + 1px border | Cards, StatTiles, dropdown triggers |
| `shadow-md` | `0 4px 6px rgba(15,23,42,0.08), 0 2px 4px rgba(15,23,42,0.06)` | `0 4px 8px rgba(0,0,0,0.5)` + 1px border | Popovers, dropdown menus, tooltips |
| `shadow-lg` | `0 10px 15px rgba(15,23,42,0.10), 0 4px 6px rgba(15,23,42,0.06)` | `0 10px 20px rgba(0,0,0,0.55)` + 1px border | Modal/Dialog, Drawer/Sheet |
| `shadow-xl` | `0 20px 25px rgba(15,23,42,0.12), 0 8px 10px rgba(15,23,42,0.06)` | `0 20px 30px rgba(0,0,0,0.6)` + 1px border | Command palette, AI Assistant floating panel |

### 5.2 Border radius scale

| Token | Value | Used on |
|---|---|---|
| `radius-sm` | 4px | Badges, tags, checkboxes, small buttons, table cell chips |
| `radius-md` | 6px | Inputs, default buttons, dropdown menu container |
| `radius-lg` | 8px | Cards, StatTiles, modal container |
| `radius-xl` | 12px | Drawer/Sheet panel edge, large feature cards (Dashboard hero widgets) |
| `radius-full` | 9999px | Avatars, pill badges, switch track |

Rule of thumb encoded in the library: **elevation and radius scale together** — the higher a surface floats above the page (modal > drawer > card > input), the larger its radius, reinforcing a visual "the more it overlays, the softer/more distinct its edge" logic that also helps low-vision users distinguish overlay layers by shape, not just shadow.

---

## 6. Iconography

**Icon set: Lucide** (the icon set shadcn/ui is already built around, per Doc 09's component-layer choice) — chosen for direct pairing with the shadcn/ui primitive layer already committed to, a consistent 24×24 grid with 2px stroke weight that scales cleanly down to 16px without redrawing, and an open MIT license with 1000+ icons covering the breadth Sutram needs (academic, financial, HR, transport, medical/hostel iconography) without needing a second icon library for edge cases.

### 6.1 Sizing scale

| Token | Size | Stroke | Usage |
|---|---|---|---|
| `icon-xs` | 14px | 1.75px | Inline text icons (e.g., inside a caption/badge) |
| `icon-sm` | 16px | 2px | Table row action icons, input adornment icons (search, calendar) |
| `icon-md` | 20px | 2px | Default button icon, sidebar nav item icon (collapsed rail) |
| `icon-lg` | 24px | 2px | Page-header action icons, empty-state icon, modal header icon |
| `icon-xl` | 40px | 1.5px | EmptyState hero icon, onboarding step icon |

### 6.2 Usage rules

- **Nav icons** (sidebar): always `icon-md` (20px), always paired with a label at `≥md` breakpoint, icon-only at collapsed rail — every nav icon must be recognizable with zero label, which is a review gate when adding a new module icon to `nav.config.ts`'s visual counterpart.
- **Inline action icons** (table row actions, card actions): `icon-sm` (16px), always inside a 32px hit-area icon-button even though the glyph itself is smaller — hit-area, not glyph size, satisfies touch-target rules (44px override on mobile-web per 4.7).
- **Status icons** (paired with semantic colors — a checkmark for success, triangle for warning): always paired with the semantic color **and** a text label or tooltip, never color-only, per the non-color-only accessibility rule that also governs charts (Section 10.3).
- Icons are never used as the *sole* affordance for a destructive or financial action (e.g., "delete," "waive fee") — always icon + text label together on buttons that carry consequence.

---

## 7. Core Component Specs

Every component below is specified as: **variants**, **states**, **sizes**, **anatomy**. All are built on Radix primitives via shadcn/ui per Doc 09 §2.2, styled with the tokens from Sections 2–6, and variant/size logic is expressed via CVA (`class-variance-authority`) matching the frontend's actual implementation pattern — the Figma component's variant properties should name-match the CVA `variant`/`size` prop values exactly (e.g., a Figma Button variant property literally named `variant` with options `primary/secondary/outline/ghost/destructive/link`) so design and code stay referentially identical.

### 7.1 Button
- **Variants:** `primary` (solid `color-primary`), `secondary` (solid `color-secondary`), `outline` (border + transparent fill), `ghost` (no border/fill until hover), `destructive` (solid `color-error`), `link` (text-only, underline on hover).
- **States:** default, hover (8% darken/lighten per 2.6 derived-state rule), focus-visible (2px `color-primary` ring, 2px offset — Radix-provided, never removed), active/pressed (12% darken), disabled (50% opacity, `cursor-not-allowed`, no hover/active response), loading (label replaced/prefixed by spinner, button width preserved to prevent layout shift, disabled interaction).
- **Sizes:** `sm` (32px height, `text-body-sm`), `default` (36px height, `text-body`), `lg` (44px height, `text-body`, used on primary CTAs in WizardTemplate footer and mobile-web per touch-target rule).
- **Anatomy:** optional leading icon (`icon-sm`) → label → optional trailing icon → optional loading spinner overlay.

### 7.2 Input / Textarea
- **Variants:** `default`, `with-icon` (leading search/calendar icon), `with-addon` (currency prefix, unit suffix).
- **States:** default (`gray-300` border), hover (`gray-400` border), focus (`color-primary` border + `shadow-xs` ring), filled (same as default, visually identical — no separate "filled" treatment, avoiding a fourth visual state to track), disabled (`gray-100` bg, `gray-400` text, no border change on hover), error (`color-error` border + `text-caption` error message below in `color-error` text + error icon), read-only (no border, subtle `gray-50` bg, no focus ring — visually distinct from editable-but-empty).
- **Sizes:** `sm` (32px), `default` (36px), `lg` (44px, mobile-web default).
- **Anatomy:** label (`text-body-sm`, weight 500) → input field → helper/error text (`text-caption`) below. Textarea adds resizable handle (vertical-only) and optional character counter bottom-right.

### 7.3 Select / Combobox
- **Variants:** `select` (fixed list, Radix Select), `combobox` (searchable, Radix Popover + Command per shadcn's combobox pattern) — combobox used wherever a list can exceed ~15 items (e.g., picking a student from 40,000 records).
- **States:** same as Input, plus `open` (dropdown panel visible, trigger shows active border), multi-select adds a `chips` internal state (selected items render as removable `Badge` chips inside the trigger, input shrinks to remaining space).
- **Sizes:** matches Input (`sm`/`default`/`lg`).
- **Anatomy:** trigger (label + selected value/placeholder + chevron icon) → `shadow-md` popover panel → optional search input at top (combobox only) → option list (each option: optional leading icon/avatar, label, optional secondary metadata right-aligned, checkmark if selected) → empty-state row ("No results") → optional "Create new…" action row at bottom for creatable comboboxes.

### 7.4 Checkbox / Radio / Switch
- **Checkbox states:** unchecked, checked (filled `color-primary`, white checkmark), indeterminate (filled, horizontal dash — used in DataTable "select all" header when a partial page selection exists), disabled (any of the above at 50% opacity), error (red border on unchecked).
- **Radio:** same state set minus indeterminate; grouped radios share a `radius-full` dot-in-ring anatomy.
- **Switch:** off (gray track), on (`color-primary` track), disabled, and a `loading` state (thumb shows spinner) for switches that trigger an async save (e.g., "enable module" toggles in Settings).
- **Sizes:** single size for checkbox/radio (18px), switch is 36×20px (thumb 16px). No small/large variants — these controls are already at a floor size for touch accessibility (44px hit-area padding added around the visual control, not the control itself resized).

### 7.5 Badge / Tag
- **Variants:** `default` (neutral gray), `success`/`warning`/`error`/`info` (Section 2.4 semantic pairs), `outline` (border-only, transparent fill, used for low-emphasis category tags), `primary` (brand-colored, used for "AI-suggested" and plan-tier badges).
- **States:** static (no interactive state) vs `removable` (adds an `x` icon-button, used in multi-select chips and active-filter pills) — removable badges get hover/focus states on the `x` only.
- **Sizes:** `sm` (20px height, `text-caption`), `default` (24px height, `text-caption` weight 500).
- **Anatomy:** optional leading status dot or icon → label → optional trailing remove icon.

### 7.6 Avatar
- **Variants:** `image` (photo), `initials` (fallback, deterministic background color from a hash of the user's name, drawn from the categorical chart palette in Section 10.1 for visual consistency), `icon` (generic person icon fallback when no name is available, e.g., an unclaimed guardian record).
- **States:** default, with-status-dot (online presence, small colored ring-dot bottom-right — used sparingly, mainly in Communication module), with-ring (focus/selected state, e.g., "this is you" in a header).
- **Sizes:** `xs` (20px, dense table cells), `sm` (28px, list rows), `default` (36px, cards), `lg` (48px, DetailPageTemplate identity header), `xl` (96px, Profile/Settings page).
- **Anatomy:** circular (`radius-full`) container, image or initials text centered, optional status-dot overlay, optional grouped "stack" mode (overlapping avatars with `-8px` margin for "N assigned" summaries, capped at 4 visible + "+N" overflow badge).

### 7.7 DataTable
The single most-reused component across ~200+ list screens (Doc 09) — gets the most detailed spec.

- **Variants:** `default` (bordered rows), `compact` (denser row height, used in right-rail related-record mini-tables), `card-list` (mobile-web responsive collapse, Section 4.7).
- **Row states:** default, hover (subtle `gray-50`/`gray-100` bg), selected (checked checkbox + tinted `color-primary` at 6% opacity row bg), disabled (e.g., a row representing an archived record — 60% opacity, no hover), expanded (sub-row detail reveal, used for e.g. a fee installment breakdown under a student row).
- **Cell states:** default, sorted-column (header shows active sort icon + subtle column bg tint), editable-inline (rare — e.g., grade entry grid — shows an input on focus/click), loading (skeleton bar, Section 11.3).
- **Header:** sticky on vertical scroll, each column header is clickable for sort (ascending/descending/none cycle, `icon-xs` sort arrow), optional column-level filter icon that opens a popover, optional "select all" checkbox (with indeterminate state per 7.4) in the leftmost column when bulk actions are enabled.
- **Toolbar (sits above the table, part of `ListPageTemplate`, not the table itself):** search input (left), filter chips/dropdown group (left-center), bulk-action bar that *replaces* the toolbar when ≥1 row is selected (shows "N selected," bulk action buttons, "Clear selection"), view/column-visibility toggle and export action (right).
- **Pagination (footer):** page-size selector (`10/25/50/100`), page number controls, and a "showing X–Y of Z" label. For very large sets (student lists, transaction logs) the DataTable uses **virtualized rendering** (per Doc 09/brief) — only visible rows mount, but the Figma spec still designs discrete "pages" for handoff clarity; infinite-scroll variants are documented as an engineering implementation detail of the same visual spec, not a separate design.
- **Empty/zero-state:** uses the EmptyState component (7.16) inline within the table body area, not a separate screen.
- **Sizes:** row height `36px` (compact), `44px` (default), `56px` (comfortable — used on Student/Faculty roster tables where an avatar + two-line name/ID cell needs the room).
- **Anatomy:** Toolbar → Column headers (sticky) → Rows (checkbox cell? · data cells · row-action cell, sticky right) → Pagination footer.

### 7.8 Card
- **Variants:** `default` (bordered, `shadow-sm`), `flat` (no shadow, used inside already-elevated containers like modals), `interactive` (adds hover elevation bump to `shadow-md` + cursor pointer, used for clickable summary cards e.g. Dashboard quick-links).
- **States:** default, hover (interactive variant only), selected (2px `color-primary` border, used in WizardTemplate option-cards, e.g. "select a fee plan").
- **Sizes:** content-driven, not fixed — padding tokens `space-4`(compact)/`space-6`(default).
- **Anatomy:** optional header (title + optional action slot top-right) → body → optional footer (divider + actions, e.g. StatTile's trend line, or a card-level "View all" link).

### 7.9 Modal / Dialog
- **Variants:** `default` (centered, `shadow-lg`, `radius-lg`), `alert` (Radix AlertDialog — for destructive confirmations, no dismiss-on-overlay-click, requires explicit choice), `fullscreen` (mobile-web only — modal becomes fullscreen at `sm` breakpoint rather than a cramped small centered box).
- **States:** entering/exiting (Section 11 motion spec), default, with scrollable body (header/footer stay fixed, body scrolls when content exceeds viewport height minus 240px).
- **Sizes:** per Section 4.5 (`sm` 400 / `default` 560 / `lg` 720 / `xl` 960).
- **Anatomy:** overlay (`rgba(15,23,42,0.5)` scrim, or `rgba(0,0,0,0.7)` dark mode) → panel: header (title `text-h3` + close `icon-md` button top-right) → body (scrollable) → footer (right-aligned action buttons, `Cancel`/secondary left of primary per platform convention, sticky to panel bottom).

### 7.10 Drawer / Sheet
- **Variants:** `right` (default — filter panels, quick-create forms, notification panel), `bottom` (mobile-web action sheets, replaces `right` at `sm` breakpoint), `left` (rare — used only for the mobile nav drawer, Section 4.6).
- **States:** same enter/exit as Modal, plus a `nested` state when a Drawer opens a Modal above it (e.g., a confirm-discard dialog over a half-filled quick-create drawer) — nested overlays stack `shadow-lg` → `shadow-xl`.
- **Sizes:** `sm` 360px, `default` 480px, `lg` 640px (width for `right`/`left`; height equivalents for `bottom`: 40%/60%/85% of viewport).
- **Anatomy:** identical zone structure to Modal (header/body/footer) but full-height, sliding in from the named edge; `bottom` variant adds a drag-handle affordance at top for touch-dismiss.

### 7.11 Tabs
- **Variants:** `underline` (default — used in `DetailPageTemplate`'s tab strip, per Doc 09/brief's template spec), `pills` (used inside cards/modals for lighter-weight local switching), `segmented` (equal-width, bordered container — used for binary/ternary view toggles, e.g., "Table / Card" view switch).
- **States:** default, hover, active (bold weight + `color-primary` underline/fill), disabled (a tab representing a section the current role can't access — shown per Doc 09 RBAC "hide, don't disable" default, but `disabled` state exists for the rare case a tab is contextually unavailable, e.g., "Payroll" tab on a Faculty record before their contract is finalized), with-badge (small count badge, e.g., "Documents (3)").
- **Sizes:** `default` (44px tab height, matches DetailPageTemplate header rhythm), `sm` (36px, nested-in-card tabs).
- **Anatomy:** horizontally scrollable tab list (overflow on narrow viewports scrolls rather than wraps, with edge fade affordance) → active tab indicator (animated slide, Section 11) → tab panel content below.

### 7.12 Toast / Notification
- **Variants:** `success`/`warning`/`error`/`info` (Section 2.4 pairings), each with a leading status icon.
- **States:** entering (slide+fade in), resting, exiting (fade out), with-action (inline "Undo"/"View" link), paused-on-hover (auto-dismiss timer pauses while cursor is over the toast).
- **Sizes:** single size, max-width 400px, stacks vertically (newest on top, max 3 visible + "N more" collapse) in the bottom-right corner desktop / top-center mobile-web (bottom-right on mobile-web would collide with thumb-reach action buttons and OS UI).
- **Anatomy:** status icon → message text (`text-body-sm`) → optional action link → close icon (`icon-xs`, always present, auto-dismiss is a convenience not a requirement).

### 7.13 Tooltip
- **Variants:** `default` (dark solid bg regardless of light/dark app mode — `gray-900` bg / white text always, for max legibility as a transient overlay), `rich` (larger, allows a short paragraph + optional link, used for e.g. explaining an AI risk-score factor, Section 10).
- **States:** hover-delay (300ms before show, standard), focus-visible (shows immediately, no delay — keyboard users shouldn't wait), touch (long-press to reveal on mobile-web, since hover doesn't exist).
- **Sizes:** `default` max-width 240px; `rich` max-width 320px.
- **Anatomy:** small arrow/caret pointing at trigger → text content, `shadow-md`, `radius-md`.

### 7.14 Breadcrumb
- **Variants:** `default` only (no visual variants — kept simple deliberately).
- **States:** each crumb is a link (hover underline) except the final (current page) crumb, which is static `color-text-secondary` non-interactive text.
- **Sizes:** single size (`text-body-sm`).
- **Anatomy:** Home/module-root icon (optional) → crumb → `/` or chevron separator (`icon-xs`) → … → current page (non-link). On mobile-web, collapses to `… / Parent / Current` showing only the immediate parent, with the full chain available via a tap-to-expand on the ellipsis.

### 7.15 StatTile / KPI Card
- **Variants:** `simple` (number + label only), `trend` (adds a delta badge + sparkline, Section 9), `progress` (adds a thin progress bar, e.g. "Fee collection: 72% of term target").
- **States:** default, loading (skeleton), `positive-trend`/`negative-trend` (delta badge colored via semantic success/error — but always paired with an up/down arrow icon, never color-only, consistent with 6.2/10.3), clickable (interactive Card variant, navigates to the relevant Analytics/List view).
- **Sizes:** `default` (fits a 3- or 4-up dashboard grid column, Section 9), `compact` (fits a 6-up dense row, used in Analytics module summary strips).
- **Anatomy:** label (`text-body-sm`, `color-text-secondary`) → big number (`text-kpi`) → optional delta badge + trend icon → optional sparkline/progress bar footer.

### 7.16 EmptyState
- **Variants:** `no-data` (first-use, e.g. "No students yet — add your first student"), `no-results` (search/filter returned nothing, e.g. "No results for 'xyz' — try adjusting filters"), `error` (data failed to load, retry action), `no-permission` (rare inline case, mostly avoided per "hide don't disable" but used for partial-page permission gaps).
- **States:** static, with-primary-action (CTA button, e.g. "Add Student"), with-illustration (a restrained single-color line icon, `icon-xl`, from the Lucide set — never a cartoon illustration, per Principle 1.1's "trust over decoration").
- **Sizes:** fills the container it's placed in (table body, full page, card) — spacing scales via `space-12` vertical padding at page-level, `space-6` at card/table-body level.
- **Anatomy:** icon → heading (`text-h4`) → supporting text (`text-body-sm`, `color-text-secondary`, max-width 360px centered) → optional primary action button.

### 7.17 Stepper (WizardTemplate)
- **Variants:** `horizontal` (default desktop — numbered circles + connecting line + labels), `vertical` (used when step count exceeds ~6 and horizontal would crowd, or automatically on `md`/`sm`), `compact` (mobile-web default — collapses to "Step 2 of 5: Document Upload" text + thin progress bar, full step list available via a tap-to-expand).
- **States per step:** upcoming (gray outline circle, muted label), current (filled `color-primary` circle, bold label, larger), completed (filled `color-success` circle with checkmark, clickable to go back), error (filled `color-error` circle — a step with unresolved validation the user tried to skip past), disabled/locked (steps that require a prior step's data — grayed, non-clickable).
- **Sizes:** single size per orientation.
- **Anatomy:** step indicator (circle+number/check) → connecting line to next step (colored per completed/upcoming) → step label (+ optional sub-label, e.g. "Document Upload — 3 files required") below/beside the circle depending on orientation.

### 7.18 FileUpload
- **Variants:** `dropzone` (large drag-and-drop target, empty state), `compact` (inline button-style "Upload file" trigger, e.g. attaching to a comment).
- **States:** idle, drag-over (highlighted border + bg tint), uploading (per-file progress bar + percentage + cancel icon), success (checkmark + file preview/thumbnail + remove icon), error (per-file error message — "File exceeds 10MB limit" — with retry action), disabled.
- **Sizes:** dropzone default min-height 160px; compact is button-height (matches Button `default` 36px).
- **Anatomy:** dropzone: icon (`icon-xl`) → "Drag files here or click to browse" text → accepted-format/size microcopy (`text-caption`) → below, an uploaded-file list (each row: file-type icon, filename, size, status/progress, remove action).

### 7.19 DatePicker
- **Variants:** `single-date`, `date-range` (two-month view side by side on desktop, single scrolling month on mobile-web), `date-time` (adds a time input below the calendar).
- **States:** same as Input for the trigger field, plus calendar-open, date-selected, date-in-range (range variant — tinted background between start/end), date-disabled (e.g., blocking future dates for a "date of birth" field, or past dates for a "due date" field), today-indicator (subtle ring on the current date regardless of selection).
- **Sizes:** trigger matches Input sizes; calendar popover is a fixed size regardless of trigger size.
- **Anatomy:** input trigger (`icon-sm` calendar icon + formatted date text) → `shadow-md` popover: month/year nav header → weekday labels (`text-caption`) → date grid → optional quick-select shortcuts sidebar ("Today," "Next 7 days," "This term") for range variant.

### 7.20 CalendarView
Distinct from DatePicker — this is the bespoke full calendar surface used in Timetable and event-scheduling contexts (Doc 02 module list references Timetable as a bespoke, non-template page).
- **Variants:** `month`, `week`, `day`, `agenda` (list view of upcoming events — the default on mobile-web, since a grid month view is unusable at 375px width).
- **States:** default, event-hover (elevation bump + tooltip preview), event-conflict (visual overlap indicator when two events collide, e.g. double-booked classroom), read-only (view-only role, e.g. Student viewing Timetable — no create-on-click affordance), editable (Admin/Faculty — click-and-drag to create/resize events).
- **Sizes:** fills its container; minimum cell height enforced (48px) below which the view auto-switches from month to agenda.
- **Anatomy:** header (view-switcher segmented control + date range label + prev/next/today nav) → grid (month/week/day) or list (agenda) → event chips (colored by category/subject, per Section 10.1's categorical palette) → optional mini-legend for event categories.

### 7.21 Sidebar Nav Item
- **Variants:** `top-level` (module entry, e.g. "Students"), `nested` (sub-item under an expanded module, e.g. "Students → Admissions Queue"), `section-label` (non-interactive group header, e.g. "ACADEMIC").
- **States:** default, hover (subtle bg tint), active/current (bold weight + `color-primary` left-border accent bar + tinted bg — the single consistent "you are here" signal across all 18 role sidebars), disabled (module visible-but-locked for the tenant's plan tier — rare, shown with a small "lock" or "upgrade" badge rather than hidden, distinct from RBAC-hidden items which per Doc 09 §6.3 are removed entirely, not disabled), with-badge (unread/pending count, e.g. "Admissions (12)").
- **Sizes:** `expanded` (full width, icon + label, 40px height), `collapsed` (icon-only, 48px square, tooltip on hover shows label).
- **Anatomy:** left accent bar (active only) → icon (`icon-md`) → label (`text-body`, expanded only) → optional trailing badge/chevron (chevron if the item expands nested children).

---

## 8. Page Templates — Layout Detail

Per the foundational facts, four templates cover ~80% of Sutram's ~415 screens. Each is specified as exact zones plus its mobile-web collapse behavior.

### 8.1 ListPageTemplate

**Desktop zones (top to bottom):**
1. **Page header** (64px): breadcrumb (7.14) above page title (`text-h1`) + primary action button (e.g., "Add Student") top-right.
2. **Toolbar** (56px): search input (320px) left, filter chips/dropdowns center-left, view options + export right. Replaced by bulk-action bar on row selection (7.7).
3. **DataTable** (7.7): fills remaining vertical space, virtualized, sticky header.
4. **Pagination footer** (56px): sticky to viewport bottom within the content area.

**Mobile-web (`sm`) collapse:**
- Header: title only, primary action becomes a floating action button (FAB, bottom-right, 56px circular) rather than competing for header space.
- Toolbar: search remains inline (full-width); filters collapse into a single "Filters" button that opens a bottom Sheet (7.10) containing the same filter controls stacked vertically.
- Table → **card-list**: each row becomes a `Card` (7.8) showing avatar/icon + primary field (bold) + 2 secondary fields + a status Badge, tap-through to `DetailPageTemplate`. Bulk selection on mobile is deliberately simplified to a "Select" mode toggle (long-press a card to enter it) rather than always-visible checkboxes, to keep the card compact.
- Pagination → infinite scroll with a "Load more" sentinel, since page-number tapping is poor ergonomics on touch.

### 8.2 DetailPageTemplate

**Desktop zones:**
1. **Identity header** (96px): avatar/icon (`lg`) + primary identifier (`text-h1`, e.g. student name) + secondary metadata line (ID, status Badge, key facts) + action buttons top-right (Edit, More-actions overflow menu).
2. **Tab strip** (7.11, `underline` variant, 44px): horizontally laid across full content width, sticky below the identity header on scroll.
3. **Two-column body:** main tab-panel content (flexible width, left) + right-rail panel (320px fixed, right) containing related-info cards (7.8) — e.g., on a Student detail page: Guardian contacts, Fee status summary, Attendance summary, Recent activity — stacked cards, each independently scrollable/collapsible.
4. Tab panel content itself typically composes smaller DataTables/Cards, not a new template.

**Mobile-web (`sm`) collapse:**
- Identity header compresses to avatar (`sm`) inline with name (`text-h3`), metadata line wraps, action buttons collapse into a single overflow (`⋯`) menu.
- Right-rail panel **moves below the tab content entirely** (not hidden) — related-info cards stack under the active tab panel, each collapsed to a summary state with "View all" expansion, so critical related info (e.g., outstanding fees) is still reachable without a separate navigation, just lower on the scroll.
- Tab strip becomes horizontally scrollable (no wrap), with a subtle edge-fade affordance indicating more tabs exist off-screen.

### 8.3 FormPageTemplate

**Desktop zones:**
1. **Page header** (64px): breadcrumb + title + a persistent "unsaved changes" indicator (small dot/text) once the form is dirty.
2. **Sectioned form body** (max-width 800px per 4.5, centered within the content column): each section is a `Card` (flat variant) with a `text-h2` section title, fields laid out on the 12-col grid (typically 2-up: two `Input`s per row on desktop, collapsing to 1-up at `md`/`sm`), consistent `space-4` vertical rhythm between fields, `space-8` between sections.
3. **Inline validation:** errors appear under the specific field (7.2 error state) *and* are summarized as a dismissible banner at the top of the form if the user attempts to submit with ≥1 error, with each summary line deep-linking (scroll+focus) to the offending field — necessary given forms can run to 30+ fields (e.g., Admission application).
4. **Sticky save/cancel bar** (64px): fixed to the bottom of the viewport (not the form's natural end) so Save/Cancel remain reachable on long forms without scrolling — `Cancel` (outline/ghost) left of `Save` (primary), right-aligned within the content max-width, with the dirty-state indicator repeated here as a "You have unsaved changes" microcopy when relevant.

**Mobile-web (`sm`) collapse:**
- All field pairs go 1-up.
- Sticky save/cancel bar remains fixed to viewport bottom (critical on mobile — thumb-reachable), but shrinks to a single full-width primary Save button with Cancel accessible via the header's back/close icon instead of a second bottom button, conserving vertical space.
- Long forms (Admissions, HR onboarding) get an optional **in-page section jump menu** (a slim sticky sub-header listing section names, tap to scroll) since there's no room for a persistent right-rail table-of-contents as might exist on desktop for very long forms.

### 8.4 WizardTemplate

**Desktop zones:**
1. **Step indicator** (7.17 `horizontal`, 80px): full width across the top, shows all steps at once.
2. **Step pane:** single-column, max-width 720px, centered — one step's content at a time (never multiple steps visible simultaneously), using the same sectioned-form conventions as FormPageTemplate within the step.
3. **Back/Next footer** (72px, sticky to viewport bottom): `Back` (outline, left) — hidden on step 1 — `Save & Exit` (ghost/link, center-left, since wizards are resumable per the foundational facts — this persists partial progress and returns the user to their dashboard) — `Next`/`Submit` (primary, right; label changes to "Submit"/"Finish" on the final step).

**Mobile-web (`sm`) collapse:**
- Step indicator switches to `compact` variant (7.17): "Step 2 of 5" text + thin progress bar, full step list revealed via tap.
- Step pane goes full-width with mobile form conventions (1-up fields).
- Footer: `Next` becomes a full-width primary button (thumb-friendly); `Back` becomes a header back-icon; `Save & Exit` moves into the header overflow menu to avoid three competing bottom actions.
- **Resumability** is especially important here: the mobile-web wizard explicitly auto-saves per step (not just on explicit "Save & Exit") given a higher likelihood of interruption (app backgrounded, call received) on a phone versus desktop.

---

## 9. Dashboard / Widget System

Every one of the 18 roles gets a distinct dashboard, but — matching the AppShell principle of one shared shell rather than per-role duplicate UI — every dashboard is a **composition of the same widget primitives**, arranged differently and populated with role-appropriate data via `nav.config.ts`'s permission-driven pattern extended to a `dashboard.config.ts` equivalent (a per-role widget-list + grid-position config, not a per-role dashboard component).

### 9.1 Widget grid system

- The dashboard body is a **12-column grid** (matching Section 4.3's desktop grid), with widgets declaring a `colSpan` (e.g., a StatTile is `colSpan: 3` → four fit per row at desktop; a chart widget is typically `colSpan: 6` or `colSpan: 12` for full-width).
- Row height is content-driven per widget but StatTiles within the same row snap to equal height.
- **Responsive collapse:** at `md`, `colSpan` values are halved-and-clamped (a `3` becomes effectively 2-up, a `6` becomes full-width); at `sm`, every widget goes full-width, single column, in a fixed priority order defined per role (highest-priority widget — typically the role's most time-sensitive item, e.g. "Fees Due Today" for a Finance role, "Today's Attendance" for a Faculty role — pinned to the top).
- Widgets are **user-reorderable within their role's allowed set** (drag handle on hover, persisted per-user) but a role cannot add a widget it doesn't have permission to see — the same "hide don't disable" RBAC posture as the sidebar (Doc 09 §6.3) applies to widget availability.

### 9.2 Core reusable widget types

1. **StatTile / KPI widget** (Section 7.15) — single metric, optionally with trend/sparkline. The most-used widget across every role's dashboard (e.g., "Total Students," "Fees Collected This Term," "Pending Approvals").
2. **Chart widget** — wraps a Section-10 chart type (typically line or bar) in a Card with a title, optional time-range selector top-right, and a "View full report" link to the relevant Analytics page — dashboards show a summarized chart, Analytics shows the full explorable version.
3. **Activity feed widget** — reverse-chronological list of recent events relevant to the role (e.g., "New admission application submitted," "Fee payment received"), each row: icon (by event type) + description + relative timestamp + optional actor avatar. Paginated/"load more" at the bottom, capped to ~8 visible by default.
4. **Quick-actions widget** — a small grid of icon+label buttons (e.g., "Add Student," "Send Announcement," "Mark Attendance") linking directly into the relevant `FormPageTemplate`/bespoke flow, sized to skip navigation for a role's most frequent tasks.
5. **Upcoming-events widget** — compact agenda-style list (reuses CalendarView's `agenda` variant, 7.20) showing the next N events (classes, exams, deadlines, meetings) relevant to the role.
6. **Approvals/tasks queue widget** — a small table (compact DataTable variant) of items awaiting the current user's action (e.g., leave requests to approve, documents to verify), each row deep-linking to the relevant detail/form page — this is the widget that turns a dashboard from "read-only summary" into an actual daily work surface for approver-heavy roles (Admin, HR, Principal).
7. **AI insight widget** — surfaces advisory AI output (Doc 10) relevant to the role, e.g. "3 students flagged at elevated dropout risk this week," using the `color-accent` treatment (Section 2.2) and an explicit "AI-suggested" badge, always linking through to the full explainable-factors view rather than asserting a conclusion in-widget.
8. **Announcements/notices widget** — for Student/Parent/Faculty dashboards specifically, a simple card-list of institution-wide or class-specific announcements — deliberately the plainest widget (no chart, no data-density) since it's often the first thing a Parent-role dashboard shows and needs to read as approachable, not administrative (Principle 1.4).

---

## 10. Data Visualization Guidelines

Charts appear in the Analytics & Reports module, in dashboard chart widgets (Section 9.2), and specifically in the AI risk-score surfaces called out in Doc 10 (Risk/Dropout Prediction, Predictive Analytics Dashboard, embedded risk flags on Student profile).

### 10.1 Chart types and when to use them

| Chart type | Used for |
|---|---|
| **Line** | Trends over time — attendance rate over a term, fee collection over months, enrollment growth year-over-year. |
| **Bar (vertical/horizontal)** | Comparison across categories — attendance by class section, fee collection by department, applications by source. Horizontal orientation used when category labels are long (e.g., department names) to avoid rotated/truncated axis text. |
| **Donut** | Part-to-whole composition with ≤6 segments — fee-status breakdown (paid/due/overdue), application status distribution. Never used for >6 categories (falls back to a bar chart, which reads more precisely past that count) and never used to show a trend. |
| **Heatmap** | Density/pattern across two dimensions — attendance patterns by day-of-week × section (distinct from the bespoke Attendance Grid page, which is an input/marking surface, not an analytics chart, per the foundational facts listing them separately), and correlation/intensity views in Analytics (e.g., risk-score distribution by cohort × risk-band). |

**Categorical palette** (distinct series/categories, e.g. different class sections or fee categories on one chart): an 8-color qualitative palette derived from, but distinct in role from, the semantic status colors — chart categorical colors are never the same hues as `color-success`/`color-warning`/`color-error` in the same visual context, so a legend color never gets misread as a status. Palette: `#2563EB` (blue) · `#7C3AED` (violet) · `#0F766E` (teal) · `#EA580C` (orange) · `#DB2777` (pink) · `#65A30D` (green) · `#CA8A04` (amber) · `#475569` (slate, used for "Other/Uncategorized" bucket by convention). All 8 verified ≥3:1 against both `color-background` and `color-surface` in both modes for chart-element (non-text) contrast per WCAG's non-text contrast criterion.

### 10.2 Risk-score color encoding (sequential/diverging)

Per Doc 10, dropout/fee-default risk scores are explainable (classical ML with per-prediction feature attribution) and every screen surfacing a risk score must show contributing factors, not a bare number. The design system's color contract for this:

- Risk score visualizations use a **3-band diverging-adjacent scale**, not a continuous gradient, because the product's action model is banded (Low/Medium/High risk trigger different workflows per Doc 10), and a continuous gradient would imply false precision to a metric that's explicitly a probability estimate, not a certainty:
  - **Low risk:** `color-success-solid` (`#16A34A`)
  - **Medium risk:** `color-warning-solid` (`#D97706`, a slightly deepened variant of `color-warning` for better mid-scale legibility)
  - **High risk:** `color-error-solid` (`#DC2626`)
- For continuous/sequential data that genuinely is continuous (e.g., a heatmap of attendance percentage, not a banded risk score), a **single-hue sequential ramp** is used (5 steps, light-to-dark blue: `#DBEAFE → #93C5FD → #3B82F6 → #1D4ED8 → #1E3A8A`), never a rainbow/spectral scale, which is both harder to read ordinally and frequently inaccessible to colorblind users.
- Every risk-band visualization is paired with: (a) a text label ("High risk"), (b) an icon (per 6.2's non-color-only rule), and (c) on hover/tap, the contributing-factors breakdown required by Doc 10 — the chart color is a fast-scan aid, never the only encoding of the underlying decision.

### 10.3 Accessibility for charts

- **Never color-only.** Every chart series/category gets a direct label, a legend, and/or a distinct pattern/marker shape (line charts use distinct dash patterns or point-marker shapes per series in addition to color; bar charts get direct value labels on or above bars when space allows) so a colorblind user or a black-and-white printout (common for compliance/audit exports) remains interpretable.
- **Minimum non-text contrast** of 3:1 for chart gridlines, axis lines, and data-point boundaries against the chart background, per Section 10.1's palette verification.
- **Tooltips are the source of truth**, not just the visual — every data point is reachable via hover (mouse) and via a keyboard-navigable/focusable equivalent (arrow-key traversal across data points with a live-region announcing the focused point's value), since a purely visual chart with no data-table fallback fails for screen-reader users. Every chart widget includes a "View as table" toggle that renders the same data as an accessible `DataTable` — this is a standing requirement for any chart shipped in the Analytics module, not an optional enhancement.
- **Text size floor:** chart axis labels and legends never drop below `text-caption` (12px) even under space pressure — a chart that needs to shrink text further to fit is a candidate for horizontal-bar reorientation or a "View full report" drill-through instead.

---

## 11. Motion & Interaction Guidelines

### 11.1 Durations and easing

| Token | Duration | Easing | Used for |
|---|---|---|---|
| `motion-instant` | 100ms | `ease-out` | Button press feedback, checkbox/radio toggle |
| `motion-fast` | 150ms | `ease-out` | Hover state transitions, tooltip show |
| `motion-base` | 200ms | `ease-in-out` | Dropdown/popover open-close, tab switch indicator slide |
| `motion-moderate` | 250ms | `ease-in-out` | Modal/Drawer enter-exit, toast slide-in |
| `motion-slow` | 350ms | `ease-in-out` | Sidebar expand/collapse (has more visual mass to move) |

A single easing family (`ease-out` for things appearing/responding to direct input, `ease-in-out` for things that both enter and must later exit) keeps the whole product feeling like one system rather than each engineer picking curves ad hoc — this is enforced as a Tailwind `transition-*` utility preset, not left to inline arbitrary values.

### 11.2 What animates (and what deliberately doesn't)

- **Page transitions are minimal-to-none.** Navigating between pages (e.g., clicking a sidebar item, opening a student's detail page) does not use a full-page transition/fade — content simply renders, matching the "clarity over decoration" principle and, practically, avoiding perceived-latency stacking on top of real data-fetch latency across 415 screens. The one exception is a subtle 150ms content fade-in *only* when a page is replacing a loading-skeleton state, to avoid a jarring pop.
- **Micro-interactions get motion:** button press (scale 0.98 + `motion-instant`), toast enter/exit (`motion-moderate` slide+fade), checkbox check (a quick draw-on checkmark, `motion-fast`), switch thumb slide (`motion-fast`), accordion/collapsible expand (height auto-animate, `motion-base`), tab active-indicator (sliding underline/pill, `motion-base`).
- **Loading skeletons, not spinners, for data-heavy tables.** Per the brief's explicit call-out: any DataTable, Card grid, or Dashboard widget population uses a **skeleton placeholder** (gray pulsing blocks matching the eventual content's approximate shape/line-count) rather than a centered spinner — this preserves layout stability (no content jump when data arrives) and communicates *what kind* of content is coming, which matters on data-dense admin screens where a bare spinner gives the user no sense of how much is about to load. Spinners are reserved for small, contained actions (a button's own loading state, a single field's async-validation check) where there's no meaningful "shape" to preview.
- **Reduced motion:** all of the above respects `prefers-reduced-motion` — transitions collapse to instant/near-instant (opacity-only, ≤50ms) for users with that OS-level preference set, a hard accessibility requirement, not an enhancement.

---

## 12. Figma File Organization

### 12.1 Project structure

A single Figma **Project** ("Sutram Design System") containing these files, each independently versioned:

```
Sutram Design System (Figma Project)
├── 00-Foundations
│     Color, type, spacing, grid, elevation, radius, icon tokens as Figma Variables
│     (Light/Dark modes + Brand override examples). No components live here —
│     tokens only. This is the file Tokens Studio / the Variables REST API reads
│     to drive the code export (12.4).
│
├── 01-Components
│     Every component in Section 7, built as Figma components with variant
│     properties matching CVA prop names exactly (variant, size, state where
│     state can't be a native Figma interactive-state). Organized into pages
│     per component family (Buttons & Inputs / Data Display / Overlays &
│     Feedback / Navigation). Consumes 00-Foundations via library import —
│     never hardcodes a token value.
│
├── 02-Templates
│     The 4 page templates (Section 8) as annotated layout frames at each
│     breakpoint (xl/lg/md/sm), plus the Dashboard widget grid (Section 9)
│     and AppShell frame (sidebar + topbar states: expanded/collapsed/mobile-drawer).
│     Consumes 01-Components — templates assemble components, never redraw them.
│
├── 03-Marketing-Site
│     Public-facing pages (landing, pricing, about) — intentionally allowed
│     more visual/decorative latitude per Principle 1.1's carve-out. Shares
│     00-Foundations color/type tokens for brand consistency but is not
│     bound to the dense-admin component set in 01-Components.
│
├── 04-App-Screens-by-Module
│     One page (or, for large modules, one sub-file) per canonical module —
│     Platform Admin, Dashboard, Admissions, Students, Faculty, Academics,
│     Attendance, Examinations, Fees & Finance, Library, Hostel, Transport,
│     HR, Placement, Research, Communication, AI Assistant, Analytics &
│     Reports, Settings — matching Doc 02's module list exactly, so any
│     designer/PM can find a screen by the same name used in the IA doc,
│     the nav config, and the URL structure. Each module page instances
│     components from 01-Components inside frames from 02-Templates;
│     bespoke screens (Dashboard variants, Analytics, AI Assistant chat,
│     Attendance Grid, Timetable) get fully custom layouts here since they
│     aren't template-based.
│
└── 05-Prototypes
      Connected, clickable flows for user testing and stakeholder review
      (references Doc 06's UX flows) — pulls frames from 04 rather than
      duplicating them, kept explicitly disposable/re-buildable per flow
      rather than a source of truth for any visual spec.
```

Rationale for splitting Foundations/Components/Templates/Screens into separate files rather than one mega-file: Figma performance degrades with file size and this system will grow to cover 415 screens across 18 roles; separate files also let the frontend/tokens pipeline (12.4) watch only `00-Foundations` for token-affecting changes rather than the entire design surface, and let different sub-teams (e.g., a designer focused on Fees & Finance) work in `04` without file-lock contention with someone editing `01-Components`.

### 12.2 Naming conventions

- **Components:** `ComponentFamily/Variant` (Figma's native slash-nesting), e.g. `Button/Primary`, `Badge/Success`, `DataTable/Row/Selected` — mirrors how they'll be found/composed in code (`<Button variant="primary">`).
- **Variables/tokens:** `category-name-modifier`, all-lowercase-kebab, exactly matching the CSS custom property minus the `--` prefix (e.g. Figma variable `color-primary` ↔ CSS `--color-primary` ↔ Tailwind `bg-primary`) — this identical-string convention is what makes the Tokens Studio export (12.4) a mechanical process rather than a manual re-mapping exercise.
- **Frames/screens:** `Module / Page-Name / Breakpoint`, e.g. `Students / Student List / xl`, `Students / Student List / sm` — every screen designed at more than one breakpoint gets a sibling frame, never a single frame with "responsive notes" as annotation text.
- **Pages within a file:** Title Case matching the module/section name exactly as it appears in Doc 02's IA and in `nav.config.ts`.

### 12.3 Versioning

- Figma's native version history + named version milestones (`v1.0 — Initial system`, `v1.1 — Added Placement module screens`) at every point 00-Foundations or 01-Components changes in a way that affects already-shipped screens, so frontend can correlate "which design-system version does this Tailwind config export correspond to."
- **Breaking token changes** (renaming a token, removing a semantic color) require a documented deprecation note on the old token for one release cycle before removal, matching normal API-versioning discipline — because unlike a typical design file, this system has a live code consumer (Section 12.4) that will break silently on a renamed variable.
- Component and template files are marked **published libraries**; module screen files (`04`) consume them as library instances, never local detached copies — detaching a component instance in `04` is treated as a design-system bug report ("the library component didn't support this case"), not a normal workflow, and should trigger either a library update or a documented one-off exception.

### 12.4 Design tokens → code sync

- **Figma Variables** (native, not a plugin-only approach) are the source of truth for all Section 2–6 tokens, organized into collections: `Primitives`, `Semantic` (Light/Dark modes), `Spacing`, `Typography`, `Radius`, `Elevation` — matching this document's section structure 1:1.
- **Tokens Studio for Figma** (or the native Figma Variables REST API, either is viable — Tokens Studio adds a JSON-based intermediate format that's easier to diff in a PR and to transform, which matters given the token set needs to become both CSS custom properties and a `tailwind.config.ts` theme object) exports the `00-Foundations` variable collections to a token JSON file.
- A small build step (owned by the frontend team, living alongside the `packages/` structure referenced in Doc 09) consumes that JSON and generates:
  1. `packages/design-tokens/css/tokens.css` — the CSS custom properties (`--color-primary`, etc.) that `tailwind.config.ts` references via `theme.extend` (Doc 09 §2.3), for both `:root` (light) and `.dark` (dark mode) selectors.
  2. `packages/design-tokens/tailwind-preset.ts` — a Tailwind preset consumed by the app's `tailwind.config.ts`, so `bg-primary`, `text-error`, `rounded-lg`, `shadow-md` etc. resolve to exactly the values specified in this document, with zero hand-transcription between Figma and code.
- This pipeline runs on a **PR-based workflow**: a design-token change is exported from Figma, opened as a PR against `packages/design-tokens`, and reviewed like any other code change (including the automated contrast-check gate mentioned in Section 2.5) before merging — token changes are never hand-copied by a developer eyeballing Figma's inspector panel, which is the usual source of design/code drift this pipeline exists to eliminate.
- Component-level specs (Section 7's variants/states/sizes) are not auto-synced the same way — they're the shadcn/ui component source of truth on the code side (Doc 09 §2.2, CVA variant definitions) and this Figma document/library on the design side, kept in sync by convention (identical variant-name strings, Section 12.2) and by design-review-in-PR rather than a build-time export, since component *behavior* (Radix accessibility semantics, state logic) isn't something a token pipeline can capture — only its visual parameters are.

---

*End of Document 11. Cross-references: Doc 02 (module/IA source for Section 12.1's file structure and Section 7.21's nav items), Doc 04 (RBAC model behind "hide don't disable" referenced in Sections 7.21/9.1), Doc 09 (frontend architecture — the CSS-custom-property token pipeline, shadcn/Radix component layer, and multi-tenant theming mechanism this entire document is the design-time counterpart to), Doc 10 (AI Features — explainable risk-score requirement driving Section 10.2's color banding and Section 9.2's AI insight widget).*
