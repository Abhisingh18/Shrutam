import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import type {
  TimetableSlot,
  TimetableSlotCreateInput,
  TimetableSlotListResponse,
  TimetableSlotUpdateInput,
} from "@/types/timetable";

export function useSectionTimetable(sectionId: string | undefined) {
  return useQuery({
    queryKey: ["timetable", "section", sectionId],
    queryFn: () => apiFetch<TimetableSlotListResponse>(`/timetable/section/${sectionId}`),
    enabled: Boolean(sectionId),
  });
}

export function useFacultyTimetable(facultyId: string | undefined) {
  return useQuery({
    queryKey: ["timetable", "faculty", facultyId],
    queryFn: () => apiFetch<TimetableSlotListResponse>(`/timetable/faculty/${facultyId}`),
    enabled: Boolean(facultyId),
  });
}

export function useCreateTimetableSlot() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: TimetableSlotCreateInput) =>
      apiFetch<TimetableSlot>("/timetable/slots", { method: "POST", body: input }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["timetable"] }),
  });
}

export function useUpdateTimetableSlot(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: TimetableSlotUpdateInput) =>
      apiFetch<TimetableSlot>(`/timetable/slots/${id}`, { method: "PATCH", body: input }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["timetable"] }),
  });
}

export function useDeleteTimetableSlot() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiFetch<void>(`/timetable/slots/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["timetable"] }),
  });
}
