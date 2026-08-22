import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import type {
  Program,
  ProgramCreateInput,
  ProgramListResponse,
  ProgramUpdateInput,
} from "@/types/academics";

const programsKey = (params?: Record<string, unknown>) => ["programs", params] as const;

export function usePrograms(params: { page: number; pageSize: number; departmentId?: string }) {
  return useQuery({
    queryKey: programsKey(params),
    queryFn: () =>
      apiFetch<ProgramListResponse>("/academics/programs", {
        params: {
          page: params.page,
          page_size: params.pageSize,
          department_id: params.departmentId || undefined,
        },
      }),
    placeholderData: (prev) => prev,
  });
}

export function useCreateProgram() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: ProgramCreateInput) =>
      apiFetch<Program>("/academics/programs", { method: "POST", body: input }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["programs"] });
      qc.invalidateQueries({ queryKey: ["academics", "summary"] });
    },
  });
}

export function useUpdateProgram(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: ProgramUpdateInput) =>
      apiFetch<Program>(`/academics/programs/${id}`, { method: "PATCH", body: input }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["programs"] }),
  });
}

export function useDeleteProgram() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiFetch<void>(`/academics/programs/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["programs"] });
      qc.invalidateQueries({ queryKey: ["academics", "summary"] });
    },
  });
}
