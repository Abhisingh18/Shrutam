import type { Metadata } from "next";
import { Check, Circle, Loader } from "lucide-react";

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

const statusIcon = { done: Check, "in-progress": Loader, planned: Circle };

export default function RoadmapPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 py-20">
      <h1 className="text-4xl font-semibold tracking-tight text-foreground">Roadmap</h1>
      <p className="mt-4 text-lg text-muted-foreground">
        We&apos;re building Sutram in three phases, each shipping working software rather than
        one big-bang release.
      </p>
      <div className="mt-12 space-y-8">
        {PHASES.map((phase) => {
          const Icon = statusIcon[phase.status];
          return (
            <div key={phase.name}>
              <div className="flex items-center gap-2">
                <Icon
                  className={
                    phase.status === "in-progress" ? "size-4 text-primary" : "size-4 text-muted-foreground"
                  }
                />
                <h2 className="font-medium text-foreground">{phase.name}</h2>
              </div>
              <ul className="mt-2 ml-6 space-y-1 list-disc text-sm text-muted-foreground">
                {phase.items.map((i) => (
                  <li key={i}>{i}</li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );
}
