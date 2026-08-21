import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import type { MyAttendance, MyChildren, MyInvoices, MyResults } from "@/types/me";

/**
 * Self-service hooks backing the student/parent portal (/app/me/*). Every
 * call hits app/api/v1/me.py, which resolves the caller's own linked
 * student(s) server-side — `studentId` here is just which of *your own*
 * (or your child's) records to view, not an arbitrary lookup.
 */
export function useMyChildren() {
  return useQuery({
    queryKey: ["me", "children"],
    queryFn: () => apiFetch<MyChildren>("/me/children"),
  });
}

export function useMyAttendance(studentId?: string) {
  return useQuery({
    queryKey: ["me", "attendance", studentId],
    queryFn: () => apiFetch<MyAttendance>("/me/attendance", { params: { student_id: studentId } }),
    enabled: Boolean(studentId),
  });
}

export function useMyInvoices(studentId?: string) {
  return useQuery({
    queryKey: ["me", "invoices", studentId],
    queryFn: () => apiFetch<MyInvoices>("/me/invoices", { params: { student_id: studentId } }),
    enabled: Boolean(studentId),
  });
}

export function useMyResults(studentId?: string) {
  return useQuery({
    queryKey: ["me", "results", studentId],
    queryFn: () => apiFetch<MyResults>("/me/results", { params: { student_id: studentId } }),
    enabled: Boolean(studentId),
  });
}
