import type { Metadata } from "next";
import { Check, Circle, Loader, Map } from "lucide-react";
import { Reveal } from "@/components/marketing/reveal";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Roadmap",
  description: "What's shipped and what's coming next in Sutram.",
};

const PHASES = [
  {
    name: "Phase 1 — Core",
    status: "in-progress" as const,
    items: ["Authentication & tenant provisioning", "Students, Faculty, Attendance", "Fees, Exams & Results"],
  },
  {
    name: "Phase 2 — Operations",
    status: "planned" as const,
    items: ["HR, Library, Hostel, Transport", "Analytics & Parent Portal", "Notifications & Reports"],
  },
  {
    name: "Phase 3 — Intelligence",
    status: "planned" as const,
    items: ["Full AI Assistant", "Placement & Research", "Multi-campus & workflow automation"],
  },
];

const STATUS_CONFIG = {
  done: { icon: Check, className: "bg-success-bg text-success" },
  "in-progress": { icon: Loader, className: "bg-primary/10 text-primary" },
  planned: { icon: Circle, className: "bg-muted text-muted-foreground" },
};

export default function RoadmapPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 py-20">
      <Reveal>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/5 px-3.5 py-1.5 text-xs font-medium text-primary mb-6">
          <Map className="size-3.5" />
          Building in the open
        </span>
        <h1 className="font-display text-4xl font-semibold tracking-tight text-foreground">Roadmap</h1>
        <p className="mt-4 text-lg text-muted-foreground">
          We&apos;re building Sutram in three phases, each shipping working software rather than
          one big-bang release.
        </p>
      </Reveal>

      <div className="mt-12 relative">
        <div className="absolute left-[19px] top-2 bottom-2 w-px bg-border" aria-hidden />
        <div className="space-y-8">
          {PHASES.map((phase, i) => {
            const config = STATUS_CONFIG[phase.status];
            const Icon = config.icon;
            return (
              <Reveal key={phase.name} delay={i * 120}>
                <div className="relative flex gap-4">
                  <div
                    className={cn(
                      "relative z-10 inline-flex items-center justify-center size-10 rounded-full shrink-0",
                      config.className,
                    )}
                  >
                    <Icon className="size-4" />
                  </div>
                  <div className="rounded-xl border border-border bg-card p-5 flex-1 hover:border-primary/20 hover:shadow-sm transition-all">
                    <h2 className="font-display font-semibold text-foreground">{phase.name}</h2>
                    <ul className="mt-2.5 space-y-1.5">
                      {phase.items.map((item) => (
                        <li key={item} className="flex items-center gap-2 text-sm text-muted-foreground">
                          <span className="size-1 rounded-full bg-muted-foreground/50 shrink-0" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </Reveal>
            );
          })}
        </div>
      </div>
    </div>
  );
}
