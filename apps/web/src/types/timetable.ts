export type DayOfWeek =
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday"
  | "saturday"
  | "sunday";

export interface TimetableSlot {
  id: string;
  section_id: string;
  subject_id: string | null;
  faculty_id: string | null;
  day_of_week: DayOfWeek;
  start_time: string; // "HH:MM:SS"
  end_time: string; // "HH:MM:SS"
  room: string | null;
}

export interface TimetableSlotListResponse {
  data: TimetableSlot[];
  meta: { page: number; page_size: number; total: number };
}

export interface TimetableSlotCreateInput {
  section_id: string;
  subject_id?: string | null;
  faculty_id?: string | null;
  day_of_week: DayOfWeek;
  start_time: string;
  end_time: string;
  room?: string | null;
}

export type TimetableSlotUpdateInput = Partial<TimetableSlotCreateInput>;
