# Document 5: User Personas

**Product:** Sutram — AI-Powered Multi-Tenant Education Operating System
**Vendor:** Pragyaan Labs
**Scope:** Full responsive web application (desktop, laptop, and mobile browser). Native mobile app is explicitly out of scope for this phase — every persona below accesses Sutram through the same responsive web app, sized to their device.
**Companion documents:** Reference Document 1 (Product Vision), Document 2 (Segments & Tiers), Document 3 (IA/Module Map), Document 4 (RBAC & Role Matrix) for definitions this document assumes.

---

## 1. Purpose and How to Use This Document

This document defines the 18 canonical Sutram roles as living personas, so that product, design, engineering, and go-to-market teams share one mental model of *who* is behind every role slug. Each persona is grounded in a specific institution archetype, a specific tier (Starter / Growth / Enterprise), and a specific day-in-the-life workflow that touches real modules from the canonical module list:

`Platform Admin · Dashboard · Admissions · Students · Faculty · Academics · Attendance · Examinations · Fees & Finance · Library · Hostel · Transport · HR · Placement · Research · Communication · AI Assistant · Analytics & Reports · Settings`

Personas are ordered to match the 18 role slugs exactly as ratified: `super_admin, institution_admin, principal, dean, registrar, hod, faculty, teaching_assistant, researcher, accountant, hr_manager, hostel_warden, librarian, placement_officer, transport_manager, student, parent, guest`.

---

## 2. Persona Index

| # | Role Slug | Archetype Name | Primary Segment(s) |
|---|---|---|---|
| 1 | `super_admin` | Priya Ramanathan, Platform Operations Lead | Pragyaan Labs (vendor-side, cross-tenant) |
| 2 | `institution_admin` | Ananya Krishnan, Institution Administrator | All segments |
| 3 | `principal` | Mrs. Lakshmi Iyer, School Principal | School, Coaching Institute |
| 4 | `dean` | Dr. Ramesh Chandran, Dean of Engineering | College, University |
| 5 | `registrar` | Meenakshi Subramaniam, University Registrar | College, University |
| 6 | `hod` | Dr. Kavitha Nair, Head of Department (CS) | College, University |
| 7 | `faculty` | Arjun Mehta, Assistant Professor / Class Teacher | All segments |
| 8 | `teaching_assistant` | Sneha Reddy, Teaching Assistant / Lab Instructor | University, College |
| 9 | `researcher` | Dr. Vikram Rao, Principal Investigator | University, Research Lab |
| 10 | `accountant` | Suresh Pillai, Finance & Accounts Officer | All segments |
| 11 | `hr_manager` | Divya Menon, HR & Administration Manager | All segments (Growth+) |
| 12 | `hostel_warden` | Col. (Retd.) Ravi Shankar, Hostel Warden | School (boarding), University |
| 13 | `librarian` | Uma Bhat, Chief Librarian | School, College, University |
| 14 | `placement_officer` | Karthik Iyer, Training & Placement Officer | College, University, Coaching |
| 15 | `transport_manager` | Manoj Tiwari, Transport In-Charge | School, University |
| 16 | `student` | Riya Sharma, Student (composite, ages 14–24) | All segments |
| 17 | `parent` | Meera & Suresh Patel, Parents of a Grade 8 student | School, Coaching, some College |
| 18 | `guest` | Trustee / Prospective Parent / Auditor (composite) | All segments |

⭐ = **Phase 1 MVP priority persona** (see §5 for empathy maps): `institution_admin`, `faculty`, `student`, `parent`.

---

## 3. The 18 Personas

### 3.1 `super_admin` — Priya Ramanathan, Platform Operations Lead

**Segment:** Not tied to a customer segment — Priya works for Pragyaan Labs and operates across every tenant (School, College, University, Coaching, Research Lab) on the platform.

**Demographics/Background:** 34, B.Tech Computer Science, 8 years in SaaS operations/SRE roles before joining Pragyaan Labs as Platform Operations Lead. Based at the Pragyaan Labs NOC (or remote), manages a rotating on-call roster across 3 platform engineers.

**Goals & Motivations:** Keep every tenant's data isolated and available (99.9% uptime SLA), enforce tier entitlements (a Starter tenant cannot silently use Enterprise-only Placement or AI Assistant modules), onboard new institutions in under 48 hours, and give support engineers a safe way to reproduce customer issues without touching production data directly.

