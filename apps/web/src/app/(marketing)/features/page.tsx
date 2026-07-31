import type { Metadata } from "next";
import {
  GraduationCap,
  Users,
  BookOpen,
  CalendarCheck,
  FileCheck2,
  Wallet,
  Library,
  Building2,
  Bus,
  Briefcase,
  Handshake,
  FlaskConical,
  MessageSquare,
  Sparkles,
  BarChart3,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Features",
  description: "Every module Sutram ships — from admissions to AI-native analytics.",
};

const FEATURES = [
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
    icon: Users,
    title: "Faculty",
    points: [
      "Faculty profiles, subject and section assignment, timetables",
      "Leave, payroll and performance reviews",
      "Research and publication tracking",
    ],
  },
  {
    icon: BookOpen,
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
  {
    icon: MessageSquare,
    title: "Communication",
    points: ["Email, SMS and WhatsApp from one console", "Announcements, calendars and events"],
  },
  {
    icon: Sparkles,
    title: "AI Assistant",
    points: [
      "A role-scoped copilot — never sees more than the signed-in user could",
      "AI-drafted communications, always human-approved before sending",
      "Explainable risk scoring for attendance and fee defaults",
    ],
  },
  {
    icon: BarChart3,
    title: "Analytics & Reports",
    points: ["Executive, admissions, finance and placement dashboards", "Exportable board-ready reports"],
  },
];

export default function FeaturesPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 py-20">
      <div className="max-w-2xl">
        <h1 className="text-4xl font-semibold tracking-tight text-foreground">
          Everything your institution runs on
        </h1>
        <p className="mt-4 text-lg text-muted-foreground">
          Sutram ships as one connected platform — every module below shares the same student,
          staff and finance records, so nothing needs re-entering twice.
        </p>
      </div>

      <div className="mt-16 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
        {FEATURES.map((f) => (
          <div key={f.title}>
            <f.icon className="size-6 text-primary mb-3" />
            <h2 className="font-semibold text-foreground">{f.title}</h2>
            <ul className="mt-2 space-y-1.5">
              {f.points.map((p) => (
                <li key={p} className="text-sm text-muted-foreground flex gap-2">
                  <span className="text-primary mt-1.5">•</span>
                  <span>{p}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
