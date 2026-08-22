import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import { downloadPdf } from "@/lib/pdf-download";
import type { Payment } from "@/types/finance";
import type {
  HostelComplaint,
  HostelComplaintCreateInput,
  MyAttendance,
  MyChildren,
  MyInvoices,
  MyResults,
} from "@/types/me";

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

export function useMyInvoicePayments(invoiceId: string | undefined, studentId?: string) {
  return useQuery({
    queryKey: ["me", "invoice-payments", invoiceId, studentId],
    queryFn: () =>
      apiFetch<Payment[]>(`/me/invoices/${invoiceId}/payments`, {
        params: { student_id: studentId },
      }),
    enabled: Boolean(invoiceId),
  });
}

function withStudentParam(path: string, studentId?: string): string {
  return studentId ? `${path}?student_id=${encodeURIComponent(studentId)}` : path;
}

export function downloadMyIdCard(studentId?: string): Promise<void> {
  return downloadPdf(withStudentParam("/me/id-card.pdf", studentId), "id-card.pdf");
}

export function downloadMyReportCard(studentId?: string): Promise<void> {
  return downloadPdf(withStudentParam("/me/report-card.pdf", studentId), "report-card.pdf");
}

export function downloadMyReceipt(
  invoiceId: string,
  paymentId: string,
  invoiceNumber: string,
  studentId?: string,
): Promise<void> {
  return downloadPdf(
    withStudentParam(`/me/invoices/${invoiceId}/payments/${paymentId}/receipt.pdf`, studentId),
    `receipt-${invoiceNumber}.pdf`,
  );
}

export function useMyHostelComplaints(studentId?: string) {
  return useQuery({
    queryKey: ["me", "hostel-complaints", studentId],
    queryFn: () =>
      apiFetch<HostelComplaint[]>("/me/hostel-complaints", { params: { student_id: studentId } }),
    enabled: Boolean(studentId),
  });
}

export function useRaiseHostelComplaint(studentId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: HostelComplaintCreateInput) =>
      apiFetch<HostelComplaint>("/me/hostel-complaints", {
        method: "POST",
        body: input,
        params: { student_id: studentId },
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["me", "hostel-complaints", studentId] }),
  });
}
