"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronsLeft, ChevronsRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { visibleNavItems, isSelfServiceRole, SELF_SERVICE_NAV_ITEMS } from "@/config/nav.config";
import { useUIStore } from "@/stores/ui-store";
import { useMe, usePermissions } from "@/hooks/use-me";

export function Sidebar() {
  const pathname = usePathname();
  const collapsed = useUIStore((s) => s.sidebarCollapsed);
  const toggleSidebar = useUIStore((s) => s.toggleSidebar);
  const { data: me } = useMe();
  const permissions = usePermissions();

  const role = me?.role ?? "guest";
  const items = isSelfServiceRole(role)
    ? SELF_SERVICE_NAV_ITEMS
    : visibleNavItems(role, permissions, me?.institution_type);

  return (
    <aside
      className={cn(
        "hidden lg:flex flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground shrink-0 transition-[width] duration-150",
        collapsed ? "w-16" : "w-64",
      )}
    >
      <div className="flex items-center gap-2.5 px-4 py-2.5 border-b border-sidebar-border min-h-14">
        <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-md bg-gradient-to-br from-primary to-accent text-primary-foreground text-sm font-bold shadow-sm shadow-primary/30">
          S
        </span>
        {!collapsed && (
          <div className="min-w-0">
            <span className="block font-semibold text-sidebar-primary tracking-tight leading-tight truncate">
              Sutram
            </span>
            {me?.institution_name && (
              <span className="block text-[11px] text-sidebar-foreground/60 truncate leading-tight">
                {me.institution_name}
              </span>
            )}
          </div>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
        {items.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "group relative flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-all duration-200",
                active
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
              )}
              title={collapsed ? item.label : undefined}
            >
              <span
                className={cn(
                  "absolute left-0 top-1/2 -translate-y-1/2 h-5 w-0.5 rounded-full bg-primary transition-all duration-200",
                  active ? "opacity-100" : "opacity-0",
                )}
                aria-hidden
              />
              <Icon
                className={cn(
                  "size-4 shrink-0 transition-transform duration-200",
                  active ? "text-primary" : "group-hover:scale-110",
                )}
              />
              {!collapsed && (
                <span className="flex-1 truncate">
                  {item.label}
                  {!item.implemented && (
                    <span className="ml-2 text-[10px] uppercase tracking-wide text-muted-foreground">
                      Phase {item.phase}
                    </span>
                  )}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <button
        onClick={toggleSidebar}
        className="flex items-center justify-center gap-2 h-11 border-t border-sidebar-border text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground text-sm transition-colors"
      >
        {collapsed ? <ChevronsRight className="size-4" /> : <ChevronsLeft className="size-4" />}
      </button>
    </aside>
  );
}
