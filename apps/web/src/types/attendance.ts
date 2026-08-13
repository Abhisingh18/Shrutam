export type AttendanceStatus = "present" | "absent" | "late" | "excused";

export interface AttendanceRecord {
  id: string;
  student_id: string;
  attendance_date: string;
  status: AttendanceStatus;
  marked_by_user_id: string | null;
  remarks: string | null;
}

export interface AttendanceListResponse {
  data: AttendanceRecord[];
  meta: { page: number; page_size: number; total: number };
}

export interface AttendanceMarkEntry {
  student_id: string;
  status: AttendanceStatus;
  remarks?: string | null;
}

export interface AttendanceBulkMarkInput {
  attendance_date: string;
  entries: AttendanceMarkEntry[];
}
