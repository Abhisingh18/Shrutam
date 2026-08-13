export interface Faculty {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  department_id: string | null;
  designation: string;
  employment_type: "full_time" | "part_time" | "visiting" | "contract";
  joining_date: string;
  status: "active" | "on_leave" | "resigned" | "retired";
}

export interface FacultyListResponse {
  data: Faculty[];
  meta: { page: number; page_size: number; total: number };
}

export interface FacultyCreateInput {
  full_name: string;
  email: string;
  phone?: string | null;
  department_id?: string | null;
  designation: string;
  employment_type?: Faculty["employment_type"];
  joining_date: string;
}

export type FacultyUpdateInput = Partial<
  Pick<FacultyCreateInput, "full_name" | "phone" | "designation"> & { status: Faculty["status"] }
>;
