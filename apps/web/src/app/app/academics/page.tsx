"use client";

import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  CalendarDays,
  CalendarRange,
  Landmark,
  Sparkles,
  Users,
  type LucideIcon,
} from "lucide-react";
import { RequirePermission } from "@/components/auth/require-permission";
import { AcademicsSubNav } from "@/components/academics/academics-subnav";
import { Skeleton } from "@/components/ui/skeleton";
import { useAcademicsSummary } from "@/hooks/use-academics-summary";
import type { AcademicsSummary } from "@/types/academics";

interface PipelineStep {
  key: keyof AcademicsSummary;
  href: string;
  label: string;
  description: string;
  icon: LucideIcon;
  accent: string;
}

const STEPS: PipelineStep[] = [
  {
    key: "departments",
    href: "/app/academics/departments",
    label: "Departments",
    description: "The academic org chart root.",
    icon: Landmark,
    accent: "from-chart-1/20 to-chart-1/5 text-chart-1",
  },
  {
    key: "programs",
    href: "/app/academics/programs",
    label: "Programs",
    description: "Degrees offered per department.",
    icon: BookOpen,
    accent: "from-chart-2/20 to-chart-2/5 text-chart-2",
  },
  {
    key: "academic_years",
    href: "/app/academics/academic-years",
    label: "Academic Years",
    description: "e.g. 2026–2027.",
    icon: CalendarRange,
    accent: "from-chart-3/20 to-chart-3/5 text-chart-3",
  },
  {
    key: "semesters",
    href: "/app/academics/semesters",
    label: "Semesters",
    description: "Terms within a year.",
    icon: CalendarDays,
    accent: "from-chart-4/20 to-chart-4/5 text-chart-4",
  },
  {
    key: "sections",
    href: "/app/academics/sections",
    label: "Sections",
    description: "Class groups + class teacher.",
    icon: Users,
    accent: "from-chart-5/20 to-chart-5/5 text-chart-5",
  },
  {
    key: "subjects",
    href: "/app/academics/subjects",
    label: "Subjects",
    description: "What gets taught.",
    icon: Sparkles,
    accent: "from-primary/20 to-primary/5 text-primary",
  },
];

function PipelineCard({ step, count }: { step: PipelineStep; count: number | undefined }) {
  const Icon = step.icon;
  return (
    <Link
      href={step.href}
      className="group relative flex-1 min-w-[150px] rounded-2xl border border-border bg-card p-5 transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary/5 hover:border-primary/30"
    >
      <div
        className={`inline-flex items-center justify-center size-11 rounded-xl bg-gradient-to-br ${step.accent} mb-4`}
      >
        <Icon className="size-5" />
      </div>
      <div className="text-3xl font-bold text-foreground tabular-nums">
        {count === undefined ? <Skeleton className="h-8 w-12" /> : count}
      </div>
      <div className="text-sm font-medium text-foreground mt-1">{step.label}</div>
      <p className="text-xs text-muted-foreground mt-0.5 leading-snug">{step.description}</p>
      <ArrowRight className="absolute top-5 right-5 size-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
    </Link>
  );
}

function AcademicsHubPage() {
  const { data: summary, isLoading } = useAcademicsSummary();
  const isEmpty =
    !isLoading &&
    summary &&
    Object.values(summary).every((v) => v === 0);

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 py-5 border-b border-border">
        <h1 className="text-xl font-semibold text-foreground">Academics</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          The full hierarchy your institution runs on — set it up once, top to bottom.
        </p>
      </div>
      <AcademicsSubNav />

      <div className="flex-1 overflow-auto px-6 py-8">
        <div className="max-w-5xl mx-auto space-y-8">
          {isEmpty && (
            <div className="rounded-xl border border-dashed border-primary/30 bg-primary/5 p-5 flex items-start gap-3">
              <Sparkles className="size-5 text-primary shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-foreground">
                  Let&apos;s set up your academic structure
                </p>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Start with a Department, then add a Program under it, an Academic Year, a
                  Semester, and finally Sections and Subjects — each step below unlocks the
                  next.
                </p>
              </div>
            </div>
          )}

          <div>
            <div className="flex items-center gap-2 mb-4">
              <h2 className="text-sm font-semibold text-foreground">The hierarchy</h2>
              <span className="text-xs text-muted-foreground">
                Departments → Programs → Academic Years → Semesters → Sections → Subjects
              </span>
            </div>
            <div className="flex flex-wrap items-stretch gap-3">
              {STEPS.map((step, i) => (
                <div key={step.key} className="flex items-stretch gap-3 flex-1 min-w-[150px]">
                  <PipelineCard step={step} count={summary?.[step.key]} />
                  {i < STEPS.length - 1 && (
                    <div className="hidden lg:flex items-center text-border">
                      <ArrowRight className="size-5" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-5">
            <h2 className="text-sm font-semibold text-foreground mb-1">Timetable</h2>
            <p className="text-sm text-muted-foreground mb-3">
              Once you have at least one Section, build its weekly schedule with automatic
              conflict detection.
            </p>
            <Link
              href="/app/academics/timetable"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
            >
              Open timetable <ArrowRight className="size-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Page() {
  return (
    <RequirePermission permission="courses:catalog:read">
      <AcademicsHubPage />
    </RequirePermission>
  );
}
