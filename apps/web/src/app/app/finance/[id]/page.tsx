"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { RequirePermission } from "@/components/auth/require-permission";
import { DetailPageTemplate } from "@/components/templates/detail-page-template";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useInvoice, useInvoicePayments, useRecordPayment } from "@/hooks/use-invoices";
import { ApiError } from "@/lib/api-client";
import type { Payment } from "@/types/finance";

const statusVariant: Record<string, "success" | "warning" | "error" | "default"> = {
  paid: "success",
  pending: "warning",
  partially_paid: "default",
  overdue: "error",
  cancelled: "default",
};

function OverviewTab({ invoiceId }: { invoiceId: string }) {
  const { data: invoice, isLoading } = useInvoice(invoiceId);

  if (isLoading) return <Skeleton className="h-40 w-full max-w-md" />;
  if (!invoice) return null;

  const rows: [string, string][] = [
    ["Invoice number", invoice.invoice_number],
    ["Student ID", invoice.student_id],
    ["Amount", `₹${invoice.amount}`],
    ["Due date", invoice.due_date],
    ["Status", invoice.status.replace("_", " ")],
  ];

  return (
    <dl className="max-w-md divide-y divide-border rounded-lg border border-border">
      {rows.map(([label, value]) => (
        <div key={label} className="flex justify-between px-4 py-3 text-sm">
          <dt className="text-muted-foreground">{label}</dt>
          <dd className="font-medium text-foreground capitalize">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

function PaymentsTab({ invoiceId }: { invoiceId: string }) {
  const { data: payments, isLoading } = useInvoicePayments(invoiceId);
  const recordPayment = useRecordPayment(invoiceId);

  const [amount, setAmount] = useState("");
  const [paymentDate, setPaymentDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [method, setMethod] = useState<Payment["method"]>("cash");

  const handleRecord = async () => {
    if (!amount) return;
    try {
      await recordPayment.mutateAsync({ amount, payment_date: paymentDate, method });
      toast.success("Payment recorded");
      setAmount("");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to record payment");
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="rounded-lg border border-border p-4 space-y-3">
        <h3 className="text-sm font-semibold text-foreground">Record a payment</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <Label htmlFor="pay-amount">Amount</Label>
            <Input
              id="pay-amount"
              type="number"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="mt-1.5"
            />
          </div>
          <div>
            <Label htmlFor="pay-date">Date</Label>
            <Input
              id="pay-date"
              type="date"
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
              className="mt-1.5"
            />
          </div>
          <div>
            <Label htmlFor="pay-method">Method</Label>
            <Select value={method} onValueChange={(v) => setMethod(v as Payment["method"])}>
              <SelectTrigger id="pay-method" className="w-full mt-1.5">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cash">Cash</SelectItem>
                <SelectItem value="bank_transfer">Bank transfer</SelectItem>
                <SelectItem value="card">Card</SelectItem>
                <SelectItem value="upi">UPI</SelectItem>
                <SelectItem value="cheque">Cheque</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <Button onClick={handleRecord} disabled={!amount || recordPayment.isPending} size="sm">
          {recordPayment.isPending ? "Recording…" : "Record payment"}
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Amount</TableHead>
            <TableHead>Method</TableHead>
            <TableHead>Reference</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading && (
            <TableRow>
              <TableCell colSpan={4}>
                <Skeleton className="h-4 w-full" />
              </TableCell>
            </TableRow>
          )}
          {!isLoading && payments?.length === 0 && (
            <TableRow>
              <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                No payments recorded yet.
              </TableCell>
            </TableRow>
          )}
          {payments?.map((p) => (
            <TableRow key={p.id}>
              <TableCell>{p.payment_date}</TableCell>
              <TableCell className="font-medium text-foreground tabular-nums">₹{p.amount}</TableCell>
              <TableCell className="capitalize">{p.method.replace("_", " ")}</TableCell>
              <TableCell className="text-muted-foreground">{p.reference_number ?? "—"}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function InvoiceDetailPage({ id }: { id: string }) {
  const router = useRouter();
  const { data: invoice } = useInvoice(id);

  return (
    <DetailPageTemplate
      title={invoice?.invoice_number ?? "…"}
      subtitle={invoice ? `Due ${invoice.due_date}` : undefined}
      statusBadge={
        invoice
          ? { label: invoice.status.replace("_", " "), variant: statusVariant[invoice.status] }
          : undefined
      }
      tabs={[
        { value: "overview", label: "Overview", content: <OverviewTab invoiceId={id} /> },
        { value: "payments", label: "Payments", content: <PaymentsTab invoiceId={id} /> },
      ]}
      rightRail={
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-foreground">Quick actions</h3>
          <Button variant="outline" size="sm" className="w-full" onClick={() => router.push("/app/finance")}>
            Back to all invoices
          </Button>
        </div>
      }
    />
  );
}

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <RequirePermission permission="fees:invoice:read">
      <InvoiceDetailPage id={id} />
    </RequirePermission>
  );
}
