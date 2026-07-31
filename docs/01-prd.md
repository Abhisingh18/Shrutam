# Sutram — Product Requirements Document (PRD)

**Document 1 of 15 — Design Documentation Set**
**Product:** Sutram — AI-Powered Education Operating System
**Company:** Pragyaan Labs
**Document Owner:** Product Management, Pragyaan Labs
**Status:** Approved for Build — v1.0
**Last Updated:** 2026-07-31
**Classification:** Internal / Confidential

---

## 1. Executive Summary

Sutram is a multi-tenant, AI-native Education Operating System built by Pragyaan Labs to replace the fragmented, decades-old software stack that schools, colleges, universities, coaching institutes, and research organizations currently run on. Where the market today forces an institution to stitch together a legacy Student Information System (SIS), a bolted-on LMS, a separate fee-collection tool, spreadsheets for HR and hostel management, and a WhatsApp group for parent communication, Sutram delivers all of it — Student, Faculty, Academics, Examinations, Finance, Library, Hostel, Transport, HR, Placement, Research, Communication, Analytics, and a native AI layer — as a single, coherent, cloud-native platform.

Every institution that signs up receives its own logically isolated tenant, provisioned in minutes through a self-serve signup flow (Signup → Institution Details → Plan Selection → Payment → Tenant Creation → Super Admin Setup → Dashboard), with no mandatory sales call, no six-month implementation project, and no six-figure upfront license fee. This is the single biggest structural difference between Sutram and the incumbents (Oracle PeopleSoft Campus Solutions, SAP, Workday Student, Ellucian Banner/PowerCampus) it displaces: those systems are sold and implemented like enterprise infrastructure projects; Sutram is sold and adopted like a modern SaaS product.

Sutram is being built in three deliberate phases — a ~40-50 screen MVP covering the daily operational core (Auth, Dashboard, Students, Faculty, Attendance, Fees, Exams, Results), a ~120-150 screen Phase 2 that makes the platform operationally complete (HR, Library, Hostel, Transport, Notifications, Reports, Analytics, Parent Portal, Mobile App), and a ~250-400+ screen Phase 3 that makes it category-defining (embedded AI Assistant, AI Analytics, Placement, Research Management, Alumni, Multi-Campus, Inventory, Procurement, API Marketplace, Workflow Automation, Custom Forms, Audit & Compliance). At full maturity, Sutram spans 200-500+ screens across 15-20 role-based dashboards, serving roles from Super Admin down to Guest.

This document defines why Sutram exists, who it serves, how it makes money, how it is priced, how it is positioned against every serious competitor in the category, and what is explicitly out of scope for v1. It is the foundational document for the 14 documents that follow it in this set (architecture, data model, UX system, module specs, security, AI design, go-to-market, etc.) and all downstream documents must remain consistent with the decisions recorded here.

---

## 2. Vision & Mission

### 2.1 Vision

**To become the operating system that every educational institution on earth runs on** — the single source of truth for every student, every faculty member, every rupee of fees, every exam result, and every institutional decision, made intelligent by AI that is native to the platform rather than bolted onto it.

Just as Workday became the system of record for HR and Salesforce for CRM, Sutram intends to become the system of record for education — spanning the full institutional lifecycle from a five-year-old's first admission to a school, through university, through employment placement, through decades of alumni relationship.

### 2.2 Mission

To give every institution — from a 200-student rural coaching center to a 50,000-student multi-campus university — access to the same enterprise-grade, AI-powered operational infrastructure that today only the wealthiest universities can afford, at a price and implementation speed that makes adoption a no-brainer rather than a multi-year procurement battle.

### 2.3 Guiding Belief

Education administration software has been built for the last 30 years as if institutions were factories: rigid workflows, static reports, and forms designed for data entry clerks. Sutram is built on the belief that an institution's software should behave like a knowledgeable colleague — anticipating a registrar's next question, flagging a student at risk of dropping out before a human notices, and drafting the parent email before the teacher has to think about it. AI is not a feature of Sutram; it is the operating layer the rest of the product is built on top of.

---

## 3. Goals & Success Metrics

Sutram's goals are organized across three horizons. All monetary figures are stated in USD with INR equivalents, since Pragyaan Labs is headquartered in India and India is the initial go-to-market (GTM) market, with global expansion (Middle East, Southeast Asia, Africa, then US/UK) from Year 2 onward.

### 3.1 Business / Growth Metrics

| Metric | Year 1 Target | Year 2 Target | Year 3 Target |
|---|---|---|---|
| Active tenants (institutions) | 150 | 800 | 2,500 |
| ARR | $1.2M (~₹10 Cr) | $6M (~₹50 Cr) | $20M (~₹166 Cr) |
| Net Revenue Retention (NRR) | ≥95% | ≥105% | ≥115% |
| Gross logo churn (annual, SMB tier) | ≤15% | ≤10% | ≤8% |
| Gross logo churn (annual, Enterprise tier) | ≤5% | ≤3% | ≤2% |
| Average Contract Value (ACV) | $8,000 | $7,500 | $8,000 |
| CAC payback period | ≤18 months | ≤14 months | ≤12 months |
| % revenue from self-serve (Starter tier) | 40% | 35% | 25% |
| % revenue from Enterprise (top-down sales) | 30% | 45% | 55% |

### 3.2 Product & Adoption Metrics

