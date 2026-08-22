"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/app/academics", label: "Overview", exact: true },
  { href: "/app/academics/departments", label: "Departments" },
  { href: "/app/academics/programs", label: "Programs" },
  { href: "/app/academics/academic-years", label: "Academic Years" },
  { href: "/app/academics/semesters", label: "Semesters" },
  { href: "/app/academics/sections", label: "Sections" },
  { href: "/app/academics/subjects", label: "Subjects" },
  { href: "/app/academics/timetable", label: "Timetable" },
];

/** Shared sub-navigation across every /app/academics/* screen — keeps the
 * six-entity hierarchy feeling like one cohesive module instead of scattered
 * unrelated pages. */
export function AcademicsSubNav() {
  const pathname = usePathname();

  return (
    <div className="border-b border-border px-6 overflow-x-auto">
      <nav className="flex items-center gap-1 -mb-px min-w-max">
        {TABS.map((tab) => {
          const active = tab.exact ? pathname === tab.href : pathname?.startsWith(tab.href);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                "px-3 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors",
                active
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:border-border",
              )}
            >
              {tab.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
