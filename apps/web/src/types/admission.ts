export type AdmissionStatus = "submitted" | "under_review" | "accepted" | "rejected" | "converted";

export interface Admission {
  id: string;
  applicant_name: string;
  applicant_email: string | null;
  applicant_phone: string | null;
  campus_id: string | null;
  status: AdmissionStatus;
}

export interface AdmissionListResponse {
  data: Admission[];
  meta: { page: number; page_size: number; total: number };
}

export interface AdmissionCreateInput {
  applicant_name: string;
  applicant_email?: string | null;
  applicant_phone?: string | null;
  campus_id?: string | null;
}

export interface AdmissionUpdateInput {
  status: "submitted" | "under_review" | "accepted" | "rejected";
}

export interface ConvertToStudentResponse {
  student_id: string;
  admission_id: string;
}
