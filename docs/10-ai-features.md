# Sutram — Document 10: AI Features

**Product:** Sutram — AI-native Education Operating System
**Vendor:** Pragyaan Labs
**Related documents:** 01-PRD, 02-Information Architecture, 03-Database Design, 04-RBAC & Security. An API Design document is referenced throughout as the surface the AI Assistant calls; where this document says "the API," it means the same REST API and permission model defined in Documents 03-04.

---

## Table of Contents

1. AI Product Philosophy
2. Feature Catalog by Module
3. AI Assistant Architecture
4. Predictive Analytics Architecture
5. Human-in-the-Loop & Trust
6. Data Privacy for AI
7. Phasing

---

## 1. AI Product Philosophy

### 1.1 The core bet: embedded, not bolted-on

Most competitors treat "AI" as a chatbot bubble parked in the corner of the screen — a separate destination a user has to remember to visit, disconnected from the record they were just looking at. Sutram's thesis is the opposite: **AI should surface inside the workflow where the decision already happens, and a standalone assistant should exist in addition to that, not instead of it.**

Concretely, this means two AI surfaces coexist by design:

- **Embedded AI** — inline suggestions, auto-drafts, and flags that appear on the screen a user is already working on, triggered by system events, not by the user asking a question. Example: when `attendance.marked` produces three consecutive absences for a student, a "Draft parent notification" card appears directly on that student's Attendance tab — the faculty member reviews and sends it in two clicks, without ever opening a chat window.
- **Conversational AI** — the AI Assistant (Section 3), a role-scoped chat interface for open-ended questions and multi-step requests that don't map to a single screen ("show me top 5 fee defaulters this month," "draft a leave-approval email for Priya").

Both surfaces are backed by the **same underlying tool-calling layer** against the same API — embedded AI is simply the Assistant's capabilities pre-triggered by an event and pre-scoped to the record on screen, rather than invoked through a chat prompt. This keeps the two surfaces consistent instead of being two independently-built AI stacks that drift apart.

### 1.2 Guardrails: AI suggests, humans approve high-stakes actions

Sutram is a system of record for grades, money, and communication with parents/guardians of minors. An AI system that is occasionally wrong and fully autonomous in that context is a liability, not a feature. The platform-wide rule:

> **No AI output that changes a grade, moves money, or sends a parent/guardian-facing message at scale takes effect without an explicit human approval step.**

This is enforced structurally, not by prompt instruction:

- Every AI action is tagged at the API layer as either **`advisory`** (read-only suggestion/insight — e.g., a risk score, a matching recommendation) or **`actionable`** (would create/modify a record if executed).
- Every `actionable` AI output further carries a **stakes tier**: `low` (e.g., auto-tag a support ticket category), `medium` (e.g., draft a reminder to one parent), `high` (e.g., publish a grade, approve a fee waiver, send a bulk announcement to 500 parents).
- `low`-stakes actionable outputs may auto-apply with a visible "AI-applied" badge and one-click undo.
- `medium`- and `high`-stakes actionable outputs are **always written to a pending-approval queue** first (`ai_suggestion` state in the relevant table, or a dedicated `ai_action_queue` — see Section 5) and only take effect once a human with the requisite permission clicks Approve. The AI never calls the underlying write endpoint directly for these; it calls a "propose" endpoint that produces a reviewable draft.
- The human approver is always a role that would have had permission to take that action manually anyway — the AI Assistant's tool layer is RBAC-scoped to the acting user (Section 3.3), so it can propose a grade change for a faculty member's own course, but it cannot propose one for a course that faculty member doesn't teach.

### 1.3 Explainability as a product requirement, not a nice-to-have

Every AI score or recommendation that affects a real person (a student flagged at-risk, a fee-default probability, a shortlisting rank) ships with a **human-readable reason**, generated alongside the score, not retrofitted. "72% dropout risk" without a reason is not shippable in Sutram; "72% dropout risk — 3 missed fee deadlines in the last 60 days, attendance down 15 points over the last month, 2 consecutive failed internal assessments in Mathematics" is the minimum bar (elaborated in Section 4.3).

### 1.4 Model-agnostic by design

Sutram does not hard-couple its product experience to one LLM vendor. The philosophy (detailed architecturally in Section 3.1) is that swapping the underlying model — Claude, GPT, an open-weight model self-hosted for a data-residency-constrained Enterprise tenant — should be an infrastructure change, not a rewrite of every feature that touches AI.

---

## 2. Feature Catalog by Module

Legend for **Technique**: `Rules` = deterministic rules/thresholds (no ML); `ML` = classical ML (gradient-boosted trees, logistic regression, embeddings + cosine similarity); `LLM` = generative language model; `Hybrid` = a classical model producing a structured result that an LLM then explains/drafts in natural language.

### 2.1 Admissions

