export interface Document {
  id: string;
  owner_type: "student" | "faculty";
  owner_id: string;
  category: "photo" | "id_proof" | "certificate" | "other";
  file_name: string;
  content_type: string;
  size_bytes: number;
  uploaded_by_user_id: string | null;
  download_url: string;
  created_at: string;
}

export interface DocumentListResponse {
  data: Document[];
  meta: { page: number; page_size: number; total: number };
}
