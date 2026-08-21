import { cn } from "@/lib/utils";
import type { AttendanceRecord } from "@/types/attendance";

const STATUS_COLOR: Record<AttendanceRecord["status"], string> = {
  present: "bg-success-solid",
  late: "bg-warning-solid",
  excused: "bg-info-solid",
  absent: "bg-destructive-solid",
};

const STATUS_LABEL: Record<AttendanceRecord["status"], string> = {
  present: "Present",
  late: "Late",
  excused: "Excused",
  absent: "Absent",
};

/** GitHub-contribution-graph-style grid: one cell per school day, most recent last. */
export function AttendanceHeatmap({ records }: { records: AttendanceRecord[] }) {
  const sorted = [...records].sort(
    (a, b) => new Date(a.attendance_date).getTime() - new Date(b.attendance_date).getTime(),
  );

  // Pad the front so cells align into complete weeks of 7, oldest-first.
  const remainder = sorted.length % 7;
  const padding = remainder === 0 ? 0 : 7 - remainder;
  const cells: (AttendanceRecord | null)[] = [
    ...Array.from({ length: padding }, () => null),
    ...sorted,
  ];
  const weeks: (AttendanceRecord | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) {
    weeks.push(cells.slice(i, i + 7));
  }

  if (records.length === 0) {
    return <p className="text-sm text-muted-foreground py-6">No attendance recorded yet.</p>;
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-1 overflow-x-auto pb-2">
        {weeks.map((week, wi) => (
          <div key={wi} className="flex flex-col gap-1 shrink-0">
            {week.map((record, di) =>
              record ? (
                <div
                  key={di}
                  title={`${record.attendance_date} — ${STATUS_LABEL[record.status]}`}
                  className={cn("size-3.5 rounded-sm", STATUS_COLOR[record.status])}
                />
              ) : (
                <div key={di} className="size-3.5 rounded-sm bg-transparent" />
              ),
            )}
          </div>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
        {(Object.keys(STATUS_LABEL) as AttendanceRecord["status"][]).map((status) => (
          <span key={status} className="flex items-center gap-1.5">
            <span className={cn("size-2.5 rounded-sm", STATUS_COLOR[status])} />
            {STATUS_LABEL[status]}
          </span>
        ))}
      </div>
    </div>
  );
}
