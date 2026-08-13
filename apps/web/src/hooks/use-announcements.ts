import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import type {
  Announcement,
  AnnouncementCreateInput,
  AnnouncementListResponse,
} from "@/types/communication";

const announcementsKey = (params?: Record<string, unknown>) =>
  ["announcements", params] as const;

export function useAnnouncements(params: {
  page: number;
  pageSize: number;
  audience?: string;
  publishedOnly?: boolean;
}) {
  return useQuery({
    queryKey: announcementsKey(params),
    queryFn: () =>
      apiFetch<AnnouncementListResponse>("/communication/announcements", {
        params: {
          page: params.page,
          page_size: params.pageSize,
          audience: params.audience || undefined,
          published_only: params.publishedOnly || undefined,
        },
      }),
    placeholderData: (prev) => prev,
  });
}

export function useAnnouncement(id: string | undefined) {
  return useQuery({
    queryKey: ["announcements", "detail", id],
    queryFn: () => apiFetch<Announcement>(`/communication/announcements/${id}`),
    enabled: Boolean(id),
  });
}

// Cache invalidation keyed to backend domain events, mirroring use-students.ts —
// no live event stream yet in this scaffold, so we invalidate directly after each mutation.
export function useCreateAnnouncement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: AnnouncementCreateInput) =>
      apiFetch<Announcement>("/communication/announcements", { method: "POST", body: input }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["announcements"] }),
  });
}

export function usePublishAnnouncement(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () =>
      apiFetch<Announcement>(`/communication/announcements/${id}/publish`, { method: "POST" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["announcements"] });
      qc.invalidateQueries({ queryKey: ["announcements", "detail", id] });
    },
  });
}

export function useDeleteAnnouncement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<void>(`/communication/announcements/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["announcements"] }),
  });
}
