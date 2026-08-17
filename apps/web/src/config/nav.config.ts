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

/** super_admin bypasses gating entirely (docs/04-rbac-security.md §2). */
export function visibleNavItems(role: string, permissions: Set<string>): NavItem[] {
  const items =
    role === "super_admin"
      ? [PLATFORM_NAV_ITEM, ...NAV_ITEMS]
      : NAV_ITEMS;

  return items.filter((item) => {
    if (item.href === PLATFORM_NAV_ITEM.href) {
      return ROLE_SLUGS_WITH_PLATFORM_ACCESS.has(role);
    }
    if (item.requiredPermission === null) return true;
    if (role === "super_admin") return true;
    return permissions.has(item.requiredPermission);
  });
}