| Metric | Target |
|---|---|
| Tenant activation rate (signup → first Super Admin login → ≥1 student record created within 7 days) | ≥70% |
| Time-to-first-value (signup to first attendance/fee transaction recorded) | ≤48 hours (Starter self-serve), ≤14 days (Enterprise assisted) |
| Weekly Active Institutions (WAI) as % of paying tenants | ≥85% |
| Daily Active Users (DAU) / Monthly Active Users (MAU) ratio | ≥40% (indicates daily-operational, not occasional, usage) |
| Mobile app adoption among Students/Parents within 90 days | ≥60% |
| AI feature adoption (at least 1 AI action/week per active admin) by end of Phase 3 rollout | ≥50% |
| Support ticket deflection via AI Assistant | ≥35% |
| Feature adoption depth (avg. modules actively used per tenant, Growth+ tier) | ≥6 of 9 available |

### 3.3 Customer Experience & Quality Metrics

| Metric | Target |
|---|---|
| Platform uptime SLA — Starter/Growth | 99.9% (≤43 min downtime/month) |
| Platform uptime SLA — Enterprise | 99.95% (≤21.6 min downtime/month), with financially-backed credits |
| API p95 latency | ≤300ms |
| Net Promoter Score (NPS) — institution admins | ≥50 by Year 2 |
| Customer Satisfaction (CSAT) on support tickets | ≥90% |
| Critical security incident count (data breach, tenant isolation failure) | 0, always |
| Mean Time to Resolution (MTTR) for Sev-1 incidents | ≤1 hour |
| First-response time on support (Enterprise) | ≤1 hour, 24/7 |
| First-response time on support (Starter/Growth) | ≤8 business hours |

### 3.4 Non-Negotiable Guardrail Metrics

These are treated as launch-blocking gates, not aspirational targets:
- **Zero cross-tenant data leakage incidents** — verified via automated tenant-isolation test suites on every deploy.
- **100% of PII fields encrypted at rest** (AES-256) and in transit (TLS 1.3).
- **FERPA, India DPDP Act 2023, and GDPR compliance readiness** before any Enterprise contract signs in the respective jurisdiction.

---

## 4. Problem Statement

The education administration software market is a $15B+ global category (SIS + LMS + campus ERP + adjacent tools combined) that has not meaningfully modernized its user experience or its architecture in over two decades. Six structural problems define the status quo:

**4.1 Fragmentation.** A typical mid-size college runs 6-12 disconnected systems: a legacy SIS for student records, a separate LMS, a standalone fee/accounting package (often Tally or a regional vendor), Excel for HR and payroll, a hostel register kept on paper or a local desktop app, a transport tracker (if any), and WhatsApp/SMS gateways bolted on separately for parent communication. None of these systems share a common data model, so the same student's address is entered five times in five formats, and no single dashboard can answer "how is this student doing" across academics, fees, attendance, and discipline simultaneously.

**4.2 Implementation Timelines Measured in Years, Not Days.** Enterprise systems like Oracle PeopleSoft Campus Solutions, SAP, Workday Student, and Ellucian Banner routinely take 12-36 months to implement, requiring dedicated systems-integrator engagements costing multiples of the annual license fee itself. Institutions frequently abandon 40-60% of purchased functionality because the implementation never reaches full rollout before priorities shift or budgets run out.

**4.3 Prohibitive Cost for the Majority of the Market.** The tier-1 ERP vendors are priced for research universities with $500M+ endowments and dedicated 20-50 person IT departments. The other 95% of the market — K-12 schools, community colleges, coaching institutes, training academies, and small-to-mid universities, which is where the overwhelming majority of the world's students actually study — is left with either no real system, a patchwork of point solutions, or software so limited it barely qualifies as an SIS. This is especially true in high-growth markets like India, Southeast Asia, the Middle East, and Africa, where institution counts are large but average IT budgets are small.

**4.4 Legacy, Desktop-Era User Experience.** Interfaces from Banner, PeopleSoft, and Blackbaud are widely regarded by their own users as dense, form-heavy, and unintuitive — designed for trained data-entry staff, not for a teacher checking attendance between classes on a phone, or a parent checking a fee due date from a bus stop. Mobile is an afterthought (a wrapped web view, if it exists at all) rather than a first-class experience.

**4.5 AI as a Marketing Slide, Not a Product Layer.** Every major vendor now claims "AI-powered" capability, but in practice this means a chatbot widget bolted onto an otherwise unchanged product, or a single predictive-analytics report buried three menus deep. None of the incumbents were re-architected with AI as a native layer touching every workflow — drafting communications, flagging at-risk students, auto-reconciling fee payments, or auto-generating timetables. Institutions are correctly skeptical that "AI-powered" means anything real in this category today.

