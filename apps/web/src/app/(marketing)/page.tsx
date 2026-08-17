import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  GraduationCap,
  Wallet,
  CalendarCheck,
  FileCheck2,
  Sparkles,
  ShieldCheck,
  Building2,
  Users,
  BookOpen,
  Lock,
  Database,
  Layers,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProductMockup } from "@/components/marketing/product-mockup";

const METRICS = [
  { value: "12", label: "core modules shipped" },
  { value: "18", label: "role-based dashboards" },
  { value: "100%", label: "tables tenant-isolated" },
  { value: "<15min", label: "signup to live workspace" },
];

const SMALL_MODULES = [
  { icon: Users, label: "Faculty & HR", desc: "Timetables, payroll, leave and performance in one place.", color: "text-chart-2 bg-chart-2/10" },
  { icon: CalendarCheck, label: "Attendance", desc: "Real-time attendance with automatic parent alerts.", color: "text-chart-4 bg-chart-4/10" },
  { icon: FileCheck2, label: "Examinations", desc: "Hall tickets, marks entry, grading and transcripts.", color: "text-chart-5 bg-chart-5/10" },
  { icon: Wallet, label: "Fees & Finance", desc: "Invoicing, online payment, scholarships and payroll.", color: "text-chart-1 bg-chart-1/10" },
];

const SEGMENTS = [
  { label: "Schools", desc: "K-12 admissions, attendance, report cards and parent communication." },
  { label: "Colleges", desc: "Multi-department academics, exams, placements and alumni." },
  { label: "Universities", desc: "Multi-campus programs, research management and accreditation reporting." },
  { label: "Coaching institutes", desc: "Batch management, test series and performance analytics." },
  { label: "Research labs", desc: "Projects, funding, publications and lab resource tracking." },
];

const STEPS = [
  { n: "01", title: "Create your workspace", desc: "Institution name, type and plan — your isolated tenant is provisioned instantly." },
  { n: "02", title: "Configure in minutes", desc: "Departments, campuses, academic year and branding, guided step by step." },
  { n: "03", title: "Invite your team", desc: "Role-based access for every admin, faculty member, student and parent." },
];

