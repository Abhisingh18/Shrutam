import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import { downloadPdf } from "@/lib/pdf-download";
import type {
  Exam,
  ExamAnalytics,
  ExamCreateInput,
  ExamListResponse,
  ExamMark,
  ExamMarksBulkUpdateInput,
  ExamRankListResponse,
  ExamUpdateInput,
} from "@/types/examination";

const examsKey = (params?: Record<string, unknown>) => ["exams", params] as const;

export function useExams(params: { page: number; pageSize: number; search?: string }) {
  return useQuery({
    queryKey: examsKey(params),
    queryFn: () =>
      apiFetch<ExamListResponse>("/examinations", {
        params: {
          page: params.page,
          page_size: params.pageSize,
          search: params.search || undefined,
        },
      }),
    placeholderData: (prev) => prev,
  });
}

export function useExam(id: string | undefined) {
  return useQuery({
    queryKey: ["exams", "detail", id],
    queryFn: () => apiFetch<Exam>(`/examinations/${id}`),
    enabled: Boolean(id),
  });
}

// Cache invalidation keyed to backend domain events, mirroring use-students.ts —
// no live event stream yet in this scaffold, so we invalidate directly after each mutation.
export function useCreateExam() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: ExamCreateInput) =>
      apiFetch<Exam>("/examinations", { method: "POST", body: input }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["exams"] }),
  });
}

export function useUpdateExam(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: ExamUpdateInput) =>
      apiFetch<Exam>(`/examinations/${id}`, { method: "PATCH", body: input }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["exams"] });
      qc.invalidateQueries({ queryKey: ["exams", "detail", id] });
    },
  });
}

export function useDeleteExam() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiFetch<void>(`/examinations/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["exams"] }),
  });
}

export function usePublishExam(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => apiFetch<Exam>(`/examinations/${id}/publish`, { method: "POST" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["exams"] });
      qc.invalidateQueries({ queryKey: ["exams", "detail", id] });
    },
  });
}

export function useExamMarks(examId: string | undefined) {
  return useQuery({
    queryKey: ["exams", "marks", examId],
    queryFn: () => apiFetch<ExamMark[]>(`/examinations/${examId}/marks`),
    enabled: Boolean(examId),
  });
}

export function useUpdateExamMarks(examId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: ExamMarksBulkUpdateInput) =>
      apiFetch<ExamMark[]>(`/examinations/${examId}/marks`, { method: "PUT", body: input }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["exams", "marks", examId] }),
  });
}

export function useExamRankList(examId: string | undefined) {
  return useQuery({
    queryKey: ["exams", "rank-list", examId],
    queryFn: () => apiFetch<ExamRankListResponse>(`/examinations/${examId}/rank-list`),
    enabled: Boolean(examId),
  });
}

export function useExamAnalytics(examId: string | undefined) {
  return useQuery({
    queryKey: ["exams", "analytics", examId],
    queryFn: () => apiFetch<ExamAnalytics>(`/examinations/${examId}/analytics`),
    enabled: Boolean(examId),
  });
}

export function downloadExamReportCard(studentId: string, admissionNumber: string): Promise<void> {
  return downloadPdf(
    `/examinations/students/${studentId}/report-card.pdf`,
    `report-card-${admissionNumber}.pdf`,
  );
}