**4.6 Vendor Lock-In and Opaque, Consultant-Dependent Customization.** Legacy ERP customization is typically done through proprietary scripting layers (PeopleCode, ABAP, Banner's baseline modifications) that only certified consultants can touch, at $150-300/hour. This creates permanent dependency on the vendor's services arm or a small ecosystem of expensive system integrators, and it means every version upgrade risks breaking years of accumulated customization — a well-documented reason institutions delay upgrades for a decade or more.

**Sutram's founding thesis** is that all six of these problems are solvable simultaneously by a cloud-native, multi-tenant, configuration-driven (not code-customized) platform built AI-first from day one, sold and deployed the way modern SaaS is sold and deployed: self-serve for the long tail, fast-implementation assisted onboarding for the top of the market.

---

## 5. Target Customers & Market Segmentation

Sutram serves six institutional segments. Each has a distinct buyer persona, budget profile, and go-to-market motion, but all run on the same underlying multi-tenant platform with configuration (not code) differentiating the experience.

### 5.1 Segment Overview

| Segment | Global Institution Count (approx.) | Typical Student Count | Sutram Entry Tier |
|---|---|---|---|
| K-12 Schools | ~1.5M+ (private/independent alone: ~350K globally, ~85K in India) | 200 - 5,000 | Starter → Growth |
| Coaching / Training Institutes | ~200K+ (India alone) | 50 - 10,000 | Starter → Growth |
| Colleges (undergraduate, non-university) | ~120K globally | 500 - 15,000 | Growth → Enterprise |
| Universities (degree-granting, multi-department) | ~30,000 globally | 3,000 - 60,000 | Growth → Enterprise |
| Research Labs / Institutes | ~15,000 globally | N/A (staff/researcher-counted: 20 - 2,000) | Growth → Enterprise |
| Multi-Campus Groups / Trusts | Thousands of trusts operating 3-50+ institutions each | Varies (aggregate) | Enterprise |

### 5.2 Ideal Customer Profile (ICP) by Segment

**K-12 Schools (Primary initial ICP).**
Private and independent schools with 500-3,000 students, currently running either no digital SIS or a low-end regional product with no AI, weak mobile support, and manual fee reconciliation. Buyer: School Owner/Trustee or Principal, often with a small or non-existent IT team. Trigger event: start of an academic year, a fee-collection or attendance-tracking pain point becoming acute, or a competing school visibly modernizing. Budget authority typically sits with the owner/trustee directly, enabling fast self-serve or lightly-assisted sales cycles (2-6 weeks).

**Coaching / Training Institutes (Primary initial ICP, especially India/SEA).**
Exam-prep and skills-training businesses (JEE/NEET/UPSC coaching, IT bootcamps, vocational academies) with 100-5,000 students, highly cost-sensitive, fast-growing, and used to consumer-grade SaaS tools (they already pay for WhatsApp Business, Razorpay, Zoom). Buyer: Founder/Director. Fastest sales cycle in the portfolio (days to 2 weeks) and highest self-serve conversion rate.

**Colleges & Universities (Core mid-to-long-term ICP).**
Institutions with 2,000-50,000 students, multiple departments/faculties, formal procurement processes, and existing (often aging) SIS infrastructure they are actively trying to replace or supplement. Buyer committee: Registrar, Dean of Academic Affairs, CIO/IT Director, with final sign-off from Vice Chancellor/President and Finance. Sales cycle: 3-9 months, requiring RFP response, security review, data-migration planning, and pilot/reference calls. This segment drives Enterprise-tier ACV and is the primary target for Phase 3 depth (Research, Placement, Multi-Campus, Alumni).

**Research Labs / Institutes.**
Standalone or university-affiliated research organizations needing researcher/project/grant/publication tracking more than traditional student administration. Buyer: Lab Director or Dean of Research. Smaller in count but high strategic value for the Research module's credibility and cross-sell into affiliated universities.

**Multi-Campus Groups / Educational Trusts.**
Organizations operating multiple schools/colleges under one trust (common in India, Middle East, and parts of Africa/SEA). Buyer: Group CEO/Trustee with centralized IT/finance function. Highest-value ICP for Enterprise tier — a single Sutram deployment spans multiple tenants under one consolidated billing and cross-institution analytics relationship, making this segment central to Sutram's land-and-expand motion (land one campus, expand to the full trust).

### 5.3 Buyer Personas (Summary)

| Persona | Segment(s) | Primary Concern | What Wins Them |
|---|---|---|---|
| School Owner / Trustee | K-12, Coaching | Cost, ease of use, fast setup | Self-serve signup, transparent pricing, visible ROI in weeks |
| Principal / Director | K-12, Coaching, Colleges | Day-to-day operational relief, parent satisfaction | Mobile-first UX, automated communication, attendance/fee automation |
| Registrar | Colleges, Universities | Data accuracy, compliance, exam/records integrity | Configurable workflows, audit trails, accreditation-ready reporting |
| CIO / IT Director | Colleges, Universities, Enterprise groups | Security, integration, uptime, vendor viability | SOC 2 posture, SSO/SAML, API access, tenant isolation guarantees, SLAs |
| CFO / Finance Head | All segments, decisive at Enterprise | TCO, predictable pricing, payment reconciliation | Transparent per-student pricing, integrated fee/payment gateway, no hidden implementation costs |
| Dean of Research | Research Labs, Universities | Grant/publication tracking, researcher collaboration | Research module depth, integrations with academic databases |

---

## 6. Business Model

Sutram is a **multi-tenant, subscription-based SaaS platform**, sold primarily on **per-student-per-year pricing** with a platform base fee, supplemented by add-on modules and transaction-based revenue. This model is chosen deliberately over the alternatives:

- **Per-seat (per staff-login) pricing**, common in generic B2B SaaS (Salesforce, Zoho), is rejected as the *primary* metric because an institution's software value is driven by the number of students it manages (fee volume, records volume, communication volume), not the number of staff logins — and per-seat pricing perversely discourages institutions from giving more staff access to a tool that improves operations.
- **Flat per-institution pricing**, common among small regional SIS vendors, is rejected as the sole model because it fails to capture value at scale (a 20,000-student university and a 200-student school would pay the same) and leaves significant revenue on the table in the segment where Sutram has the deepest product (Enterprise universities).
- **Per-student pricing** aligns price directly with institutional value delivered and with the institution's own revenue driver (tuition/fees collected per student), making it easy for a buyer to model ROI, and it scales naturally and fairly from a 200-student school to a 60,000-student university.

Sutram therefore uses a **hybrid model**: a modest **annual platform base fee** (covering hosting, baseline support, and the fixed cost of onboarding) plus a **per-student-per-year rate that declines at volume** (standard SaaS volume-tiering), plus **paid add-on modules** for capabilities not every institution needs (AI Suite upgrades, Research, Placement, Transport GPS, WhatsApp/SMS credit bundles), plus a **small transaction fee on payments processed through the built-in Fee/Payment module** (an established fintech-adjacent SaaS revenue pattern, mirroring how vertical SaaS like Toast, ServiceTitan, and Mindbody monetize payment flow, not just software access).

This hybrid model is why Sutram can profitably serve a 200-student coaching institute (low absolute price, low cost to serve via self-serve/automation) and a 40,000-student university (high absolute price, justifying white-glove Enterprise service) from the same product.

---

## 7. Subscription / Pricing Model

Sutram is priced in three tiers — **Starter, Growth, and Enterprise** — designed so that Phase 1 features map to Starter, Phase 1+2 map to Growth, and the full Phase 1+2+3 platform maps to Enterprise. Pricing is quoted in INR for the India/SEA market and USD for international markets; figures below are list price (India), with USD shown at approximate parity for reference. All tiers bill annually by default (a ~15% surcharge applies to monthly billing, standard SaaS practice to encourage annual commitment and reduce churn-driven revenue volatility).

### 7.1 Tier Structure

| | **Starter** | **Growth** | **Enterprise** |
|---|---|---|---|
| **Target segment** | Small schools, coaching institutes (<1,000 students) | Mid-size schools, colleges (1,000-10,000 students) | Universities, multi-campus trusts, research labs (10,000+ students or multi-campus) |
| **Pricing** | ₹199/student/year (~$3), min. ₹75,000/year (~$900) platform fee | ₹399/student/year (~$5.5), min. ₹3,50,000/year (~$4,200) platform fee | Custom (typically ₹700-1,200/student/year, ~$9-15), negotiated platform fee |
| **Campuses included** | 1 | Up to 3 | Unlimited |
| **Modules included** | Auth, Dashboard, Students, Faculty, Attendance, Fees, Exams, Results (Phase 1 set) | Everything in Starter **+** HR, Library, Hostel, Transport, Notifications/Communication, Reports, Analytics, Parent Portal, Mobile App (Phase 1+2 set) | Everything in Growth **+** AI Assistant, AI Analytics, Placement, Research, Alumni, Multi-Campus console, Inventory, Procurement, API Marketplace, Workflow Automation, Custom Forms, Audit & Compliance (Phase 1+2+3, full platform) |
| **AI capability** | Basic AI chatbot (FAQ/help), AI-assisted report summaries | AI Insights: predictive attendance/dropout risk flags, AI-drafted parent/staff communications, smart timetable suggestions | Full AI Assistant across every module (natural-language queries, autonomous workflow actions), AI Analytics with custom model tuning, AI-powered placement matching, AI research-grant/publication assistant |
| **User roles enabled** | Core 8 roles (Admin, Principal, Faculty, Accountant, Student, Parent, Librarian-lite, Guest) | Adds HOD, TA, Warden, Placement Officer, Transport Manager | All 15-20 roles including Dean, Registrar, Researcher, Super Admin multi-tenant console |
| **Support** | Email, ≤8 business-hour response, community knowledge base | Priority email + chat, ≤8 business-hour response, quarterly business review | 24/7 phone/chat/email, ≤1-hour Sev-1 response, dedicated Customer Success Manager, monthly business review |
| **SLA** | 99.9% uptime (best-effort credits) | 99.9% uptime (financially-backed credits) | 99.95% uptime (financially-backed credits), custom SLA negotiable |
| **Integrations / API** | Standard payment gateway, SMS/email only | + WhatsApp Business API, Google Workspace/Microsoft 365 SSO, REST API (rate-limited) | Full API access, SSO/SAML/SCIM, API Marketplace publishing rights, custom integration support |
| **Deployment options** | Shared multi-tenant cloud only | Shared multi-tenant cloud only | Shared multi-tenant cloud (default) or dedicated VPC / single-tenant deployment (premium) |
| **White-label** | No | No | Optional add-on (trust/group branding across sub-institutions) |
| **Data residency options** | Regional default (India data center for India tenants, etc.) | Regional default | Configurable (data residency guarantees for regulatory compliance) |
| **Onboarding** | Self-serve, guided in-app setup wizard | Self-serve + optional paid onboarding package | Assisted, white-glove onboarding included in contract |

### 7.2 Pricing Logic & Volume Tiering

Per-student rates decline as enrollment scales, consistent with standard SaaS volume-pricing practice and the reality that marginal cost per student decreases with scale:

| Enrollment Band | Starter Rate | Growth Rate | Enterprise Rate (indicative) |
|---|---|---|---|
| 1 - 500 students | ₹199/student/yr | ₹399/student/yr | N/A (below Enterprise minimum) |
| 501 - 2,000 students | ₹179/student/yr | ₹349/student/yr | ₹999/student/yr |
| 2,001 - 10,000 students | N/A (upgrade to Growth) | ₹299/student/yr | ₹849/student/yr |
| 10,001 - 30,000 students | N/A | N/A | ₹749/student/yr |
| 30,000+ students | N/A | N/A | ₹649/student/yr (negotiated floor) |

### 7.3 Add-On Modules (available to Growth and Enterprise, à la carte)

| Add-On | Pricing Model | Notes |
|---|---|---|
| AI Assistant Pro (full conversational AI across all modules) | +₹79/student/yr | Included by default in Enterprise |
| AI Analytics & Predictive Insights Suite | +₹49/student/yr | Included by default in Enterprise |
| Placement & Career Services Module | +₹35/student/yr (final-year students only) | Enterprise default |
| Research Management Module | Flat ₹2,00,000/yr per institution | For universities/research labs; Enterprise default |
| Transport GPS Live Tracking | +₹15/student/yr (bus-riders only) | Optional at all paid tiers |
| WhatsApp/SMS Communication Credit Bundles | Usage-based (pass-through + 20% margin) | All tiers |
| Additional Campus (beyond tier allowance) | ₹1,00,000/campus/yr | Growth tier |
| White-Label / Custom Domain & Branding | ₹3,00,000/yr flat | Enterprise only |
| Dedicated VPC / Single-Tenant Hosting | Custom quote (typically +40-60% over shared pricing) | Enterprise only |
| Priority Data Migration Service | One-time, ₹50,000 - ₹5,00,000 depending on source system complexity | All tiers |

### 7.4 Free Tier / Trial Policy

Sutram offers a **30-day full-feature trial** (Growth-tier feature set, capped at 100 student records) with no credit card required, converting to a paid Starter or Growth plan at trial end. This lowers self-serve friction to zero for the highest-velocity segments (coaching institutes, small schools) while protecting revenue by capping trial scale.

---

## 8. Revenue Streams

Sutram's revenue is diversified across six streams, reducing dependence on any single motion and creating multiple expansion paths within an existing account:

1. **Subscription revenue (primary, ~70% of ARR at maturity).** Recurring per-student + platform-fee subscription across Starter/Growth/Enterprise tiers, billed annually in advance.
2. **Add-on module revenue (~12% of ARR).** AI Suite upgrades, Research, Placement, Transport GPS, White-Label, additional campuses — the primary expansion-revenue lever within existing accounts (land-and-expand).
3. **Implementation & onboarding services (~6% of ARR).** One-time fees for Enterprise data migration from legacy SIS/ERP systems, custom workflow configuration, and change-management/training services. Priced to roughly cover cost (not a profit center) — the strategic goal is fast, successful go-lives that drive retention, not services margin.
4. **Payment transaction fees (~8% of ARR, fast-growing).** A 0.5-0.9% fee on fee/tuition payments processed through Sutram's embedded payment gateway (on top of the underlying payment processor's own fee), consistent with vertical-SaaS fintech attach models. Institutions may opt out and use their own payment gateway integration, but the embedded option is the default and the friction-minimized path.
5. **Marketplace & integration revenue (~2% of ARR at maturity, Phase 3+).** Revenue share (typically 20-30%) from third-party developers/ISVs publishing paid apps/integrations on the Sutram API Marketplace (introduced in Phase 3), analogous to Salesforce AppExchange or Workday Marketplace.
6. **White-label / multi-campus trust licensing (~2% of ARR).** Premium fee for trusts/groups that white-label Sutram under their own brand across sub-institutions.

