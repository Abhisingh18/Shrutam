import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  Briefcase,
  Building2,
  Bus,
  CalendarCheck,
  CheckCircle2,
  FileCheck2,
  FlaskConical,
  GraduationCap,
  Handshake,
  Layers,
  Library,
  MessageSquare,
  Sparkles,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Reveal } from "@/components/shared/reveal";

export const metadata: Metadata = {
  title: "Features",
  description: "Every module Sutram ships — from admissions to AI-native analytics.",
};

interface Feature {
  icon: LucideIcon;
  title: string;
  points: string[];
}

interface Category {
  eyebrow: string;
  heading: string;
  /** Fully literal Tailwind classes — never interpolate a color token into a
   * class string, the JIT compiler can't see through template literals and
   * would silently drop the class from the generated CSS. */
  badgeClass: string;
  features: Feature[];
}

const CATEGORIES: Category[] = [
  {
    eyebrow: "Student lifecycle",
    heading: "Admission through graduation, one connected record",
    badgeClass: "border-primary/20 bg-primary/5 text-primary",
    features: [
      {
        icon: GraduationCap,
        title: "Admissions & Students",
        points: [
          "Online applications with AI-assisted screening and duplicate detection",
          "One student record from admission through alumni",
          "Documents, guardians, medical and disciplinary history in one profile",
        ],
      },
      {
        icon: Layers,
        title: "Academics",
        points: [
          "Departments, programs, courses, subjects and curricula",
          "Semester and academic-calendar management",
          "Section and timetable generation",
        ],
      },
      {
        icon: CalendarCheck,
        title: "Attendance",
        points: [
          "Daily and per-period attendance capture",
          "Anomaly detection with automatic parent alerts",
          "Attendance-linked exam eligibility rules",
        ],
      },
      {
        icon: FileCheck2,
        title: "Examinations",
        points: [
          "Exam scheduling, hall tickets and seating plans",
          "Marks entry, grading and CGPA calculation",
          "Transcripts and certificates on demand",
        ],
      },
    ],
  },
  {
    eyebrow: "Money & operations",
    heading: "The day-to-day running of a campus",
    badgeClass: "border-chart-1/20 bg-chart-1/5 text-chart-1",
    features: [
      {
        icon: Wallet,
        title: "Fees & Finance",
        points: [
          "Configurable fee structures and online payment collection",
          "Scholarships, refunds and payroll",
          "Real-time ledgers and finance reporting",
        ],
      },
      {
        icon: Library,
        title: "Library",
        points: ["Catalog, issue/return and fine management", "Barcode and digital-resource support"],
      },
      {
        icon: Building2,
        title: "Hostel",
        points: ["Room allocation, mess planning", "Visitor logs and maintenance requests"],
      },
      {
        icon: Bus,
        title: "Transport",
        points: ["Routes, drivers and vehicle passes", "Attendance-linked pickup/drop tracking"],
      },
    ],
  },
  {
    eyebrow: "People",
    heading: "Everyone who works at the institution",
    badgeClass: "border-chart-2/20 bg-chart-2/5 text-chart-2",
    features: [
      {
        icon: Users,
        title: "Faculty",
        points: [
          "Faculty profiles, subject and section assignment, timetables",
          "Leave, payroll and performance reviews",
          "Research and publication tracking",
        ],
      },
      {
        icon: Briefcase,
        title: "HR",
        points: ["Recruitment, payroll and leave", "Performance reviews and promotions"],
      },
      {
        icon: Handshake,
        title: "Placement",
        points: ["Company and job-posting management", "Interview pipelines and offer tracking"],
      },
      {
        icon: FlaskConical,
        title: "Research",
        points: ["Projects, funding and research groups", "Publications and patents"],
      },
    ],
  },
];

const AI_FEATURE: Feature = {
  icon: Sparkles,
  title: "AI Assistant",
  points: [
    "A role-scoped copilot — never sees more than the signed-in user could",
    "AI-drafted communications, always human-approved before sending",
    "Explainable risk scoring for attendance and fee defaults",
  ],
};

const CLOSING_FEATURES: Feature[] = [
  {
    icon: MessageSquare,
    title: "Communication",
    points: ["Email, SMS and WhatsApp from one console", "Announcements, calendars and events"],
  },
  {
    icon: BarChart3,
    title: "Analytics & Reports",
    points: ["Executive, admissions, finance and placement dashboards", "Exportable board-ready reports"],
  },
];

const STATS = [
  { value: "15", label: "connected modules" },
  { value: "1", label: "shared student & staff record" },
  { value: "0", label: "spreadsheets re-entered" },
];

function FeatureCard({ feature, delay }: { feature: Feature; delay: number }) {
  return (
    <Reveal delay={delay}>
      <div className="group h-full rounded-2xl border border-border bg-card p-6 hover:border-primary/30 hover:shadow-xl hover:shadow-primary/5 hover:-translate-y-1 transition-all duration-300">
        <div className="inline-flex items-center justify-center size-11 rounded-xl bg-muted text-foreground mb-4 group-hover:scale-110 group-hover:bg-primary/10 group-hover:text-primary transition-all duration-300">
          <feature.icon className="size-5" />
        </div>
        <h3 className="font-display font-semibold text-foreground">{feature.title}</h3>
        <ul className="mt-3 space-y-2">
          {feature.points.map((p) => (
            <li key={p} className="text-sm text-muted-foreground flex gap-2 leading-snug">
              <CheckCircle2 className="size-3.5 text-success shrink-0 mt-0.5" />
              <span>{p}</span>
            </li>
          ))}
        </ul>
      </div>
    </Reveal>
  );
}

