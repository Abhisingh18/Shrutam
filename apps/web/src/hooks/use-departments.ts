import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import type {
  Department,
  DepartmentCreateInput,
  DepartmentListResponse,
  DepartmentUpdateInput,
} from "@/types/academics";

const departmentsKey = (params?: Record<string, unknown>) => ["departments", params] as const;

export function useDepartments(params: { page: number; pageSize: number; search?: string }) {
  return useQuery({
    queryKey: departmentsKey(params),
    queryFn: () =>
      apiFetch<DepartmentListResponse>("/academics/departments", {
        params: {
          page: params.page,
          page_size: params.pageSize,
          search: params.search || undefined,
        },
      }),
    placeholderData: (prev) => prev,
  });
}

export function useDepartment(id: string | undefined) {
  return useQuery({
    queryKey: ["departments", "detail", id],
    queryFn: () => apiFetch<Department>(`/academics/departments/${id}`),
    enabled: Boolean(id),
  });
}

export function useCreateDepartment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: DepartmentCreateInput) =>
      apiFetch<Department>("/academics/departments", { method: "POST", body: input }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["departments"] }),
  });
}

export function useUpdateDepartment(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: DepartmentUpdateInput) =>
      apiFetch<Department>(`/academics/departments/${id}`, { method: "PATCH", body: input }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["departments"] });
      qc.invalidateQueries({ queryKey: ["departments", "detail", id] });
    },
  });
}

export function useDeleteDepartment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiFetch<void>(`/academics/departments/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["departments"] }),
  });
}
