import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  FlaskConical,
  Landmark,
  Layers,
  School,
  Target,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Solutions",
  description: "Sutram configured for schools, colleges, universities, coaching institutes and research labs.",
};

interface Solution {
  id: string;
  name: string;
  navLabel: string;
  icon: LucideIcon;
  summary: string;
  highlights: string[];
  /** Fully literal Tailwind classes — never interpolate a color token into a
   * class string, the JIT compiler can't see through template literals. */
  iconBox: string;
  iconText: string;
  badge: string;
  glow: string;
}

const SOLUTIONS: Solution[] = [
  {
    id: "school",
    name: "Schools",
    navLabel: "Schools",
    icon: School,
    summary: "K-12 admissions, attendance, report cards and parent communication in one place.",
    highlights: [
      "Admissions with merit lists and duplicate detection",
      "Daily attendance with instant parent SMS/WhatsApp alerts",
      "Report cards, certificates and ID cards",
      "Transport and hostel for boarding schools",
    ],
    iconBox: "bg-primary/10 text-primary",
    iconText: "text-primary",
    badge: "border-primary/20 bg-primary/5 text-primary",
    glow: "bg-primary/10",
  },
  {
    id: "college",
    name: "Colleges",
    navLabel: "Colleges",
    icon: Building2,
    summary: "Multi-department academics, examinations, placements and alumni management.",
    highlights: [
      "Department, program and curriculum management",
      "Semester exams, CGPA and transcripts",
      "Placement pipelines with company and interview tracking",
      "Alumni records that survive graduation",
    ],
    iconBox: "bg-chart-1/10 text-chart-1",
    iconText: "text-chart-1",
    badge: "border-chart-1/20 bg-chart-1/5 text-chart-1",
    glow: "bg-chart-1/10",
  },
  {
    id: "university",
    name: "Universities",
    navLabel: "Universities",
    icon: Landmark,
    summary: "Multi-campus programs, research management and accreditation-ready reporting.",
    highlights: [
      "Multi-campus and multi-program academic structures",
      "Research projects, funding and publications",
      "Accreditation and compliance reporting",
      "Dedicated-isolation deployment option for scale",
    ],
    iconBox: "bg-chart-2/10 text-chart-2",
    iconText: "text-chart-2",
    badge: "border-chart-2/20 bg-chart-2/5 text-chart-2",
    glow: "bg-chart-2/10",
  },
  {
    id: "coaching",
    name: "Coaching institutes",
    navLabel: "Coaching",
    icon: Target,
    summary: "Batch management, test series and performance analytics for competitive exam prep.",
    highlights: [
      "Batch and cohort management",
      "Test series with instant scoring",
      "Fee collection and defaulter tracking",
      "Performance analytics per student and batch",
    ],
    iconBox: "bg-chart-4/10 text-chart-4",
    iconText: "text-chart-4",
    badge: "border-chart-4/20 bg-chart-4/5 text-chart-4",
    glow: "bg-chart-4/10",
  },
  {
    id: "research",
    name: "Research labs & institutes",
    navLabel: "Research labs",
    icon: FlaskConical,
    summary: "Projects, funding, publications and lab resource tracking for research-first organizations.",
    highlights: [
      "Research project and funding-grant tracking",
      "Publication and patent records",
      "Research-group and lab membership management",
      "Grant-opportunity matching (AI Assistant, Enterprise tier)",
    ],
    iconBox: "bg-accent/10 text-accent",
    iconText: "text-accent",
    badge: "border-accent/20 bg-accent/5 text-accent",
    glow: "bg-accent/10",
  },
];

