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
  /** `module:resource:action` string this item is gated on — docs/04-rbac-security.md §1. */
  requiredPermission: string | null;
  /** Roadmap phase this module ships in — docs/01-prd.md phasing. */
  phase: 1 | 2 | 3;
  /** True once the module has real screens; false renders a "coming soon" stub. */
  implemented: boolean;
}

// Canonical sidebar order — docs/02-information-architecture.md handoff.
// Single source of truth for every role's sidebar: docs/09-frontend-architecture.md §6
// ("one nav.config.ts, never per-role duplicate components").
export const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/app/dashboard", icon: LayoutDashboard, requiredPermission: null, phase: 1, implemented: true },
  { label: "Admissions", href: "/app/admissions", icon: ClipboardList, requiredPermission: "admissions:application:read", phase: 1, implemented: true },
  { label: "Students", href: "/app/students", icon: GraduationCap, requiredPermission: "students:profile:read", phase: 1, implemented: true },
  { label: "Faculty", href: "/app/faculty", icon: Users, requiredPermission: "faculty:profile:read", phase: 1, implemented: true },
  { label: "Academics", href: "/app/academics", icon: BookOpen, requiredPermission: "courses:catalog:read", phase: 1, implemented: true },
  { label: "Attendance", href: "/app/attendance", icon: CalendarCheck, requiredPermission: "attendance:record:read", phase: 1, implemented: true },
  { label: "Examinations", href: "/app/examinations", icon: FileCheck2, requiredPermission: "exams:schedule:read", phase: 1, implemented: true },
  { label: "Fees & Finance", href: "/app/finance", icon: Wallet, requiredPermission: "fees:invoice:read", phase: 1, implemented: true },
  { label: "Library", href: "/app/library", icon: Library, requiredPermission: "library:book:read", phase: 2, implemented: false },
  { label: "Hostel", href: "/app/hostel", icon: Building2, requiredPermission: "hostel:room:read", phase: 2, implemented: false },
  { label: "Transport", href: "/app/transport", icon: Bus, requiredPermission: "transport:route:read", phase: 2, implemented: false },
  { label: "HR", href: "/app/hr", icon: Briefcase, requiredPermission: "hr:employee:read", phase: 2, implemented: false },
  { label: "Placement", href: "/app/placement", icon: Handshake, requiredPermission: "placement:job:read", phase: 3, implemented: false },
  { label: "Research", href: "/app/research", icon: FlaskConical, requiredPermission: "research:project:read", phase: 3, implemented: false },
  { label: "Communication", href: "/app/communication", icon: MessageSquare, requiredPermission: "communication:message:read", phase: 2, implemented: false },
  { label: "AI Assistant", href: "/app/ai-assistant", icon: Sparkles, requiredPermission: "ai:assistant:use", phase: 3, implemented: false },
  { label: "Analytics & Reports", href: "/app/analytics", icon: BarChart3, requiredPermission: "analytics:dashboard:read", phase: 2, implemented: false },
  { label: "Settings", href: "/app/settings", icon: Settings, requiredPermission: "settings:institution:read", phase: 1, implemented: false },
];

// Super-admin-only platform console — docs/02-information-architecture.md §6.
export const PLATFORM_NAV_ITEM: NavItem = {
  label: "Platform Admin",
  href: "/app/platform",
  icon: ShieldAlert,
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
