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

export interface AttendanceSummary {
  student_id: string;
  total_days: number;
  present_days: number;
  absent_days: number;
  late_days: number;
  excused_days: number;
  attendance_percentage: number | null;
}

export interface AttendanceDefaulter {
  student_id: string;
  student_name: string;
  total_days: number;
  present_days: number;
  attendance_percentage: number;
}

export interface AttendanceDefaultersResponse {
  threshold: number;
  data: AttendanceDefaulter[];
}
