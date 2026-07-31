# Sutram — Document 14: Deployment & Scaling Architecture

**Company:** Pragyaan Labs
**Product:** Sutram — AI-powered, Multi-Tenant Education Operating System
**Document owner:** Platform / Infrastructure Engineering (SRE)
**Status:** Draft v1.0 — baseline for Phase 1 implementation, with explicit Phase 2/3 evolution paths
**Scope:** Full web application infrastructure (native mobile app out of scope for this revision — mobile clients consume the same REST API and add no new infrastructure surface beyond what's described here)
**Depends on:** Document 1 (PRD — pricing tiers, growth targets, uptime SLAs), Document 3 (Database Design — RLS, `tenants.isolation_mode`, partitioning baseline), Document 4 (RBAC & Security — data residency, encryption), Document 7 (API Design — rate limits by tier), Document 8 (Backend Architecture — modular monolith, event bus, PgBouncer, caching, extraction triggers)
**Purpose:** This document answers one question concretely, in numbers: *how does Sutram's infrastructure survive going from one pilot institution to 5,000 institutions, without the platform being re-architected out of necessity rather than choice?*

---

## Table of Contents

1. [Deployment Topology by Phase](#1-deployment-topology-by-phase)
2. [Database Scaling Specifics](#2-database-scaling-specifics)
3. [Multi-Tenant Noisy-Neighbor Mitigation](#3-multi-tenant-noisy-neighbor-mitigation)
4. [Caching & CDN Strategy at Scale](#4-caching--cdn-strategy-at-scale)
5. [Global / Multi-Region Considerations](#5-global--multi-region-considerations)
6. [Capacity Planning Model](#6-capacity-planning-model)
7. [Scaling Triggers & Runbook](#7-scaling-triggers--runbook)
8. [Cost Scaling Model](#8-cost-scaling-model)
9. [Failure Modes & Graceful Degradation](#9-failure-modes--graceful-degradation)
10. [Long-Term Architecture Evolution Notes](#10-long-term-architecture-evolution-notes)

---

## 1. Deployment Topology by Phase

Three topology snapshots, each tied to a concrete institution/student-volume band and to the pricing-tier structure from Document 1 §7. Nothing here is calendar-triggered — the actual move from one phase's topology to the next is driven by the metrics in Section 7, not by a roadmap date. `plan_tier` (Document 3 §1: `trial`, `standard`, `professional`, `enterprise`, `isolated`) is the internal DB enum; it maps to the customer-facing Starter/Growth/Enterprise names from Document 1 as `standard≈Starter`, `professional≈Growth`, `enterprise`/`isolated≈Enterprise` (the `isolated` value is what a dedicated-isolation Enterprise tenant carries, Section 1.4).

### 1.1 Phase 1 — MVP / pilot customers

**Target band:** 1–20 pilot institutions, low thousands of total students. This is the topology the platform launches with and the one the capacity model in Section 6 is calibrated against at its smallest point.

| Component | Sizing | Notes |
|---|---|---|
| Kubernetes cluster | Single region, single cluster, 1 node pool | Managed control plane (EKS/AKS/GKE — cloud-agnostic per foundational decision) |
| Worker nodes | 3 nodes × 4 vCPU / 16 GB | Sized for the monolith + workers + platform pods (ingress, monitoring agents) with room for one node to fail without capacity loss |
| Monolith API pods | 3–5 replicas, 1 vCPU / 2 GB request each, HPA disabled or floor-pinned | Stateless (Document 8 §11.4) — 3 is the HA floor even at near-zero load, 5 is the ceiling before Phase 2 autoscaling is turned on |
| Celery workers | 2–3 pods, split `realtime`/`default`/`bulk` queues (Section 3) | Queue-depth scaling not yet needed at this volume; fixed replica count |
| PostgreSQL | 1 primary + 1 async streaming read replica, single AZ acceptable, 2 vCPU / 8 GB (e.g. `db.m6g.large`-class) | Managed service (RDS/Cloud SQL/Azure Database for PostgreSQL) for automated backups/patching from day one — self-hosting Postgres is never in scope, even at pilot scale |
| Redis | 1 managed instance, no cluster mode, 2 vCPU / 6 GB | Single point of failure accepted at this scale; Section 9 defines the graceful-degradation behavior if it goes down |
| Object storage | S3-compatible bucket, standard storage class | Pay-as-you-go; negligible cost at this volume |
| Load balancer | Managed cloud LB (ALB/NLB or equivalent) in front of the API ingress | TLS termination at the LB; no sticky sessions needed (stateless pods) |
| Connection pooling | PgBouncer, transaction pooling mode (Document 8 §6.2) | Deployed even at pilot scale — this is a correctness/architecture decision (Section 2.1), not a scale optimization deferred to later |
| Event bus | Postgres outbox + Redis Streams (Document 8 §5) | Single Redis instance doubles as the stream backend at this volume |

**Cost order of magnitude:** roughly **$1,000–2,500/month** in cloud infra spend (compute + managed Postgres + Redis + LB + storage + egress), before observability/SaaS tooling (logging, APM, error tracking — typically a few hundred dollars more at this scale). This is directional, not a vendor quote, and is broadly similar across AWS/Azure/GCP given the cloud-agnostic Terraform baseline.

### 1.2 Phase 2 — scaling (tens of institutions, tens of thousands of students)

**Target band:** roughly 20–300 institutions, tens of thousands to low hundreds of thousands of total students.

| Component | Sizing | Notes |
|---|---|---|
| Kubernetes | Same region, 2+ node pools (general-purpose + a bursty pool for background workers) | Still single-region; multi-region is a Phase 3 concern (Section 5) |
| Monolith API pods | HPA-driven, floor 5 / ceiling 20–30, target 60–65% CPU utilization | First real horizontal pod autoscaling — see Section 7 for the exact trigger metrics |
| PostgreSQL | **Multi-AZ managed** primary (e.g. RDS Multi-AZ / Cloud SQL HA) + 1–2 read replicas, 8 vCPU / 32 GB primary class | Multi-AZ removes single-AZ failure as an availability risk; replicas absorb reporting/analytics load (Section 2.2) |
| Redis | **Cluster mode**, 3+ shards, replicated | Removes the Phase 1 single-instance SPOF and scales throughput beyond one instance's ceiling |
| CDN | Fronting the public marketing site and static/JS/CSS bundle assets | CloudFront/Cloudflare/Azure CDN/Cloud CDN — provider-agnostic per Section 4 |
| First microservice extraction | **Communication/Notifications** is the most likely first extraction (Document 8 §11.1's bursty-I/O trigger is the one that fires earliest at realistic notification volumes) | Extracted via the Strangler Fig mechanism already defined in Document 8 §11.2 — same Postgres initially, own deployable, own HPA (queue-depth based, not CPU) |
| Event bus | Still Redis Streams unless an extraction has already happened, in which case RabbitMQ/Kafka graduation (Document 8 §5.2) is evaluated alongside that extraction | Graduation is metric-triggered, not automatic just because Phase 2 started |

**Cost order of magnitude:** roughly **$6,000–15,000/month**, scaling with institution count within the band — dominated by the Multi-AZ Postgres upgrade and the Redis cluster, partially offset by the fact that marginal per-tenant infra cost is now falling (Section 8).

### 1.3 Phase 3 — enterprise scale (hundreds–thousands of institutions, millions of students)

**Target band:** 300+ institutions up to the 5,000-institution planning horizon, millions of total students.

| Component | Sizing | Notes |
|---|---|---|
| Kubernetes | **Multi-region**, active-passive by default (active-active considered per-service once a service's data model supports it — see below) | Region selection strategy in Section 5 |
| Monolith footprint | Shrinks over time as Finance, Communication, and AI/Analytics are fully extracted (Document 8 §11.1 triggers all expected to have fired by this scale) | What remains in the monolith (Student, Faculty, Academic, Examination, Library, Hostel, Transport, HR, Placement, Research, Settings) continues to scale via HPA as in Phase 2 |
| PostgreSQL | Multi-AZ primary per region, **read/write splitting** enforced at the repository layer (already the pattern per Document 8 §11.3, just at higher replica counts — 3–5 replicas per region) | Sharding (below) is evaluated only if primary write throughput becomes the bottleneck after replicas and partitioning are both maxed out |
| Dedicated-isolation tenants | Large/regulated Enterprise tenants with `tenants.isolation_mode = 'dedicated_db'` (or, for the largest, a fully separate namespace/cluster) get their own Postgres instance and (optionally) their own K8s namespace, sized to that tenant's actual load | This is the PRD's "Dedicated VPC / Single-Tenant Hosting" add-on (Document 1 §7.3) — Section 8 covers its cost structure |
| Redis | Regional clusters, one per active region | No cross-region Redis replication for cache/session data — session/cache state is regional and disposable by design (Document 8 §7) |
| Event bus | RabbitMQ/Kafka (Document 8 §5.2), by this scale extraction has almost certainly already forced the graduation | Cross-region event replication only where a workflow genuinely spans regions (rare — most tenants are single-region by data-residency design, Section 5) |
| Sharding (contingency, not a Phase 3 default) | If a single regional Postgres primary's **write** throughput becomes the bottleneck even after read-replica offload and the partitioning strategy in Section 2.3, the fallback is sharding by `tenant_id` **hash** (preferred over range — hash gives uniform distribution across shards regardless of tenant size skew) across N physical primaries, with a thin tenant→shard routing layer at the connection-pool level | This is explicitly a reserve strategy, not a committed Phase 3 build. Document 3 §1.4 already notes the shared-schema/RLS model comfortably handles individual tables into the 500M–1B row range with native partitioning; dedicated-isolation migration (above) siphons off the tenants most likely to cause primary contention before platform-wide sharding is ever needed. Sharding is evaluated only after both of those levers are exhausted. |

Whether a given region runs **active-active or active-passive** is decided per deployment, not platform-wide: regions serving tenants under strict data-residency requirements (Section 5) are natively single-region (no cross-region replication of that tenant's data at all — active in exactly one place), while the DR posture for the primary India region is active-passive (Section 5) unless/until write-conflict resolution for a genuinely active-active OLTP Postgres setup is justified by measured cross-region latency pain — that is a deliberately deferred, not rejected, evolution.

---

## 2. Database Scaling Specifics

### 2.1 Connection pooling math (PgBouncer)

Document 8 §6.2 already establishes **PgBouncer in transaction pooling mode** as the non-negotiable connection layer between every API pod/worker and Postgres, and establishes why `SET LOCAL app.current_tenant_id` (not plain `SET`) is what makes transaction pooling safe for RLS. This section adds the actual capacity math.

**Worked example at Phase 2 scale (≈20 API pods):**

| Parameter | Value | Rationale |
|---|---|---|
| Postgres `max_connections` | 500 (typical managed mid-tier instance ceiling) | Vendor default for the instance class in Section 1.2 |
| Reserved (superuser, replication slots, maintenance/backup jobs) | ~50 | Leaves headroom so a maintenance job never gets connection-starved by application traffic |
| Usable budget for application traffic | ~450 | `max_connections` − reserved |
| PgBouncer **transaction-mode** backend pool size (to Postgres) | 100 | The actual number of physical Postgres backend connections PgBouncer maintains — well under the 450 budget, leaving room for the session-mode side-pool below and future replica-relay connections |
| PgBouncer **session-mode** side-pool (LISTEN/NOTIFY relay, advisory locks — Document 8 §6.2) | 15–20 | Small, fixed — only the outbox relay and a handful of coordination processes need it |
| App-side pool per pod (asyncpg pool → PgBouncer) | 20 logical connections | Each pod opens up to 20 logical connections into PgBouncer |
| Logical connections at 20 pods | 20 × 20 = 400 | This is the number that *would* hit Postgres directly without pooling |
| Actual Postgres backend connections consumed | ≤100 (the fixed backend pool) | This is the entire point of transaction pooling: PgBouncer multiplexes 400 logical (pod-side) connections onto 100 physical (Postgres-side) ones, reusing a backend connection the instant one transaction commits and handing it to the next queued transaction |

**The real ceiling is not connection count, it's transaction throughput.** Once pod count grows enough that the 100-connection backend pool is saturated (all 100 mid-transaction at the same instant), additional requests queue briefly inside PgBouncer rather than failing outright — the practical scaling limit is Postgres's CPU/IO capacity to execute transactions, not the raw number of connections. This is why Section 7's Postgres scaling trigger is CPU/IO-based, not connection-count-based: connection exhaustion is a symptom PgBouncer is specifically deployed to prevent from ever becoming the bottleneck first.

At Phase 3 scale (dozens to hundreds of pods per region across the remaining monolith + extracted services), the same math holds per-service: each extracted service (Finance, Communication, AI/Analytics) gets its own PgBouncer backend pool sized against its own instance's `max_connections` budget, rather than all services sharing one pool — this is a direct consequence of the Strangler Fig extraction already separating each service's data ownership (Document 8 §11.2).

### 2.2 Read-replica routing

Extends Document 8 §11.3's explicit-per-query-method routing pattern with the concrete routing rules:

| Traffic class | Routes to | Why |
|---|---|---|
| Transactional writes (fee payment, mark entry, attendance marking, admission) | Primary | Obviously — writes must go to the primary |
| Read-after-write within the same user flow (e.g., "show the invoice I just created") | Primary | Replica lag (typically sub-second, never zero) makes this dangerous to route to a replica; pinned per Document 8 §11.3 |
| Reporting/analytics queries (Section 10, and the AI/Analytics module's aggregate reads) | Replica | These are explicitly tolerant of a few seconds of staleness and are exactly the query shape (large scans, aggregations) that should not compete with OLTP writes for primary I/O |
| Dashboard widget reads (attendance %, fee-collection %, occupancy) | Replica, backed by the Redis hot-read cache (Document 8 §7) first | Cache-aside in front of the replica — replica is the fallback on cache miss, not the first hop |
| Bulk export jobs (Section 3) | Replica | Long-running scans belong nowhere near the primary |
| Admin/audit-log queries | Replica, except where an admin action needs read-after-write consistency (e.g., verifying a just-made config change took effect) | Same rule as row 2 |

Replica lag is monitored continuously (Document 8 §10.3); the specific automated fallback threshold is defined in Section 7's runbook table.

### 2.3 Partitioning strategy for high-volume tables

Document 3 §8/§1.4 already establishes the Phase 1/2 baseline: `audit_logs`, `student_attendance`, `faculty_attendance`, `ai_predictions`, `vehicle_attendance`, and `messages` are **range-partitioned by month** on their timestamp column, with local indexes per partition, enabling cheap `DETACH PARTITION`-based retention instead of slow bulk deletes.

This document adds the **Phase 3 evolution** for these same tables, triggered by Document 3 §1.4's stated row-count threshold (~500M–1B rows in a single logical table):

- **Composite partitioning**: sub-partition each monthly range partition by `tenant_id` **hash** (Postgres native sub-partitioning: `PARTITION BY RANGE (created_at)` at the top level, `PARTITION BY HASH (tenant_id)` within each monthly partition). This keeps individual partition+sub-partition segments small enough for autovacuum and index maintenance to stay fast even as total row count crosses the billion mark platform-wide.
- **Why hash and not tenant-id range for the sub-partition**: institution size is highly skewed (a 200-student coaching institute and a 60,000-student university in the same monthly partition) — range sub-partitioning by `tenant_id` would just recreate the same noisy-neighbor concentration risk one partition level down; hash spreads any single large tenant's rows evenly across sub-partitions.
- **Dedicated-isolation tenants are excluded from this math entirely** — once a tenant is on `isolation_mode = 'dedicated_db'`, its high-volume tables live in its own database with its own partitioning tuned to its own volume, so it never contributes to the shared-tenant partition sizing problem in the first place. This is one of the concrete reasons the dedicated-isolation escalation path (Section 7) exists: it is a scaling release valve for the shared tables, not just a compliance feature.

### 2.4 Vacuum / maintenance at scale

- **Autovacuum tuning per table class**: high-churn, high-volume partitioned tables (`audit_logs`, `attendance`, `notifications`) get per-table `autovacuum_vacuum_scale_factor`/`autovacuum_analyze_scale_factor` overrides tighter than the Postgres default (which is tuned for much smaller tables) — vacuuming a freshly-closed monthly partition promptly matters more than the default's conservative global setting would deliver.
- **Partition-local vacuum** is inherently cheaper than vacuuming one giant unpartitioned table — this is one of the direct operational payoffs of the Section 2.3 partitioning strategy, not just a query-performance one.
- **Closed/archived partitions are `DETACH`ed** (per the Document 3 §8.4 retention table) rather than left attached and periodically re-vacuumed for no benefit — a detached partition exported to cold S3 storage costs zero further vacuum/maintenance cycles.
- **Maintenance windows**: `VACUUM FULL`/major version upgrades are scheduled against the read replica first where feasible (validate, then promote/failover) to avoid a maintenance-window primary outage as tenant count grows and any downtime window affects proportionally more institutions.

---

## 3. Multi-Tenant Noisy-Neighbor Mitigation

Builds directly on Document 8 §6.3 (per-request `statement_timeout` tiered by plan, per-tenant connection pool ceilings, query cost/row-limit guardrails, rate limiting) and Document 7 §11's rate-limit table by tier. This section adds the background-job queue prioritization the backend doc references but doesn't detail.

### 3.1 Query-level enforcement (recap + concrete values)

| Control | Starter | Growth | Enterprise |
|---|---|---|---|
| `statement_timeout` (interactive queries) | 5s | 8s | 15s |
| `statement_timeout` (report/export queries, routed to replica) | 30s | 60s | 120s |
| Per-tenant PgBouncer/app-level connection ceiling | 10 | 30 | 100+ (negotiated) |
| API rate limit (req/min) | 300 | 1,000 | Custom, typically 5,000+ | 

(Rate-limit row restated from Document 7 §11 for context; that document remains the source of truth if the two ever diverge.)

### 3.2 Background job queue prioritization

Celery workers run against **three separate named queues**, each with its own worker pool and its own HPA policy, rather than one shared FIFO queue — this is the mechanism that stops a Starter-tier tenant's bulk CSV import from starving an Enterprise tenant's real-time dashboard refresh:

| Queue | Carries | Worker pool | Autoscaling signal |
|---|---|---|---|
| `realtime` | Exam-result-publish fan-out, live dashboard aggregate recompute, payment-confirmation webhooks, anything a user is actively waiting on | Reserved minimum concurrency, never starved by other queues | Queue depth + oldest-job age; scales aggressively (Section 7) |
| `default` | Standard async work: notification dispatch, document AI pipeline steps, standard report generation | Shared pool, autoscales normally | Queue depth |
| `bulk` | CSV import/export, large data migrations, scheduled batch jobs (payroll runs, month-end reports) | **Concurrency-capped pool**, deliberately not allowed to scale past a fixed ceiling regardless of queue depth | Depth monitored for SLA/alerting purposes only — does not trigger additional worker capacity beyond the cap, by design |

- Every job is tagged with `tenant_id` and `plan_tier` at dispatch time. A tenant-level **concurrent-job ceiling** (already surfaced as the "bulk export/import — max concurrent jobs" row in Document 7 §11: 1 for Starter, 3 for Growth, 10+ for Enterprise) is enforced at dispatch, not just at the queue level — a Starter tenant cannot queue five bulk imports and consume five `bulk`-queue worker slots simultaneously.
- Because `bulk` has a hard concurrency cap independent of demand, a large CSV import (even from an Enterprise tenant) cannot expand to consume workers that `realtime` needs — the isolation is structural (separate pools), not just priority-based (which can still starve under sustained load).
- This queue split is also what makes the Communication module's extraction trigger (Document 8 §11.1 — "a provider outage/latency spike... has any measurable effect on unrelated API p95 latency") detectable and preventable before extraction: bulk notification fan-outs already run in a separate, capped pool from anything latency-sensitive, even while Communication is still inside the monolith.

### 3.3 Escalation path

When the controls above are insufficient — i.e., a specific tenant is still measurably degrading others despite tiered timeouts, connection ceilings, rate limits, and queue isolation — the escalation path is the same one Document 8 §6.3 defines: **dedicated schema → dedicated database → dedicated-isolation deployment** (`tenants.isolation_mode`), triggered by the "single tenant > 15% of platform load" metric in Section 7.

---

## 4. Caching & CDN Strategy at Scale

Extends the Redis cache-purpose table already defined in Document 8 §7 with the scale-specific caching and CDN layer.

### 4.1 What's cacheable vs never-cacheable

| Cacheable | Layer | TTL / invalidation |
|---|---|---|
| Dashboard aggregates (attendance %, fee-collection %, occupancy, enrollment counts) | Redis hot-read cache | Short TTL (seconds–minutes) + event-driven invalidation on the underlying domain event (`attendance.marked`, `fee.paid`, etc.) — Document 8 §7 |
| Permission-lookup results (`role_permissions` resolution) | Redis, versioned keys | Instantly invalidated via `role_version` bump, no TTL dependency for correctness (Document 8 §7) |
| Tenant settings / module-enablement flags | Redis | Event-driven invalidation on `tenant.settings.updated` |
| Public marketing site (sutram.app marketing pages, pricing page, blog) | CDN edge cache | Long TTL (hours), purged on deploy |
| Tenant-branded login page **shell** (logo, theme color, layout — not auth state) | CDN edge cache, keyed per tenant subdomain | Invalidated on `tenant.branding.updated` event via CDN purge API call, same event that already invalidates the Redis settings cache |
| Static JS/CSS bundle assets | CDN edge cache, content-hashed filenames | Effectively immutable (new deploy = new hash = new cache entry, no purge needed) |

| Never-cacheable | Why |
|---|---|
| Financial transactions (payment status, invoice state, ledger entries) | Must always reflect the true current state — a stale cached "payment pending" after a successful payment is a support incident and a trust problem |
| Exam results **before publish** | A cache leak of an unpublished result is a severe integrity/fairness incident, not just a staleness bug — these reads always go direct to the primary with a fresh RBAC/RLS check on every request, no cache layer in the path at all |
| Auth tokens / session validity itself | Verified live against the JWT signature + Redis denylist (or its degraded-mode fallback, Section 9) on every request — never cached as "still valid" |
| Any endpoint returning another tenant's data | N/A by construction — cache keys are always tenant-scoped (`tenant:{tenant_id}:...`), so cross-tenant cache pollution is structurally prevented, not just policy-prevented |

### 4.2 Cache invalidation tied to the event bus

The pattern established in Document 8 §7 — modules invalidate their own cached data by consuming their own domain events rather than relying on TTL alone — is the platform-wide rule, and it's what lets the caching layer scale correctness-safely as event volume grows: invalidation is a **subscriber**, exactly like any other event consumer (Communication, AI/Analytics), so it scales the same way the event bus itself scales (Redis Streams → RabbitMQ/Kafka per Document 8 §5.2) rather than needing a separate scaling story.

### 4.3 CDN specifics at scale

- **Provider-agnostic** per the cloud-agnostic foundational decision — CloudFront, Cloudflare, Azure CDN, or Cloud CDN are interchangeable behind Terraform, selected per target cloud/region.
- **Origin shielding** is enabled once CDN egress volume justifies it (Phase 2+), reducing origin (S3/API) load from cache-miss stampedes across many edge PoPs.
- **Cache-Control headers** are set per-route by the API itself (not a CDN-side override), so cacheability is a property of the endpoint's contract (Section 4.1's table), reviewable in code, not a CDN configuration side-channel that can silently drift from what's actually safe to cache.
- The CDN is explicitly **not** in the path for any authenticated API data endpoint — only the public marketing site, the branding shell of tenant login pages, and static assets ever get edge-cached; every `/api/v1/*` response is `Cache-Control: no-store` by default unless a route explicitly opts in (and per Section 4.1, none of the financial/exam-result routes ever do).

---

## 5. Global / Multi-Region Considerations

### 5.1 Region strategy

- **Primary region: India** (Mumbai, matching `tenants.region` default `in-mumbai` from Document 3), reflecting the product's origin market and the customer concentration described in Document 1's market sizing (K-12, coaching institutes, colleges, and multi-campus trusts concentrated in India/SEA/Middle East/Africa).
- **Expansion regions**: EU and US, activated specifically to serve **Enterprise-tier customers with data-residency requirements** (Document 4 §8.4 already defines this as an Enterprise-tier configurable option — India, EU, or US regional hosting, with tenant data, backups, and DEK material kept resident in the selected region). A new region is stood up via the same Terraform IaC used for the primary region — this is a deliberate design constraint, not an afterthought: no region-specific manual infrastructure is permitted.
- **Latency optimization**: for the dominant India-concentrated customer base, single-region deployment in Mumbai already keeps intra-region latency low for the vast majority of tenants; multi-region is driven by **compliance/residency requirements first, latency second** — an EU tenant's data residency requirement and its latency benefit from EU hosting happen to point the same direction, which is why residency-driven expansion is also latency-sensible expansion.
- **Tenant-to-region routing**: resolved once at tenant provisioning (`tenants.region`) and enforced at the platform-gateway layer — a tenant's traffic, once provisioned into a region, is not silently rerouted cross-region; a region change is a deliberate, audited migration operation.

### 5.2 Disaster recovery

| Phase | DR posture | RPO target | RTO target |
|---|---|---|---|
| Phase 1 | Continuous WAL/PITR backup to the same region's object storage; no warm standby region | ≤ 15 minutes | ≤ 4 hours (restore from backup + redeploy) |
| Phase 2 | Multi-AZ Postgres (automatic same-region failover) + cross-region backup replication to a designated DR region within the tenant's approved residency set | ≤ 15 minutes (backup lag) for cross-region; near-zero for same-AZ failover | ≤ 2 hours for cross-region full recovery; minutes for same-AZ failover (automatic) |
| Phase 3 | Warm standby in a secondary region (active-passive), automated failover runbook, regular DR drills | ≤ 5 minutes | ≤ 30 minutes for a full regional failover |

- **DR region selection always respects data residency**: an EU-resident tenant's DR target is another EU region, never India or US, regardless of which region would otherwise be operationally convenient — Document 4 §8.4's "cross-region replication for DR restricted to regions the tenant has explicitly approved" is enforced at the infrastructure-provisioning layer (Terraform variables per tenant-region binding), not left as a policy-only guarantee.
- **India primary DR target**: a second India-region-compliant location (e.g., a secondary availability region within the same country if the chosen cloud offers one, or an approved secondary Indian region) — full regional failover for the primary region is a Phase 3 capability; Phase 1/2 relies on backup-restore DR for the (rare, monitored) full-region-loss scenario.

### 5.3 Data residency enforcement

Restated from Document 4 §8.4 with the infra-layer mechanics: the `tenants.region` column drives which physical Postgres instance, which S3 bucket/region, and which DEK material a tenant's data ever touches — application code never has a code path that could write a tenant's row to an out-of-region database, because the connection the application holds for that tenant's requests is already bound to the correct region's PgBouncer/Postgres endpoint at the routing layer (Section 5.1). This is a structural guarantee, not a per-query check.

---

## 6. Capacity Planning Model

A concrete formula relating institution count and student volume to required compute/DB capacity, so infra spend can be forecast against the Document 1 growth model.

### 6.1 The formula

```
Total Students (T)        = Σ (institutions × avg students per institution)
Daily Platform Requests    = T × RPSD
  where RPSD (Requests-Per-Student-per-Day, blended)
  = 12  [platform-wide average across student portal, parent portal,
         staff actions performed per enrolled student, AI Assistant
         queries, and notification-triggered reads — a starting
         planning assumption, to be recalibrated against real pilot
         telemetry once Phase 1 usage data exists]

Peak-Hour Requests         = Daily Platform Requests × 0.18
  [18% concentration in the single busiest hour — school-day traffic
   is front-loaded around attendance-taking, fee-window, and
   result-publish moments rather than evenly distributed across 24h]

Peak RPS                   = Peak-Hour Requests / 3600

API Pods Required          = ceil(Peak RPS / 90)   [floor of 3 for HA]
  [90 sustained RPS/pod is the planning capacity per monolith pod
   (1 vCPU / 2GB request class, mixed CRUD+auth workload through
   PgBouncer), assuming pods are run at ~50-60% of theoretical max
   to preserve burst headroom for HPA to react before saturation]
```

### 6.2 Worked scale points

| Institutions | Avg students/inst. | Total students (T) | Daily requests | Peak RPS | API pods (planning) | Postgres primary class | Read replicas | Redis |
|---|---|---|---|---|---|---|---|---|
| 10 | 800 | 8,000 | 96,000 | 4.8 | 3 (HA floor) | 2 vCPU / 8 GB | 1 | Single instance |
| 50 | 1,000 | 50,000 | 600,000 | 30 | 3–4 | 4 vCPU / 16 GB | 1 | Single instance |
| 200 | 1,200 | 240,000 | 2,880,000 | 144 | 6–8 | 8 vCPU / 32 GB, Multi-AZ | 2 | Cluster, 3 shards |
| 1,000 | 1,500 | 1,500,000 | 18,000,000 | 900 | ~40 (across monolith + extracted services) | 16 vCPU class, Multi-AZ, sharding evaluated per Section 1.3 | 3–5 per region | Cluster, 6+ shards, per-region |
| 5,000 | 1,800 | 9,000,000 | 108,000,000 | 5,400 | Full microservices, multi-region, per-service HPA | Sharded (if triggered) or dedicated-isolation-siphoned shared cluster | Region-local, 3–5 each | Regional clusters |

**How to use this table**: it is a planning tool, not a guarantee — actual RPSD, peak concentration, and per-pod capacity should all be recalibrated against real telemetry (Document 8 §10's RED/USE metrics) starting from the first pilot cohort, and the table regenerated quarterly against the then-current Document 1 growth targets. The 10/50-institution rows correspond to the Phase 1 topology (Section 1.1), 200 to Phase 2 (Section 1.2), and 1,000/5,000 to the Phase 3 band (Section 1.3) — the pod/DB sizing in Section 1's tables was in fact derived from this model, not chosen independently, so the two sections are internally consistent by construction.

### 6.3 Storage capacity planning

Separately from request capacity, storage grows roughly linearly with student count and time:

- **OLTP row growth**: attendance (~1 row/student/school-day), notifications (~2–5/student/week), audit log entries (proportional to staff+admin action volume, roughly 0.5–1 row per student-equivalent per day platform-wide) are the dominant high-volume tables — this is exactly why Section 2.3's partitioning strategy targets these specific tables.
- **Object storage**: documents (transfer certificates, ID proofs, marksheets, certificates) average an estimated 2–5 MB/student/year of retained documents at full adoption (higher for institutions using Document AI features heavily) — at 9,000,000 students (Phase 3 upper bound) this is on the order of tens of terabytes/year, well within S3-class economics and requiring no architectural change, only routine capacity/cost monitoring.

---

## 7. Scaling Triggers & Runbook

Every trigger below is a **specific, monitored metric** feeding an **automated or human-escalated action** — no calendar-based or "when it feels slow" triggers, consistent with how Document 8 §11.1 defines the microservice-extraction triggers this table restates and extends.

| # | Metric | Threshold | Action | Automated? |
|---|---|---|---|---|
| 1 | API P95 latency (per route) | > 400ms sustained 10 min | HPA scale-out on the monolith (or the specific extracted service) | Yes |
| 2 | API pod CPU utilization | > 70% sustained 5 min | HPA adds replicas (standard k8s HPA target) | Yes |
| 3 | API pod CPU utilization | < 30% sustained 30 min | HPA scales in (down to the HA floor of 3) | Yes |
| 4 | Postgres primary CPU | > 70% sustained 15 min | Page on-call DBA; provision/scale a read replica; audit slow-query log for the offending query pattern | Semi (alert auto-fires, remediation reviewed) |
| 5 | PgBouncer backend pool utilization | > 80% of configured backend pool busy, sustained 10 min | Increase PgBouncer backend pool ceiling if headroom exists in `max_connections` budget (Section 2.1), else scale Postgres instance class | Semi |
| 6 | Replica lag | > 5 seconds | Auto-pause replica read routing, fall back all reads to primary (Document 8 §11.3); page on-call | Yes (pause) / Semi (root-cause) |
| 7 | Redis memory utilization | > 75% used | Scale Redis instance class or add a cluster shard | Semi |
| 8 | Redis ops/sec | > 80% of instance's rated ops ceiling, sustained | Move to (or add a shard to) cluster mode | Semi |
| 9 | `realtime` queue depth / oldest-job age | Depth > threshold or oldest job age > 30s | Scale `realtime` worker pool (Document 8 §11.4 — queue-depth-based HPA) | Yes |
| 10 | `default`/`bulk` queue oldest-job age | > SLA for that queue class (e.g., bulk import > 30 min) | Alert; `bulk` pool intentionally capped (Section 3.2) so this triggers a review, not auto-scale | Semi |
| 11 | Notification send backlog age | > 15 min for any channel | Alert Communication/on-call; check provider health (Section 9.3); does not block triggering transactions regardless | Semi |
| 12 | Single tenant's share of platform CPU-seconds or request volume | > 15% sustained over a rolling 7-day window | Flag for a dedicated-isolation migration conversation with Enterprise CS/Sales + Platform Eng (Section 1.3, Document 3 §1.4) | Semi (metric auto-flags, decision is human) |
| 13 | Communication module outbound volume | Sustained tens of thousands of messages/day, or any measurable provider-outage effect on unrelated API P95 (Document 8 §11.1) | Trigger Communication extraction planning | Semi |
| 14 | Finance ledger/reporting query contention with OLTP writes | Measurable contention on the primary (Document 8 §11.1) | Trigger Finance extraction planning (compliance findings can also trigger this independently) | Semi |
| 15 | AI job queue depth/latency variance | Requires a scaling policy distinct from request-latency HPA (Document 8 §11.1) | Trigger AI/Analytics extraction planning | Semi |
| 16 | Any shared high-volume table row count | Approaching 500M–1B rows (Document 3 §1.4) | Apply/extend native partitioning (Section 2.3) ahead of query-latency degradation, not after | Semi |
| 17 | SLO error-budget burn rate | Fast-burn alert (e.g., 2% of monthly budget consumed within 1 hour) | Page on-call + incident commander immediately | Yes (alert) |
| 18 | Cross-region P95 latency for a customer concentration outside the current primary region | Sustained above target (e.g., > 300ms) | Evaluate standing up a new region (Section 5.1) | Semi |
| 19 | Postgres primary write throughput | Sustained near instance ceiling even after replica offload (row 4) and partitioning (row 16) are both already applied | Evaluate sharding (Section 1.3) — last-resort trigger, expected to be rare | Semi |

"Semi" actions always auto-fire the **alert**; the remediation itself is executed by an on-call engineer following a documented runbook step, not blindly automated, because most of these (instance resizing, extraction kickoff, sharding) are consequential enough to warrant a human decision gate even though the trigger detection itself is fully automated.

---

## 8. Cost Scaling Model

### 8.1 The general shape of the curve

Infra cost **per tenant** should fall through Phase 1→Phase 2 as shared-infra economies of scale dominate (fixed costs — managed HA Postgres, Redis cluster, K8s control plane, observability stack — amortize across a growing tenant base while marginal cost of one more shared-schema tenant approaches near-zero: mostly proportional storage + proportional compute), then **partially re-diverge** in Phase 3 as a minority of large Enterprise tenants opt into dedicated isolation, which does not benefit from shared-tenant economies by definition.

| Phase | Approx. institutions | Approx. infra cost/tenant/month (shared-tenant tenants) | Why |
|---|---|---|---|
| Phase 1 | 5–20 | $50–150 | Small fixed-cost base spread across very few tenants — highest per-tenant cost of any phase |
| Phase 2 | 50–300 | $15–40 | Fixed costs (Multi-AZ Postgres, Redis cluster, CDN, observability) now amortized across a much larger base |
| Phase 3 (shared-tenant) | 1,000–5,000 | $5–20 | Full economies of scale: regional clusters and extracted microservices scaled to aggregate demand, not per-tenant; this is the target steady-state unit economics |
| Phase 3 (dedicated-isolation Enterprise) | A small minority of the largest Enterprise tenants | Materially higher — dedicated Postgres instance, dedicated backups/DR, dedicated compute, no shared-infra amortization | Directly mirrors the **+40–60% premium over shared pricing** that Document 1 §7.3 already prices the "Dedicated VPC / Single-Tenant Hosting" add-on at — that premium exists specifically to cover this real cost delta plus margin, not as an arbitrary upsell |

### 8.2 Infra cost as % of revenue (COGS target)

- Phase 1: infra COGS can reasonably run **>50% of revenue** for the pilot cohort — this is expected and acceptable; pilot pricing/contracts should not be evaluated on unit economics yet.
- Phase 2: should trend toward a healthy SaaS infra COGS band, **15–25% of revenue**, as shared-tenant economies of scale take hold — this is the range the business-metric targets in Document 1 §3.1 (gross margin implied by churn/ACV targets) assume.
- Phase 3: blended COGS stays in the healthy band for the shared-tenant majority, with the dedicated-isolation minority running a deliberately higher COGS% that is *fully offset* by that segment's pricing premium (Section 8.1) — the platform should never subsidize dedicated isolation out of shared-tenant margin; the add-on pricing is set to prevent exactly that.

---

## 9. Failure Modes & Graceful Degradation

The core design principle: **no single dependency — Redis, the AI/LLM provider, or a notification provider — may ever become a single point of failure for a core ERP transaction** (attendance, fees, exams, admissions). Each is addressed individually.

### 9.1 Redis down

- **Sessions**: JWTs are stateless and RS256-signature-verified (Document 8 §6.1) — they do not require Redis to be validated. Only the **denylist check** (revocation) and "log out everywhere" depend on Redis. On Redis unavailability, the platform **fails open on the denylist check** (a token already issued continues to be honored until its natural ≤15-minute expiry) rather than failing closed and locking every user out — the exposure window is bounded to the access-token TTL, an accepted and small risk versus a full platform login outage.
- **Rate limiting**: fails open (temporarily permissive) rather than blocking all traffic — a brief window of unenforced rate limits is preferable to Redis unavailability taking down the whole API.
- **Hot-read cache** (dashboard aggregates, permission lookups, settings): cache-aside reads fall through to Postgres directly on every miss. Functionally correct, higher latency and higher Postgres load — this is the expected "degrade to DB-backed reads" behavior, and it's exactly why Section 7's Postgres CPU trigger (row 4) exists as a safety net if a prolonged Redis outage pushes replica/primary load up.
- **Event bus** (Phase 1, Redis Streams): a Redis outage does pause the outbox relay's stream delivery; the **Postgres outbox table itself is the durable source of truth** (Document 8 §5), so no event is lost — delivery resumes and catches up once Redis recovers. This durability property is exactly why the outbox pattern was chosen over a Redis-only queue.

### 9.2 AI / LLM provider down

- The AI Assistant UI shows an explicit **"AI Assistant temporarily unavailable"** state; no other module's UI or API is affected.
- Enforced structurally, not just by convention: the AI/Analytics module is architecturally decoupled (Document 8 §4.2) — it consumes events asynchronously and exposes only a narrow sync read API that nothing else's request path depends on synchronously. There is no code path in Student, Faculty, Academic, Examination, Finance, or any other core module that calls out to the LLM provider inline.
- A **circuit breaker** (Document 8 §12's "every outbound call to an external provider is wrapped with timeouts, retry-with-backoff, and a circuit breaker" pattern) trips on repeated LLM provider failures, short-circuiting further attempts and surfacing the unavailable state immediately rather than letting every request hang on a timeout.
- AI-driven predictive insights/dashboards degrade to their last-computed snapshot (already stored, per Document 3's `ai_predictions`/analytics-snapshot tables) rather than disappearing outright, where a stale-but-labeled snapshot is more useful than a blank widget.

### 9.3 Notification provider (SMS/WhatsApp/email) down

- Restates and confirms Document 8 §12's existing design: outbound provider calls are wrapped in timeout + retry-with-backoff + circuit breaker. On sustained provider failure, sends are **queued for retry**, not dropped.
- **The triggering business transaction always commits independently of notification delivery.** A fee payment, an exam-result publish, or an admission approval is a completed, correct database transaction the instant its own module's write succeeds — the notification is a downstream, asynchronous side effect (event-consumed by the Communication module, Document 8 §4.2) that can fail, retry, or arrive late without ever rolling back or blocking the transaction that triggered it.
- Multi-provider failover (e.g., a secondary SMS/WhatsApp provider) is a Phase 2+ resilience investment once notification volume is high enough that a single provider's extended outage would create a visible backlog — tracked as part of the Communication module's own extraction readiness (Section 7, row 13).

### 9.4 Other failure modes (brief)

| Failure | Behavior |
|---|---|
| Postgres primary instance failure | Managed-service automatic failover to standby (Multi-AZ, Phase 2+) or restore-from-backup (Phase 1, per Section 5.2's RTO/RPO table) |
| Single AZ failure | Absorbed transparently by Multi-AZ Postgres and multi-node K8s worker pools (Phase 2+); Phase 1 pilot accepts single-AZ risk explicitly (Section 1.1) |
| K8s node failure | Pod rescheduling onto healthy nodes; HA floor (3 pods minimum) ensures no full-outage window from a single node loss |
| CDN edge outage | Falls back to origin fetch (standard CDN behavior); only affects marketing/static/branding-shell assets, never authenticated API traffic (Section 4.3) |
| S3/object storage unavailable | Document upload/download and report-export delivery degrade (queued, retried); no core academic/financial transaction depends synchronously on object storage being reachable |

---

## 10. Long-Term Architecture Evolution Notes

### 10.1 Data warehouse for Analytics

The OLTP Postgres + read replicas + materialized snapshot tables (Document 3's `ai_predictions`/analytics-snapshot pattern) is sufficient through Phase 1 and most of Phase 2. A **dedicated OLAP data warehouse**, separate from the OLTP system of record, becomes worth introducing once any of the following is true:

- Cross-tenant-safe aggregate reporting (platform-wide benchmarking features, Pragyaan Labs' own product analytics) needs joins/aggregations across large fact tables in shapes that don't fit the OLTP schema's indexing strategy and would otherwise contend with live OLTP/replica traffic.
- Enterprise customers request direct BI-tool connectivity (Looker/Power BI/Tableau) — this should never point at the OLTP replica directly, both for load-isolation reasons and because a warehouse's semantic/access layer is the right place to re-enforce tenant isolation for a BI tool, not an ad hoc grant on the replica.
- Analytics report execution volume (Document 7 §11's per-tier daily execution limits: 20/200/unbounded) grows enough that even replica-routed reporting queries (Section 2.2) start requiring their own dedicated scaling story distinct from the OLTP replica fleet.

**Recommended shape when triggered**: a columnar warehouse (cloud-native — Redshift/BigQuery/Snowflake — or a cost-controlled self-hosted option like ClickHouse, chosen per the cloud-agnostic principle at the time), fed via CDC from the Postgres outbox events plus scheduled batch export from read replicas — never a direct live query path from BI tools into OLTP. **`tenant_id` remains a first-class partition/cluster key in the warehouse**, and RLS-equivalent row-level security is enforced at the warehouse's semantic layer — moving to a warehouse must not be allowed to quietly weaken the tenant-isolation guarantee that RLS provides in the OLTP system.

### 10.2 Vector store scaling for AI RAG

Document 8 §8.3 already states the trigger: "if/when embedding volume or query latency outgrows `pgvector` on the primary, a dedicated vector store becomes one of the concrete triggers for extracting AI/Analytics into its own service." This document adds the concrete evolution path:

- **Phase 1/2**: `pgvector` co-located on the OLTP primary (HNSW or IVFFlat index), scoped per `tenant_id`/`entity_id` as already defined — adequate while embedding counts are in the low millions platform-wide and RAG query latency stays within target.
- **Phase 3 trigger point**: embedding volume crossing roughly tens of millions of chunks platform-wide, or RAG retrieval P95 latency exceeding target, whichever comes first — consistent with the AI/Analytics extraction trigger in Document 8 §11.1.
- **Phase 3 shape**: a dedicated vector store (either a managed vector database or `pgvector` on a Postgres instance dedicated to the now-extracted AI/Analytics service, sized and indexed independently of the OLTP primary), **still partitioned/namespaced by `tenant_id`** so the same tenant-isolation guarantee the RLS model provides today carries forward unchanged even though the underlying storage engine has changed — isolation guarantees migrate with the data, they are never a casualty of an infrastructure swap.
