export interface Department {
  id: string;
  name: string;
  code: string;
  campus_id: string | null;
}

export interface DepartmentListResponse {
  data: Department[];
  meta: { page: number; page_size: number; total: number };
}

export interface DepartmentCreateInput {
  name: string;
  code: string;
  campus_id?: string | null;
}

export type DepartmentUpdateInput = Partial<DepartmentCreateInput>;

export interface Subject {
  id: string;
  name: string;
  code: string;
  department_id: string;
  credits: number;
}

export interface SubjectListResponse {
  data: Subject[];
  meta: { page: number; page_size: number; total: number };
}

export interface SubjectCreateInput {
  name: string;
  code: string;
  department_id: string;
  credits: number;
}

export type SubjectUpdateInput = Partial<SubjectCreateInput>;

export interface Program {
  id: string;
  name: string;
  code: string;
  department_id: string;
  degree_type: "undergraduate" | "postgraduate" | "diploma";
}

export interface ProgramListResponse {
  data: Program[];
  meta: { page: number; page_size: number; total: number };
}

export interface ProgramCreateInput {
  name: string;
  code: string;
  department_id: string;
  degree_type: Program["degree_type"];
}

export interface Semester {
  id: string;
  name: string;
  academic_year_id: string;
  start_date: string;
  end_date: string;
  is_current: boolean;
}

export interface SemesterListResponse {
  data: Semester[];
  meta: { page: number; page_size: number; total: number };
}

export interface SemesterCreateInput {
  name: string;
  academic_year_id: string;
  start_date: string;
  end_date: string;
  is_current?: boolean;
}

export interface Section {
  id: string;
  name: string;
  program_id: string;
  semester_id: string;
  capacity: number;
  class_teacher_id: string | null;
}

export interface SectionListResponse {
  data: Section[];
  meta: { page: number; page_size: number; total: number };
}

export interface SectionCreateInput {
  name: string;
  program_id: string;
  semester_id: string;
  capacity: number;
  class_teacher_id?: string | null;
}

export type SectionUpdateInput = Partial<
  Pick<SectionCreateInput, "name" | "capacity" | "class_teacher_id">
>;
