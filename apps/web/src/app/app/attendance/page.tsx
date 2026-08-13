"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { RequirePermission } from "@/components/auth/require-permission";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
// TODO: useStudents is called with a large fixed page_size to approximate "all
// students" for a single mark-attendance session. Once rosters exceed this,
// this page needs pagination/virtualization (and likely a section/class filter)
// rather than one flat table.
import { useStudents } from "@/hooks/use-students";
import { useAttendanceForDate, useMarkAttendance } from "@/hooks/use-attendance";
import { ApiError } from "@/lib/api-client";
import type { AttendanceStatus } from "@/types/attendance";

const STATUS_OPTIONS: { value: AttendanceStatus; label: string }[] = [
  { value: "present", label: "Present" },
  { value: "absent", label: "Absent" },
  { value: "late", label: "Late" },
  { value: "excused", label: "Excused" },
];

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function MarkAttendancePage() {
  const [selectedDate, setSelectedDate] = useState(todayIso);
  const [statusByStudent, setStatusByStudent] = useState<Record<string, AttendanceStatus>>({});

  const { data: studentsData, isLoading: studentsLoading } = useStudents({
    page: 1,
    pageSize: 200,
  });
  const { data: existingRecords, isLoading: attendanceLoading } =
    useAttendanceForDate(selectedDate);
  const markAttendance = useMarkAttendance();

  const students = useMemo(() => studentsData?.data ?? [], [studentsData]);

  // Pre-fill from any already-marked records for this date; default everyone
  // else to "present" so a fast "mark all present, flag exceptions" pass
  // (docs/06-ux-flows.md §5.2) doesn't require touching every row.
  useEffect(() => {
    if (!existingRecords) return;
    const byStudent: Record<string, AttendanceStatus> = {};
    for (const student of students) {
      byStudent[student.id] = "present";
    }
    for (const record of existingRecords) {
      byStudent[record.student_id] = record.status;
    }
    setStatusByStudent(byStudent);
  }, [existingRecords, students]);

  const setStatus = (studentId: string, status: AttendanceStatus) => {
    setStatusByStudent((prev) => ({ ...prev, [studentId]: status }));
  };

  const markAllPresent = () => {
    setStatusByStudent((prev) => {
      const next = { ...prev };
      for (const student of students) next[student.id] = "present";
      return next;
    });
  };

  const handleSave = async () => {
    try {
      await markAttendance.mutateAsync({
        attendance_date: selectedDate,
        entries: students.map((student) => ({
          student_id: student.id,
          status: statusByStudent[student.id] ?? "present",
        })),
      });
      toast.success("Attendance saved");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to save attendance");
    }
  };

  const isLoading = studentsLoading || attendanceLoading;

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-start justify-between gap-4 px-6 py-5 border-b border-border">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Mark Attendance</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Record today&apos;s attendance for every student.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-40"
          />
          <Button type="button" variant="outline" onClick={markAllPresent}>
            Mark all present
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-auto px-6 py-4 pb-24">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Admission #</TableHead>
              <TableHead>Name</TableHead>
              <TableHead className="w-48">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading &&
              Array.from({ length: 6 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 3 }).map((__, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))}

            {!isLoading && students.length === 0 && (
              <TableRow>
                <TableCell colSpan={3} className="text-center py-12 text-muted-foreground">
                  No students to mark attendance for.
                </TableCell>
              </TableRow>
            )}

            {!isLoading &&
              students.map((student) => (
                <TableRow key={student.id}>
                  <TableCell className="font-mono text-xs">{student.admission_number}</TableCell>
                  <TableCell className="font-medium text-foreground">{student.full_name}</TableCell>
                  <TableCell>
                    <Select
                      value={statusByStudent[student.id] ?? "present"}
                      onValueChange={(v) => setStatus(student.id, v as AttendanceStatus)}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {STATUS_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </div>

      <div className="sticky bottom-0 flex items-center justify-end gap-3 px-6 py-4 border-t border-border bg-background/95 backdrop-blur">
        <Button
          type="button"
          onClick={handleSave}
          disabled={markAttendance.isPending || isLoading || students.length === 0}
        >
          {markAttendance.isPending ? "Saving…" : "Save attendance"}
        </Button>
      </div>
    </div>
  );
}

export default function Page() {
  return (
    <RequirePermission permission="attendance:record:read">
      <MarkAttendancePage />
    </RequirePermission>
  );
}