---

## 9. Competitive Analysis

| Dimension | **Sutram** | Oracle PeopleSoft Campus Solutions | SAP (Student Lifecycle Mgmt) | Workday Student | Salesforce Education Cloud | Ellucian Banner/PowerCampus | Blackbaud | Odoo (Education apps) | Zoho One (generic) | MS Dynamics 365 |
|---|---|---|---|---|---|---|---|---|---|---|
| AI-native (built into core workflows, not bolted on) | **Yes — architectural pillar** | No (add-on analytics only) | Limited (SAP Joule bolt-on) | Partial (Workday AI emerging, generic HCM-first) | Partial (Einstein AI, CRM-centric not academic-native) | No | No | No | Generic AI add-on | Partial (Copilot, generic) |
| True multi-tenant SaaS | **Yes, from day one** | No (mostly on-prem/hosted single-tenant legacy) | No (largely on-prem/private cloud) | Yes (cloud-native, but HCM-first) | Yes | Partial (SaaS option exists, legacy core) | Partial | Yes (self-hosted common) | Yes | Yes |
| Self-serve signup (no sales call required) | **Yes** | No | No | No | No | No | No | Partial | Yes | No |
| Typical implementation time | **Days (Starter) to 8-12 weeks (Enterprise)** | 12-36 months | 12-24 months | 9-18 months | 6-12 months | 9-18 months | 4-9 months | 2-6 months | 1-4 weeks | 3-9 months |
| Starting price accessibility | **Low — viable for 200-student institutions** | Very high (enterprise-only) | Very high | High | High | High | Medium-High | Low-Medium | Low | Medium-High |
| Education-specific depth (curriculum, exams, admissions, hostel, transport) | **Very deep, purpose-built** | Deep (legacy strength) | Shallow (generic ERP adapted) | Medium (HCM/Student bolt-on) | Shallow (CRM adapted for admissions/advancement) | Deep (legacy strength) | Medium (strong in fundraising/advancement, weaker ops) | Shallow (generic ERP modules) | None (generic business suite) | Shallow (generic ERP/CRM adapted) |
| UX modernity | **Modern, consumer-grade** | Dated | Dated | Modern | Modern | Dated | Dated-to-Medium | Medium | Modern | Medium |
| Mobile-first | **Yes — native apps, core design principle** | No (web-only, poor mobile) | No | Partial | Partial | No | No | Partial | Yes | Partial |
| Configurable without code (vs. consultant-dependent customization) | **Yes — config engine, no-code workflow builder (Phase 3)** | No (PeopleCode required) | No (ABAP required) | Limited (Workday Studio, still specialist-dependent) | Partial (Apex/clicks-not-code, CRM-scope only) | No (baseline mods, specialist-dependent) | Limited | Partial (developer-dependent) | Yes (limited depth) | Partial (specialist-dependent) |
| Multi-tenant, multi-campus trust management | **Yes — native Enterprise feature** | Partial (complex, costly) | Partial | Partial | No (not education-org-structure-aware) | Partial | No | No | No | Partial |
| Total cost of ownership (5-yr, mid-size institution) | **Lowest in category** | Highest | Highest | High | High | High | Medium-High | Medium | Low (but lacks depth) | Medium-High |
| Target buyer today | Long-tail + mid-market + universities (all segments) | Large research universities only | Large enterprises/universities | Large universities, US-centric | Advancement/admissions offices, not full ops | Mid-large universities | Nonprofits/independent schools (advancement-heavy) | SMB, budget-constrained | Generic SMB, not education-specific | Large enterprises, generic |

