import type { Student } from "@/types/student";
import type { AttendanceRecord } from "@/types/attendance";
import type { Invoice } from "@/types/finance";

export type MyChildren = Student[];
export type MyAttendance = AttendanceRecord[];
export type MyInvoices = Invoice[];

export interface MyExamResult {
  exam_id: string;
  exam_name: string;
  exam_type: string;
  max_marks: number;
  marks_obtained: number | null;
  grade: string | null;
  grade_point: number | null;
}

export interface MyCGPA {
  student_id: string;
  cgpa: number | null;
  scale: string;
  exams_graded: number;
}

export interface MyResults {
  results: MyExamResult[];
  cgpa: MyCGPA;
}
