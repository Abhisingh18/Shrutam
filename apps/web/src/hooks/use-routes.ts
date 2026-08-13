import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import type {
  Route,
  RouteCreateInput,
  RouteListResponse,
  RouteUpdateInput,
} from "@/types/transport";

export function useRoutes(params: { page: number; pageSize: number }) {
  return useQuery({
    queryKey: ["routes", params],
    queryFn: () =>
      apiFetch<RouteListResponse>("/transport/routes", {
        params: { page: params.page, page_size: params.pageSize },
      }),
    placeholderData: (prev) => prev,
  });
}

export function useRoute(id: string | undefined) {
  return useQuery({
    queryKey: ["routes", "detail", id],
    queryFn: () => apiFetch<Route>(`/transport/routes/${id}`),
    enabled: Boolean(id),
  });
}

// Cache invalidation keyed to backend domain events, mirroring use-students.ts —
// no live event stream yet in this scaffold, so we invalidate directly after each mutation.
export function useCreateRoute() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: RouteCreateInput) =>
      apiFetch<Route>("/transport/routes", { method: "POST", body: input }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["routes"] }),
  });
}

export function useUpdateRoute(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: RouteUpdateInput) =>
      apiFetch<Route>(`/transport/routes/${id}`, { method: "PATCH", body: input }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["routes"] });
      qc.invalidateQueries({ queryKey: ["routes", "detail", id] });
    },
  });
}

export function useDeleteRoute() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiFetch<void>(`/transport/routes/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["routes"] }),
  });
}