function CategorySection({ category, index }: { category: Category; index: number }) {
  return (
    <section className={index > 0 ? "border-t border-border" : undefined}>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-16 sm:py-20">
        <Reveal className="max-w-2xl mb-10">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide mb-4 ${category.badgeClass}`}
          >
            {category.eyebrow}
          </span>
          <h2 className="font-display text-2xl sm:text-3xl font-semibold text-foreground text-balance">
            {category.heading}
          </h2>
        </Reveal>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {category.features.map((feature, i) => (
            <FeatureCard key={feature.title} feature={feature} delay={i * 80} />
          ))}
        </div>
      </div>
    </section>
  );
}

export default function FeaturesPage() {
  return (
    <>
      {/* ───────────────────────── Hero ───────────────────────── */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-grid-pattern" aria-hidden />
        <div
          className="absolute -top-24 -right-24 size-[26rem] rounded-full bg-primary/15 blur-3xl animate-float-slow"
          aria-hidden
        />
        <div
          className="absolute top-32 -left-32 size-[22rem] rounded-full bg-accent/10 blur-3xl animate-float-slow-reverse"
          aria-hidden
        />

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 pt-20 pb-16 sm:pt-28 sm:pb-20">
          <div className="max-w-2xl animate-in fade-in slide-in-from-bottom-4 duration-700">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/5 px-3.5 py-1.5 text-xs font-medium text-primary mb-6 shadow-sm shadow-primary/5">
              <Layers className="size-3.5" />
              Every module, one platform
            </span>
            <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-semibold tracking-tight text-foreground text-balance leading-[1.08]">
              Everything your institution{" "}
              <span className="bg-gradient-to-r from-primary via-primary to-accent bg-clip-text text-transparent">
                runs on
              </span>
            </h1>
            <p className="mt-6 text-lg text-muted-foreground max-w-xl text-pretty leading-relaxed">
              Sutram ships as one connected platform — every module below shares the same
              student, staff and finance records, so nothing needs re-entering twice.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-3">
              <Button
                size="lg"
                className="shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 hover:-translate-y-0.5 transition-all"
                asChild
              >
                <Link href="/signup">
                  Start free trial <ArrowRight className="size-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" className="hover:-translate-y-0.5 transition-transform" asChild>
                <Link href="/demo">Request a demo</Link>
              </Button>
            </div>
          </div>
        </div>

        <div className="relative border-t border-border bg-card/60 backdrop-blur">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 py-8 grid grid-cols-3 gap-6">
            {STATS.map((s, i) => (
              <Reveal key={s.label} delay={i * 80} className="text-center sm:text-left">
                <div className="font-display text-3xl font-bold text-foreground tabular-nums">{s.value}</div>
                <div className="text-sm text-muted-foreground mt-0.5">{s.label}</div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ───────────────────────── Category sections ───────────────────────── */}
      {CATEGORIES.map((category, index) => (
        <CategorySection key={category.eyebrow} category={category} index={index} />
      ))}

      {/* ───────────────────────── Intelligence & engagement ───────────────────────── */}
      <section className="border-t border-border">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-16 sm:py-20">
          <Reveal className="max-w-2xl mb-10">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-accent/20 bg-accent/5 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-accent mb-4">
              Intelligence &amp; engagement
            </span>
            <h2 className="font-display text-2xl sm:text-3xl font-semibold text-foreground text-balance">
              The layer that makes the rest smarter
            </h2>
          </Reveal>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            <Reveal className="lg:col-span-7">
              <div className="h-full rounded-2xl border border-accent/20 bg-gradient-to-br from-accent/5 via-card to-card p-8 relative overflow-hidden group hover:border-accent/40 hover:shadow-xl hover:shadow-accent/10 hover:-translate-y-1 transition-all duration-300">
                <div
                  className="absolute -right-16 -top-16 size-56 rounded-full bg-accent/15 blur-2xl group-hover:bg-accent/20 transition-colors"
                  aria-hidden
                />
                <div className="relative">
                  <div className="inline-flex items-center justify-center size-12 rounded-xl bg-accent/15 text-accent mb-5 group-hover:scale-110 transition-transform duration-300">
                    <AI_FEATURE.icon className="size-6" />
                  </div>
                  <h3 className="font-display text-xl font-semibold text-foreground">{AI_FEATURE.title}</h3>
                  <ul className="mt-4 space-y-2 max-w-md">
                    {AI_FEATURE.points.map((p) => (
                      <li key={p} className="text-sm text-foreground/80 flex gap-2">
                        <CheckCircle2 className="size-3.5 text-accent shrink-0 mt-0.5" />
                        <span>{p}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </Reveal>

            <div className="lg:col-span-5 flex flex-col gap-5">
              {CLOSING_FEATURES.map((feature, i) => (
                <div key={feature.title} className="flex-1">
                  <FeatureCard feature={feature} delay={100 + i * 100} />
                </div>
              ))}
            </div>
          </div>
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
        <Reveal className="relative mx-auto max-w-7xl px-4 sm:px-6 py-20 sm:py-28 text-center">
          <h2 className="font-display text-3xl sm:text-4xl font-semibold text-balance">
            See every module working together
          </h2>
          <p className="mt-3 text-primary-foreground/80 max-w-xl mx-auto text-lg">
            Spin up a free trial workspace in minutes, or book a walkthrough with our team.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
            <Button size="lg" variant="secondary" className="shadow-xl hover:-translate-y-0.5 transition-transform" asChild>
              <Link href="/signup">Start free trial</Link>
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10 hover:-translate-y-0.5 transition-transform"
              asChild
            >
              <Link href="/demo">Request a demo</Link>
            </Button>
          </div>
        </Reveal>
      </section>
    </>
  );
}
