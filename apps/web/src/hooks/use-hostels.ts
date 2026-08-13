import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import type { Hostel, HostelCreateInput, HostelListResponse } from "@/types/hostel";

export function useHostels(params: { page: number; pageSize: number }) {
  return useQuery({
    queryKey: ["hostels", params],
    queryFn: () =>
      apiFetch<HostelListResponse>("/hostel/hostels", {
        params: { page: params.page, page_size: params.pageSize },
      }),
    placeholderData: (prev) => prev,
  });
}

// Cache invalidation keyed to backend domain events, mirroring use-students.ts —
// no live event stream yet in this scaffold, so we invalidate directly after each mutation.
export function useCreateHostel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: HostelCreateInput) =>
      apiFetch<Hostel>("/hostel/hostels", { method: "POST", body: input }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["hostels"] }),
  });
}
