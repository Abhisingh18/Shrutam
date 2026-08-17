"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronsLeft, ChevronsRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { visibleNavItems } from "@/config/nav.config";
import { useUIStore } from "@/stores/ui-store";
import { useMe, usePermissions } from "@/hooks/use-me";

export function Sidebar() {
  const pathname = usePathname();
  const collapsed = useUIStore((s) => s.sidebarCollapsed);
  const toggleSidebar = useUIStore((s) => s.toggleSidebar);
  const { data: me } = useMe();
  const permissions = usePermissions();

  const items = visibleNavItems(me?.role ?? "guest", permissions, me?.institution_type);

  return (
    <aside
      className={cn(
        "hidden lg:flex flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground shrink-0 transition-[width] duration-150",
        collapsed ? "w-16" : "w-64",
      )}
    >
      <div className="flex flex-col justify-center px-4 py-2.5 border-b border-sidebar-border min-h-14">
        {!collapsed && (
          <>
            <span className="font-semibold text-sidebar-primary tracking-tight leading-tight">
              Sutram
            </span>
            {me?.institution_name && (
              <span className="text-[11px] text-sidebar-foreground/60 truncate leading-tight">
                {me.institution_name}
              </span>
            )}
          </>
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
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
              )}
              title={collapsed ? item.label : undefined}
            >
              <Icon className="size-4 shrink-0" />
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
        className="flex items-center justify-center gap-2 h-11 border-t border-sidebar-border text-sidebar-foreground/70 hover:bg-sidebar-accent text-sm"
      >
        {collapsed ? <ChevronsRight className="size-4" /> : <ChevronsLeft className="size-4" />}
      </button>
    </aside>
  );
}
