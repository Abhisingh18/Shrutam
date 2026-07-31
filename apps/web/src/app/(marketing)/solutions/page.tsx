import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Solutions",
  description: "Sutram configured for schools, colleges, universities, coaching institutes and research labs.",
};

const SOLUTIONS = [
  {
    id: "school",
    name: "Schools",
    summary: "K-12 admissions, attendance, report cards and parent communication in one place.",
    highlights: [
      "Admissions with merit lists and duplicate detection",
      "Daily attendance with instant parent SMS/WhatsApp alerts",
      "Report cards, certificates and ID cards",
      "Transport and hostel for boarding schools",
    ],
  },
  {
    id: "college",
    name: "Colleges",
    summary: "Multi-department academics, examinations, placements and alumni management.",
    highlights: [
      "Department, program and curriculum management",
      "Semester exams, CGPA and transcripts",
      "Placement pipelines with company and interview tracking",
      "Alumni records that survive graduation",
    ],
  },
  {
    id: "university",
    name: "Universities",
    summary: "Multi-campus programs, research management and accreditation-ready reporting.",
    highlights: [
      "Multi-campus and multi-program academic structures",
      "Research projects, funding and publications",
      "Accreditation and compliance reporting",
      "Dedicated-isolation deployment option for scale",
    ],
  },
  {
    id: "coaching",
    name: "Coaching institutes",
    summary: "Batch management, test series and performance analytics for competitive exam prep.",
    highlights: [
      "Batch and cohort management",
      "Test series with instant scoring",
      "Fee collection and defaulter tracking",
      "Performance analytics per student and batch",
    ],
  },
  {
    id: "research",
    name: "Research labs & institutes",
    summary: "Projects, funding, publications and lab resource tracking for research-first organizations.",
    highlights: [
      "Research project and funding-grant tracking",
      "Publication and patent records",
      "Research-group and lab membership management",
      "Grant-opportunity matching (AI Assistant, Enterprise tier)",
    ],
  },
];

export default function SolutionsPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 py-20">
      <div className="max-w-2xl">
        <h1 className="text-4xl font-semibold tracking-tight text-foreground">
          One platform, configured for how you run
        </h1>
        <p className="mt-4 text-lg text-muted-foreground">
          Sutram is the same platform under the hood for every segment — what changes is which
          modules are enabled and how the dashboards are configured out of the box.
        </p>
      </div>

      <div className="mt-16 space-y-16">
        {SOLUTIONS.map((s) => (
          <div key={s.id} id={s.id} className="grid lg:grid-cols-3 gap-8 scroll-mt-20">
            <div>
              <h2 className="text-2xl font-semibold text-foreground">{s.name}</h2>
              <p className="mt-2 text-muted-foreground">{s.summary}</p>
              <Button className="mt-6" variant="outline" asChild>
                <Link href="/demo">See it for {s.name.toLowerCase()}</Link>
              </Button>
            </div>
            <ul className="lg:col-span-2 grid sm:grid-cols-2 gap-3">
              {s.highlights.map((h) => (
                <li
                  key={h}
                  className="rounded-lg border border-border p-4 text-sm text-foreground"
                >
                  {h}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
