export type ComplaintCategory =
  | "electrical"
  | "plumbing"
  | "furniture"
  | "cleanliness"
  | "internet"
  | "other";

export type ComplaintStatus = "open" | "in_progress" | "resolved";

export interface HostelComplaint {
  id: string;
  room_id: string;
  student_id: string;
  category: ComplaintCategory;
  description: string;
  status: ComplaintStatus;
  raised_date: string;
  resolved_date: string | null;
  resolution_notes: string | null;
}

export interface HostelComplaintListResponse {
  data: HostelComplaint[];
  meta: { page: number; page_size: number; total: number };
}

export interface HostelComplaintCreateInput {
  category: ComplaintCategory;
  description: string;
}

export interface HostelComplaintResolveInput {
  status: ComplaintStatus;
  resolution_notes?: string | null;
}
