import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  ClipboardList,
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
  Settings,
  ShieldAlert,
} from "lucide-react";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  /** One-line description — used on the dashboard module grid and (future) sidebar tooltips. */
  description: string;
  /** `module:resource:action` string this item is gated on — docs/04-rbac-security.md §1. */
  requiredPermission: string | null;
  /** Roadmap phase this module ships in — docs/01-prd.md phasing. */
  phase: 1 | 2 | 3;
  /** True once the module has real screens; false renders a "coming soon" stub. */
  implemented: boolean;
}

// Canonical sidebar order — docs/02-information-architecture.md handoff.
// Single source of truth for every role's sidebar: docs/09-frontend-architecture.md §6
// ("one nav.config.ts, never per-role duplicate components") — also powers the
// dashboard's "Your workspace" module grid so the two views never diverge.
export const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/app/dashboard", icon: LayoutDashboard, description: "Your workspace overview.", requiredPermission: null, phase: 1, implemented: true },
  { label: "Admissions", href: "/app/admissions", icon: ClipboardList, description: "Applications — submit, review, accept, convert to student.", requiredPermission: "admissions:application:read", phase: 1, implemented: true },
  { label: "Students", href: "/app/students", icon: GraduationCap, description: "Every enrolled student — profile, status, contact details.", requiredPermission: "students:profile:read", phase: 1, implemented: true },
  { label: "Faculty", href: "/app/faculty", icon: Users, description: "Faculty profiles, designation and employment details.", requiredPermission: "faculty:profile:read", phase: 1, implemented: true },
  { label: "Academics", href: "/app/academics", icon: BookOpen, description: "Departments, subjects, programs, semesters and sections.", requiredPermission: "courses:catalog:read", phase: 1, implemented: true },
  { label: "Attendance", href: "/app/attendance", icon: CalendarCheck, description: "Mark daily attendance and browse history.", requiredPermission: "attendance:record:read", phase: 1, implemented: true },
  { label: "Examinations", href: "/app/examinations", icon: FileCheck2, description: "Exams, marks entry and result publishing.", requiredPermission: "exams:schedule:read", phase: 1, implemented: true },
  { label: "Fees & Finance", href: "/app/finance", icon: Wallet, description: "Invoices, fee structures and payment records.", requiredPermission: "fees:invoice:read", phase: 1, implemented: true },
  { label: "Library", href: "/app/library", icon: Library, description: "Book catalog, issue and return tracking.", requiredPermission: "library:book:read", phase: 2, implemented: true },
  { label: "Hostel", href: "/app/hostel", icon: Building2, description: "Rooms, occupancy and student allocations.", requiredPermission: "hostel:room:read", phase: 2, implemented: true },
  { label: "Transport", href: "/app/transport", icon: Bus, description: "Vehicles, routes and student transport passes.", requiredPermission: "transport:route:read", phase: 2, implemented: true },
  { label: "HR", href: "/app/hr", icon: Briefcase, description: "Non-teaching staff records and leave approvals.", requiredPermission: "hr:employee:read", phase: 2, implemented: true },
  { label: "Placement", href: "/app/placement", icon: Handshake, description: "Company outreach, job postings and offers.", requiredPermission: "placement:job:read", phase: 3, implemented: false },
  { label: "Research", href: "/app/research", icon: FlaskConical, description: "Projects, funding and publications.", requiredPermission: "research:project:read", phase: 3, implemented: false },
  { label: "Communication", href: "/app/communication", icon: MessageSquare, description: "Announcements — draft, publish, target an audience.", requiredPermission: "communication:message:read", phase: 2, implemented: true },
  { label: "AI Assistant", href: "/app/ai-assistant", icon: Sparkles, description: "A role-scoped copilot for quick answers and drafts.", requiredPermission: "ai:assistant:use", phase: 3, implemented: false },
  { label: "Analytics & Reports", href: "/app/analytics", icon: BarChart3, description: "Live numbers across every module in one dashboard.", requiredPermission: "analytics:dashboard:read", phase: 2, implemented: true },
  { label: "Settings", href: "/app/settings", icon: Settings, description: "Institution profile, users, roles and integrations.", requiredPermission: "settings:institution:read", phase: 1, implemented: false },
];

export const SELF_SERVICE_ROLES = new Set(["student", "parent"]);

export function isSelfServiceRole(role: string): boolean {
  return SELF_SERVICE_ROLES.has(role);
}