**Daily Workflow:** Starts the day in **Platform Admin → Tenant Health** reviewing overnight alerts (failed backups, a Growth-tier tenant approaching its 10,000-student cap, a payment gateway webhook failure for one institution's Fees & Finance module). Processes the overnight signup queue: verifies a new Coaching Institute's domain, provisions their tenant, applies the Starter feature-flag set. Reviews **Audit Logs** for a flagged anomaly (an `institution_admin` account attempting 200 password resets in 10 minutes — likely a credential-stuffing attempt, escalates to security). Mid-day: uses scoped, logged **impersonation** to reproduce a bug a `registrar` reported in Examinations seating allocation, without seeing student PII beyond what's needed. Afternoon: reviews subscription tier changes queued by Sales Ops (an institution upgrading Growth → Enterprise) and confirms the entitlement flip activates Placement, Research, and AI Assistant modules at midnight local time for that tenant. Ends the day verifying the automated tenant-isolated backup job completed for all ~40 active tenants.

**Pain Points with Legacy Tools:** Before a unified Platform Admin console, this work would be split across a cloud provider console, a separate billing system (Stripe/Chargebee), a support ticketing tool, and a spreadsheet tracking "which tenant is on which tier and which flags are enabled" — manually updated and routinely stale, leading to tenants gaining access to modules they never paid for, or Enterprise customers hitting Starter-tier limits after a sales upgrade that never got reflected in the flag system.

**What Success Looks Like:** Zero manual steps between "contract signed" and "tenant fully provisioned with correct tier entitlements"; every support impersonation session is scoped, time-boxed, and auto-logged for compliance; tenant-level anomalies surface as proactive alerts, not customer-reported tickets.

**Top Features:** Platform Admin → Tenant Management & Provisioning; Feature Flags / Tier Entitlement control; System Health & Audit Logs; Billing/Subscription sync; scoped Impersonation for support.

**Technical Proficiency:** Expert (this is a technical operations role).

**Device/Context:** Desktop, multi-monitor setup at a NOC-style workstation, VPN-gated access to the Platform Admin console; never on a personal phone due to the sensitivity of cross-tenant controls.

---

### 3.2 `institution_admin` — Ananya Krishnan, Institution Administrator ⭐

**Segment:** All segments — every tenant has exactly one primary `institution_admin` account (sometimes a small team) regardless of whether the institution is a school, college, university, coaching chain, or research lab.

**Demographics/Background:** 38, MBA, previously an operations/IT coordinator at the institution for 6 years before being handed ownership of the Sutram rollout. Reports to the Principal/Dean/Director and to the management trust/board on system performance.

**Goals & Motivations:** Make the Sutram rollout stick — low helpdesk ticket volume, high daily active usage among faculty and staff. Own the subscription relationship (tier, add-on modules, seat counts). Be accreditation-ready year-round instead of scrambling for two weeks before a NAAC/NBA/regional accreditation visit. Reduce the number of shadow systems (personal Excel sheets, WhatsApp groups) that faculty fall back on when the "official" system is inconvenient.

**Daily Workflow:** Opens **Dashboard** first thing to check institution-wide KPIs — today's attendance rate, open admissions applications, fee collection percentage against target. Moves to **Settings** to provision access for three new faculty hires (assign `faculty` role, department, teaching sections) and to adjust the academic calendar for a rescheduled holiday. Mid-morning: reviews the **Admissions** pipeline dashboard with the admissions team, resolves a stuck application flagged for document verification. Midday: a `hod` escalates a timetable conflict — Ananya checks **Faculty** module workload views to mediate. Afternoon: pulls a NAAC-format extract from **Analytics & Reports** for the accreditation committee — this used to take her team three weeks of manually compiling data from six spreadsheets; now it's a saved report template. Late day: reviews a **Communication** broadcast draft before it goes out to all parents about exam schedule changes, and checks the support queue for any tickets escalated from faculty.

**Pain Points with Legacy Tools:** Fee data lived in a standalone accounting package, attendance was Excel per class-teacher, admissions were tracked in a shared Google Sheet that regularly got double-booked or overwritten, and parent communication went out over an unmanaged WhatsApp broadcast list with no delivery confirmation or record. When the accreditation team asked "what was our student-faculty ratio for each of the last three years," it took two staff members eleven working days to reconstruct the answer from disconnected sources — and the number was still disputed by an external auditor.

**What Success Looks Like:** One login surface for every operational question a trustee or accreditation visitor might ask; helpdesk tickets about "where do I find X" drop to near zero within two terms of go-live; the NAAC/NBA-style extract is a five-minute export instead of a three-week project.

**Top Features:** Settings (roles, permissions, module/tier configuration, academic calendar); Dashboard (institution-wide KPIs); Admissions (pipeline); Analytics & Reports (accreditation/board reporting); Communication (institution-wide broadcasts).

**Technical Proficiency:** Intermediate–advanced (comfortable with configuration screens, exports, and role management; not a developer).

**Device/Context:** Desktop in her office as the primary surface (this role does configuration-heavy work that benefits from a full keyboard and large screen); laptop from home during the intensive admissions season (April–June in the Indian academic calendar); browser-based (Chrome/Edge), no native app needed since Settings and Analytics are inherently desktop-shaped tasks.

---

### 3.3 `principal` — Mrs. Lakshmi Iyer, School Principal

**Segment:** School (K-12) primarily; the same behavioral pattern maps to a "Center Director" at a Coaching Institute branch.

**Demographics/Background:** 52, M.Ed, 26 years in education, the last 9 as principal of a 1,400-student CBSE-affiliated school with two shifts. Reports to a school management trust/board.

**Goals & Motivations:** Academic outcomes and board-exam results, staff discipline and morale, a low-friction relationship with parents, and defensible records if a disciplinary or safety incident is ever escalated to the trust or to a regulator.

**Daily Workflow:** After the 8:00 AM assembly, opens **Dashboard** on her office desktop to scan today's attendance anomalies — three sections showing unusually low attendance, worth a quick check with the class teacher. A teacher calls in sick; Lakshmi uses **Faculty** module's substitution view to find a free-period teacher for that slot in under two minutes, instead of the old staffroom whiteboard scramble. Mid-morning: a Class 9 discipline case needs a decision — she pulls up the student's record in **Students** to see the full history (not just today's incident) before deciding on action. Before Friday's Parent-Teacher Meeting, she reviews the **Fees & Finance** defaulter list — 40 families with dues pending — and cross-references it against **Attendance** so she isn't caught off guard by a parent asking about their child's attendance percentage. Approves final exam question papers and result publication in **Examinations** before they go live. Afternoon: meets three parents; pulls up prior **Communication** thread history so she isn't hearing a complaint for the "first time" when it's actually the third.

**Pain Points with Legacy Tools:** Paper attendance registers were reconciled into a summary sheet only once a week, so a slipping student wasn't caught until report-card time. Disciplinary notes lived in a physical file cabinet, sorted by year, not by student — finding a repeat offender's full history meant pulling three folders. Every morning a teacher called in sick, the vice-principal would run down the corridor checking who had a free period. Parent complaints came in by phone with no record, so the same complaint sometimes reached the principal three separate times from three different escalation paths.

**What Success Looks Like:** A single Dashboard screen answers "how is my school doing today"; substitute assignment takes under 2 minutes; walking into Friday's PTM with a fee-defaulter and attendance-risk list already reconciled, not assembled at midnight the night before.

**Top Features:** Dashboard (school-wide real-time view); Attendance (school-wide, not just per-class); Faculty (substitution/workload); Examinations (approval workflow before results publish); Communication (parent thread history).

**Technical Proficiency:** Intermediate — comfortable with dashboards and structured screens, delegates deep configuration to the `institution_admin`.

**Device/Context:** Desktop in the principal's office for planning and approvals; phone browser while walking the campus for quick attendance/substitution checks between periods (responsive web, not a native app).

---

### 3.4 `dean` — Dr. Ramesh Chandran, Dean of Engineering

**Segment:** College, University (this role essentially does not exist in K-12 Schools or most Coaching Institutes).

**Demographics/Background:** 55, PhD, 28 years as faculty before being appointed Dean of a School of Engineering overseeing 6 departments (~150 faculty, ~4,000 students) within a university.

**Goals & Motivations:** Academic quality and consistency across departments he doesn't personally teach in, accreditation readiness (NBA/ABET-style outcomes-based accreditation), faculty research output, and defensible curriculum-change governance (a change one HOD makes shouldn't silently break another department's shared courses).

**Daily Workflow:** Reviews school-level **Dashboard** rollups aggregating each department's attendance, pass rates, and faculty workload. A `hod` submits a curriculum change (a new elective) through the **Academics** module's approval workflow — Ramesh reviews the diff against the existing syllabus and approves or sends it back with comments, all logged, replacing what used to be an email thread with Word-doc attachments that different people edited out of order. Checks the **Research** module for aggregated publication and grant metrics across all 6 departments ahead of a funding-agency site visit — each HOD used to keep this in a personal spreadsheet with different column conventions, making department comparison nearly impossible. Reviews semester-end grade distributions in **Examinations** for outlier patterns (a course with an unusually high fail rate) before results are released university-wide. Coordinates with **HR** on faculty recruitment approvals for two open Assistant Professor positions.

**Pain Points with Legacy Tools:** Curriculum approvals traveled by email with Word attachments, and by the third round of revisions nobody was certain which version was authoritative. Each HOD tracked departmental research output in a personally-formatted spreadsheet, so producing one clean accreditation table meant two weeks of manual reconciliation before every NBA visit. There was no way to see, in one place, whether Department A's grading was unusually lenient compared to Department B's for a course both taught in parallel.

**What Success Looks Like:** Curriculum changes move through one auditable workflow with version history; the accreditation research-output table is a live report, not an annual fire drill; grade-distribution outliers surface automatically instead of being discovered by a student complaint months later.

