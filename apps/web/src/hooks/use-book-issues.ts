import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import type {
  BookIssue,
  BookIssueCreateInput,
  BookIssueListResponse,
  OverdueBookIssue,
} from "@/types/library";

const bookIssuesKey = (params?: Record<string, unknown>) => ["book-issues", params] as const;

export function useBookIssues(params: {
  page: number;
  pageSize: number;
  bookId?: string;
  studentId?: string;
  status?: string;
}) {
  return useQuery({
    queryKey: bookIssuesKey(params),
    queryFn: () =>
      apiFetch<BookIssueListResponse>("/library/issues", {
        params: {
          page: params.page,
          page_size: params.pageSize,
          book_id: params.bookId || undefined,
          student_id: params.studentId || undefined,
          status: params.status || undefined,
        },
      }),
    placeholderData: (prev) => prev,
  });
}

// Cache invalidation keyed to backend domain events, mirroring use-students.ts —
// no live event stream yet in this scaffold, so we invalidate directly after each mutation.
export function useCreateBookIssue() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: BookIssueCreateInput) =>
      apiFetch<BookIssue>("/library/issues", { method: "POST", body: input }),
    onSuccess: (issue) => {
      qc.invalidateQueries({ queryKey: ["book-issues"] });
      qc.invalidateQueries({ queryKey: ["books"] });
      qc.invalidateQueries({ queryKey: ["books", "detail", issue.book_id] });
    },
  });
}

export function useReturnBookIssue() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<BookIssue>(`/library/issues/${id}/return`, { method: "POST" }),
    onSuccess: (issue) => {
      qc.invalidateQueries({ queryKey: ["book-issues"] });
      qc.invalidateQueries({ queryKey: ["books"] });
      qc.invalidateQueries({ queryKey: ["books", "detail", issue.book_id] });
      qc.invalidateQueries({ queryKey: ["book-issues", "overdue"] });
    },
  });
}

export function useOverdueBookIssues() {
  return useQuery({
    queryKey: ["book-issues", "overdue"],
    queryFn: () => apiFetch<OverdueBookIssue[]>("/library/issues/overdue"),
  });
}

export function usePayBookIssueFine() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<BookIssue>(`/library/issues/${id}/pay-fine`, { method: "POST" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["book-issues"] });
      qc.invalidateQueries({ queryKey: ["book-issues", "overdue"] });
    },
  });
}
