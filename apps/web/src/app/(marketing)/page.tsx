import Link from "next/link";
import {
  ArrowRight,
  GraduationCap,
  Wallet,
  CalendarCheck,
  FileCheck2,
  Sparkles,
  ShieldCheck,
  Building2,
  Users,
  BookOpen,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const MODULES = [
  { icon: GraduationCap, label: "Admissions & Students", desc: "From application to alumni, one record follows every student." },
  { icon: Users, label: "Faculty & HR", desc: "Timetables, payroll, leave and performance in one place." },
  { icon: CalendarCheck, label: "Attendance", desc: "Real-time attendance with automatic parent alerts." },
  { icon: FileCheck2, label: "Examinations", desc: "Hall tickets, marks entry, grading and transcripts." },
  { icon: Wallet, label: "Fees & Finance", desc: "Invoicing, online payment, scholarships and payroll." },
  { icon: BookOpen, label: "Library & Hostel", desc: "Issue/return, room allocation, mess and maintenance." },
  { icon: Sparkles, label: "AI Assistant", desc: "A role-scoped copilot that never sees more than the user can." },
  { icon: ShieldCheck, label: "Enterprise security", desc: "Row-level tenant isolation, SSO, full audit trail." },
];

const SEGMENTS = [
  { label: "Schools", desc: "K-12 admissions, attendance, report cards and parent communication." },
  { label: "Colleges", desc: "Multi-department academics, exams, placements and alumni." },
  { label: "Universities", desc: "Multi-campus programs, research management and accreditation reporting." },
  { label: "Coaching institutes", desc: "Batch management, test series and performance analytics." },
  { label: "Research labs", desc: "Projects, funding, publications and lab resource tracking." },
];

export default function HomePage() {
  return (
    <>
      <section className="relative overflow-hidden">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 pt-20 pb-24 sm:pt-28 sm:pb-32">
          <div className="max-w-3xl">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted px-3 py-1 text-xs font-medium text-muted-foreground mb-6">
              <Sparkles className="size-3.5 text-accent" />
              AI-native, not AI-bolted-on
            </span>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-semibold tracking-tight text-foreground text-balance">
              The Education Operating System, built for the AI era
            </h1>
            <p className="mt-6 text-lg text-muted-foreground max-w-xl">
              Sutram unifies admissions, academics, finance, HR and AI into one platform for
              schools, colleges, universities, coaching institutes and research labs —
              replacing a dozen disconnected tools with one.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row gap-3">
              <Button size="lg" asChild>
                <Link href="/signup">
                  Start free trial <ArrowRight className="size-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="/demo">Request a demo</Link>
              </Button>
            </div>
            <p className="mt-4 text-sm text-muted-foreground">
              No credit card required · Live in days, not months
            </p>
          </div>
        </div>
      </section>

      <section className="border-t border-border bg-muted/30">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-20">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-primary mb-3">
            One platform, entire lifecycle
          </h2>
          <p className="text-2xl sm:text-3xl font-semibold text-foreground max-w-2xl">
            Every module your institution runs on — connected by default, not integrated after
            the fact.
          </p>

          <div className="mt-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {MODULES.map((m) => (
              <div
                key={m.label}
                className="rounded-lg border border-border bg-card p-5 hover:border-primary/40 transition-colors"
              >
                <m.icon className="size-6 text-primary mb-3" />
                <h3 className="font-medium text-foreground">{m.label}</h3>
                <p className="text-sm text-muted-foreground mt-1">{m.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-border">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-20">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-primary mb-3">
            Built for every kind of institution
          </h2>
          <p className="text-2xl sm:text-3xl font-semibold text-foreground max-w-2xl mb-12">
            One product, configured for how your institution actually runs.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {SEGMENTS.map((s) => (
              <Link
                key={s.label}
                href="/solutions"
                className="rounded-lg border border-border p-5 hover:bg-muted/50 transition-colors"
              >
                <Building2 className="size-5 text-secondary mb-3" />
                <h3 className="font-medium text-foreground">{s.label}</h3>
                <p className="text-sm text-muted-foreground mt-1">{s.desc}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-border bg-primary text-primary-foreground">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-20 text-center">
          <h2 className="text-3xl font-semibold">Ready to see Sutram on your own data?</h2>
          <p className="mt-3 text-primary-foreground/80 max-w-xl mx-auto">
            Spin up a free trial workspace in minutes, or book a walkthrough with our team.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
            <Button size="lg" variant="secondary" asChild>
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
