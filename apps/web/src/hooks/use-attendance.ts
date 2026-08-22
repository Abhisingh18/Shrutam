import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import type {
  AttendanceBulkMarkInput,
  AttendanceDefaultersResponse,
  AttendanceListResponse,
  AttendanceRecord,
  AttendanceSummary,
} from "@/types/attendance";

const attendanceHistoryKey = (params?: Record<string, unknown>) =>
  ["attendance", "history", params] as const;
const attendanceForDateKey = (attendanceDate: string) =>
  ["attendance", "date", attendanceDate] as const;

/** Pre-fills the mark-attendance UI when re-opening an already-marked day. */
export function useAttendanceForDate(attendanceDate: string) {
  return useQuery({
    queryKey: attendanceForDateKey(attendanceDate),
    queryFn: () => apiFetch<AttendanceRecord[]>(`/attendance/date/${attendanceDate}`),
    enabled: Boolean(attendanceDate),
  });
}

export function useAttendanceHistory(params: {
  page: number;
  pageSize: number;
  date?: string;
  studentId?: string;
}) {
  return useQuery({
    queryKey: attendanceHistoryKey(params),
    queryFn: () =>
      apiFetch<AttendanceListResponse>("/attendance", {
        params: {
          page: params.page,
          page_size: params.pageSize,
          date: params.date || undefined,
          student_id: params.studentId || undefined,
        },
      }),
    placeholderData: (prev) => prev,
  });
}

// Cache invalidation keyed to backend domain events (attendance.marked) —
// docs/09-frontend-architecture.md §5. No live event stream yet in this
// scaffold, so we invalidate directly after each mutation instead of subscribing.
export function useMarkAttendance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: AttendanceBulkMarkInput) =>
      apiFetch<AttendanceRecord[]>("/attendance/mark", { method: "POST", body: input }),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ["attendance", "history"] });
      qc.invalidateQueries({ queryKey: attendanceForDateKey(variables.attendance_date) });
      qc.invalidateQueries({ queryKey: ["attendance", "defaulters"] });
    },
  });
}

export function useAttendanceSummary(studentId: string | undefined) {
  return useQuery({
    queryKey: ["attendance", "summary", studentId],
    queryFn: () => apiFetch<AttendanceSummary>(`/attendance/summary/${studentId}`),
    enabled: Boolean(studentId),
  });
}

export function useAttendanceDefaulters(threshold: number = 75) {
  return useQuery({
    queryKey: ["attendance", "defaulters", threshold],
    queryFn: () =>
      apiFetch<AttendanceDefaultersResponse>("/attendance/defaulters", { params: { threshold } }),
  });
}
