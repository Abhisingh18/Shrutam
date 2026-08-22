"use client";

import { useState } from "react";
import { CheckCircle2, ChevronDown, ChevronUp, Clock, AlertTriangle, Download, XCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ChildSelector } from "@/components/me/child-selector";
import { downloadMyReceipt, useMyInvoicePayments, useMyInvoices } from "@/hooks/use-me-portal";
import { ApiError } from "@/lib/api-client";
import type { Invoice } from "@/types/finance";

const STATUS_CONFIG: Record<
  Invoice["status"],
  { label: string; icon: typeof CheckCircle2; className: string }
> = {
  paid: { label: "Paid", icon: CheckCircle2, className: "bg-success-bg text-success" },
  pending: { label: "Pending", icon: Clock, className: "bg-warning-bg text-warning" },
  partially_paid: { label: "Partially paid", icon: Clock, className: "bg-info-bg text-info" },
  overdue: { label: "Overdue", icon: AlertTriangle, className: "bg-destructive-bg text-destructive" },
  cancelled: { label: "Cancelled", icon: XCircle, className: "bg-muted text-muted-foreground" },
};

function PaymentsRow({
  invoice,
  studentId,
}: {
  invoice: Invoice;
  studentId: string | undefined;
}) {
  const { data: payments, isLoading } = useMyInvoicePayments(invoice.id, studentId);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const handleDownload = async (paymentId: string) => {
    setDownloadingId(paymentId);
    try {
      await downloadMyReceipt(invoice.id, paymentId, invoice.invoice_number, studentId);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to download receipt");
    } finally {
      setDownloadingId(null);
    }
  };

  if (isLoading) return <Skeleton className="h-10 w-full" />;
  if (!payments || payments.length === 0) {
    return <p className="text-xs text-muted-foreground py-2">No payments recorded yet.</p>;
  }

  return (
    <div className="space-y-1.5 py-1">
      {payments.map((p) => (
        <div
          key={p.id}
          className="flex items-center justify-between gap-3 rounded-md bg-muted/40 px-3 py-2 text-xs"
        >
          <span className="text-foreground font-medium tabular-nums">
            ₹{parseFloat(p.amount).toLocaleString("en-IN")}
          </span>
          <span className="text-muted-foreground">{p.payment_date}</span>
          <span className="text-muted-foreground capitalize">{p.method.replace("_", " ")}</span>
          <Button
            variant="ghost"
            size="icon-sm"
            disabled={downloadingId === p.id}
            onClick={() => handleDownload(p.id)}
            aria-label="Download receipt"
          >
            <Download className="size-3.5" />
          </Button>
        </div>
      ))}
    </div>
  );
}

export default function MyFeesPage() {
  const [studentId, setStudentId] = useState<string | undefined>();
  const { data: invoices, isLoading } = useMyInvoices(studentId);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const outstanding = invoices?.filter((i) => i.status !== "paid" && i.status !== "cancelled") ?? [];
  const outstandingTotal = outstanding.reduce((sum, i) => sum + parseFloat(i.amount), 0);

  return (
    <div className="p-6 space-y-8">
      <div>
        <h1 className="text-xl font-semibold text-foreground">My Fees</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Invoices and payment status.</p>
        <div className="mt-3">
          <ChildSelector selectedId={studentId} onSelect={setStudentId} />
        </div>
      </div>

      {invoices && invoices.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-xl">
          <div className="rounded-xl border border-border bg-card p-5">
            <div className="text-sm text-muted-foreground">Outstanding</div>
            <div className="text-2xl font-bold text-foreground tabular-nums mt-1">
              ₹{outstandingTotal.toLocaleString("en-IN")}
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">
              {outstanding.length} invoice{outstanding.length === 1 ? "" : "s"}
            </div>
          </div>
          <div className="rounded-xl border border-border bg-card p-5">
            <div className="text-sm text-muted-foreground">Total invoices</div>
            <div className="text-2xl font-bold text-foreground tabular-nums mt-1">
              {invoices.length}
            </div>
          </div>
        </div>
      )}

      <div>
        <h2 className="text-sm font-semibold text-foreground mb-3">Invoices</h2>
        {isLoading && (
          <div className="space-y-2">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        )}
        {!isLoading && invoices?.length === 0 && (
          <div className="rounded-lg border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
            No invoices yet.
          </div>
        )}
        <div className="space-y-2">
          {invoices?.map((invoice) => {
            const config = STATUS_CONFIG[invoice.status];
            const Icon = config.icon;
            const expanded = expandedId === invoice.id;
            return (
              <div key={invoice.id} className="rounded-lg border border-border bg-card overflow-hidden">
                <button
                  type="button"
                  onClick={() => setExpandedId(expanded ? null : invoice.id)}
                  className="flex w-full items-center justify-between gap-4 p-4 text-left hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`inline-flex items-center justify-center size-9 rounded-lg shrink-0 ${config.className}`}>
                      <Icon className="size-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="font-medium text-foreground font-mono text-sm">
                        {invoice.invoice_number}
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        Due {invoice.due_date}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right">
                      <div className="font-semibold text-foreground tabular-nums">
                        ₹{parseFloat(invoice.amount).toLocaleString("en-IN")}
                      </div>
                      <div className={`text-xs font-medium mt-0.5 ${config.className.split(" ")[1]}`}>
                        {config.label}
                      </div>
                    </div>
                    {expanded ? (
                      <ChevronUp className="size-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="size-4 text-muted-foreground" />
                    )}
                  </div>
                </button>
                {expanded && (
                  <div className="px-4 pb-3 border-t border-border">
                    <div className="text-xs font-medium text-muted-foreground pt-2 pb-1">
                      Payments
                    </div>
                    <PaymentsRow invoice={invoice} studentId={studentId} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