**Top Features:** Academics (curriculum approval workflow); Research (cross-department publication/grant rollup); Analytics & Reports (accreditation packets); Dashboard (department comparison view); Examinations (result oversight).

**Technical Proficiency:** Intermediate.

**Device/Context:** Desktop/laptop in his office for approval workflows; tablet browser during accreditation-committee meetings to pull up data on demand.

---

### 3.5 `registrar` — Meenakshi Subramaniam, University Registrar

**Segment:** College, University (rare in K-12; the closest analog in a School is the `institution_admin` or an administrative officer role, and Coaching Institutes rarely have a formal Registrar).

**Demographics/Background:** 47, administrative/compliance background with a Master's in Education Administration, custodian of the university's official academic record for 12 years.

**Goals & Motivations:** Records that will hold up in a legal or regulatory dispute, timely transcript and degree-certificate issuance, clash-free examination logistics across dozens of programs, and full statutory compliance for enrollment reporting.

**Daily Workflow:** Morning: processes a batch of transcript and bonafide-certificate requests submitted by students through the **Students** module's self-service request queue, each routed to her for approval with the underlying academic record already attached. Mid-morning: coordinates exam-hall and seating allocation in **Examinations** for the upcoming semester-end exams across 30 programs — the system flags a clash where two large courses were both allocated the same hall block, which she resolves before it becomes a day-of crisis. Reviews a credit-transfer request from a student who studied a semester abroad, cross-checking against the receiving program's requirements in **Academics**. Afternoon: prepares the enrollment-verification report for a government scholarship agency, pulled from **Analytics & Reports**. Handles an amendment to a five-year-old grade record following a grievance-committee ruling — makes the change in the system, which captures who made it, when, and why, versus the old paper file where such changes were sometimes disputed years later with no record of authorization.

**Pain Points with Legacy Tools:** Transcript requests arrived as paper application forms routed by hand across three offices, taking up to two weeks. Exam seating was built in Excel each semester, and hall clashes were routinely discovered the morning of the exam, not before. Record amendments had no audit trail, which became a real liability when a student disputed a grade change years after the fact and no one could say who had authorized it.

**What Success Looks Like:** Transcript turnaround measured in hours, not weeks; seating conflicts caught by the system before publication, not by an invigilator on exam morning; every record amendment carries an immutable, queryable audit trail.

**Top Features:** Students (records, transcripts, self-service requests); Examinations (scheduling and seating allocation); Academics (credit transfer); Analytics & Reports (statutory/enrollment reporting); Communication (bulk official notices).

**Technical Proficiency:** Intermediate — this is a systems-of-record role that rewards precision over speed.

**Device/Context:** Desktop in the registrar's office almost exclusively — this work involves official records and multi-tab cross-referencing that isn't well suited to a small screen.

---

### 3.6 `hod` — Dr. Kavitha Nair, Head of Department (Computer Science)

**Segment:** College, University primarily; occasionally a large, departmentalized senior School.

**Demographics/Background:** 46, PhD, senior faculty member elected/appointed to lead a Computer Science department of 18 faculty and roughly 900 students across four year-groups.

**Goals & Motivations:** A conflict-free timetable every semester, verified syllabus completion (not just self-reported), fair and transparent faculty workload distribution, and mentoring junior faculty without drowning in administrative overhead.

**Daily Workflow:** Start of semester is dominated by **Faculty** module timetable and workload allocation — assigning 18 faculty across sections while balancing teaching load, lab supervision, and research time, with the system flagging double-bookings before they're published (previously built by hand in Excel, with clashes discovered by an angry faculty member in week two). Mid-semester: checks **Academics** for real-time syllabus-completion percentage per course, replacing the old method of asking each faculty member to self-report progress in a Word document, which was frequently optimistic. Reviews **Attendance** for students falling below the department's minimum threshold and flags them for counseling. Moderates internal assessment marks in **Examinations** before they're finalized, checking for outlier grading patterns between sections of the same course taught by different faculty. Mentors two junior faculty on their teaching load and approves TA assignments for the semester's lab sections.

**Pain Points with Legacy Tools:** Timetabling was an annual Excel nightmare with clashes surfacing in week two of term. Syllabus completion was whatever faculty said it was in a self-reported document, with no way to verify against actual delivered content. Faculty workload disputes ("why do I have 6 sections and they have 3") had no neutral, transparent record to settle them.

**What Success Looks Like:** A conflict-free timetable generated and published before term starts; a live syllabus-completion dashboard instead of a self-reported guess; workload visible to the whole department, ending workload-fairness disputes.

**Top Features:** Faculty (timetable/workload allocation); Academics (syllabus tracking); Attendance (department-level view); Examinations (assessment moderation); Dashboard (department rollup).

**Technical Proficiency:** Intermediate.

**Device/Context:** Desktop/laptop, browser-based, mostly during business hours in her office or department workroom.

---

### 3.7 `faculty` — Arjun Mehta, Assistant Professor / Class Teacher ⭐

**Segment:** All segments — this persona represents a school teacher, a college/university professor, and a coaching-institute trainer alike; the underlying daily needs are nearly identical even though titles differ.

**Demographics/Background:** 31, M.Sc plus B.Ed (school context) or a subject Master's (college context), 6 years teaching experience, teaches 5 sections across 2 subjects and is class-teacher/mentor for one section. Represents the largest daily-active user group on the platform by headcount.

**Goals & Motivations:** Spend time teaching, not doing paperwork. Get through attendance and grading fast enough that it doesn't eat into prep or personal time. Be able to answer a parent's question about a specific student without digging through three different places.