// Students and parents get a deliberately narrow, self-scoped nav instead of
// the admin module list — RBAC never grants them module permissions (see
// scripts/seed_platform.py), so the admin nav would render almost empty for
// them anyway. These routes are backed by /me/* endpoints that resolve each
// caller's own linked student(s), not by role permission — see app/api/v1/me.py.
export const SELF_SERVICE_NAV_ITEMS: NavItem[] = [
  { label: "My Dashboard", href: "/app/dashboard", icon: LayoutDashboard, description: "Your overview.", requiredPermission: null, phase: 1, implemented: true },
  { label: "My Attendance", href: "/app/me/attendance", icon: CalendarCheck, description: "Your attendance history.", requiredPermission: null, phase: 1, implemented: true },
  { label: "My Fees", href: "/app/me/fees", icon: Wallet, description: "Invoices and payment status.", requiredPermission: null, phase: 1, implemented: true },
  { label: "My Results", href: "/app/me/results", icon: FileCheck2, description: "Published exam results and CGPA.", requiredPermission: null, phase: 1, implemented: true },
  { label: "My Hostel", href: "/app/me/hostel", icon: Building2, description: "Raise and track room maintenance complaints.", requiredPermission: null, phase: 2, implemented: true },
];

// Super-admin-only platform console — docs/02-information-architecture.md §6.
export const PLATFORM_NAV_ITEM: NavItem = {
  label: "Platform Admin",
  href: "/app/platform",
  icon: ShieldAlert,
  description: "Cross-tenant platform console.",
  requiredPermission: null,
  phase: 1,
  implemented: false,
};

const ROLE_SLUGS_WITH_PLATFORM_ACCESS = new Set(["super_admin"]);

export type InstitutionType = "school" | "college" | "university" | "coaching" | "research_lab";

// Which modules are relevant for each institution type — a school doesn't run
// Placement or Research, a research lab doesn't run Examinations or Hostel.
// Dashboard/Settings are always relevant and aren't listed here. Anything not
// listed for a type is hidden for that tenant regardless of role permission —
// this is presentation-only curation, NOT a security boundary (the backend
// permission check is what actually enforces access).
const INSTITUTION_TYPE_MODULES: Record<InstitutionType, string[]> = {
  school: [
    "/app/admissions", "/app/students", "/app/faculty", "/app/academics",
    "/app/attendance", "/app/examinations", "/app/finance", "/app/library",
    "/app/hostel", "/app/transport", "/app/hr", "/app/communication", "/app/analytics",
  ],
  college: [
    "/app/admissions", "/app/students", "/app/faculty", "/app/academics",
    "/app/attendance", "/app/examinations", "/app/finance", "/app/library",
    "/app/hostel", "/app/transport", "/app/hr", "/app/placement",
    "/app/communication", "/app/analytics",
  ],
  university: [
    "/app/admissions", "/app/students", "/app/faculty", "/app/academics",
    "/app/attendance", "/app/examinations", "/app/finance", "/app/library",
    "/app/hostel", "/app/transport", "/app/hr", "/app/placement", "/app/research",
    "/app/communication", "/app/analytics", "/app/ai-assistant",
  ],
  coaching: [
    "/app/admissions", "/app/students", "/app/faculty", "/app/academics",
    "/app/attendance", "/app/examinations", "/app/finance",
    "/app/communication", "/app/analytics",
  ],
  research_lab: [
    "/app/admissions", "/app/faculty", "/app/research", "/app/hr",
    "/app/communication", "/app/analytics",
  ],
};

const ALWAYS_VISIBLE_HREFS = new Set(["/app/dashboard", "/app/settings"]);

/**
 * super_admin bypasses gating entirely (docs/04-rbac-security.md §2).
 * `institutionType` further curates the module list to what that kind of
 * institution actually runs — omit it (e.g. before /auth/me has loaded) to
 * fall back to permission-only filtering.
 */
export function visibleNavItems(
  role: string,
  permissions: Set<string>,
  institutionType?: InstitutionType | null,
): NavItem[] {
  const items =
    role === "super_admin"
      ? [PLATFORM_NAV_ITEM, ...NAV_ITEMS]
      : NAV_ITEMS;

  const relevantHrefs = institutionType ? INSTITUTION_TYPE_MODULES[institutionType] : null;

  return items.filter((item) => {
    if (item.href === PLATFORM_NAV_ITEM.href) {
      return ROLE_SLUGS_WITH_PLATFORM_ACCESS.has(role);
    }
    if (
      relevantHrefs &&
      role !== "super_admin" &&
      !ALWAYS_VISIBLE_HREFS.has(item.href) &&
      !relevantHrefs.includes(item.href)
    ) {
      return false;
    }
    if (item.requiredPermission === null) return true;
    if (role === "super_admin") return true;
    return permissions.has(item.requiredPermission);
  });
}
