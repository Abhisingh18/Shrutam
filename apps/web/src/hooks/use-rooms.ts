import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import type { Room, RoomCreateInput, RoomListResponse, RoomUpdateInput } from "@/types/hostel";

export function useRooms(params: { page: number; pageSize: number; hostelId?: string }) {
  return useQuery({
    queryKey: ["rooms", params],
    queryFn: () =>
      apiFetch<RoomListResponse>("/hostel/rooms", {
        params: {
          page: params.page,
          page_size: params.pageSize,
          hostel_id: params.hostelId || undefined,
        },
      }),
    placeholderData: (prev) => prev,
  });
}

export function useRoom(id: string | undefined) {
  return useQuery({
    queryKey: ["rooms", "detail", id],
    queryFn: () => apiFetch<Room>(`/hostel/rooms/${id}`),
    enabled: Boolean(id),
  });
}

// Cache invalidation keyed to backend domain events, mirroring use-students.ts —
// no live event stream yet in this scaffold, so we invalidate directly after each mutation.
export function useCreateRoom() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: RoomCreateInput) =>
      apiFetch<Room>("/hostel/rooms", { method: "POST", body: input }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["rooms"] }),
  });
}

export function useUpdateRoom(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: RoomUpdateInput) =>
      apiFetch<Room>(`/hostel/rooms/${id}`, { method: "PATCH", body: input }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["rooms"] });
      qc.invalidateQueries({ queryKey: ["rooms", "detail", id] });
    },
  });
}

export function useDeleteRoom() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiFetch<void>(`/hostel/rooms/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["rooms"] }),
  });
}
