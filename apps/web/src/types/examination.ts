export interface Exam {
  id: string;
  name: string;
  exam_type: string;
  subject_id: string | null;
  start_date: string;
  end_date: string;
  max_marks: number;
  status: "draft" | "scheduled" | "ongoing" | "completed" | "results_published";
}

export interface ExamListResponse {
  data: Exam[];
  meta: { page: number; page_size: number; total: number };
}

export interface ExamCreateInput {
  name: string;
  exam_type: string;
  subject_id?: string | null;
  start_date: string;
  end_date: string;
  max_marks: number;
}

export type ExamUpdateInput = Partial<
  Pick<ExamCreateInput, "name" | "exam_type" | "subject_id" | "start_date" | "end_date" | "max_marks"> & {
    status: Exam["status"];
  }
>;

export interface ExamMark {
  id: string;
  exam_id: string;
  student_id: string;
  marks_obtained: number | null;
  grade: string | null;
  remarks: string | null;
}

export interface ExamMarkEntry {
  student_id: string;
  marks_obtained: number | null;
  grade: string | null;
  remarks: string | null;
}

export interface ExamMarksBulkUpdateInput {
  marks: ExamMarkEntry[];
}

export interface ExamRankEntry {
  rank: number;
  student_id: string;
  student_name: string;
  marks_obtained: number;
  percentage: number;
  grade: string | null;
}

export interface ExamRankListResponse {
  exam_id: string;
  max_marks: number;
  data: ExamRankEntry[];
}

export interface ExamAnalytics {
  exam_id: string;
  students_graded: number;
  average_marks: number | null;
  highest_marks: number | null;
  lowest_marks: number | null;
  pass_count: number;
  fail_count: number;
  pass_percentage: number | null;
  grade_distribution: Record<string, number>;
}
