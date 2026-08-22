import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import type {
  AcademicYear,
  AcademicYearCreateInput,
  AcademicYearListResponse,
  AcademicYearUpdateInput,
} from "@/types/academics";

export function useAcademicYears(params: { page: number; pageSize: number }) {
  return useQuery({
    queryKey: ["academic-years", params],
    queryFn: () =>
      apiFetch<AcademicYearListResponse>("/academics/academic-years", {
        params: { page: params.page, page_size: params.pageSize },
      }),
    placeholderData: (prev) => prev,
  });
}

export function useCreateAcademicYear() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: AcademicYearCreateInput) =>
      apiFetch<AcademicYear>("/academics/academic-years", { method: "POST", body: input }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["academic-years"] });
      qc.invalidateQueries({ queryKey: ["academics", "summary"] });
    },
  });
}

export function useUpdateAcademicYear(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: AcademicYearUpdateInput) =>
      apiFetch<AcademicYear>(`/academics/academic-years/${id}`, { method: "PATCH", body: input }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["academic-years"] }),
  });
}

export function useDeleteAcademicYear() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<void>(`/academics/academic-years/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["academic-years"] });
      qc.invalidateQueries({ queryKey: ["academics", "summary"] });
    },
  });
}
