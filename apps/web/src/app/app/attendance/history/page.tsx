"use client";

import { useState } from "react";
import { RequirePermission } from "@/components/auth/require-permission";
import { ListPageTemplate } from "@/components/templates/list-page-template";
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
import { Input } from "@/components/ui/input";
import { useAttendanceHistory } from "@/hooks/use-attendance";
import type { AttendanceStatus } from "@/types/attendance";

const statusVariant: Record<AttendanceStatus, string> = {
  present: "bg-success-bg text-success border-transparent",
  absent: "bg-destructive-bg text-destructive border-transparent",
  late: "bg-warning-bg text-warning border-transparent",
  excused: "bg-info-bg text-info border-transparent",
};

function AttendanceHistoryPage() {
  const [page, setPage] = useState(1);
  const [date, setDate] = useState("");
  const pageSize = 20;

  const { data, isLoading, isFetching } = useAttendanceHistory({ page, pageSize, date });

  return (
    <ListPageTemplate
      title="Attendance History"
      description="Browse previously recorded attendance."
      toolbarExtra={
        <Input
          type="date"
          value={date}
          onChange={(e) => {
            setDate(e.target.value);
            setPage(1);
          }}
          className="w-40"
        />
      }
      page={page}
      pageSize={pageSize}
      total={data?.meta.total ?? 0}
      onPageChange={setPage}
    >
      <Table>
        <TableHeader>
          <TableRow>
            {/* TODO: resolve student_id to a name once a join endpoint/roster
                lookup exists — raw ID is a stand-in for this wave. */}
            <TableHead>Student ID</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Remarks</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading &&
            Array.from({ length: 5 }).map((_, i) => (
              <TableRow key={i}>
                {Array.from({ length: 4 }).map((__, j) => (
                  <TableCell key={j}>
                    <Skeleton className="h-4 w-full" />
                  </TableCell>
                ))}
              </TableRow>
            ))}

          {!isLoading && data?.data.length === 0 && (
            <TableRow>
              <TableCell colSpan={4} className="text-center py-12 text-muted-foreground">
                {date ? "No attendance records match your filters." : "No attendance records yet."}
              </TableCell>
            </TableRow>
          )}

          {!isLoading &&
            data?.data.map((record) => (
              <TableRow key={record.id} className={isFetching ? "opacity-60" : ""}>
                <TableCell className="font-mono text-xs">{record.student_id}</TableCell>
                <TableCell className="text-muted-foreground">{record.attendance_date}</TableCell>
                <TableCell>
                  <Badge variant="outline" className={statusVariant[record.status]}>
                    {record.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">{record.remarks ?? "—"}</TableCell>
              </TableRow>
            ))}
        </TableBody>
      </Table>
    </ListPageTemplate>
  );
}

export default function Page() {
  return (
    <RequirePermission permission="attendance:record:read">
      <AttendanceHistoryPage />
    </RequirePermission>
  );
}
