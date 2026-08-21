import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import type {
  Notification,
  NotificationListResponse,
  UnreadCountResponse,
} from "@/types/notification";

const notificationsKey = (params?: Record<string, unknown>) =>
  ["notifications", params] as const;
const unreadCountKey = ["notifications", "unread-count"] as const;

export function useNotifications(params: { page?: number; pageSize?: number; unreadOnly?: boolean } = {}) {
  const { page = 1, pageSize = 20, unreadOnly = false } = params;

  return useQuery({
    queryKey: notificationsKey({ page, pageSize, unreadOnly }),
    queryFn: () =>
      apiFetch<NotificationListResponse>("/notifications", {
        params: {
          page,
          page_size: pageSize,
          unread_only: unreadOnly || undefined,
        },
      }),
    placeholderData: (prev) => prev,
  });
}

export function useUnreadCount() {
  return useQuery({
    queryKey: unreadCountKey,
    queryFn: () => apiFetch<UnreadCountResponse>("/notifications/unread-count"),
    refetchInterval: 30_000,
  });
}

export function useMarkNotificationRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<Notification>(`/notifications/${id}/read`, { method: "POST" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}

export function useMarkAllNotificationsRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () =>
      apiFetch<{ updated: number }>("/notifications/read-all", { method: "POST" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}
