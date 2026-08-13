import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import type {
  Employee,
  EmployeeCreateInput,
  EmployeeListResponse,
  EmployeeUpdateInput,
} from "@/types/hr";

const employeesKey = (params?: Record<string, unknown>) => ["employees", params] as const;

export function useEmployeeList(params: { page: number; pageSize: number; search?: string }) {
  return useQuery({
    queryKey: employeesKey(params),
    queryFn: () =>
      apiFetch<EmployeeListResponse>("/hr/employees", {
        params: {
          page: params.page,
          page_size: params.pageSize,
          search: params.search || undefined,
        },
      }),
    placeholderData: (prev) => prev,
  });
}

export function useEmployee(id: string | undefined) {
  return useQuery({
    queryKey: ["employees", "detail", id],
    queryFn: () => apiFetch<Employee>(`/hr/employees/${id}`),
    enabled: Boolean(id),
  });
}

// Cache invalidation keyed to backend domain events, mirrors use-faculty.ts —
// docs/09-frontend-architecture.md §5. No live event stream yet in this scaffold,
// so we invalidate directly after each mutation instead of subscribing.
export function useCreateEmployee() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: EmployeeCreateInput) =>
      apiFetch<Employee>("/hr/employees", { method: "POST", body: input }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["employees"] }),
  });
}

export function useUpdateEmployee(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: EmployeeUpdateInput) =>
      apiFetch<Employee>(`/hr/employees/${id}`, { method: "PATCH", body: input }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["employees"] });
      qc.invalidateQueries({ queryKey: ["employees", "detail", id] });
    },
  });
}

export function useDeleteEmployee() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiFetch<void>(`/hr/employees/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["employees"] }),
  });
}
