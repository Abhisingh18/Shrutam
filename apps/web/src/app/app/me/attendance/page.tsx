"use client";

import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ChildSelector } from "@/components/me/child-selector";
import { AttendanceHeatmap } from "@/components/me/attendance-heatmap";
import { CircularProgress } from "@/components/widgets/circular-progress";
import { useMyAttendance } from "@/hooks/use-me-portal";
import type { AttendanceRecord } from "@/types/attendance";

const statusVariant: Record<AttendanceRecord["status"], string> = {
  present: "bg-success-bg text-success border-transparent",
  absent: "bg-destructive-bg text-destructive border-transparent",
  late: "bg-warning-bg text-warning border-transparent",
  excused: "bg-info-bg text-info border-transparent",
};

export default function MyAttendancePage() {
  const [studentId, setStudentId] = useState<string | undefined>();
  const { data: records, isLoading } = useMyAttendance(studentId);

  const presentCount = records?.filter((r) => r.status === "present").length ?? 0;
  const total = records?.length ?? 0;
  const rate = total > 0 ? Math.round((presentCount / total) * 100) : 0;
  const tone = rate >= 90 ? "success" : rate >= 75 ? "warning" : "destructive";

  return (
    <div className="p-6 space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-foreground">My Attendance</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Last 90 recorded school days.</p>
          <div className="mt-3">
            <ChildSelector selectedId={studentId} onSelect={setStudentId} />
          </div>
        </div>
      </div>

      {total > 0 && (
        <div className="rounded-xl border border-border bg-card p-6 flex flex-col sm:flex-row items-center gap-8">
          <CircularProgress value={presentCount} max={total} size="lg" tone={tone} label="Attendance rate" />
          <div className="flex-1 w-full">
            <h2 className="text-sm font-semibold text-foreground mb-3">Last {total} days</h2>
            <AttendanceHeatmap records={records ?? []} />
          </div>
        </div>
      )}

      <div>
        <h2 className="text-sm font-semibold text-foreground mb-3">History</h2>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Remarks</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell colSpan={3}>
                  <Skeleton className="h-4 w-full" />
                </TableCell>
              </TableRow>
            )}
            {!isLoading && records?.length === 0 && (
              <TableRow>
                <TableCell colSpan={3} className="text-center py-12 text-muted-foreground">
                  No attendance recorded yet.
                </TableCell>
              </TableRow>
            )}
            {records?.map((r) => (
              <TableRow key={r.id}>
                <TableCell>{r.attendance_date}</TableCell>
                <TableCell>
                  <Badge variant="outline" className={statusVariant[r.status]}>
                    {r.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">{r.remarks ?? "—"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
