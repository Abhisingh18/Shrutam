import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import type {
  RoomAllocation,
  RoomAllocationCreateInput,
  RoomAllocationListResponse,
} from "@/types/hostel";

export function useRoomAllocations(params: {
  page: number;
  pageSize: number;
  roomId?: string;
  studentId?: string;
  status?: string;
}) {
  return useQuery({
    queryKey: ["room-allocations", params],
    queryFn: () =>
      apiFetch<RoomAllocationListResponse>("/hostel/allocations", {
        params: {
          page: params.page,
          page_size: params.pageSize,
          room_id: params.roomId || undefined,
          student_id: params.studentId || undefined,
          status: params.status || undefined,
        },
      }),
    placeholderData: (prev) => prev,
  });
}

// Cache invalidation keyed to backend domain events, mirroring use-students.ts —
// no live event stream yet in this scaffold, so we invalidate directly after each mutation.
export function useCreateRoomAllocation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: RoomAllocationCreateInput) =>
      apiFetch<RoomAllocation>("/hostel/allocations", { method: "POST", body: input }),
    onSuccess: (allocation) => {
      qc.invalidateQueries({ queryKey: ["room-allocations"] });
      qc.invalidateQueries({ queryKey: ["rooms"] });
      qc.invalidateQueries({ queryKey: ["rooms", "detail", allocation.room_id] });
    },
  });
}

export function useVacateRoomAllocation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<RoomAllocation>(`/hostel/allocations/${id}/vacate`, { method: "POST" }),
    onSuccess: (allocation) => {
      qc.invalidateQueries({ queryKey: ["room-allocations"] });
      qc.invalidateQueries({ queryKey: ["rooms"] });
      qc.invalidateQueries({ queryKey: ["rooms", "detail", allocation.room_id] });
    },
  });
}
