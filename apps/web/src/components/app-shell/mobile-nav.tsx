"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { visibleNavItems } from "@/config/nav.config";
import { useMe, usePermissions } from "@/hooks/use-me";

export function MobileNav() {
  const pathname = usePathname();
  const { data: me } = useMe();
  const permissions = usePermissions();
  const items = visibleNavItems(me?.role ?? "guest", permissions, me?.institution_type);

  return (
    <div className="flex flex-col h-full bg-sidebar text-sidebar-foreground">
      <div className="h-14 flex items-center px-4 border-b border-sidebar-border font-semibold text-sidebar-primary">
        Sutram
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
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium",
                active
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground/80 hover:bg-sidebar-accent",
              )}
            >
              <Icon className="size-4 shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
