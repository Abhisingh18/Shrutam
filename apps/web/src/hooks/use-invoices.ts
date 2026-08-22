import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import { downloadPdf } from "@/lib/pdf-download";
import type {
  Invoice,
  InvoiceCreateInput,
  InvoiceDefaultersResponse,
  InvoiceListResponse,
  InvoiceUpdateInput,
  Payment,
  PaymentCreateInput,
} from "@/types/finance";

export function useInvoices(params: { page: number; pageSize: number; search?: string }) {
  return useQuery({
    queryKey: ["invoices", params],
    queryFn: () =>
      apiFetch<InvoiceListResponse>("/finance/invoices", {
        params: {
          page: params.page,
          page_size: params.pageSize,
          search: params.search || undefined,
        },
      }),
    placeholderData: (prev) => prev,
  });
}

export function useInvoice(id: string | undefined) {
  return useQuery({
    queryKey: ["invoices", "detail", id],
    queryFn: () => apiFetch<Invoice>(`/finance/invoices/${id}`),
    enabled: Boolean(id),
  });
}

export function useCreateInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: InvoiceCreateInput) =>
      apiFetch<Invoice>("/finance/invoices", { method: "POST", body: input }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["invoices"] }),
  });
}

export function useUpdateInvoice(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: InvoiceUpdateInput) =>
      apiFetch<Invoice>(`/finance/invoices/${id}`, { method: "PATCH", body: input }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["invoices"] });
      qc.invalidateQueries({ queryKey: ["invoices", "detail", id] });
    },
  });
}

export function useInvoicePayments(invoiceId: string | undefined) {
  return useQuery({
    queryKey: ["invoices", "payments", invoiceId],
    queryFn: () => apiFetch<Payment[]>(`/finance/invoices/${invoiceId}/payments`),
    enabled: Boolean(invoiceId),
  });
}

export function useRecordPayment(invoiceId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: PaymentCreateInput) =>
      apiFetch<Payment>(`/finance/invoices/${invoiceId}/payments`, {
        method: "POST",
        body: input,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["invoices", "payments", invoiceId] });
      qc.invalidateQueries({ queryKey: ["invoices", "detail", invoiceId] });
      qc.invalidateQueries({ queryKey: ["invoices"] });
      qc.invalidateQueries({ queryKey: ["invoices", "defaulters"] });
    },
  });
}

export function useInvoiceDefaulters() {
  return useQuery({
    queryKey: ["invoices", "defaulters"],
    queryFn: () => apiFetch<InvoiceDefaultersResponse>("/finance/invoices/defaulters"),
  });
}

export function downloadPaymentReceipt(
  invoiceId: string,
  paymentId: string,
  invoiceNumber: string,
): Promise<void> {
  return downloadPdf(
    `/finance/invoices/${invoiceId}/payments/${paymentId}/receipt.pdf`,
    `receipt-${invoiceNumber}.pdf`,
  );
}
