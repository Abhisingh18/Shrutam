import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import type {
  Admission,
  AdmissionCreateInput,
  AdmissionListResponse,
  AdmissionUpdateInput,
  ConvertToStudentResponse,
} from "@/types/admission";

export function useAdmissions(params: { page: number; pageSize: number; search?: string }) {
  return useQuery({
    queryKey: ["admissions", params],
    queryFn: () =>
      apiFetch<AdmissionListResponse>("/admissions", {
        params: {
          page: params.page,
          page_size: params.pageSize,
          search: params.search || undefined,
        },
      }),
    placeholderData: (prev) => prev,
  });
}

export function useAdmission(id: string | undefined) {
  return useQuery({
    queryKey: ["admissions", "detail", id],
    queryFn: () => apiFetch<Admission>(`/admissions/${id}`),
    enabled: Boolean(id),
  });
}

export function useCreateAdmission() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: AdmissionCreateInput) =>
      apiFetch<Admission>("/admissions", { method: "POST", body: input }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admissions"] }),
  });
}

export function useUpdateAdmission(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: AdmissionUpdateInput) =>
      apiFetch<Admission>(`/admissions/${id}`, { method: "PATCH", body: input }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admissions"] });
      qc.invalidateQueries({ queryKey: ["admissions", "detail", id] });
    },
  });
}

export function useConvertToStudent(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (admissionNumber: string) =>
      apiFetch<ConvertToStudentResponse>(`/admissions/${id}/convert`, {
        method: "POST",
        body: { admission_number: admissionNumber },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admissions"] });
      qc.invalidateQueries({ queryKey: ["admissions", "detail", id] });
      qc.invalidateQueries({ queryKey: ["students"] });
    },
  });
}
