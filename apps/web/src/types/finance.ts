export interface FeeStructure {
  id: string;
  name: string;
  amount: string;
  frequency: "one_time" | "monthly" | "quarterly" | "annual";
  academic_year_id: string | null;
}

export interface FeeStructureListResponse {
  data: FeeStructure[];
  meta: { page: number; page_size: number; total: number };
}

export interface FeeStructureCreateInput {
  name: string;
  amount: string;
  frequency: FeeStructure["frequency"];
  academic_year_id?: string | null;
}

export type InvoiceStatus = "pending" | "paid" | "partially_paid" | "overdue" | "cancelled";

export interface Invoice {
  id: string;
  student_id: string;
  fee_structure_id: string | null;
  amount: string;
  due_date: string;
  invoice_number: string;
  status: InvoiceStatus;
}

export interface InvoiceListResponse {
  data: Invoice[];
  meta: { page: number; page_size: number; total: number };
}

export interface InvoiceCreateInput {
  student_id: string;
  fee_structure_id?: string | null;
  amount: string;
  due_date: string;
  invoice_number?: string;
}

export interface InvoiceUpdateInput {
  amount?: string;
  due_date?: string;
  status?: InvoiceStatus;
}

export interface Payment {
  id: string;
  invoice_id: string;
  amount: string;
  payment_date: string;
  method: "cash" | "bank_transfer" | "card" | "upi" | "cheque" | "other";
  reference_number: string | null;
}

export interface PaymentCreateInput {
  amount: string;
  payment_date: string;
  method: Payment["method"];
  reference_number?: string;
}
