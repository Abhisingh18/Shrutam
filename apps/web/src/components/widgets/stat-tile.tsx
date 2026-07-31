import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatTileProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  trend?: { direction: "up" | "down"; label: string };
  loading?: boolean;
}

/** docs/11-figma-design-system.md §9 — one of the 6-8 core reusable dashboard widgets. */
export function StatTile({ label, value, icon: Icon, trend, loading }: StatTileProps) {
  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">{label}</span>
        <Icon className="size-4 text-muted-foreground" />
      </div>
      <div className="mt-2 text-3xl font-bold tabular-nums text-foreground">
        {loading ? <span className="inline-block h-8 w-16 rounded bg-muted animate-pulse" /> : value}
      </div>
      {trend && (
        <div
          className={cn(
            "mt-1 text-xs font-medium",
            trend.direction === "up" ? "text-success" : "text-destructive",
          )}
        >
          {trend.direction === "up" ? "↑" : "↓"} {trend.label}
        </div>
      )}
    </div>
  );
}
