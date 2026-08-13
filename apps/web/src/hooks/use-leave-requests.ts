import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import type {
  LeaveRequest,
  LeaveRequestCreateInput,
  LeaveRequestDecisionInput,
  LeaveRequestListResponse,
} from "@/types/hr";

const leaveRequestsKey = (params?: Record<string, unknown>) =>
  ["leave-requests", params] as const;

export function useLeaveRequestList(params: {
  page: number;
  pageSize: number;
  employeeId?: string;
  status?: string;
}) {
  return useQuery({
    queryKey: leaveRequestsKey(params),
    queryFn: () =>
      apiFetch<LeaveRequestListResponse>("/hr/leave-requests", {
        params: {
          page: params.page,
          page_size: params.pageSize,
          employee_id: params.employeeId || undefined,
          status: params.status || undefined,
        },
      }),
    placeholderData: (prev) => prev,
  });
}

// Cache invalidation keyed to backend domain events, mirrors use-faculty.ts —
// docs/09-frontend-architecture.md §5. No live event stream yet in this scaffold,
// so we invalidate directly after each mutation instead of subscribing.
export function useCreateLeaveRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: LeaveRequestCreateInput) =>
      apiFetch<LeaveRequest>("/hr/leave-requests", { method: "POST", body: input }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["leave-requests"] }),
  });
}

export function useDecideLeaveRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: LeaveRequestDecisionInput }) =>
      apiFetch<LeaveRequest>(`/hr/leave-requests/${id}/decide`, {
        method: "POST",
        body: input,
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["leave-requests"] }),
  });
}