| Feature | Roles | Technique | Input Data | Output | Trigger |
|---|---|---|---|---|---|
| AI application screening/ranking | `institution_admin`, `registrar`, `principal`, `dean` | Hybrid — ML scoring model (prior academic scores, entrance test scores, program-fit features) ranks; LLM drafts a one-paragraph rationale per applicant | Application form fields, uploaded transcripts (post-Document AI extraction), entrance test scores, program capacity/cutoff config | Ranked applicant list with a fit score (0-100) and a rationale string per applicant; advisory only — admission decisions remain a human action | User action: `admissions.review_queue.rank` (registrar opens the review queue) OR event `admission.application.submitted` (async pre-scoring so the queue is ready when opened) |
| Duplicate application detection | `registrar`, `institution_admin` | ML — fuzzy matching (name/DOB/guardian-contact/document-hash similarity) + record-linkage classifier | Applicant name, DOB, phone, email, guardian details, uploaded ID document hash, across current and prior admission cycles | Flagged duplicate/possible-duplicate clusters with a confidence score and the matched fields highlighted | Event: `admission.application.submitted` (runs synchronously before the application is accepted into the queue) |

### 2.2 Students

| Feature | Roles | Technique | Input Data | Output | Trigger |
|---|---|---|---|---|---|
| Dropout/at-risk prediction | `institution_admin`, `principal`, `dean`, `hod`, `faculty` (own students), `student`/`parent` (own record, read-only) | ML — classical gradient-boosted classifier (not an LLM: this is a tabular, feature-engineered problem where classical ML is both more accurate and cheaper to explain) | Attendance % (trailing 30/60/90-day), grade trend across assessments, fee payment history/delinquency, LMS/engagement signals, prior-term outcome | Risk category (`academic`/`attendance`/`financial`/`dropout`/`wellbeing`) + `risk_level` (`low`/`medium`/`high`/`critical`) + `contributing_factors` — written to the `risk_scores` table (Doc 03 §5.13) | Scheduled batch job (nightly) + event-driven incremental recompute on `attendance.marked`, `fee.paid` (or missed), `exam.result.published` |
| Personalized learning path suggestions | `student`, `faculty` (co-view for advising) | Hybrid — ML similarity/clustering on peer performance patterns + LLM to phrase the recommendation | Student's grade history by subject, strengths/weak-topic breakdown from exam-question-level tagging, elective/course catalog, peer cohort outcomes (anonymized/aggregated) | Ranked list of recommended electives/remedial modules/study resources with a plain-language "why this" explanation | User action: student opens Student Assistant or the Academics "Recommended for you" panel |

### 2.3 Attendance