**Key takeaway:** Sutram is the only platform in this comparison set that is simultaneously (a) genuinely AI-native, (b) true self-serve multi-tenant SaaS, (c) purpose-built with education-specific depth across the *entire* institutional operating surface (not just CRM/advancement or just HCM), and (d) priced and implemented fast enough to be viable for the 95% of institutions the incumbents structurally ignore.

---

## 10. Unique Selling Proposition (USP)

1. **AI-native, not AI-bolted-on.** Every module — Attendance, Fees, Exams, HR, Hostel, Placement — has AI woven into its core workflows (predictive risk flags, auto-drafted communications, natural-language queries, autonomous routine actions), not a chatbot widget floating on top of an otherwise unchanged legacy product.

2. **Live in days, not years.** Self-serve signup takes an institution from "Institution Name" to a working Super Admin dashboard in under 15 minutes for Starter/Growth tiers, and full Enterprise onboarding in 8-12 weeks — versus the 12-36 month implementation timelines standard among Oracle, SAP, Workday, and Ellucian deployments.

3. **One platform, entire institutional lifecycle, one-third to one-fifth the total cost of ownership.** Sutram replaces 6-12 fragmented point tools (SIS, LMS, fee software, HR spreadsheets, hostel registers, communication tools) with a single system built for the complete student and institution lifecycle — from admission through alumni — at a fraction of what institutions currently spend across their fragmented stack, let alone what a legacy ERP license would cost.

