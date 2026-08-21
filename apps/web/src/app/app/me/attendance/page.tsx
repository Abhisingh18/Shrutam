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

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">My Attendance</h1>
        <p className="text-sm text-muted-foreground">Last 90 recorded days.</p>
      </div>

      <ChildSelector selectedId={studentId} onSelect={setStudentId} />

      {total > 0 && (
        <div className="rounded-lg border border-border bg-card p-4 max-w-xs">
          <div className="text-sm text-muted-foreground">Attendance rate</div>
          <div className="text-2xl font-bold text-foreground tabular-nums mt-1">
            {Math.round((presentCount / total) * 100)}%
          </div>
          <div className="text-xs text-muted-foreground mt-0.5">
            {presentCount} present of {total} days
          </div>
        </div>
      )}

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
  );
}