**Daily Workflow:** 8:05 AM, first period: marks attendance for 42 students on the classroom desktop in under 60 seconds using **Attendance**'s roster-tap interface, instead of the paper register he used to fill and later transcribe into Excel every Friday night. Between periods: uploads today's lesson material and the next assignment to **Academics**. Third period: proctors a unit test; that evening from his phone browser at home, enters marks into **Examinations** — the system auto-computes the grade, updates the class rank, and flows the mark into the report card, instead of the old routine of entering the same marks into three separate spreadsheets (his personal gradebook, the school's internal Excel, and the board-format sheet) with the accompanying risk of transcription mismatches between them. Responds to a parent's question about their child's recent dip in performance via **Communication** — the thread is visible to the school and other subject teachers of that child too, not stuck in his personal WhatsApp. During his free period, a student is sent to him for counseling; he opens the **Students** profile to see the child's attendance and performance across *all* subjects, not just his own, before the conversation. End of day: checks his personal teaching-load and pending-grading summary on **Dashboard**.

**Pain Points with Legacy Tools:** Paper attendance registers copied into a spreadsheet once a week meant a struggling student's attendance problem often wasn't visible until much too late. Marks lived in three disconnected spreadsheets prone to transcription errors between the "real" gradebook and the official report-card format. Parent conversations happened over personal WhatsApp, invisible to the school and to other teachers who might need the same context. When a student was sent to him for mentoring, he had no visibility into how they were doing in other subjects — he was counseling blind.

**What Success Looks Like:** Attendance for a full class takes under a minute; a mark entered once flows everywhere it needs to (report card, gradebook, analytics) without re-typing; every parent conversation is in one shared thread the whole school can see; a student's full academic picture is one click away when it matters.

**Top Features:** Attendance (fast roster entry); Examinations (mark entry/gradebook); Academics (lesson plans/content/assignments); Communication (parent messaging); Students (360° learner profile).

**Technical Proficiency:** Basic–intermediate, and highly variable across the faculty population — the product must be usable by a teacher who has never used anything beyond WhatsApp and a calculator, not just power users.

**Device/Context:** Shared classroom desktop/kiosk between periods (not personally owned, so no session should linger insecurely); personal phone browser for grading and messaging in the evening; tablet browser in schools with smart-classroom setups. No native app — the responsive web experience is the only surface, so it must feel fast even on modest shared hardware.

---

### 3.8 `teaching_assistant` — Sneha Reddy, Teaching Assistant / Lab Instructor

**Segment:** University primarily, some College (graduate students assisting a course).

**Demographics/Background:** 25, PhD candidate in her second year, assists a professor with a 120-student Data Structures course — running two lab sections and grading a defined subset of assignments — while managing her own coursework and research.

**Goals & Motivations:** Handle lab attendance and grading for her assigned sections efficiently without it eating into research time, and have unambiguous boundaries on what she's authorized to touch versus what belongs to the professor of record.

**Daily Workflow:** Marks attendance for her two lab sections in **Attendance**. Grades lab reports for her assigned 40 students in **Examinations**, scoped so she can only see and grade the students in her sections, not the full 120-student roster. Posts lab manuals and starter code to **Academics** for her sections. Answers student doubts in a **Communication** thread scoped to her lab groups.

**Pain Points with Legacy Tools:** In the old world, TA access was usually just "the professor forwards you an Excel file" — no real system access, no clear boundary on what she was allowed to edit, and grading spreadsheets passed back and forth by email with version conflicts (whose copy has the latest grades?).

**What Success Looks Like:** Scoped, role-appropriate access that lets her grade and manage attendance only for her assigned sections, with a clean audit trail distinguishing her actions from the professor's — so there's never a dispute about who entered which grade.

**Top Features:** Attendance (section-scoped); Examinations (scoped grading); Academics (lab materials); Communication (section-scoped threads).

**Technical Proficiency:** Advanced (younger, tech-native graduate student population).

**Device/Context:** Personal laptop browser most of the time; university lab desktop during lab sessions.

---

### 3.9 `researcher` — Dr. Vikram Rao, Principal Investigator / Senior Scientist

**Segment:** University, Research Lab / Training Institute (Enterprise-tier feature — the Research module).

**Demographics/Background:** 44, PhD, runs a materials-science research group of 8 graduate students and 2 postdocs, holds 3 active external grants.

**Goals & Motivations:** Track grant funds against actual spend without a reconciliation nightmare at audit time, keep the group's shared lab equipment bookable without double-booking, track each student's thesis milestones, and keep the group's publication record visible to the institution for ranking/accreditation purposes without manually re-submitting it every year.

**Daily Workflow:** Updates project milestones and logs recent expenditure in **Research**, cross-referencing against the grant ledger which is now visible from **Fees & Finance** instead of living in a personal spreadsheet disconnected from the institution's books. Books a shared spectrometer for Thursday afternoon through the **Research** module's equipment-booking calendar, which now prevents the double-booking that used to happen when the old system was a physical logbook next to the machine — or worse, a WhatsApp group where two students both said "I've got it Thursday." Reviews a PhD student's thesis-progress update. Submits metadata for a paper just accepted at a journal, which will roll up automatically into the institution's publication metrics for **Analytics & Reports** instead of Vikram manually filling in a spreadsheet the Dean's office sends around every January.

**Pain Points with Legacy Tools:** Grant budgets tracked in a personal Excel file, completely disconnected from the institution's actual finance system, meant an external audit routinely surfaced discrepancies that took days to explain. Equipment booking via a physical logbook or WhatsApp group caused real double-bookings that wasted expensive machine time. Publication records were scattered across ORCID, Google Scholar, and personal CVs, with no institutional rollup until someone manually compiled it for a ranking submission.

**What Success Looks Like:** Grant spend visible against the institutional ledger in real time, not reconciled once a year under audit pressure; equipment bookings with zero double-booking incidents; publication metrics that roll up automatically for institutional reporting.

**Top Features:** Research (grants/projects/publications/equipment booking); Fees & Finance (grant ledger visibility); Analytics & Reports (institutional publication rollups); Communication; HR (onboarding student researchers).

**Technical Proficiency:** Intermediate–advanced.

**Device/Context:** Desktop in his lab/office as primary; laptop while traveling to conferences to keep milestone tracking current.

---

### 3.10 `accountant` — Suresh Pillai, Finance & Accounts Officer

**Segment:** All segments — every institution has fee/finance operations regardless of type.

**Demographics/Background:** 41, M.Com, 15 years in institutional finance, manages fee collection, payroll coordination inputs, vendor payments, and statutory compliance (GST/TDS in the Indian context) for a mid-sized institution.

**Goals & Motivations:** Same-day reconciliation of every fee payment regardless of channel, a defaulter list that's accurate the moment someone asks for it (not stale by the time of a PTM), statutory compliance without last-minute scrambles, and payroll that doesn't require re-deriving attendance and leave data by hand every month.

**Daily Workflow:** First task of the day: reconciles yesterday's fee payments in **Fees & Finance** — online gateway transactions, bank NEFT transfers, and offline cash/cheque receipts entered by the front office, all landing in one ledger instead of three separate exports he used to stitch together manually every night, often past 9 PM. Generates the current fee-defaulter list — the same list Mrs. Iyer (the principal, persona 3.3) needs reconciled before Friday's PTM, and which used to take him half a day of cross-referencing against yesterday's manual list. Processes two scholarship adjustments and one refund. Coordinates with **HR** to pull attendance/leave data for the month's payroll run, which used to require him to manually cross-reference each staff member's leave record against a separate attendance spreadsheet, a process prone to error and dispute. Handles vendor invoices routed from **Transport** (fuel/maintenance) and **Hostel** (mess supplies). Prepares a weekly financial summary for the `institution_admin`.

**Pain Points with Legacy Tools:** Reconciling fee payments from three different channels (bank statement CSV, payment-gateway CSV, and a paper cash-receipt book) into one Excel ledger every night was slow and error-prone, and a mismatch discovered days later was hard to trace back to its source. The defaulter list was a static, manually-updated document that was routinely out of date by the time anyone acted on it — exactly the kind of stale list that turns a PTM into a scramble. Payroll was recalculated by hand each month, cross-referencing attendance and leave from a separate system, and disputes over a docked day's pay were common because there was no shared source of truth.

**What Success Looks Like:** A single auto-reconciled ledger across every payment channel; a defaulter list that's accurate to the minute, not the week; a one-click payroll run that pulls attendance/leave automatically, eliminating the manual cross-reference and the disputes that came with it.

**Top Features:** Fees & Finance (collection/reconciliation/defaulter list); HR (payroll data sync); Hostel/Transport (billing integration); Analytics & Reports (financial summaries); Dashboard.

**Technical Proficiency:** Intermediate.

**Device/Context:** Desktop in the finance office, where multi-tab reconciliation work benefits from a full screen; occasional laptop from home during month-end close.

---

### 3.11 `hr_manager` — Divya Menon, HR & Administration Manager

**Segment:** All segments (Growth tier and above — Starter-tier institutions typically don't have a dedicated HR module user).

**Demographics/Background:** 39, MBA-HR, manages recruitment, leave, staff records, and appraisal cycles for a mid-sized institution with roughly 180 staff.

**Goals & Motivations:** A recruitment pipeline that doesn't live in her email inbox, accurate real-time leave balances so approvals aren't guesswork, staff compliance documents that survive an audit, and appraisal cycles grounded in actual performance data instead of a disconnected form.

**Daily Workflow:** Reviews pending leave requests in **HR**, checking real-time balances before approving — previously staff submitted paper leave forms or emailed her directly, and she kept balances in a personal tracker that was often a few days out of date. Tracks the recruitment pipeline for two open faculty positions, moving candidates through stages instead of managing it via an email folder. Sends appraisal-cycle reminders, now able to link each staff member's appraisal to actual data pulled from **Academics**/**Examinations** (syllabus completion, student outcomes) instead of a standalone Google Form disconnected from reality. Coordinates payroll inputs with `accountant` Suresh Pillai. Verifies a new hire's compliance documents (ID proof, degree certificates, prior experience letters) are uploaded to the digital staff record, replacing the physical folder that too often went missing during an audit.

**Pain Points with Legacy Tools:** Leave approvals happened over paper forms or scattered emails with no central balance tracker, so double-booked leave and disputed balances were routine. Staff compliance documents lived in physical folders that were sometimes simply lost, creating real exposure during an external audit or inspection. Appraisal forms were a standalone Google Form with no link to the staff member's actual teaching or performance data.

**What Success Looks Like:** Self-service leave requests against real-time balances; a digital staff-document vault that survives any audit; appraisals grounded in real performance data pulled automatically from the academic modules.

**Top Features:** HR (leave, recruitment, appraisal, document vault); Faculty (performance-data linkage for appraisals); Fees & Finance (payroll sync); Communication; Analytics & Reports.

**Technical Proficiency:** Intermediate.

**Device/Context:** Desktop in the HR office, browser-based.

---

### 3.12 `hostel_warden` — Col. (Retd.) Ravi Shankar, Hostel Warden

**Segment:** School (boarding schools), University (Growth tier and above — this role is largely absent from day-schools, Coaching Institutes, and Research Labs).

**Demographics/Background:** 58, retired Army officer, warden of a 300-bed boys' hostel at a residential school for the past 5 years.

**Goals & Motivations:** Student safety above everything else, efficient room/bed allocation, tight discipline, and a documented, defensible trail for every time a student leaves campus.

**Daily Workflow:** Morning roll call recorded in **Hostel** for all 300 boarders. Processes leave-out requests — a student wants to go home for the weekend — routed through a digital parent-approval workflow in **Hostel**/**Communication**, replacing the old system where a warden would call the parent's phone number on file (if it was even current) and note the verbal "yes" on a paper pad. Manages room reallocation for two new mid-term admissions using the live occupancy view. Runs the night in/out register digitally, checking students back in as they return from evening activities. Escalates a discipline issue (a student caught outside after curfew) to the Principal with the incident logged against the student's profile. Coordinates hostel/mess fee billing with `accountant` Suresh Pillai.

**Pain Points with Legacy Tools:** The paper in/out register was vulnerable to forgery and loss, and reconstructing "who was on campus at 9 PM last Tuesday" after an incident was painfully slow. Room allocation tracked in Excel caused real double-allotments during the admission rush. Leave-out approvals happened by phone call with no record — a genuine safety and liability risk if a student later claimed a parent never actually authorized their outing.

**What Success Looks Like:** A digital in/out log with parent e-approval for every outing, eliminating the phone-call liability gap; a live room-occupancy view that makes double-allotment structurally impossible; instant alerts to both parent and Principal for any anomaly (a student not checked in by curfew).

**Top Features:** Hostel (room allocation, in/out register, leave-approval workflow); Communication (parent alerts); Students (linked discipline/profile history); Fees & Finance (mess/hostel billing); Dashboard.

**Technical Proficiency:** Basic–intermediate.

**Device/Context:** Shared desktop at the hostel office/reception; phone browser during night rounds to check students in/out on the move.

---

### 3.13 `librarian` — Uma Bhat, Chief Librarian

**Segment:** School, College, University (Growth tier and above).

**Demographics/Background:** 45, MLIS, manages the catalog, circulation, and a growing set of digital-journal subscriptions for a college library serving 3,500 students.

**Goals & Motivations:** Fast, dispute-free book issue/return, accurate fine collection, an inventory that doesn't require a once-a-year physical audit to trust, and visibility into what faculty actually need for journal subscriptions versus what's just requested loudly.

**Daily Workflow:** Issues and returns books via barcode scan against **Library**, each transaction now automatically synced to the borrowing student's profile — previously, standalone library software had no link to student records, so a student's borrowing history vanished the moment they changed class or graduated, making disputes about "did I really not return that book" impossible to resolve. Generates the day's overdue-fines list, which now flows automatically into **Fees & Finance** rather than being calculated by hand and frequently disputed by students who claim a different return date. Manages new acquisitions and cataloging. During exam season, manages reading-room seating capacity. Responds to a faculty request for a new journal subscription, checking usage data before approving the renewal.

**Pain Points with Legacy Tools:** Standalone legacy library software had no integration with student records, so borrowing history disappeared whenever a student's class or enrollment status changed. Fines were calculated manually and routinely disputed. Inventory — which books were lost, damaged, or simply missing — was only truly reconciled once a year via an exhausting physical audit.

**What Success Looks Like:** Every issue/return is permanently linked to the borrower's student profile regardless of class changes; fines calculate automatically and flow into the fee ledger without dispute; inventory status is a live dashboard, not an annual fire drill.

**Top Features:** Library (catalog/circulation); Fees & Finance (fine integration); Students (borrowing history in profile); Analytics & Reports; Communication (overdue reminders).

**Technical Proficiency:** Basic–intermediate.

**Device/Context:** Shared desktop at the circulation counter with a barcode-scanner peripheral.

---

### 3.14 `placement_officer` — Karthik Iyer, Training & Placement Officer

**Segment:** College, University primarily; some Coaching Institutes (competitive-exam result-linked counseling/placement). Enterprise-tier feature.

**Demographics/Background:** 40, industry-relations background, manages company outreach and placement drives for a college of 2,000 final-year-eligible students.

**Goals & Motivations:** Maximize placement percentage (a headline number for the college's marketing and NIRF-style rankings), manage company relationships without losing track of them, get eligibility lists right the first time, and produce placement statistics on demand rather than as an annual reconstruction project.

**Daily Workflow:** Posts a new company drive in **Placement**, setting eligibility criteria (minimum CGPA, branch, no active backlog). The system auto-filters eligible students by pulling live data from **Academics**/**Examinations**, instead of the old process of manually cross-checking a company's criteria against a printed CGPA sheet — a process that had, more than once, put an ineligible student in front of a recruiter, embarrassing both the student and the institution. Schedules campus interview slots and tracks offer letters as they come in. Responds to a company's HR contact through a tracked outreach thread rather than personal email with no institutional record. Generates the term's placement statistics for the Dean's accreditation packet and the admissions brochure — a live report instead of the annual multi-week reconstruction it used to be.

**Pain Points with Legacy Tools:** Eligibility lists cross-checked by hand against Examinations records in Excel occasionally shortlisted ineligible students, a visible and embarrassing error. Company relationships were tracked in Karthik's personal email with no shared institutional memory — if he left, that relationship history left with him. Placement statistics for accreditation/ranking submissions were compiled manually each year, and historical numbers were often inconsistent year to year because the underlying method of counting changed.

**What Success Looks Like:** Eligibility lists are always correct because they're pulled live, not cross-checked by hand; company relationships live in a shared CRM-like pipeline, not personal inboxes; placement statistics are a one-click report with consistent historical methodology.

**Top Features:** Placement (drive management, eligibility filtering, offer tracking); Academics/Examinations (CGPA data feed); Analytics & Reports; Communication (bulk student/company outreach); Students.

**Technical Proficiency:** Intermediate.

**Device/Context:** Desktop in the placement cell office; laptop while traveling for company visits.

---

### 3.15 `transport_manager` — Manoj Tiwari, Transport In-Charge

**Segment:** School primarily; University (Growth tier and above); rare in Coaching Institutes and Research Labs.

**Demographics/Background:** 43, operations/logistics background, manages a fleet of 22 buses, drivers, and routes for a school of 1,800 day students.

**Goals & Motivations:** Safe, on-time transport, efficient route assignment as addresses change through the year, driver compliance (license/fitness certificate expiry) never lapsing, and fewer "where is the bus" phone calls flooding the front office.

**Daily Workflow:** Assigns a newly-admitted student to a route/stop in **Transport** based on their address. Monitors bus status through the day, fielding a parent's query about a 15-minute delay on Route 7 due to traffic — increasingly answered by the system's live status view rather than a call to the office. Reviews driver compliance: the system flags that one driver's fitness certificate expires in 10 days, prompting Manoj to schedule the renewal before it becomes a compliance lapse — previously tracked (or missed) on a wall calendar. Handles a mid-year route-change request from a family that moved house. Coordinates transport-fee billing with `accountant` Suresh Pillai.

**Pain Points with Legacy Tools:** Route-stop sheets were maintained in Excel and updated by hand every time a student's address changed, with stale sheets occasionally causing a bus to skip a stop. With no live visibility for parents, the front office fielded a daily flood of "where is the bus" calls that a status view could have absorbed. Driver license and fitness-certificate expiry was tracked on a wall calendar, and at least one lapse per year became a genuine compliance risk.

**What Success Looks Like:** Route/stop assignment updates instantly when an address changes; parent-facing status visibility measurably cuts the daily call volume to the front office; compliance-expiry alerts fire automatically, weeks ahead, not after the fact.

**Top Features:** Transport (route/stop management, driver compliance tracking); Communication (parent delay/status alerts); Fees & Finance (transport billing); Students (route linkage); Dashboard.

**Technical Proficiency:** Basic–intermediate.

**Device/Context:** Shared desktop in the transport office; phone browser for on-the-go route changes and driver coordination.

---

### 3.16 `student` — Riya Sharma, Student (composite persona, ages 14–24) ⭐

**Segment:** All segments. The persona below centers on a Grade 11 school student, but the same daily needs — schedule, results, fees, materials, communication — apply almost unchanged to an undergraduate, a coaching-institute aspirant, or a graduate researcher; only the vocabulary changes (marks vs. GPA, class teacher vs. professor).

**Demographics/Background:** 16, Grade 11, owns a mid-range Android phone with a limited data plan; also uses the shared computer lab at school for heavier tasks. Represents the largest total user population on the platform.

**Goals & Motivations:** Know exactly what's due and when (homework, tests, fees) without depending on catching a verbal announcement or a notice-board posting; see her own results and attendance without asking a teacher; get help when she's stuck, quickly.

**Daily Workflow:** Checks **Dashboard**/**Attendance** on her phone browser each morning before leaving for school to confirm today's schedule hasn't changed. During a free period, opens **Academics** to download today's lesson notes and check the next assignment's deadline. After a unit test, checks **Examinations** the same evening for her result rather than waiting a week for a printed sheet. Before the fee due-date, checks **Fees & Finance** and pays online instead of her parents needing to take a day off work to queue at the bank with a physical challan. Messages her class teacher through **Communication** with a doubt about a math problem instead of it getting lost in a personal WhatsApp chat. Checks **Library** to see her book's due date before a fine accrues. In her final year, checks **Placement** to see if she's eligible for an upcoming company drive.

**Pain Points with Legacy Tools:** Notices were read out in class or pinned to a physical noticeboard, and if she was absent that day, she simply missed them. Results were sometimes posted as scattered PDFs shared over WhatsApp groups, hard to find later. Fee payment meant a physical bank challan and a queue, often requiring a parent to take time off work. She had no way to check her own attendance percentage, so the first she'd hear of a shortfall was sometimes a surprise debarment notice right before exams.

**What Success Looks Like:** One place for schedule, results, fees, and materials, with in-app and email notifications for anything time-sensitive; self-service requests for things like bonafide certificates; a running attendance-percentage counter so a shortfall is never a surprise.

**Top Features:** Dashboard (personal view); Attendance (self-view with running percentage); Examinations (results); Fees & Finance (online payment); Communication.

**Technical Proficiency:** Advanced — digital native — but the product must perform well on low-end Android devices and limited data plans, since that is the realistic hardware baseline for a large share of this population, not the exception.

**Device/Context:** Personal phone browser is the dominant surface by a wide margin; shared computer-lab desktop for students without a personal device or for heavier tasks. Because native mobile is out of scope, the responsive web app's mobile performance (fast load on weak connections, thumb-friendly layout) is not a nice-to-have for this persona — it is the product.

---

### 3.17 `parent` — Meera & Suresh Patel, Parents of a Grade 8 student ⭐

**Segment:** School primarily, Coaching Institute (parents of aspirants still in school), and some College (though far less common once students are adults at university — parent portal usage drops sharply past Grade 12 in most markets).

**Demographics/Background:** Both 38–42, working professionals (Meera in healthcare administration, Suresh in a mid-size firm), moderate tech literacy, share one school-communication touchpoint but both want visibility. Two children at the same school, one in Grade 8 and one in Grade 4.

**Goals & Motivations:** Stay informed about both children's academic progress, attendance, and fees without having to chase the school for information; be confident their children are safe on the school bus and, later, in a hostel; walk into a Parent-Teacher Meeting already informed rather than being informed *at* the meeting.

**Daily Workflow:** Meera gets a phone-browser notification about her Grade 4 daughter's attendance being marked; a quick glance at **Attendance** confirms both children were marked present today. Reviews **Communication** for a school circular about an upcoming holiday and a direct message from her Grade 8 son's class teacher about a slipping quiz score — flagged early, not discovered at report-card time. Checks **Fees & Finance** ahead of the term's due date and pays online from her phone in under two minutes, instead of a paper fee circular that too often got buried at the bottom of a schoolbag until it was almost overdue. Before Friday's PTM (the same meeting Principal Iyer and Accountant Pillai are separately preparing for), Suresh reviews both children's **Examinations** result trends over the last three tests so the conversation with the teacher is a discussion of what to do next, not a first-time discovery of a problem. Tracks the school bus's live status in **Transport** on the days he's the one waiting at the stop.

**Pain Points with Legacy Tools:** Fee due-date notices came home as paper circulars that regularly got lost in a schoolbag, resulting in late-payment stress that was entirely avoidable. Attendance shortfalls were invisible until report-card time, with no proactive warning. PTM conversations were unproductive because parents walked in with no data and were essentially told the problem for the first time, with no chance to prepare. With two children at the same school, tracking two separate paper diaries roughly doubled the chance something got missed.

**What Success Looks Like:** One login covering both children; proactive alerts *before* a fee due-date or an attendance dip becomes a crisis, not after; walking into a PTM already knowing the trend, so the 10-minute conversation is about a plan, not a revelation.

**Top Features:** Fees & Finance (pay + proactive reminders); Attendance (real-time percentage per child); Examinations (results/trend view); Communication (circulars and direct teacher messages); Transport (bus tracking).

**Technical Proficiency:** Basic–intermediate, and this varies enormously across the parent population — the design must be simple enough for a parent who has never used anything beyond a messaging app, and ideally supports regional-language interfaces given the diversity of the target markets.

**Device/Context:** Personal phone browser almost exclusively — this is, alongside `student`, the persona for whom mobile-web quality matters most, precisely because there is no native app; occasional desktop use at home for fee payment when a larger screen is convenient.

---

### 3.18 `guest` — Trustee / Prospective Parent / External Auditor (composite persona)

**Segment:** All segments — this is a scoped, time-boxed access pattern rather than a segment-specific role. Typical instances: a school-management trust member reviewing board-level KPIs, a prospective parent checking an admissions application's status, an external accreditation auditor granted read-only access to specific reports, or an alumnus.

**Demographics/Background:** Varies widely by instance — a trustee might be a 60-year-old retired executive; a prospective parent a 35-year-old professional; an auditor a visiting accreditation-committee member with no prior familiarity with the institution's systems at all.

**Goals & Motivations:** Get a specific piece of information quickly, without needing the overhead of a full staff account, and without depending on someone else to manually produce and email a document that's stale the moment it's sent.

**Daily Workflow:** Receives a time-boxed invite link generated by the `institution_admin` (Ananya Krishnan). Logs into a deliberately narrow guest view — for a prospective parent, this is their child's **Admissions** application status; for a trustee, a read-only **Dashboard** with board-level KPIs; for an accreditation auditor, a scoped **Analytics & Reports** packet with exactly the tables they've been granted access to and nothing more. No edit capability anywhere. The session expires automatically per the policy the `institution_admin` set.

**Pain Points with Legacy Tools:** Trustees and auditors historically received static PDF or Excel exports by email that were out of date within days. Prospective parents had to call the front office for even a basic admission-status update, straining office staff during peak admission season. Auditors requesting supporting documentation could wait weeks for staff to manually assemble and send it.

**What Success Looks Like:** Self-service, always-current, narrowly-scoped access that never requires IT to manually create or revoke a full account for a one-time need; access that expires itself instead of requiring someone to remember to revoke it.

**Top Features:** Admissions (application status portal); Analytics & Reports (scoped board/accreditation packets); Dashboard (read-only KPIs); (configured by `institution_admin` via Settings, which controls guest scope and expiry).

**Technical Proficiency:** Varies widely — design for the least tech-confident plausible guest, since this audience cannot be trained or onboarded the way an employee can.

**Device/Context:** Personal phone or desktop browser via a one-time link; no account creation friction, no app install.

---

## 4. Buyer vs. User Distinction

Sutram, like most enterprise education software, is sold to one set of people and used daily by a much larger, more diverse set of people. Conflating "who decides to buy" with "who has to love using it every day" is a common cause of enterprise-software failure in this category — this section makes the distinction explicit.

| Category | Who | What they optimize for |
|---|---|---|
| **Economic Buyer** (signs the contract, owns the budget/ROI decision) | `institution_admin` (owns the relationship day to day); `principal` (School); `dean`/Vice-Chancellor's office (University, often alongside `institution_admin`); an owner-director in a Coaching Institute; a management trust/board in many Indian private institutions | Total cost of ownership, tier fit, reduction in administrative headcount/overhead, accreditation and compliance risk reduction, vendor reliability |
| **Technical Evaluator / Influencer** (assesses fit before signature, can veto) | `institution_admin`, `registrar` (records/compliance fit), `hod`/IT committee members, sometimes `accountant` (fee/payment gateway fit) | Data migration feasibility, integration with existing systems, security/compliance posture, ease of role/permission configuration |
| **Champion** (drives adoption internally, first to feel the pain the product solves) | `institution_admin`, occasionally a proactive `principal`, `dean`, or `hod` who is personally frustrated with the status quo | Visible quick wins in the first term that build internal credibility for the rollout |
| **Daily Power Users** (heaviest, most frequent, most feature-dependent usage) | `faculty`, `accountant`, `registrar`, `hr_manager`, `hostel_warden`, `librarian`, `placement_officer`, `transport_manager`, `hod` | Speed of routine tasks (attendance, mark entry, reconciliation), reliability, minimal clicks for repetitive actions |
| **Daily Casual/Mass Users** (very high headcount, shallow but frequent per-session usage) | `student`, `parent` | Simplicity, mobile-web performance, proactive notifications, zero training required |
| **Executive/Oversight Users** (low frequency, high-stakes, dashboard/report consumption) | `principal`, `dean`, `registrar` (for compliance), `institution_admin` | Trustworthy, always-current summary data without needing to ask staff to "pull a report" |
| **Vendor-Side Operator** (not a customer at all) | `super_admin` | Platform-wide reliability, tenant isolation, entitlement correctness |
| **Scoped/Occasional Access** | `guest` | Getting one answer fast without account overhead |

**Key implication for product and GTM:** the sales and onboarding motion must satisfy `institution_admin`/`principal`/`dean` (the buyer), but retention and expansion (Starter → Growth → Enterprise, seat growth, low churn) are actually won or lost on whether `faculty`, `student`, and `parent` — none of whom signed the contract and none of whom can be "sold" — find Sutram meaningfully faster than what it replaced. This is why `institution_admin`, `faculty`, `student`, and `parent` are the four Phase 1 MVP priority personas: one buyer-side and three usage-side personas whose combined success determines both the sale and the renewal.

---

## 5. Empathy Maps — Phase 1 MVP Priority Personas

These four personas — `institution_admin`, `faculty`, `student`, `parent` — carry the heaviest weight in Phase 1 scope decisions because together they represent the buyer, the highest-friction daily operator, and the two highest-headcount usage populations.

### 5.1 Institution Admin — Ananya Krishnan

| | |
|---|---|
| **Says** | "Why does every accreditation visit turn into a three-week data-collection project?" · "I need to know today's numbers, not last month's." · "Every new system I add is another login my staff will refuse to use." |
| **Thinks** | "If this rollout fails, it's my name on it with the board." · "I can't keep approving shadow spreadsheets — but I also can't force adoption without making the official system genuinely easier." |
| **Does** | Provisions and configures user access; monitors institution-wide dashboards; extracts compliance/accreditation reports; mediates escalations between departments; owns the tier/subscription relationship. |
| **Feels** | Accountable and exposed — she is the single point of contact when *anything* about the system is wrong, from a wrong fee amount to a missing report field, regardless of whether it was her configuration mistake or not. |
| **Pains** | Fragmented systems that force manual reconciliation before every audit; low-tech staff quietly reverting to Excel/WhatsApp when the official tool is inconvenient, silently eroding data quality. |
| **Gains sought** | A single source of truth that survives an accreditation visit unprepared; faculty and parents who actually use the system without being told to. |

### 5.2 Faculty — Arjun Mehta

| | |
|---|---|
| **Says** | "Just let me get attendance done before the bell rings." · "I already have this student's marks in my notebook — why do I have to type it again?" · "I need five more minutes with my students, not five more minutes with a screen." |
| **Thinks** | "Every extra click here is a click I'm not spending on lesson prep." · "If I mess up this parent's message, I'll hear about it at the PTM." |
| **Does** | Marks attendance multiple times a day; enters marks/grades; uploads lesson content; messages parents and mentors students; checks his own teaching-load summary. |
| **Feels** | Time-squeezed and slightly wary of new systems that have historically added work rather than removed it; relieved when something genuinely saves him time (attendance in under a minute); frustrated by anything that requires re-entering data he's already entered once. |
| **Pains** | Re-typing the same mark into multiple places; parent conversations with no shared record; counseling a student with no visibility beyond his own subject. |
| **Gains sought** | Attendance and grading fast enough to be a non-event in his day; one shared thread per parent; a full picture of a student the moment he needs it. |

### 5.3 Student — Riya Sharma

| | |
|---|---|
| **Says** | "Did I miss an announcement again?" · "Can I just pay this online instead of my mom taking a day off?" · "What's my attendance percentage right now — am I at risk?" |
| **Thinks** | "If it's not on my phone, I'll probably miss it." · "I don't want to bother a teacher for something I could check myself." |
| **Does** | Checks schedule and results on her phone; pays fees online; messages teachers with doubts; checks library due dates; (in senior years) checks placement eligibility. |
| **Feels** | Mildly anxious about missing something important through no fault of her own (an announcement she never saw); relieved when she can self-serve an answer instead of waiting on an adult; comfortable and fluent with the phone-first interaction pattern, impatient with anything slow or clunky on her device. |
| **Pains** | Missed announcements from being absent the one day they were read out; surprise attendance debarment; results scattered across WhatsApp PDFs; parents losing a work day for a bank-queue fee payment. |
| **Gains sought** | Everything time-sensitive pushed to her, not something she has to hunt for; instant results and a running attendance counter; fast, reliable performance on an ordinary Android phone and a modest data plan. |

### 5.4 Parent — Meera & Suresh Patel

| | |
|---|---|
| **Says** | "I found out about this at the PTM — why didn't anyone tell me sooner?" · "I don't want to chase the school for basic information." · "Is my child safe on that bus right now?" |
| **Thinks** | "If something's wrong, I want to know before it becomes a crisis, not after." · "I have two kids in this school — I shouldn't need two separate systems to track them." |
| **Does** | Checks attendance and results; pays fees online; reads school circulars and messages teachers directly; tracks the school bus; prepares mentally for PTMs using result trends. |
| **Feels** | Time-poor and guilty about not being more present at school; anxious specifically about safety (transport, hostel) and about being blindsided at a PTM; grateful for anything that removes a step from an already busy day. |
| **Pains** | Paper fee circulars lost in a schoolbag; attendance problems invisible until report-card time; PTM conversations that reveal a problem for the first time instead of discussing a plan; doubled effort tracking multiple children. |
| **Gains sought** | Proactive alerts before a deadline or a dip becomes urgent; one login for every child; enough data before a PTM to make it a 10-minute planning conversation instead of a 30-minute revelation. |

---

## 6. Segment Cross-Reference Table

Not every role is equally relevant to every institution type. This table shows how strongly each persona maps to each segment, to guide segment-specific onboarding flows, marketing messaging, and which roles get emphasized in segment-specific demos.

**Legend:** **P** = Primary (core to how that segment operates) · **S** = Secondary (present, meaningful, but not defining) · **R** = Rare (exists occasionally, e.g., only at larger institutions of that type) · **–** = Not applicable / effectively never present

| Role Slug | School (K-12) | College | University | Coaching Institute | Research Lab / Training Institute |
|---|---|---|---|---|---|
| `super_admin` | — (vendor-side across all) | | | | |
| `institution_admin` | P | P | P | P | P |
| `principal` | P | R | – | P (as Center Director) | – |
| `dean` | – | P | P | – | R |
| `registrar` | R | P | P | R | – |
| `hod` | R | P | P | S | S |
| `faculty` | P | P | P | P | S |
| `teaching_assistant` | – | S | P | R | S |
| `researcher` | – | S | P | – | P |
| `accountant` | P | P | P | P | P |
| `hr_manager` | S | P | P | S | S |
| `hostel_warden` | S (boarding schools) | S | P | R | R |
| `librarian` | P | P | P | S | S |
| `placement_officer` | – | P | P | S | – |
| `transport_manager` | P | S | S | R | – |
| `student` | P | P | P | P | S (research scholars) |
| `parent` | P | S | R | P | – |
| `guest` | S | S | S | S | S |

**Reading the table:**
- **School (K-12)** is dominated by `principal`, `faculty`, `transport_manager`, and `parent` — governance roles like `dean`, `registrar`, and `researcher` essentially don't exist here.
- **College and University** look similar to each other, both anchored by `dean`, `registrar`, `hod`, and (for University specifically) `researcher` and `teaching_assistant`, which are rare or absent in most Colleges.
- **Coaching Institute** mirrors School's operational simplicity (a `principal`-equivalent Center Director, `faculty`/trainers, `parent` engagement) but adds `placement_officer`-style outcome tracking for competitive-exam results and college counseling.
- **Research Lab / Training Institute** is the most specialized segment — `researcher` is its Primary persona, with `faculty`, `hod`, and `hr_manager` present in Secondary support roles and almost no `student`, `parent`, or `transport_manager` presence.
- `institution_admin` and `accountant` are Primary everywhere — every tenant, regardless of segment, needs someone owning system configuration and someone owning the books.

---

*End of Document 5 — User Personas.*
