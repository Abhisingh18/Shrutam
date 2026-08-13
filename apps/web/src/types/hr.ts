export interface Employee {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  department_id: string | null;
  designation: string;
  employment_type: "full_time" | "part_time" | "contract";
  joining_date: string;
  status: "active" | "on_leave" | "resigned" | "terminated";
}

export interface EmployeeListResponse {
  data: Employee[];
  meta: { page: number; page_size: number; total: number };
}

export interface EmployeeCreateInput {
  full_name: string;
  email: string;
  phone?: string | null;
  department_id?: string | null;
  designation: string;
  employment_type?: Employee["employment_type"];
  joining_date: string;
}

export type EmployeeUpdateInput = Partial<
  Pick<EmployeeCreateInput, "full_name" | "phone" | "designation"> & {
    status: Employee["status"];
  }
>;

export interface LeaveRequest {
  id: string;
  employee_id: string;
  leave_type: string;
  start_date: string;
  end_date: string;
  reason: string | null;
  status: "pending" | "approved" | "rejected";
  approved_by_user_id: string | null;
}

export interface LeaveRequestListResponse {
  data: LeaveRequest[];
  meta: { page: number; page_size: number; total: number };
}

export interface LeaveRequestCreateInput {
  employee_id: string;
  leave_type: string;
  start_date: string;
  end_date: string;
  reason?: string | null;
}

export interface LeaveRequestDecisionInput {
  status: "approved" | "rejected";
}
