export interface Notification {
  id: string;
  title: string;
  body: string | null;
  link_url: string | null;
  notification_type: string;
  read_at: string | null;
  created_at: string;
}

export interface NotificationListResponse {
  data: Notification[];
  meta: { page: number; page_size: number; total: number };
}

export interface UnreadCountResponse {
  count: number;
}