4. **Configurable, not customized.** A no-code configuration and workflow-builder engine (deepened in Phase 3) lets institutions adapt Sutram to their processes without consultant-dependent, version-breaking code customization — eliminating the single biggest reason institutions get stuck on unsupported legacy ERP versions for a decade.

5. **Mobile-first for every role.** Native mobile experiences for Students, Parents, Faculty, and Wardens are a core design principle, not an afterthought — reflecting how these users actually live, unlike the desktop-era interfaces of legacy SIS/ERP incumbents.

6. **Built for the whole market, not just the top 5%.** Priced and packaged to be genuinely viable for a 200-student coaching institute and a 40,000-student university on the same platform — serving the long tail that Oracle, SAP, Workday, and Ellucian structurally cannot reach.

---

## 11. Product Principles / Design Philosophy

1. **AI-native, not AI-bolted-on.** AI is a platform layer available to every module from the architecture up, not a separate product surface.
2. **Multi-tenant from day one.** Every architectural, data-model, and UX decision assumes strict tenant isolation and horizontal scalability across thousands of tenants — retrofitting multi-tenancy later is explicitly rejected as a strategy.
3. **Configurable, not customized.** Institution-specific variation is handled through configuration (settings, workflow builders, custom fields/forms) rather than forked or bespoke code per customer.
4. **Mobile-first, responsive-always.** Every user-facing workflow is designed for a phone screen first, then expanded to tablet/desktop — not the reverse.
5. **Self-serve first, assisted when it matters.** The product must be adoptable without a human in the loop for the long-tail segments, while still supporting white-glove onboarding for Enterprise buyers who require it.
6. **Role-based, not one-size-fits-all.** Every one of the 15-20 roles gets a purpose-built dashboard surfacing only what that role needs, not a generic "everything" screen with permission-based hiding.
7. **Progressive disclosure of complexity.** Phase 1 screens must remain usable and uncluttered even after Phase 3 modules are enabled — advanced functionality is layered in, never dumped onto the base workflows.
8. **Data as a single source of truth.** A student, faculty member, or transaction exists exactly once in the data model, referenced (never duplicated) across every module — the direct antidote to the fragmentation problem in Section 4.1.
9. **Security and privacy by design, not by audit.** Tenant isolation, encryption, and consent/compliance (FERPA, DPDP, GDPR) are architectural requirements from the first commit, not retrofitted before a compliance review.
10. **Fast, always.** Sub-300ms p95 API response and sub-2-second page loads are treated as a product requirement, not a "nice to have" performance goal — legacy ERP sluggishness is a competitive opening Sutram must never hand back.
11. **Extensible by design.** The platform exposes a documented API and (from Phase 3) a marketplace, so the ecosystem — not just Pragyaan Labs — can extend Sutram's reach, mirroring how Salesforce and Workday built durable moats via ecosystems.