export default function HomePage() {
  return (
    <>
      {/* ───────────────────────── Hero ───────────────────────── */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-grid-pattern" aria-hidden />
        <div
          className="absolute -top-24 -left-24 size-[28rem] rounded-full bg-primary/20 blur-3xl animate-float-slow"
          aria-hidden
        />
        <div
          className="absolute top-40 right-[-8rem] size-[24rem] rounded-full bg-accent/15 blur-3xl animate-float-slow-reverse"
          aria-hidden
        />

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 pt-20 pb-20 sm:pt-28 sm:pb-28">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className="max-w-xl">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-medium text-primary mb-6">
                <Sparkles className="size-3.5" />
                AI-native, not AI-bolted-on
              </span>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-semibold tracking-tight text-foreground text-balance">
                The Education Operating System, built for the{" "}
                <span className="bg-gradient-to-r from-primary via-primary to-accent bg-clip-text text-transparent">
                  AI era
                </span>
              </h1>
              <p className="mt-6 text-lg text-muted-foreground max-w-xl text-pretty">
                Sutram unifies admissions, academics, finance, HR and AI into one platform for
                schools, colleges, universities, coaching institutes and research labs —
                replacing a dozen disconnected tools with one.
              </p>
              <div className="mt-10 flex flex-col sm:flex-row gap-3">
                <Button
                  size="lg"
                  className="shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-shadow"
                  asChild
                >
                  <Link href="/signup">
                    Start free trial <ArrowRight className="size-4" />
                  </Link>
                </Button>
                <Button size="lg" variant="outline" asChild>
                  <Link href="/demo">Request a demo</Link>
                </Button>
              </div>
              <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="size-4 text-success" /> No credit card required
                </span>
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="size-4 text-success" /> Live in days, not months
                </span>
              </div>
            </div>

            <div className="lg:pl-4">
              <ProductMockup />
            </div>
          </div>
        </div>

        {/* Metrics strip */}
        <div className="relative border-t border-border bg-card/60 backdrop-blur">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 py-8 grid grid-cols-2 sm:grid-cols-4 gap-6">
            {METRICS.map((m) => (
              <div key={m.label} className="text-center sm:text-left">
                <div className="text-3xl font-bold text-foreground tabular-nums">{m.value}</div>
                <div className="text-sm text-muted-foreground mt-0.5">{m.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ───────────────────────── Feature bento grid ───────────────────────── */}
      <section className="border-t border-border bg-muted/30">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-20 sm:py-28">
          <div className="max-w-2xl mb-14">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-primary mb-3">
              One platform, entire lifecycle
            </h2>
            <p className="text-2xl sm:text-3xl font-semibold text-foreground text-balance">
              Every module your institution runs on — connected by default, not integrated
              after the fact.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Featured: Admissions & Students */}
            <div className="lg:col-span-7 rounded-2xl border border-border bg-card p-8 relative overflow-hidden group hover:border-primary/30 transition-colors">
              <div
                className="absolute -right-16 -top-16 size-56 rounded-full bg-primary/10 blur-2xl group-hover:bg-primary/15 transition-colors"
                aria-hidden
              />
              <div className="relative">
                <div className="inline-flex items-center justify-center size-12 rounded-xl bg-primary/10 text-primary mb-5">
                  <GraduationCap className="size-6" />
                </div>
                <h3 className="text-xl font-semibold text-foreground">Admissions &amp; Students</h3>
                <p className="text-muted-foreground mt-2 max-w-md">
                  From application to alumni, one record follows every student — admission,
                  documents, guardians, attendance, fees and results, all in one profile.
                </p>
                <ul className="mt-5 grid grid-cols-2 gap-x-6 gap-y-2 text-sm text-foreground/80">
                  {["Application intake", "Accept → convert to student", "Guardian records", "Full academic history"].map((f) => (
                    <li key={f} className="flex items-center gap-2">
                      <CheckCircle2 className="size-3.5 text-success shrink-0" /> {f}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Featured: AI Assistant */}
            <div className="lg:col-span-5 rounded-2xl border border-accent/20 bg-gradient-to-br from-accent/5 via-card to-card p-8 relative overflow-hidden group hover:border-accent/40 transition-colors">
              <div
                className="absolute -right-12 -top-12 size-48 rounded-full bg-accent/15 blur-2xl group-hover:bg-accent/20 transition-colors"
                aria-hidden
              />
              <div className="relative">
                <div className="inline-flex items-center justify-center size-12 rounded-xl bg-accent/15 text-accent mb-5">
                  <Sparkles className="size-6" />
                </div>
                <h3 className="text-xl font-semibold text-foreground">AI Assistant</h3>
                <p className="text-muted-foreground mt-2">
                  A role-scoped copilot that never sees more than the signed-in user could.
                  Every suggestion is advisory — humans approve grades, money and
                  parent-facing messages.
                </p>
                <span className="inline-flex items-center gap-1.5 mt-5 text-sm font-medium text-accent">
                  See how it&apos;s scoped <ArrowUpRight className="size-3.5" />
                </span>
              </div>
            </div>

            {SMALL_MODULES.map((m) => (
              <div
                key={m.label}
                className="lg:col-span-3 rounded-2xl border border-border bg-card p-6 hover:border-primary/30 hover:shadow-md transition-all"
              >
                <div className={`inline-flex items-center justify-center size-10 rounded-lg mb-4 ${m.color}`}>
                  <m.icon className="size-5" />
                </div>
                <h3 className="font-medium text-foreground">{m.label}</h3>
                <p className="text-sm text-muted-foreground mt-1.5">{m.desc}</p>
              </div>
            ))}

            {/* Library & Hostel */}
            <div className="lg:col-span-6 rounded-2xl border border-border bg-card p-8 flex items-start gap-5 hover:border-primary/30 transition-colors">
              <div className="inline-flex items-center justify-center size-12 rounded-xl bg-chart-3/10 text-chart-3 shrink-0">
                <BookOpen className="size-6" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground">Library &amp; Hostel</h3>
                <p className="text-muted-foreground mt-1.5">
                  Book issue/return with live copy tracking, room allocation with occupancy
                  tracking, mess and maintenance requests.
                </p>
              </div>
            </div>

            {/* Enterprise security */}
            <div className="lg:col-span-6 rounded-2xl border border-border bg-card p-8 flex items-start gap-5 hover:border-primary/30 transition-colors">
              <div className="inline-flex items-center justify-center size-12 rounded-xl bg-success-bg text-success shrink-0">
                <ShieldCheck className="size-6" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground">Enterprise security</h3>
                <p className="text-muted-foreground mt-1.5">
                  PostgreSQL Row-Level Security on every table, 18-role RBAC, full audit trail
                  — your data is isolated by the database itself, not just app code.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ───────────────────────── How it works ───────────────────────── */}
      <section className="border-t border-border">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-20 sm:py-28">
          <div className="max-w-2xl mb-14">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-primary mb-3">
              From signup to live
            </h2>
            <p className="text-2xl sm:text-3xl font-semibold text-foreground text-balance">
              No implementation project. No sales-led onboarding queue.
            </p>
          </div>

          <div className="grid sm:grid-cols-3 gap-8 relative">
            <div
              className="hidden sm:block absolute top-6 left-[16.5%] right-[16.5%] h-px bg-border"
              aria-hidden
            />
            {STEPS.map((step) => (
              <div key={step.n} className="relative">
                <div className="inline-flex items-center justify-center size-12 rounded-full bg-primary text-primary-foreground font-semibold relative z-10">
                  {step.n}
                </div>
                <h3 className="mt-5 font-semibold text-foreground text-lg">{step.title}</h3>
                <p className="mt-2 text-muted-foreground">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ───────────────────────── Segments ───────────────────────── */}
      <section className="border-t border-border bg-muted/30">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-20 sm:py-28">
          <div className="max-w-2xl mb-14">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-primary mb-3">
              Built for every kind of institution
            </h2>
            <p className="text-2xl sm:text-3xl font-semibold text-foreground text-balance">
              One product, configured for how your institution actually runs.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {SEGMENTS.map((s) => (
              <Link
                key={s.label}
                href="/solutions"
                className="group rounded-xl border border-border bg-card p-5 hover:border-primary/30 hover:shadow-md transition-all"
              >
                <div className="inline-flex items-center justify-center size-9 rounded-lg bg-secondary/10 text-secondary mb-4">
                  <Building2 className="size-4" />
                </div>
                <h3 className="font-medium text-foreground flex items-center gap-1">
                  {s.label}
                  <ArrowUpRight className="size-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                </h3>
                <p className="text-sm text-muted-foreground mt-1">{s.desc}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ───────────────────────── Trust strip ───────────────────────── */}
      <section className="border-t border-border">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-16 grid sm:grid-cols-3 gap-8">
          {[
            { icon: Database, title: "Row-Level Security", desc: "Tenant isolation enforced by Postgres itself, not just application code." },
            { icon: Lock, title: "Role-scoped by design", desc: "18 roles, permission-checked on every request, front and back end." },
            { icon: Layers, title: "One connected system", desc: "One student record, one source of truth, across every module." },
          ].map((item) => (
            <div key={item.title} className="flex items-start gap-4">
              <div className="inline-flex items-center justify-center size-10 rounded-lg bg-muted text-foreground shrink-0">
                <item.icon className="size-5" />
              </div>
              <div>
                <h3 className="font-medium text-foreground">{item.title}</h3>
                <p className="text-sm text-muted-foreground mt-1">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ───────────────────────── CTA ───────────────────────── */}
      <section className="relative border-t border-border overflow-hidden bg-primary text-primary-foreground">
        <div
          className="absolute inset-0 bg-grid-pattern opacity-[0.08]"
          style={{ filter: "invert(1)" }}
          aria-hidden
        />
        <div
          className="absolute -bottom-32 left-1/2 -translate-x-1/2 size-[36rem] rounded-full bg-accent/20 blur-3xl"
          aria-hidden
        />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 py-20 sm:py-28 text-center">
          <h2 className="text-3xl sm:text-4xl font-semibold text-balance">
            Ready to see Sutram on your own data?
          </h2>
          <p className="mt-3 text-primary-foreground/80 max-w-xl mx-auto text-lg">
            Spin up a free trial workspace in minutes, or book a walkthrough with our team.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
            <Button size="lg" variant="secondary" className="shadow-xl" asChild>
              <Link href="/signup">Start free trial</Link>
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10"
              asChild
            >
              <Link href="/demo">Request a demo</Link>
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}
