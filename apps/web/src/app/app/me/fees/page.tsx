"use client";

import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ChildSelector } from "@/components/me/child-selector";
import { useMyInvoices } from "@/hooks/use-me-portal";
import type { Invoice } from "@/types/finance";

const statusVariant: Record<Invoice["status"], string> = {
  paid: "bg-success-bg text-success border-transparent",
  pending: "bg-warning-bg text-warning border-transparent",
  partially_paid: "bg-info-bg text-info border-transparent",
  overdue: "bg-destructive-bg text-destructive border-transparent",
  cancelled: "bg-muted text-muted-foreground border-transparent",
};

export default function MyFeesPage() {
  const [studentId, setStudentId] = useState<string | undefined>();
  const { data: invoices, isLoading } = useMyInvoices(studentId);

  const outstanding = invoices?.filter((i) => i.status !== "paid" && i.status !== "cancelled") ?? [];

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">My Fees</h1>
        <p className="text-sm text-muted-foreground">Invoices and payment status.</p>
      </div>

      <ChildSelector selectedId={studentId} onSelect={setStudentId} />

      {invoices && invoices.length > 0 && (
        <div className="rounded-lg border border-border bg-card p-4 max-w-xs">
          <div className="text-sm text-muted-foreground">Outstanding invoices</div>
          <div className="text-2xl font-bold text-foreground tabular-nums mt-1">
            {outstanding.length}
          </div>
        </div>
      )}

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Invoice #</TableHead>
            <TableHead>Amount</TableHead>
            <TableHead>Due date</TableHead>
            <TableHead>Status</TableHead>
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
          {!isLoading && invoices?.length === 0 && (
            <TableRow>
              <TableCell colSpan={4} className="text-center py-12 text-muted-foreground">
                No invoices yet.
              </TableCell>
            </TableRow>
          )}
          {invoices?.map((invoice) => (
            <TableRow key={invoice.id}>
              <TableCell className="font-mono text-xs">{invoice.invoice_number}</TableCell>
              <TableCell className="font-medium text-foreground tabular-nums">
                ₹{invoice.amount}
              </TableCell>
              <TableCell className="text-muted-foreground">{invoice.due_date}</TableCell>
              <TableCell>
                <Badge variant="outline" className={statusVariant[invoice.status]}>
                  {invoice.status.replace("_", " ")}
                </Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
