import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import type {
  Student,
  StudentCreateInput,
  StudentListResponse,
  StudentUpdateInput,
} from "@/types/student";

const studentsKey = (params?: Record<string, unknown>) => ["students", params] as const;

export function useStudents(params: { page: number; pageSize: number; search?: string }) {
  return useQuery({
    queryKey: studentsKey(params),
    queryFn: () =>
      apiFetch<StudentListResponse>("/students", {
        params: {
          page: params.page,
          page_size: params.pageSize,
          search: params.search || undefined,
        },
      }),
    placeholderData: (prev) => prev,
  });
}

export function useStudent(id: string | undefined) {
  return useQuery({
    queryKey: ["students", "detail", id],
    queryFn: () => apiFetch<Student>(`/students/${id}`),
    enabled: Boolean(id),
  });
}

// Cache invalidation keyed to backend domain events (student.admitted / .updated /
// .deleted) — docs/09-frontend-architecture.md §5. No live event stream yet in this
// scaffold, so we invalidate directly after each mutation instead of subscribing.
export function useCreateStudent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: StudentCreateInput) =>
      apiFetch<Student>("/students", { method: "POST", body: input }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["students"] }),
  });
}

export function useUpdateStudent(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: StudentUpdateInput) =>
      apiFetch<Student>(`/students/${id}`, { method: "PATCH", body: input }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["students"] });
      qc.invalidateQueries({ queryKey: ["students", "detail", id] });
    },
  });
}

export function useDeleteStudent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiFetch<void>(`/students/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["students"] }),
  });
}