| Feature | Roles | Technique | Input Data | Output | Trigger |
|---|---|---|---|---|---|
| Anomaly detection (unusual absence patterns) | `faculty`, `hod`, `hostel_warden` (hostel-linked absence), `institution_admin` | ML — statistical/time-series anomaly detection (e.g., sudden deviation from a student's own rolling baseline, or a whole-section deviation suggesting a data-entry or scheduling issue) | Per-student and per-section attendance time series | Anomaly flag with type (`individual_pattern_break`, `section_wide_drop`, `possible_marking_error`) and the deviation magnitude | Event: `attendance.marked` (evaluated as part of the nightly aggregation, with same-day evaluation for section-wide anomalies to catch marking errors quickly) |
| Auto-generated parent alerts | `faculty`, `hod` (approve/send), `parent` (recipient) | Hybrid — Rules engine decides *when* (e.g., 3 consecutive absences, or weekly % below a configurable threshold); LLM drafts the *message text* in the parent's preferred language/channel tone | Attendance threshold breach event, student name, subject/section, historical alert count (to avoid alert fatigue) | Drafted notification (SMS/WhatsApp/email/in-app) queued for approval | Event: `attendance.marked` crossing a configured threshold rule |

### 2.4 Examinations

| Feature | Roles | Technique | Input Data | Output | Trigger |
|---|---|---|---|---|---|
| AI-assisted grading for subjective answers | `faculty`, `teaching_assistant` (grade, subject to review), `hod` (spot-audit) | LLM-based, **human-in-the-loop mandatory** — the model never publishes a grade on its own | Scanned/typed subjective answer text (post-OCR if handwritten), the model answer/rubric, max marks per rubric criterion | Suggested marks per rubric line + suggested overall score + a justification citing which rubric criteria were met/missed; state = `pending_review`, never `published` | User action: faculty opens "AI-assist" on an ungraded answer script within the grading workspace |
| Automated question paper generation | `faculty`, `hod`, `registrar` (exam-cell) | Hybrid — Rules/constraint-solver selects questions from the tagged question bank to satisfy blueprint constraints (topic weightage, difficulty distribution, marks total, no-repeat-from-last-N-papers); LLM used only to generate *new* candidate questions when the bank is thin on a topic, which then requires faculty approval before entering the bank | Question bank (tagged by topic/difficulty/Bloom's level/marks/last-used), exam blueprint (topic weightage, total marks, duration) | A generated paper matching the blueprint, with per-question source tags (existing bank item vs. AI-generated-pending-approval) | User action: faculty/exam-cell initiates "Generate paper" from a blueprint |
| Plagiarism detection | `faculty`, `hod`, `dean` | ML — text-similarity (n-gram/embedding-based) against a corpus of submitted answers in the same batch, prior-year submissions, and (where licensed) external sources | Submitted subjective answer text / assignment text | Similarity score per pair/source with matched passages highlighted; advisory — never auto-penalizes | User action: faculty runs "Check originality" on a submission batch, OR event `exam.submission.received` for async pre-screening |

### 2.5 Fees & Finance

| Feature | Roles | Technique | Input Data | Output | Trigger |
|---|---|---|---|---|---|
| Fee-default risk scoring | `accountant`, `institution_admin`, `principal` | ML — classical classifier (payment-history features), same modeling family as dropout risk but a distinct `risk_category = 'financial'` model | Payment history (on-time/late/missed by installment), outstanding balance vs. income-bracket/scholarship flags (where captured), prior-term default status, family/sibling account linkage | `risk_scores` entry (`financial` category) with level and contributing factors (e.g., "2 of last 3 installments paid >15 days late; ₹18,500 currently overdue") | Event: `fee.paid` (recompute on payment activity) + scheduled batch on installment due-dates |
| AI-drafted payment reminder messages | `accountant` (approve/send) | LLM — drafts tone-appropriate reminder text (first notice vs. escalated notice differ in tone), parameterized by the risk score and days-overdue | Fee-default risk score, days overdue, amount, prior reminder count, channel preference | Drafted SMS/WhatsApp/email queued for approval; escalation tone auto-selected by overdue tier but never auto-sent | Event: `fee.paid` deadline missed (i.e., an expected `fee.paid` event does not occur by the due date, detected by the fee-schedule scheduler) |
| Anomaly detection in expense/budget data | `accountant`, `institution_admin` (Finance module) | ML — statistical outlier detection on expense line items vs. category/vendor/department historical baselines | Expense transactions (amount, category, vendor, department, approver, date), budget allocations | Flagged transactions (e.g., "3.2x the department's monthly average for this category," "new vendor, high first transaction amount") for manual review; never auto-blocks a transaction | Event: expense/transaction recorded in Fees & Finance module (batch nightly + real-time flag for transactions above a configurable absolute threshold) |

### 2.6 Faculty

| Feature | Roles | Technique | Input Data | Output | Trigger |
|---|---|---|---|---|---|
| Workload/timetable optimization suggestions | `hod`, `registrar`, `institution_admin` | ML/Optimization — constraint solver (room capacity, faculty load caps, no double-booking, preference weighting) over the timetable search space | Faculty teaching loads, room/lab availability, course-section enrollment, faculty preferences/blackout slots, prior-term timetable as a warm-start | A generated draft timetable + a workload-balance report flagging over/under-loaded faculty; requires HOD/registrar approval before publishing | User action: HOD/registrar initiates "Generate timetable" for a term, OR event `academics.term.opened` for pre-draft generation |
| Performance insight summaries | `faculty` (self), `hod`, `dean`, `principal` | Hybrid — ML aggregates metrics (section pass rates, average feedback score, grading turnaround time trend); LLM narrates the summary | Section-level exam outcomes, student feedback scores, grading turnaround times, attendance-marking punctuality | A narrative summary ("Your Semester 3 sections averaged 78% pass rate, up 6 points from last term; grading turnaround improved to 4.2 days average") with the underlying metrics linked | User action: opens Faculty Assistant or the "My Performance" panel; also generated on a scheduled cadence (end of term) as a digest |

### 2.7 Placement

| Feature | Roles | Technique | Input Data | Output | Trigger |
|---|---|---|---|---|---|
| Student-job matching | `placement_officer`, `student` (own matches), `dean` | ML — embedding-based similarity (resume/skills/academic-record embedding vs. job-requirement embedding) + hard-filter on eligibility rules (CGPA cutoff, branch, backlog status) | Student profile (skills, resume text, academic record, certifications), job posting requirements (skills, eligibility criteria, role description) | Ranked list of matched students per job (or matched jobs per student) with a similarity score and matched/missing-skill breakdown | Event: `placement.job.posted` (batch match) + on-demand re-match when a student profile is updated |
| Interview readiness scoring | `placement_officer`, `student` (own score) | Hybrid — ML score from mock-interview and assessment signals; LLM generates targeted improvement feedback | Mock interview scores/feedback history, resume completeness, technical assessment/aptitude test results, communication-skill assessment (if captured) | Readiness score + specific improvement areas ("Strong technical assessment score; resume lacks quantified project outcomes; schedule a mock interview — none completed yet") | User action: student or placement officer opens the Interview Readiness panel; recomputed on new mock-interview/assessment data |

### 2.8 Research

| Feature | Roles | Technique | Input Data | Output | Trigger |
|---|---|---|---|---|---|
| Literature/publication matching | `researcher`, `faculty`, `hod` | ML — embedding-based semantic search over publication abstracts/keywords | Researcher's prior publications/keywords/research interests, external publication metadata (title/abstract/keywords, via integrated academic-index API) | Ranked list of relevant recent publications/potential collaborators with a relevance score | User action: researcher opens the Research module's "Related work" panel, OR scheduled digest on a set cadence |
| Grant-opportunity matching | `researcher`, `hod`, `dean` | ML — embedding-based similarity between researcher/department profile and grant call descriptions, with hard-filter on eligibility (funding agency, discipline, career stage) | Researcher/department profile (discipline, prior grants, publication record), grant call database (integrated external feed) | Ranked matched grant opportunities with deadline and eligibility rationale | Scheduled batch (new grant calls ingested) + on-demand search |

### 2.9 Communication

| Feature | Roles | Technique | Input Data | Output | Trigger |
|---|---|---|---|---|---|
| AI-drafted announcements/emails | `institution_admin`, `principal`, `registrar`, `hod`, `faculty`, `hr_manager` (any role with Communication compose permission) | LLM — drafts full message from a short prompt/bullet list, matched to the target audience's tone (parent-facing vs. staff-facing) | User's brief/intent, target audience/segment, relevant record context (e.g., event details, policy being announced) | Drafted message (subject + body, multi-channel variants for email/SMS/WhatsApp/in-app) in the compose window, editable before send; bulk sends to parents are `high`-stakes and require the Section 1.2 approval gate even when the drafting role has send permission for smaller audiences | User action: clicks "Draft with AI" inside the Communication compose screen |
| WhatsApp/SMS auto-responses via chatbot | `student`, `parent` (external channel users); monitored by `institution_admin`/front-office role internally | LLM with tool-calling (same architecture as Section 3), scoped to FAQ-type and self-service read queries only over WhatsApp/SMS | Inbound message text, sender's linked identity (student/parent record, resolved via registered phone number), FAQ knowledge base, permitted read-only API calls | Auto-reply text; anything beyond a scoped read query (e.g., a complaint, a request to change a grade) is escalated to a human queue rather than answered | Event: inbound WhatsApp/SMS message received on the institution's registered number |

### 2.10 AI Assistant (flagship — see Section 3 for full architecture)

| Feature | Roles | Technique | Input Data | Output | Trigger |
|---|---|---|---|---|---|
| AI Chatbot (general assistant) | All internal roles, `student` | LLM + RAG + function-calling | User's natural-language query, conversation history, tool-call results from the API (scoped to caller's RBAC) | Conversational answer, optionally with an inline action card (e.g., a draft to approve) | User action: message sent in `/app/ai/chatbot` |
| Student Assistant | `student` | LLM + RAG + function-calling, scoped to the student's own records | "When is my next exam and what's my attendance %?" | Direct answer pulled live via `GET /exams/upcoming` and `GET /attendance/summary` scoped to `own_user_id` | User action: message sent in `/app/ai/student-assistant` |
| Faculty Assistant | `faculty` | LLM + RAG + function-calling, scoped to the faculty member's assigned sections/courses | "Draft a leave-approval email for Priya" | Drafted email queued in Communication for send, referencing the actual leave request record via a tool call | User action: message sent in `/app/ai/faculty-assistant` |

### 2.11 Document AI

| Feature | Roles | Technique | Input Data | Output | Trigger |
|---|---|---|---|---|---|
| OCR + structured extraction | `registrar`, `institution_admin`, `student`/`parent` (self-upload during admissions/enrollment), `hr_manager` (staff document onboarding) | ML/LLM hybrid — OCR engine extracts raw text/layout; a document-understanding model classifies document type (mark sheet, ID proof, certificate) and extracts structured fields against a per-type schema | Uploaded document image/PDF (mark sheet, Aadhaar/passport/ID, prior degree certificate, etc.) | Structured field set (name, DOB, marks-by-subject, document number, issue authority, etc.) with a per-field confidence score; low-confidence fields are flagged for manual correction before the form auto-fills | User action: file uploaded in an admissions/enrollment/HR onboarding form's document field |

### 2.12 Voice AI

| Feature | Roles | Technique | Input Data | Output | Trigger |
|---|---|---|---|---|---|
| Voice-to-text for accessibility and quick data entry | `faculty` (voice-marking attendance), any role for voice-driven Assistant queries, accessibility users platform-wide | ML — speech-to-text model, optionally paired with the same function-calling layer as the AI Assistant for voice commands | Audio stream/clip, target field/context (e.g., attendance roster for the active section) | Transcribed text, or for voice-marking attendance, a structured attendance-marking action routed through the same tool-calling/RBAC layer as a typed request (never a direct DB write) | User action: microphone activated on a supported screen (Attendance marking, any AI Assistant surface, form fields with voice-input enabled) |

---

## 3. AI Assistant Architecture

The AI Assistant is the flagship conversational surface (AI Chatbot, Student Assistant, Faculty Assistant, and the tool-calling layer underlying Document AI/Voice AI voice-commands and the embedded-AI surfaces in Section 1.1). Its architecture is described once here rather than per-screen, because all AI Assistant screens share one backend.

### 3.1 LLM provider abstraction (model-agnostic)

- All LLM calls go through an internal **Model Gateway** service — application code never calls a vendor SDK directly. The gateway exposes a stable internal interface (`complete(messages, tools, system_prompt, tenant_context) -> response`) and translates it to the specifics of whichever provider is configured.
- Provider is configurable **per tenant, per use case**, not globally hardcoded: an Enterprise tenant with a data-residency requirement can be routed to a self-hosted/regional model for RAG-sensitive queries, while a Starter tenant's basic FAQ chatbot routes to a low-cost hosted model — this is also the mechanism behind the PRD's "model-routing to cost-efficient models for high-volume/low-complexity AI tasks" margin-protection strategy (Doc 01 §11).
- Supported provider classes at launch: Anthropic Claude (default), OpenAI GPT-class, with the gateway interface designed so a self-hosted open-weight model can be added as a third backend without touching feature code — swapping the model is a Model Gateway configuration change, not a per-feature code change.
- Prompt templates, tool schemas, and system prompts are stored centrally and versioned, independent of which model backend serves a given request, so behavior stays consistent across a provider swap and A/B provider comparisons are possible.

### 3.2 RAG over tenant-scoped data

- Sutram uses a **tenant-filtered shared vector store** (not one physical vector DB per tenant) for cost/operational efficiency at Starter/Growth scale, with every vector record carrying a mandatory `tenant_id` metadata field. Enterprise tenants requiring stronger physical isolation (data-residency contracts) can be provisioned a **dedicated per-tenant vector store** — the retrieval interface is identical either way, so this is a deployment-topology choice, not an application-logic branch.
- **Every retrieval query is issued with a mandatory `tenant_id` filter applied at the vector-store query layer itself** (not filtered post-retrieval in application code) — mirroring the RLS backstop pattern used for the primary database (Doc 04 §4.3). A missing or spoofed tenant filter fails closed (query rejected), not open.
- What gets embedded/indexed: institution policy documents, handbooks, FAQ knowledge base, course syllabi, and — critically — **not** raw student PII by default. Structured, per-record facts (a specific student's attendance %, a specific fee balance) are **never** pre-embedded into the vector store; they are fetched live via function-calling (Section 3.3) at answer time. This deliberately keeps the vector store to institution-level/policy-level knowledge, which shrinks the cross-tenant-leakage blast radius considerably: even a retrieval-filter bug would surface policy text, not another tenant's student's grades.

### 3.3 Function/tool-calling with RBAC enforcement at the tool-call layer

This is the architectural core of the Assistant and the primary defense against an AI feature ever doing something the human user isn't allowed to do.

- The Assistant does not have standing database access. Its only way to read or write data is by invoking **tools**, and every tool is a thin wrapper around an existing REST API endpoint from the platform's API layer (same endpoints, same middleware stack, as a normal UI request) — not a separate AI-only backdoor path.
- **The tool-call is executed with the requesting user's own JWT/session context**, carrying the same `sub`, `tenant_id`, and `role` claims described in Doc 04 §5.5. The LLM chooses *which* tool to call and with *what arguments*; the API layer then runs the exact same RBAC/ABAC permission check (Doc 04 §1.3) and Row-Level Security backstop (Doc 04 §4.3) it would run for a click in the UI. **The LLM has no privilege the human user lacks, and no path exists for the LLM to call an endpoint the API gateway wouldn't have authorized for that user directly.** This is the load-bearing guarantee: RBAC enforcement lives at the API boundary, not in the prompt, so a jailbroken or manipulated model still cannot exceed the calling user's actual permissions.
- A faculty member's Assistant session therefore literally cannot fetch another faculty member's section data, exactly as a faculty member cannot open that data in the regular UI — not because the model was told not to, but because the underlying `GET /attendance?section_id=X` call 403s under the faculty member's own token if `X` isn't in their assigned sections.
- Tool catalog is scoped per role at the gateway level too, as a defense-in-depth/UX layer above the hard API check: a `student` session is only offered read-oriented, self-scoped tools (`get_my_attendance`, `get_my_exam_schedule`, `get_my_fee_balance`); a `faculty` session is additionally offered section-scoped read tools and `propose_*` write tools (`propose_leave_approval_email`, never a raw `send_email` with no draft step) that terminate in the Section 1.2 approval queue for anything above `low` stakes.
- Every tool call and its result is logged (request args, resolved scope, response, latency) to support both debugging and the audit trail in Section 5.

### 3.4 Conversation memory/session handling

- Each conversation is a persisted session (`ai_conversation_id`) scoped to `tenant_id` + `user_id`, with message history stored server-side (not just client-side) so a user can resume a conversation across devices/sessions, subject to the same encryption-at-rest requirements as other tenant data (Doc 04 §7.1).
- Context window management: recent turns are passed in full; older turns are summarized (LLM-generated rolling summary) once the conversation exceeds a token budget, keeping cost bounded on long-running sessions without silently truncating context the user still expects the Assistant to remember.
- Conversation history itself is treated as tenant data subject to retention/export/erasure rules (Section 6) — a right-to-erasure request for a user includes their AI conversation history.
- Sessions expire/lock to the same tenant+role context as the underlying auth session; if a user's role or tenant assignment changes mid-conversation (rare, but e.g. a permission downgrade), the next tool call re-resolves against current permissions, not cached ones — there is no "remembered" elevated privilege from earlier in the conversation.

### 3.5 Guardrails against prompt injection and cross-tenant data leakage

Multi-tenant SaaS is an explicit, named risk here, not an afterthought:

- **Cross-tenant leakage defenses (defense-in-depth, matching the three-layer model in Doc 04 §4):**
  1. *Application layer*: every tool call carries the requester's verified `tenant_id`; tool implementations route through the same tenant-scoped repository layer as the rest of the app (Doc 04 §4.2) — there is no raw-query path available to a tool.
  2. *Database layer*: Postgres RLS (Doc 04 §4.3) applies to any row a tool call touches, regardless of what the LLM "intended" to query — this is the backstop that holds even if a tool's implementation has a bug.
  3. *Retrieval layer*: vector-store queries are hard-filtered by `tenant_id` at the query layer (Section 3.2), not left to the LLM to "remember" to scope correctly.
  4. The system prompt is templated per-request with the tenant/user context injected by the backend (not user-suppliable), and the model is never given another tenant's identifiers to reason about in the first place — you cannot leak what was never in context.
- **Prompt injection defenses:**
  - Untrusted content the model reads (a document uploaded by a user, an inbound WhatsApp message, retrieved knowledge-base text) is wrapped and clearly delimited as *data*, never concatenated into the *instruction* portion of the prompt, and the system prompt explicitly instructs the model to treat content inside those delimiters as non-authoritative.
  - Tool definitions are the actual security boundary (Section 3.3), so even a fully successful injection that convinces the model to "try" a disallowed action still fails at the API's permission check — injection resistance in the prompt is a UX/reliability concern here, not the last line of defense.
  - Output filtering: responses are scanned for patterns indicating leaked system-prompt content, tool schemas, or credential-shaped strings before being returned to the client.
  - High-risk tool calls (anything above `low` stakes per Section 1.2) always land in the approval queue regardless of how the model was prompted to request them — injection cannot skip the human gate because the gate is enforced by the API, not by the model choosing to be careful.
  - Rate limiting and anomaly monitoring on tool-call patterns (e.g., a session attempting many distinct students' record lookups in rapid succession) feed the same abuse-prevention monitoring as Doc 04 §10, flagging potential scraping/enumeration attempts even when each individual call is technically authorized.
- **External-channel hardening**: the WhatsApp/SMS auto-responder (Section 2.9) is a stricter subset of the Assistant — inbound messages are unauthenticated by definition (a phone number, not a logged-in session), so its tool catalog is restricted to read-only, self-scoped-by-registered-number queries only, with no write/propose tools reachable from that channel at all.

### 3.6 High-level request flow

```
User message (chat / WhatsApp / voice transcript)
        │
        ▼
Auth/session context resolved (tenant_id, user_id, role) — same as any API request
        │
        ▼
Model Gateway: system prompt (templated + tenant-scoped) + conversation history
  + RAG retrieval (tenant-filtered vector search, policy/knowledge content only)
        │
        ▼
LLM reasons → selects tool(s) from the role-scoped tool catalog + arguments
        │
        ▼
Tool call executed as an authenticated API request under the USER's own token
  → API gateway RBAC/ABAC check → RLS backstop at the DB
        │
        ├── advisory / low-stakes actionable → result returned inline, applied/shown directly
        │
        └── medium/high-stakes actionable → written to approval queue, NOT executed;
            Assistant tells the user a draft was created and is pending approval
        │
        ▼
Response composed (LLM narrates tool results in natural language) → returned to user
        │
        ▼
Full turn (prompt, tool calls, args, results, response) logged for audit (Section 5)
```

---

## 4. Predictive Analytics Architecture

### 4.1 Feature store concept

Risk models (dropout/at-risk, fee-default, and future predictive models) share a common **feature store** rather than each model independently querying raw tables — this keeps feature definitions consistent across models (e.g., "attendance %" is computed one way, everywhere) and makes new models cheap to stand up.

Core feature groups maintained per student (refreshed on the cadence in 4.2):

| Feature group | Example features | Primary source events |
|---|---|---|
| Attendance signals | Trailing 7/30/90-day attendance %, trend slope, anomaly flags | `attendance.marked` |
| Academic signals | Grade trend across last N assessments, subject-level pass/fail streaks, rank/percentile movement | `exam.result.published` |
| Financial signals | Days-overdue on current installment, historical on-time-payment ratio, count of missed deadlines (trailing 12 months) | `fee.paid` (and its absence vs. schedule) |
| Engagement signals | LMS/portal login frequency, assignment submission timeliness, library usage, Assistant usage (where consented) | Cross-module activity events |
| Structural/context features | Program/branch, scholarship status, hostel/day-scholar, prior-term outcome | `student.admitted`, enrollment records |

Feature values are computed by scheduled aggregation jobs (and incrementally on relevant events, Section 2.2/2.5) and persisted so that: (a) the same feature values are usable by multiple models without recomputation, and (b) feature history is retained for model-drift analysis, matching the `ai_predictions`/`risk_scores` retention policy already defined in Doc 03 §8 (2 years hot, superseded predictions retained for drift analysis).

### 4.2 Model retraining cadence

- **Scheduled retraining**: risk models retrain on a **monthly** cadence by default against the accumulated feature store, using the prior academic term(s) as labeled training data (e.g., did a flagged student actually drop out / actually default). Cadence is configurable per model — a model with a slower-moving signal (placement readiness, tied to placement-season cycles) retrains per-cycle rather than monthly.
- **Trigger-based retraining**: an out-of-cadence retrain is triggered if monitored prediction-quality metrics (below) breach a threshold, rather than waiting for the next scheduled window.
- **Model versioning**: every trained model is persisted with a `model_name` + `model_version` (matching the `ai_predictions.model_name`/`model_version` columns, Doc 03 §5.13), so any historical prediction is traceable to the exact model that produced it — required both for debugging and for the audit trail in Section 5.
- **Drift monitoring**: prediction distributions and (where ground truth becomes available, e.g., actual term-end outcomes) accuracy/calibration metrics are tracked per model version; a sustained shift flags the model for review before the next scheduled retrain.
- **Champion/challenger rollout**: a newly retrained model runs in shadow mode (scored but not surfaced) against a sample of live traffic before being promoted to replace the active model, to catch regressions before they reach an advisor's or parent's screen.

### 4.3 Explainability requirement

Every entry written to `risk_scores` populates `contributing_factors` (JSONB, Doc 03 §5.13) with a structured, human-readable breakdown — this is a hard schema requirement, not an optional field left null:

```json
{
  "risk_category": "dropout",
  "risk_level": "high",
  "score": 72.4,
  "contributing_factors": [
    { "factor": "fee_deadlines_missed_60d", "value": 3, "weight": "high", "description": "3 missed fee deadlines in the last 60 days" },
    { "factor": "attendance_trend_30d", "value": -15, "weight": "high", "description": "Attendance down 15 percentage points over the last month" },
    { "factor": "consecutive_assessment_fails", "value": 2, "weight": "medium", "description": "2 consecutive failed internal assessments in Mathematics" }
  ]
}
```

- Factors are derived directly from the feature store inputs that most influenced that specific prediction (via the model's native feature-importance/attribution method — e.g., SHAP values for gradient-boosted models), **not** a generic templated sentence — the explanation is instance-specific, so two students with the same overall risk_level can (and often will) show different contributing factors.
- This requirement is why dropout/fee-default risk uses **classical ML rather than an opaque deep model**: gradient-boosted trees and logistic regression both support reliable per-prediction feature attribution at low latency, which is the deciding factor over marginally higher accuracy from a less explainable model — for a score that can trigger a call home to a family, "why" matters more than a couple points of AUC.
- Every screen that surfaces a risk score (Risk/Dropout Prediction, Predictive Analytics Dashboard, embedded flags on the Student profile) renders the contributing factors alongside the score — a bare number is treated as a UI bug, not an acceptable minimal state.

---

## 5. Human-in-the-Loop & Trust

### 5.1 Where human approval is mandatory before AI output takes effect

Restating and consolidating the stakes-tier gate from Section 1.2 as an explicit checklist, since this is the trust foundation of the whole AI story:

| Domain | AI role | Human approval required before... |
|---|---|---|
| Grades (AI-assisted grading) | Suggests marks per rubric criterion | ...marks are published to the student/gradebook (`exam.result.published`) — faculty must accept/edit/reject every AI-suggested score |
| Financial actions (fee waivers, expense flags, payment plan changes) | Scores risk, drafts reminders, flags anomalies | ...any money-moving or record-altering action executes — AI never issues a waiver, never modifies an invoice, only proposes/flags |
| Bulk parent/guardian communication | Drafts message content | ...send, always, for any audience above a small configurable single-recipient threshold — a `medium`/`high` stakes send sits in the approval queue regardless of who has send permission for one-off messages |
| Admissions decisions | Ranks/scores applicants | ...an admit/reject/waitlist decision is recorded — ranking is advisory input to a human decision, never the decision itself |
| Question-paper AI-generated (novel) questions | Drafts new questions when the bank is thin | ...the question enters the reusable question bank or an actual exam paper |
| Timetable generation | Proposes a full draft schedule | ...the timetable is published/activated for the term |

By contrast, **advisory-only outputs** (risk scores, matching/ranking suggestions, performance summaries, literature/grant matches) never require an approval step to be *shown* — they're informational. The approval gate exists specifically at the boundary where an AI output would otherwise become a record change or an outbound message.

### 5.2 Audit trail of AI-suggested vs. human-approved actions

- Every AI-generated proposal (grading suggestion, drafted communication, timetable draft, waiver flag, etc.) is written as a distinct record with a status lifecycle: `ai_proposed` → `human_reviewed` → `approved` / `edited_and_approved` / `rejected`.
- On approval (or edited-approval), the resulting write to the underlying business table (grades, fee records, sent-message log) triggers the standard `audit_logs` entry (Doc 03 §3.8) exactly as a fully manual action would — `actor_user_id` is the approving human, `before_data`/`after_data` capture the actual change — **plus an additional linkage field carrying the originating AI proposal id**, so any audit_logs entry that originated from an AI suggestion is traceable back to: which model/version produced it, what the original AI-suggested value was, and whether the human approved it verbatim or edited it first.
- This gives compliance/leadership a queryable answer to "how much of what happened this term was AI-suggested vs. purely manual, and how often do humans override the AI" — itself a useful model-quality signal (a high edit/reject rate on a given model surfaces a model that needs retraining or a feature that needs re-scoping), surfaced as a report in Analytics & Reports for `institution_admin`/`principal`.
- AI Assistant tool calls are logged independently (Section 3.3) with full request/response detail, retained under the same partitioned, append-only regime as `audit_logs` — an Assistant conversation that led to an approved action is reconstructable end-to-end: the user's question, the tool calls made under their identity, the draft produced, and the eventual human approval.

---

## 6. Data Privacy for AI

Sutram's AI features inherit every obligation defined in Doc 04 §7-8 (encryption, GDPR, FERPA, India DPDP Act 2023) and add AI-specific commitments on top, given that a meaningful share of the data involved belongs to minors.

- **No cross-tenant model training.** No tenant's data is ever used to train or fine-tune a model that serves another tenant. Where per-tenant fine-tuning or a tenant-specific fine-tuned model is offered (an Enterprise-tier option), that model artifact is scoped and access-controlled to that tenant alone, matching the tenant-isolation guarantees in Doc 04 §4. Platform-wide model improvements (e.g., improving the base grading-assistant model) are trained only on data covered by an explicit, revocable agreement for that purpose — never silently on live tenant data.
- **No training on prompts/conversations by default.** Data sent to third-party LLM providers through the Model Gateway (Section 3.1) is transmitted under a data-processing agreement that excludes it from the provider's own model-training corpus (a standard enterprise-API-tier commitment from major LLM vendors) — this is a contractual requirement for any provider added to the gateway, not an assumption.
- **Opt-out mechanism.** Institution admins can disable AI features module-by-module per tenant (already reflected in the Starter/Growth/Enterprise tiering, Doc 01 §7); within an enabled module, individual users can opt out of AI-driven communications being auto-drafted about them (e.g., a parent can request their child's absence-notification drafting stay disabled while the underlying rules-based alert still fires without AI drafting), surfaced through the same Privacy Center used for GDPR/DPDP rights (Doc 04 §8.1/§8.3).
- **Minors' data and Verifiable Parental Consent.** Per Doc 04 §8.3, processing a minor's data for anything beyond the core educational function requires Verifiable Parental Consent captured at Parent-linking. AI features that go beyond "core educational function" in a way that requires this consent explicitly include: any predictive risk scoring beyond basic academic reporting, and any use of a minor's data for cross-student pattern learning (e.g., a matching model trained across a cohort). Purely operational AI (attendance-anomaly detection feeding the same alerting the institution would send manually) is treated as within the core educational function and does not require a separate consent flow, but is still disclosed in the institution's AI-use notice.
- **FERPA alignment.** AI-generated content that touches a student's education record (a risk score, an AI-assisted grade suggestion) is itself part of that education record once approved, and inherits the same access-control and disclosure rules as the underlying record (Doc 04 §8.2) — a parent/student can request to see not just the final grade but that an AI-assisted grading pass occurred, consistent with FERPA's access-to-records principle.
- **Data minimization in AI pipelines.** As established in Section 3.2, the RAG knowledge base deliberately excludes raw student PII by default; Document AI extraction output is stored with the same field-level encryption as manually entered PII (Doc 04 §7.3); Voice AI audio is transcribed and the audio itself is not retained beyond the transcription step unless the tenant has explicitly enabled voice-record retention for a specific compliance reason.
- **Right-to-erasure reach.** An erasure request for a data subject cascades to: their AI conversation history (Section 3.4), any `ai_predictions`/`risk_scores` entries where they are the `subject_id`, and cached embeddings derived from their content — consistent with the erasure-flow scope already defined in Doc 04 §8.5.

---

## 7. Phasing

AI capability is deliberately staged, matching the PRD's phase-gating principle (Doc 01 §12) and its explicit cost-control strategy of tiering AI depth to willingness-to-pay (Doc 01 §11).

### Phase 1 — Lightweight AI (ships with the MVP core; available even on Starter tier)

Rules-based and simple, low-cost AI only — no LLM tool-calling, no predictive ML models yet.

- Basic rules-based attendance/fee alerts (threshold-triggered, template-text notifications — no AI drafting yet, sets up the event-trigger plumbing that Phase 2's AI-drafted messages will reuse)
- Simple FAQ chatbot (retrieval over a static knowledge base, no function-calling against live records, no conversation memory beyond the current session) — the seed of the AI Chatbot screen, intentionally scoped down from its Phase 3 form
- Document AI OCR extraction in a basic form (field extraction to auto-fill admissions/enrollment forms), since it directly reduces manual data entry from day one and doesn't depend on the Assistant's tool-calling infrastructure

### Phase 2 — Predictive & assistive AI (Growth tier and above)

- Dropout/at-risk prediction and fee-default risk scoring go live (classical ML, feature store, explainability requirement all as specified in Section 4) — this is when `ai_predictions`/`risk_scores` become populated in production
- Attendance anomaly detection
- AI-drafted communications (payment reminders, parent alerts, general announcements) — LLM drafting layered on top of the Phase 1 rules-based trigger plumbing, with the approval-queue gate (Section 1.2) shipping alongside it, not after
- AI application screening/ranking, duplicate application detection
- Performance insight summaries, workload/timetable optimization suggestions
- Student-job matching (basic form), literature/grant matching

### Phase 3 — Full AI Assistant & advanced generative AI (Enterprise tier — the flagship AI Assistant / AI Analytics capability referenced in Doc 01)

- Full AI Assistant with RAG + function/tool-calling (AI Chatbot, Student Assistant, Faculty Assistant) as architected in Section 3, including the complete RBAC-enforced tool layer and multi-tenant guardrails
- AI-assisted grading for subjective answers (human-in-the-loop grading workspace)
- Automated question paper generation
- Plagiarism detection
- Document AI's full structured-extraction pipeline (multi-document-type classification, confidence-scored field extraction) beyond Phase 1's basic OCR fill
- Voice AI (voice-to-text data entry, voice-driven Assistant commands)
- Predictive Analytics Dashboard as a dedicated cross-module surface, interview readiness scoring, personalized learning path suggestions
- Anomaly detection in expense/budget data
- WhatsApp/SMS auto-response chatbot on external channels

This staging also lines up with the PRD's screen-count phasing (Phase 1 ~40-50 screens, Phase 2 ~120-150, Phase 3 ~250-400+, Doc 01 §12) and with the Information Architecture's AI screens, all ten of which (AI Chatbot, Student Assistant, Faculty Assistant, Predictive Analytics, Risk/Dropout Prediction, Attendance Prediction, Placement Prediction, AI Report Generator, Document AI, Voice AI) are marked Phase 3 in Doc 02 — consistent with this document's placement of the Assistant's full architecture, AI-assisted grading, Document AI's full pipeline, and Voice AI as Phase 3 deliverables, while their precursor capabilities (basic OCR, basic FAQ chatbot, basic risk scoring without the dedicated dashboard UI) land earlier to deliver incremental value ahead of the full flagship release.
