export interface Vehicle {
  id: string;
  registration_number: string;
  vehicle_type: string;
  capacity: number;
  driver_name: string | null;
  driver_phone: string | null;
}

export interface VehicleListResponse {
  data: Vehicle[];
  meta: { page: number; page_size: number; total: number };
}

export interface VehicleCreateInput {
  registration_number: string;
  vehicle_type: string;
  capacity: number;
  driver_name?: string | null;
  driver_phone?: string | null;
}

export type VehicleUpdateInput = Partial<VehicleCreateInput>;

export interface Route {
  id: string;
  name: string;
  vehicle_id: string | null;
  stops: string | null;
}

export interface RouteListResponse {
  data: Route[];
  meta: { page: number; page_size: number; total: number };
}

export interface RouteCreateInput {
  name: string;
  vehicle_id?: string | null;
  stops?: string | null;
}

export type RouteUpdateInput = Partial<RouteCreateInput>;

export interface TransportPass {
  id: string;
  student_id: string;
  route_id: string;
  valid_from: string;
  valid_until: string | null;
  status: "active" | "expired" | "cancelled";
}

export interface TransportPassListResponse {
  data: TransportPass[];
  meta: { page: number; page_size: number; total: number };
}

export interface TransportPassCreateInput {
  student_id: string;
  route_id: string;
  valid_from: string;
  valid_until?: string | null;
}
