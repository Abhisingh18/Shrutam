import { cn } from "@/lib/utils";

// Mirrors the 10-point scale in apps/api/app/core/grading.py.
const GRADE_TONE: Record<string, string> = {
  "A+": "bg-success-bg text-success",
  A: "bg-success-bg text-success",
  "B+": "bg-info-bg text-info",
  B: "bg-info-bg text-info",
  C: "bg-warning-bg text-warning",
  D: "bg-warning-bg text-warning",
  F: "bg-destructive-bg text-destructive",
};

export function GradeBadge({ grade, size = "md" }: { grade: string | null; size?: "sm" | "md" }) {
  if (!grade) {
    return <span className="text-muted-foreground text-sm">—</span>;
  }
  const tone = GRADE_TONE[grade] ?? "bg-muted text-muted-foreground";
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded-md font-bold tabular-nums",
        tone,
        size === "sm" ? "size-7 text-xs" : "size-9 text-sm",
      )}
    >
      {grade}
    </span>
  );
}