---

## 12. Scope & Phasing Summary

Sutram is built in three phases, sequenced so each phase is independently valuable, sellable, and revenue-generating rather than requiring the full 200-500 screen vision to ship before any institution can go live.

### Phase 1 — MVP (~40-50 screens): "Run the Daily Core"
**Modules:** Auth, Dashboard, Students, Faculty, Attendance, Fees, Exams, Results.
**Rationale:** These are the workflows every institution, regardless of segment, touches every single day, and they are the workflows currently most often handled on paper or in spreadsheets in the underserved long tail. Shipping only this core lets Sutram reach first revenue and first reference customers fast, validates the multi-tenant provisioning flow and core data model under real usage, and directly maps to the **Starter** pricing tier — proving the self-serve motion before investing in the breadth of Phase 2/3.

### Phase 2 (~120-150 screens): "Become Operationally Complete"
**Modules added:** HR, Library, Hostel, Transport, Notifications/Communication, Reports, Analytics, Parent Portal, Mobile App.
**Rationale:** This phase converts Sutram from an academic-records tool into a complete institutional operating system, adding the back-office (HR) and residential/logistics (Hostel, Transport) functions that boarding schools, colleges, and universities require, plus the communication and reporting layers that make the platform sticky and visible to parents (a key retention and word-of-mouth driver). This phase directly maps to the **Growth** tier and is the point at which Sutram becomes credible competition for point solutions in each of these categories, not just for basic SIS tools.

### Phase 3 (~250-400+ screens): "Become Category-Defining"
**Modules added:** AI Assistant, AI Analytics, Placement, Research, Alumni, Multi-Campus, Inventory, Procurement, API Marketplace, Workflow Automation, Custom Forms, Audit & Compliance.
**Rationale:** This phase is what makes Sutram categorically different from every competitor in Section 9 rather than merely a modern, cheaper alternative to them. AI Assistant/AI Analytics deliver on the AI-native thesis at full depth; Placement, Research, and Alumni extend Sutram across the complete lifecycle a university cares about beyond enrollment; Multi-Campus and Procurement/Inventory unlock the highest-ACV Enterprise trust/group segment; and API Marketplace plus Workflow Automation/Custom Forms deliver the "configurable, not customized" principle at full strength, building the ecosystem moat. This phase directly maps to the **Enterprise** tier and is where Sutram becomes viable as an Oracle/SAP/Workday/Ellucian replacement at the top of the market, not only a great option for the underserved long tail.

**Total at maturity:** 200-500+ screens across 15-20 role-based dashboards, reached incrementally over three phases, each independently monetizable via the tier structure in Section 7.

---

## 13. Risks & Mitigations

