"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Pencil } from "lucide-react";
import { RequirePermission } from "@/components/auth/require-permission";
import { DetailPageTemplate } from "@/components/templates/detail-page-template";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import { FormField } from "@/components/templates/form-page-template";
import { useEmployee } from "@/hooks/use-employees";
import {
  useCreateLeaveRequest,
  useDecideLeaveRequest,
  useLeaveRequestList,
} from "@/hooks/use-leave-requests";
import { ApiError } from "@/lib/api-client";
import type { LeaveRequest } from "@/types/hr";

const employeeStatusVariant: Record<string, string> = {
  active: "success",
  on_leave: "warning",
  resigned: "default",
  terminated: "default",
};

const leaveStatusVariant: Record<LeaveRequest["status"], string> = {
  pending: "bg-warning-bg text-warning border-transparent",
  approved: "bg-success-bg text-success border-transparent",
  rejected: "bg-destructive-bg text-destructive border-transparent",
};

function OverviewTab({ employeeId }: { employeeId: string }) {
  const { data: employee, isLoading } = useEmployee(employeeId);

  if (isLoading) return <Skeleton className="h-40 w-full max-w-md" />;
  if (!employee) return null;

  const rows: [string, string][] = [
    ["Full name", employee.full_name],
    ["Email", employee.email],
    ["Phone", employee.phone ?? "—"],
    // TODO: resolve department_id -> department name once cross-module lookup to
    // the Academics module's departments table is wired up.
    ["Department", employee.department_id ?? "—"],
    ["Designation", employee.designation],
    ["Employment type", employee.employment_type],
    ["Joining date", employee.joining_date],
    ["Status", employee.status],
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

const leaveRequestSchema = z.object({
  leave_type: z.enum(["sick", "casual", "earned"]),
  start_date: z.string().min(1, "Required"),
  end_date: z.string().min(1, "Required"),
  reason: z.string().optional(),
});

type LeaveRequestFormValues = z.infer<typeof leaveRequestSchema>;

function RequestLeaveForm({ employeeId, onDone }: { employeeId: string; onDone: () => void }) {
  const createLeaveRequest = useCreateLeaveRequest();
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<LeaveRequestFormValues>({
    resolver: zodResolver(leaveRequestSchema),
    defaultValues: { leave_type: "casual" },
  });

  const onSubmit = handleSubmit(async (values) => {
    try {
      await createLeaveRequest.mutateAsync({
        employee_id: employeeId,
        leave_type: values.leave_type,
        start_date: values.start_date,
        end_date: values.end_date,
        reason: values.reason || null,
      });
      toast.success("Leave request submitted");
      onDone();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to submit leave request");
    }
  });

  return (
    <form
      onSubmit={onSubmit}
      className="grid grid-cols-1 sm:grid-cols-2 gap-4 rounded-lg border border-border p-4 mb-4"
    >
      <FormField label="Leave type" htmlFor="leave_type">
        <Select
          value={watch("leave_type")}
          onValueChange={(v) => setValue("leave_type", v as LeaveRequestFormValues["leave_type"])}
        >
          <SelectTrigger id="leave_type" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="sick">Sick</SelectItem>
            <SelectItem value="casual">Casual</SelectItem>
            <SelectItem value="earned">Earned</SelectItem>
          </SelectContent>
        </Select>
      </FormField>
      <div />
      <FormField label="Start date" htmlFor="start_date" error={errors.start_date?.message}>
        <Input id="start_date" type="date" {...register("start_date")} />
      </FormField>
      <FormField label="End date" htmlFor="end_date" error={errors.end_date?.message}>
        <Input id="end_date" type="date" {...register("end_date")} />
      </FormField>
      <FormField label="Reason" htmlFor="reason" className="sm:col-span-2">
        <Textarea id="reason" {...register("reason")} />
      </FormField>
      <div className="sm:col-span-2 flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onDone}>
          Cancel
        </Button>
        <Button type="submit" disabled={createLeaveRequest.isPending}>
          {createLeaveRequest.isPending ? "Submitting…" : "Submit request"}
        </Button>
      </div>
    </form>
  );
}

function LeaveRequestsTab({ employeeId }: { employeeId: string }) {
  const [showForm, setShowForm] = useState(false);
  const { data, isLoading } = useLeaveRequestList({ page: 1, pageSize: 50, employeeId });
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
    <div>
      <div className="flex justify-end mb-4">
        {!showForm && (
          <Button size="sm" onClick={() => setShowForm(true)}>
            Request leave
          </Button>
        )}
      </div>

      {showForm && (
        <RequestLeaveForm employeeId={employeeId} onDone={() => setShowForm(false)} />
      )}

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Type</TableHead>
            <TableHead>Start</TableHead>
            <TableHead>End</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="w-32" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading &&
            Array.from({ length: 3 }).map((_, i) => (
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
              <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                No leave requests yet.
              </TableCell>
            </TableRow>
          )}

          {!isLoading &&
            data?.data.map((lr) => (
              <TableRow key={lr.id}>
                <TableCell className="capitalize">{lr.leave_type}</TableCell>
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
    </div>
  );
}

function EmployeeDetailPage({ id }: { id: string }) {
  const router = useRouter();
  const { data: employee } = useEmployee(id);

  return (
    <DetailPageTemplate
      title={employee?.full_name ?? "…"}
      subtitle={employee?.designation}
      statusBadge={
        employee
          ? {
              label: employee.status,
              variant:
                (employeeStatusVariant[employee.status] as
                  | "default"
                  | "success"
                  | "warning"
                  | "error") ?? "default",
            }
          : undefined
      }
      actions={
        <Button variant="outline" asChild>
          <Link href={`/app/hr/${id}/edit`}>
            <Pencil className="size-4" /> Edit
          </Link>
        </Button>
      }
      tabs={[
        { value: "overview", label: "Overview", content: <OverviewTab employeeId={id} /> },
        {
          value: "leaves",
          label: "Leave requests",
          content: <LeaveRequestsTab employeeId={id} />,
        },
      ]}
      rightRail={
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-foreground">Quick actions</h3>
          <Button variant="outline" size="sm" className="w-full" onClick={() => router.push("/app/hr")}>
            Back to all employees
          </Button>
        </div>
      }
    />
  );
}

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <RequirePermission permission="hr:employee:read">
      <EmployeeDetailPage id={id} />
    </RequirePermission>
  );
}
