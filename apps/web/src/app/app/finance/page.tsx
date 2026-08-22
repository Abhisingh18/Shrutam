"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertTriangle, ChevronDown, ChevronUp } from "lucide-react";
import { RequirePermission } from "@/components/auth/require-permission";
import { ListPageTemplate } from "@/components/templates/list-page-template";
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
import { Button } from "@/components/ui/button";
import { useInvoiceDefaulters, useInvoices } from "@/hooks/use-invoices";
import type { InvoiceStatus } from "@/types/finance";

function DefaultersPanel() {
  const [open, setOpen] = useState(false);
  const { data, isLoading } = useInvoiceDefaulters();
  const count = data?.data.length ?? 0;

  return (
    <div className="rounded-lg border border-border mb-4 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-sm hover:bg-muted/40 transition-colors"
      >
        <span className="flex items-center gap-2 font-medium text-foreground">
          <AlertTriangle className="size-4 text-destructive" />
          Fee defaulters
          {!isLoading && (
            <Badge variant="outline" className="bg-destructive-bg text-destructive border-transparent">
              {count}
            </Badge>
          )}
          {!isLoading && data && count > 0 && (
            <span className="text-muted-foreground font-normal">
              · ₹{parseFloat(data.total_outstanding).toLocaleString("en-IN")} outstanding
            </span>
          )}
        </span>
        {open ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
      </button>
      {open && (
        <div className="px-4 pb-4 border-t border-border pt-3">
          {isLoading && <Skeleton className="h-20 w-full" />}
          {!isLoading && count === 0 && (
            <p className="text-sm text-muted-foreground py-2">No overdue invoices — nice.</p>
          )}
          {!isLoading && count > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice #</TableHead>
                  <TableHead>Student</TableHead>
                  <TableHead>Outstanding</TableHead>
                  <TableHead>Days overdue</TableHead>
                  <TableHead>Late fee</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data?.data.map((d) => (
                  <TableRow key={d.invoice_id}>
                    <TableCell className="font-mono text-xs">{d.invoice_number}</TableCell>
                    <TableCell className="font-medium text-foreground">{d.student_name}</TableCell>
                    <TableCell className="tabular-nums font-semibold text-destructive">
                      ₹{parseFloat(d.outstanding).toLocaleString("en-IN")}
                    </TableCell>
                    <TableCell className="tabular-nums text-muted-foreground">
                      {d.days_overdue}
                    </TableCell>
                    <TableCell className="tabular-nums text-muted-foreground">
                      {parseFloat(d.late_fee) > 0
                        ? `₹${parseFloat(d.late_fee).toLocaleString("en-IN")}`
                        : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      )}
    </div>
  );
}

const statusVariant: Record<InvoiceStatus, string> = {
  paid: "bg-success-bg text-success border-transparent",
  pending: "bg-warning-bg text-warning border-transparent",
  partially_paid: "bg-info-bg text-info border-transparent",
  overdue: "bg-destructive-bg text-destructive border-transparent",
  cancelled: "bg-muted text-muted-foreground border-transparent",
};

function InvoicesListPage() {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const pageSize = 20;

  const { data, isLoading, isFetching } = useInvoices({ page, pageSize, search });

  return (
    <ListPageTemplate
      title="Fees & Finance"
      description="Invoices and payments across your institution."
      primaryAction={{ label: "Add invoice", onClick: () => router.push("/app/finance/new") }}
      search={{
        value: search,
        onChange: (v) => {
          setSearch(v);
          setPage(1);
        },
        placeholder: "Search by invoice number…",
      }}
      toolbarExtra={
        <Button variant="outline" size="sm" asChild>
          <Link href="/app/finance/fee-structures">Fee structures</Link>
        </Button>
      }
      page={page}
      pageSize={pageSize}
      total={data?.meta.total ?? 0}
      onPageChange={setPage}
    >
      <DefaultersPanel />
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Invoice #</TableHead>
            <TableHead>Student</TableHead>
            <TableHead>Amount</TableHead>
            <TableHead>Due date</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading &&
            Array.from({ length: 5 }).map((_, i) => (
              <TableRow key={i}>
                {Array.from({ length: 5 }).map((__, j) => (
                  <TableCell key={j}>
                    <Skeleton className="h-4 w-full" />
                  </TableCell>
                ))}
              </TableRow>
            ))}

          {!isLoading && data?.data.length === 0 && (
            <TableRow>
              <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                {search ? "No invoices match your search." : "No invoices yet — add your first one."}
              </TableCell>
            </TableRow>
          )}

          {!isLoading &&
            data?.data.map((invoice) => (
              <TableRow
                key={invoice.id}
                className={`cursor-pointer ${isFetching ? "opacity-60" : ""}`}
                onClick={() => router.push(`/app/finance/${invoice.id}`)}
              >
                <TableCell className="font-mono text-xs">{invoice.invoice_number}</TableCell>
                {/* Student name resolution needs a cross-module join — see students TODO */}
                <TableCell className="text-muted-foreground font-mono text-xs">
                  {invoice.student_id}
                </TableCell>
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
    </ListPageTemplate>
  );
}

export default function Page() {
  return (
    <RequirePermission permission="fees:invoice:read">
      <InvoicesListPage />
    </RequirePermission>
  );
}