function SolutionSection({ solution, index }: { solution: Solution; index: number }) {
  const Icon = solution.icon;
  return (
    <section
      id={solution.id}
      className={`scroll-mt-24 ${index > 0 ? "border-t border-border" : ""} ${index % 2 === 1 ? "bg-muted/30" : ""}`}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-16 sm:py-20">
        <div className="grid lg:grid-cols-12 gap-10 items-start">
          <div className="lg:col-span-4 animate-in fade-in slide-in-from-bottom-3 fill-mode-both duration-500">
            <div className={`inline-flex items-center justify-center size-14 rounded-2xl mb-6 ${solution.iconBox}`}>
              <Icon className="size-7" />
            </div>
            <h2 className="text-2xl sm:text-3xl font-semibold text-foreground text-balance">
              {solution.name}
            </h2>
            <p className="mt-3 text-muted-foreground leading-relaxed">{solution.summary}</p>
            <Button className="mt-6 hover:-translate-y-0.5 transition-transform" variant="outline" asChild>
              <Link href="/demo">
                See it for {solution.name.toLowerCase()} <ArrowRight className="size-4" />
              </Link>
            </Button>
          </div>

          <div className="lg:col-span-8 grid sm:grid-cols-2 gap-4">
            {solution.highlights.map((h, i) => (
              <div
                key={h}
                className="group relative rounded-2xl border border-border bg-card p-5 overflow-hidden hover:border-foreground/20 hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 animate-in fade-in slide-in-from-bottom-2 fill-mode-both"
                style={{ animationDelay: `${100 + i * 80}ms`, animationDuration: "500ms" }}
              >
                <div
                  className={`absolute -right-8 -top-8 size-24 rounded-full ${solution.glow} blur-2xl opacity-0 group-hover:opacity-100 transition-opacity`}
                  aria-hidden
                />
                <div className="relative flex items-start gap-3">
                  <CheckCircle2 className={`size-4 shrink-0 mt-0.5 ${solution.iconText}`} />
                  <span className="text-sm text-foreground leading-snug">{h}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

export default function SolutionsPage() {
  return (
    <>
      {/* ───────────────────────── Hero ───────────────────────── */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-grid-pattern" aria-hidden />
        <div
          className="absolute -top-24 -left-24 size-[26rem] rounded-full bg-primary/15 blur-3xl animate-float-slow"
          aria-hidden
        />
        <div
          className="absolute top-24 -right-32 size-[22rem] rounded-full bg-accent/10 blur-3xl animate-float-slow-reverse"
          aria-hidden
        />

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 pt-20 pb-10 sm:pt-28 sm:pb-14">
          <div className="max-w-2xl animate-in fade-in slide-in-from-bottom-4 duration-700">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/5 px-3.5 py-1.5 text-xs font-medium text-primary mb-6 shadow-sm shadow-primary/5">
              <Layers className="size-3.5" />
              Five segments, one platform
            </span>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-semibold tracking-tight text-foreground text-balance leading-[1.08]">
              One platform,{" "}
              <span className="bg-gradient-to-r from-primary via-primary to-accent bg-clip-text text-transparent">
                configured for how you run
              </span>
            </h1>
            <p className="mt-6 text-lg text-muted-foreground max-w-xl text-pretty leading-relaxed">
              Sutram is the same platform under the hood for every segment — what changes is
              which modules are enabled and how the dashboards are configured out of the box.
            </p>
          </div>
        </div>

        {/* Jump nav */}
        <div className="relative border-t border-border bg-card/60 backdrop-blur">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 py-4 flex flex-wrap items-center gap-2">
            {SOLUTIONS.map((s) => (
              <a
                key={s.id}
                href={`#${s.id}`}
                className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3.5 py-1.5 text-sm font-medium text-foreground hover:border-primary/30 hover:text-primary transition-colors"
              >
                <s.icon className="size-3.5" />
                {s.navLabel}
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* ───────────────────────── Segment sections ───────────────────────── */}
      {SOLUTIONS.map((solution, index) => (
        <SolutionSection key={solution.id} solution={solution} index={index} />
      ))}

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
            Ready to see Sutram configured for you?
          </h2>
          <p className="mt-3 text-primary-foreground/80 max-w-xl mx-auto text-lg">
            Tell us your segment and we&apos;ll show you the exact modules and dashboards you&apos;d get.
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
