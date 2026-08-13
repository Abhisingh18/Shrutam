export type AnnouncementAudience = "all" | "students" | "faculty" | "parents" | "staff";

export interface Announcement {
  id: string;
  title: string;
  body: string;
  audience: AnnouncementAudience;
  created_by_user_id: string | null;
  published_at: string | null;
  created_at: string;
}

export interface AnnouncementListResponse {
  data: Announcement[];
  meta: { page: number; page_size: number; total: number };
}

export interface AnnouncementCreateInput {
  title: string;
  body: string;
  audience: AnnouncementAudience;
}