| Risk Category | Risk | Mitigation |
|---|---|---|
| **Technical** | Multi-tenant data isolation failure (cross-tenant data leak) — catastrophic for an education-records product | Tenant isolation enforced at the database-schema and query-middleware layers (detailed in the Architecture doc), automated tenant-isolation regression tests gating every deploy, regular third-party penetration testing |
| **Technical** | Platform performance degradation as tenant count scales into thousands | Horizontally scalable microservices architecture, per-tenant resource quotas, load-tested capacity planning ahead of each growth milestone, dedicated-VPC escape valve for the largest Enterprise tenants |
| **Technical** | AI feature reliability/hallucination risk in high-stakes contexts (e.g., exam results, fee amounts) | AI Assistant is scoped to read/summarize/draft/recommend by default; any AI action that writes financial or academic-record data requires explicit human confirmation (human-in-the-loop by design, detailed in the AI Design doc) |
| **Market** | Long, conservative buying cycles in the university segment slow Enterprise revenue ramp | Land-and-expand strategy: enter via Starter/Growth (single department or campus), expand to full Enterprise multi-campus contract after proven adoption, reducing size and risk of the initial buying decision |
| **Market** | Price-sensitive long-tail segment (coaching institutes, small schools) is also the most churn-prone | Low-friction self-serve onboarding, in-app activation nudges, proactive lifecycle email/WhatsApp campaigns, and a free trial to ensure fit before commitment, keeping CAC low enough that even higher churn remains profitable |
| **Compliance / Regulatory** | India DPDP Act 2023 (Digital Personal Data Protection Act) compliance, especially regarding minors' data (majority of Sutram's data subjects are students under 18) | Explicit parental/guardian consent flows for minors, data localization within India for India-tenant data by default, a designated Data Protection Officer, and DPDP-compliant data-processing agreements built into the Terms of Service from launch |
| **Compliance / Regulatory** | FERPA compliance required for any US-market education customers | FERPA-aligned access controls (directory vs. non-directory information distinctions), audit logging of all student-record access, signed FERPA-compliant data agreements available for US Enterprise contracts |
| **Compliance / Regulatory** | GDPR compliance required for EU/UK expansion | EU data residency option at Enterprise tier, right-to-erasure and data-portability tooling built into the platform (not manual/ad hoc), GDPR-compliant sub-processor agreements |
| **Compliance / Regulatory** | Payment processing (fee collection) brings PCI-DSS scope | Use PCI-DSS Level 1 certified payment processor partners for all card/UPI transactions; Sutram itself never stores raw card data, minimizing direct PCI scope |
| **Competitive** | Incumbent vendors (Oracle, SAP, Workday) respond by launching their own "AI-native" repositioning or acquiring modern point solutions | Sustain the speed-of-implementation and price-accessibility advantage (structurally very hard for incumbents to replicate given their sales-motion and legacy-architecture constraints), and continue deepening AI capability as a moat rather than a marketing claim |
| **Competitive** | Regional/local SIS vendors compete aggressively on price in the long-tail segment | Differentiate on AI depth, breadth of modules (single platform vs. point solution), and mobile-first UX rather than competing purely on price; maintain a Starter tier priced to remove cost as the primary objection |
| **Execution** | Attempting to ship the full 200-500 screen vision before achieving product-market fit at the Phase 1 core | Strict phase-gating (Section 12): Phase 2/3 investment is sequenced behind demonstrated Phase 1 activation and retention metrics (Section 3.2), not built speculatively in parallel |
| **Execution** | AI feature costs (LLM inference) eroding gross margin at scale | Tiered AI capability (Starter gets lightweight AI, Enterprise gets full capability) aligned with willingness-to-pay; architecture supports model-routing to cost-efficient models for high-volume/low-complexity AI tasks |

---

## 14. Out of Scope (v1)

The following are explicitly **not** part of Sutram's v1 (Phase 1 MVP) scope, and several are deferred beyond even Phase 3. Listing them here prevents scope creep and keeps downstream documents (architecture, module specs) focused on the committed roadmap:

- **On-premise / self-hosted deployment** for any tier below Enterprise. On-prem is not offered at all in v1; a dedicated-VPC option is an Enterprise-only Phase 3+ consideration, not a v1 commitment.
- **Full LMS / e-learning content authoring and delivery** (course video hosting, SCORM/xAPI content packages, MOOC-style delivery). Sutram integrates with third-party LMS tools via API (Phase 3 API Marketplace) rather than building a competing content-authoring LMS in-house.
- **Payroll processing and statutory compliance filings** (as opposed to HR records/attendance/leave management, which are in scope from Phase 2). Payroll disbursement and country-specific statutory filing (PF/ESI/TDS in India, equivalent elsewhere) is deferred; Sutram will integrate with specialist payroll providers rather than become one.
- **Full accounting/general-ledger/ERP-grade finance** (accounts payable/receivable beyond student fees, multi-currency consolidated financial statements, asset depreciation schedules). Sutram's Finance module in v1 and Phase 2 covers student fee collection, invoicing, and basic institutional expense tracking, not a complete general-ledger accounting system; deep GL functionality is deferred to Phase 3 Procurement/Inventory-adjacent scope at the earliest, with integration to dedicated accounting software (e.g., Tally, QuickBooks, Zoho Books) as the near-term path.
- **Native offline-first mobile functionality** beyond basic caching. Full offline data entry with conflict-resolution sync is deferred beyond Phase 3; the Phase 2 Mobile App requires connectivity for write operations at launch, with read-caching only.
- **Admissions/CRM-style lead management for prospective (not-yet-enrolled) students.** v1 manages enrolled students; a dedicated admissions-funnel/CRM capability is a candidate for a future phase beyond the scope defined in this document, not committed here.
- **Video conferencing / virtual classroom infrastructure.** Sutram integrates with existing tools (Zoom, Google Meet, Microsoft Teams) rather than building native video infrastructure.
- **Hardware (biometric devices, RFID readers, bus GPS units).** Sutram integrates with third-party hardware via defined API/webhook contracts; it does not manufacture or bundle hardware.
- **Non-English/regional-language full localization at launch.** v1 ships in English with an internationalization-ready architecture (detailed in the UX/i18n doc); full regional-language UI packs are a Phase 2/3 rollout, not a v1 launch blocker.
- **Blockchain-based credentialing/certificates.** Explicitly out of scope for the foreseeable roadmap; not a committed feature at any phase currently planned.
- **A public-facing course marketplace / MOOC consumer product.** Sutram is B2B institutional software; it will never become a direct-to-consumer course marketplace.

---

*End of Document 1. This PRD is the ground-truth reference for all subsequent documents in the Sutram design-documentation set, including Architecture (Doc 2), Data Model (Doc 3), UX/Design System (Doc 4), and the individual Module Specifications (Docs 5+). Any deviation from the pricing tiers, phasing, or scope defined here must be raised as an explicit change against this document, not silently introduced downstream.*
