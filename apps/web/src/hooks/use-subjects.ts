import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import type {
  Subject,
  SubjectCreateInput,
  SubjectListResponse,
  SubjectUpdateInput,
} from "@/types/academics";

const subjectsKey = (params?: Record<string, unknown>) => ["subjects", params] as const;

export function useSubjects(params: {
  page: number;
  pageSize: number;
  search?: string;
  departmentId?: string;
}) {
  return useQuery({
    queryKey: subjectsKey(params),
    queryFn: () =>
      apiFetch<SubjectListResponse>("/academics/subjects", {
        params: {
          page: params.page,
          page_size: params.pageSize,
          search: params.search || undefined,
          department_id: params.departmentId || undefined,
        },
      }),
    placeholderData: (prev) => prev,
  });
}

export function useSubject(id: string | undefined) {
  return useQuery({
    queryKey: ["subjects", "detail", id],
    queryFn: () => apiFetch<Subject>(`/academics/subjects/${id}`),
    enabled: Boolean(id),
  });
}

export function useCreateSubject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: SubjectCreateInput) =>
      apiFetch<Subject>("/academics/subjects", { method: "POST", body: input }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["subjects"] }),
  });
}

export function useUpdateSubject(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: SubjectUpdateInput) =>
      apiFetch<Subject>(`/academics/subjects/${id}`, { method: "PATCH", body: input }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["subjects"] });
      qc.invalidateQueries({ queryKey: ["subjects", "detail", id] });
    },
  });
}

export function useDeleteSubject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiFetch<void>(`/academics/subjects/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["subjects"] }),
  });
}
