import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import type {
  Semester,
  SemesterCreateInput,
  SemesterListResponse,
  SemesterUpdateInput,
} from "@/types/academics";

const semestersKey = (params?: Record<string, unknown>) => ["semesters", params] as const;

export function useSemesters(params: { page: number; pageSize: number; academicYearId?: string }) {
  return useQuery({
    queryKey: semestersKey(params),
    queryFn: () =>
      apiFetch<SemesterListResponse>("/academics/semesters", {
        params: {
          page: params.page,
          page_size: params.pageSize,
          academic_year_id: params.academicYearId || undefined,
        },
      }),
    placeholderData: (prev) => prev,
  });
}

export function useCreateSemester() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: SemesterCreateInput) =>
      apiFetch<Semester>("/academics/semesters", { method: "POST", body: input }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["semesters"] });
      qc.invalidateQueries({ queryKey: ["academics", "summary"] });
    },
  });
}

export function useUpdateSemester(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: SemesterUpdateInput) =>
      apiFetch<Semester>(`/academics/semesters/${id}`, { method: "PATCH", body: input }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["semesters"] }),
  });
}

export function useDeleteSemester() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiFetch<void>(`/academics/semesters/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["semesters"] });
      qc.invalidateQueries({ queryKey: ["academics", "summary"] });
    },
  });
}
