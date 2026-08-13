import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import type {
  TransportPass,
  TransportPassCreateInput,
  TransportPassListResponse,
} from "@/types/transport";

export function useTransportPasses(params: {
  page: number;
  pageSize: number;
  studentId?: string;
  routeId?: string;
  status?: string;
}) {
  return useQuery({
    queryKey: ["transport-passes", params],
    queryFn: () =>
      apiFetch<TransportPassListResponse>("/transport/passes", {
        params: {
          page: params.page,
          page_size: params.pageSize,
          student_id: params.studentId || undefined,
          route_id: params.routeId || undefined,
          status: params.status || undefined,
        },
      }),
    placeholderData: (prev) => prev,
  });
}

// Cache invalidation keyed to backend domain events, mirroring use-students.ts —
// no live event stream yet in this scaffold, so we invalidate directly after each mutation.
export function useCreateTransportPass() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: TransportPassCreateInput) =>
      apiFetch<TransportPass>("/transport/passes", { method: "POST", body: input }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["transport-passes"] }),
  });
}

export function useCancelTransportPass() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<TransportPass>(`/transport/passes/${id}/cancel`, { method: "POST" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["transport-passes"] }),
  });
}
