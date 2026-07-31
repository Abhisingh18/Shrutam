export interface Student {
  id: string;
  admission_number: string;
  full_name: string;
  date_of_birth: string | null;
  gender: "male" | "female" | "other" | "prefer_not_to_say" | null;
  email: string | null;
  phone: string | null;
  campus_id: string | null;
  status: "active" | "inactive" | "graduated" | "transferred" | "expelled";
}

export interface StudentListResponse {
  data: Student[];
  meta: { page: number; page_size: number; total: number };
}

export interface StudentCreateInput {
  admission_number: string;
  full_name: string;
  date_of_birth?: string | null;
  gender?: Student["gender"];
  email?: string | null;
  phone?: string | null;
  campus_id?: string | null;
}

export type StudentUpdateInput = Partial<
  Pick<StudentCreateInput, "full_name" | "email" | "phone"> & { status: Student["status"] }
>;
