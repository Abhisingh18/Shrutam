export interface Hostel {
  id: string;
  name: string;
  warden_name: string | null;
  campus_id: string | null;
}

export interface HostelListResponse {
  data: Hostel[];
  meta: { page: number; page_size: number; total: number };
}

export interface HostelCreateInput {
  name: string;
  warden_name?: string | null;
  campus_id?: string | null;
}

export interface Room {
  id: string;
  hostel_id: string;
  room_number: string;
  capacity: number;
  occupied_count: number;
}

export interface RoomListResponse {
  data: Room[];
  meta: { page: number; page_size: number; total: number };
}

export interface RoomCreateInput {
  hostel_id: string;
  room_number: string;
  capacity: number;
}

export type RoomUpdateInput = Partial<Pick<RoomCreateInput, "room_number" | "capacity">>;

export interface RoomAllocation {
  id: string;
  room_id: string;
  student_id: string;
  allocated_date: string;
  vacated_date: string | null;
  status: "active" | "vacated";
}

export interface RoomAllocationListResponse {
  data: RoomAllocation[];
  meta: { page: number; page_size: number; total: number };
}

export interface RoomAllocationCreateInput {
  room_id: string;
  student_id: string;
  allocated_date: string;
}
