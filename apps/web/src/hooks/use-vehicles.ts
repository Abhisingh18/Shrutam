import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import type {
  Vehicle,
  VehicleCreateInput,
  VehicleListResponse,
  VehicleUpdateInput,
} from "@/types/transport";

export function useVehicles(params: { page: number; pageSize: number }) {
  return useQuery({
    queryKey: ["vehicles", params],
    queryFn: () =>
      apiFetch<VehicleListResponse>("/transport/vehicles", {
        params: { page: params.page, page_size: params.pageSize },
      }),
    placeholderData: (prev) => prev,
  });
}

export function useVehicle(id: string | undefined) {
  return useQuery({
    queryKey: ["vehicles", "detail", id],
    queryFn: () => apiFetch<Vehicle>(`/transport/vehicles/${id}`),
    enabled: Boolean(id),
  });
}

// Cache invalidation keyed to backend domain events, mirroring use-students.ts —
// no live event stream yet in this scaffold, so we invalidate directly after each mutation.
export function useCreateVehicle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: VehicleCreateInput) =>
      apiFetch<Vehicle>("/transport/vehicles", { method: "POST", body: input }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["vehicles"] }),
  });
}

export function useUpdateVehicle(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: VehicleUpdateInput) =>
      apiFetch<Vehicle>(`/transport/vehicles/${id}`, { method: "PATCH", body: input }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["vehicles"] });
      qc.invalidateQueries({ queryKey: ["vehicles", "detail", id] });
    },
  });
}

export function useDeleteVehicle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiFetch<void>(`/transport/vehicles/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["vehicles"] }),
  });
}
