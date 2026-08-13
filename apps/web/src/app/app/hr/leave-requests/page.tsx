"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useEmployee } from "@/hooks/use-employees";
import { useDecideLeaveRequest, useLeaveRequestList } from "@/hooks/use-leave-requests";
import { ApiError } from "@/lib/api-client";
import type { LeaveRequest } from "@/types/hr";

const leaveStatusVariant: Record<LeaveRequest["status"], string> = {
  pending: "bg-warning-bg text-warning border-transparent",
  approved: "bg-success-bg text-success border-transparent",
  rejected: "bg-destructive-bg text-destructive border-transparent",
};

function EmployeeNameCell({ employeeId }: { employeeId: string }) {
  const { data: employee, isLoading } = useEmployee(employeeId);
  if (isLoading) return <Skeleton className="h-4 w-24" />;
  return <span>{employee?.full_name ?? employeeId}</span>;
}

function LeaveRequestsListPage() {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const pageSize = 20;

  const { data, isLoading, isFetching } = useLeaveRequestList({
    page,
    pageSize,
    status: statusFilter === "all" ? undefined : statusFilter,
  });
  const decideLeaveRequest = useDecideLeaveRequest();

  const decide = async (id: string, decision: "approved" | "rejected") => {
    try {
      await decideLeaveRequest.mutateAsync({ id, input: { status: decision } });
      toast.success(`Leave request ${decision}`);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to update leave request");
    }
  };

  return (
    <ListPageTemplate
      title="Leave requests"
      description="Leave requests submitted by employees across your institution."
      toolbarExtra={
        <Select
          value={statusFilter}
          onValueChange={(v) => {
            setStatusFilter(v);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
      }
      page={page}
      pageSize={pageSize}
      total={data?.meta.total ?? 0}
      onPageChange={setPage}
    >
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Employee</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Start</TableHead>
            <TableHead>End</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="w-40" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading &&
            Array.from({ length: 5 }).map((_, i) => (
              <TableRow key={i}>
                {Array.from({ length: 6 }).map((__, j) => (
                  <TableCell key={j}>
                    <Skeleton className="h-4 w-full" />
                  </TableCell>
                ))}
              </TableRow>
            ))}

          {!isLoading && data?.data.length === 0 && (
            <TableRow>
              <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                No leave requests found.
              </TableCell>
            </TableRow>
          )}

          {!isLoading &&
            data?.data.map((lr) => (
              <TableRow
                key={lr.id}
                className={isFetching ? "opacity-60" : ""}
              >
                <TableCell
                  className="font-medium text-foreground cursor-pointer"
                  onClick={() => router.push(`/app/hr/${lr.employee_id}`)}
                >
                  <EmployeeNameCell employeeId={lr.employee_id} />
                </TableCell>
                <TableCell className="capitalize text-muted-foreground">{lr.leave_type}</TableCell>
                <TableCell className="text-muted-foreground">{lr.start_date}</TableCell>
                <TableCell className="text-muted-foreground">{lr.end_date}</TableCell>
                <TableCell>
                  <Badge variant="outline" className={leaveStatusVariant[lr.status]}>
                    {lr.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  {lr.status === "pending" && (
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => decide(lr.id, "approved")}>
                        Approve
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => decide(lr.id, "rejected")}>
                        Reject
                      </Button>
                    </div>
                  )}
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
    <RequirePermission permission="hr:employee:read">
      <LeaveRequestsListPage />
    </RequirePermission>
  );
}
