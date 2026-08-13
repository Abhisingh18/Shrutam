import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import type {
  Faculty,
  FacultyCreateInput,
  FacultyListResponse,
  FacultyUpdateInput,
} from "@/types/faculty";

const facultyKey = (params?: Record<string, unknown>) => ["faculty", params] as const;

export function useFacultyList(params: { page: number; pageSize: number; search?: string }) {
  return useQuery({
    queryKey: facultyKey(params),
    queryFn: () =>
      apiFetch<FacultyListResponse>("/faculty", {
        params: {
          page: params.page,
          page_size: params.pageSize,
          search: params.search || undefined,
        },
      }),
    placeholderData: (prev) => prev,
  });
}

export function useFacultyMember(id: string | undefined) {
  return useQuery({
    queryKey: ["faculty", "detail", id],
    queryFn: () => apiFetch<Faculty>(`/faculty/${id}`),
    enabled: Boolean(id),
  });
}

// Cache invalidation keyed to backend domain events, mirrors use-students.ts —
// docs/09-frontend-architecture.md §5. No live event stream yet in this scaffold,
// so we invalidate directly after each mutation instead of subscribing.
export function useCreateFaculty() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: FacultyCreateInput) =>
      apiFetch<Faculty>("/faculty", { method: "POST", body: input }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["faculty"] }),
  });
}

export function useUpdateFaculty(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: FacultyUpdateInput) =>
      apiFetch<Faculty>(`/faculty/${id}`, { method: "PATCH", body: input }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["faculty"] });
      qc.invalidateQueries({ queryKey: ["faculty", "detail", id] });
    },
  });
}

export function useDeleteFaculty() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiFetch<void>(`/faculty/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["faculty"] }),
  });
}
