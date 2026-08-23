import type { LucideIcon } from "lucide-react";
import { ArrowDown, ArrowUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatTileProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  trend?: { direction: "up" | "down"; label: string };
  loading?: boolean;
  /** Fully literal Tailwind classes — never interpolate a color token into a
   * class string, the JIT compiler can't see through template literals. */
  tone?: "primary" | "chart-1" | "chart-2" | "chart-4";
}

const TONE_CLASS: Record<NonNullable<StatTileProps["tone"]>, string> = {
  primary: "bg-primary/10 text-primary",
  "chart-1": "bg-chart-1/10 text-chart-1",
  "chart-2": "bg-chart-2/10 text-chart-2",
  "chart-4": "bg-chart-4/10 text-chart-4",
};

/** docs/11-figma-design-system.md §9 — one of the 6-8 core reusable dashboard widgets. */
export function StatTile({ label, value, icon: Icon, trend, loading, tone = "primary" }: StatTileProps) {
  return (
    <div className="group rounded-xl border border-border bg-card p-5 hover:border-primary/20 hover:shadow-md hover:shadow-foreground/5 hover:-translate-y-0.5 transition-all duration-300">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">{label}</span>
        <div
          className={cn(
            "inline-flex items-center justify-center size-8 rounded-lg group-hover:scale-110 transition-transform duration-300",
            TONE_CLASS[tone],
          )}
        >
          <Icon className="size-4" />
        </div>
      </div>
      <div className="mt-3 text-3xl font-bold tabular-nums text-foreground">
        {loading ? <span className="inline-block h-8 w-16 rounded bg-muted animate-pulse" /> : value}
      </div>
      {trend && (
        <div
          className={cn(
            "mt-2 inline-flex items-center gap-1 text-xs font-medium rounded-full px-2 py-0.5",
            trend.direction === "up" ? "bg-success-bg text-success" : "bg-destructive-bg text-destructive",
          )}
        >
          {trend.direction === "up" ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" />}
          {trend.label}
        </div>
      )}
    </div>
  );
}
