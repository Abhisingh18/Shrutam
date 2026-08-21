"use client";

import { useState } from "react";
import { CheckCircle2, Clock, AlertTriangle, XCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { ChildSelector } from "@/components/me/child-selector";
import { useMyInvoices } from "@/hooks/use-me-portal";
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

export default function MyFeesPage() {
  const [studentId, setStudentId] = useState<string | undefined>();
  const { data: invoices, isLoading } = useMyInvoices(studentId);

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
            return (
              <div
                key={invoice.id}
                className="flex items-center justify-between gap-4 rounded-lg border border-border bg-card p-4"
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
                <div className="text-right shrink-0">
                  <div className="font-semibold text-foreground tabular-nums">
                    ₹{parseFloat(invoice.amount).toLocaleString("en-IN")}
                  </div>
                  <div className={`text-xs font-medium mt-0.5 ${config.className.split(" ")[1]}`}>
                    {config.label}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
