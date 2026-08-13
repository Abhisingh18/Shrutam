"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { UserCheck } from "lucide-react";
import { RequirePermission } from "@/components/auth/require-permission";
import { DetailPageTemplate } from "@/components/templates/detail-page-template";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useAdmission, useConvertToStudent, useUpdateAdmission } from "@/hooks/use-admissions";
import { ApiError } from "@/lib/api-client";
import type { AdmissionStatus } from "@/types/admission";

const statusVariant: Record<AdmissionStatus, "success" | "warning" | "error" | "default"> = {
  submitted: "default",
  under_review: "warning",
  accepted: "success",
  rejected: "error",
  converted: "default",
};

function ConvertDialog({ admissionId }: { admissionId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [admissionNumber, setAdmissionNumber] = useState("");
  const convert = useConvertToStudent(admissionId);

  const handleConvert = async () => {
    try {
      const result = await convert.mutateAsync(admissionNumber);
      toast.success("Converted to student");
      setOpen(false);
      router.push(`/app/students/${result.student_id}`);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to convert");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <UserCheck className="size-4" /> Convert to student
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Convert application to student</DialogTitle>
        </DialogHeader>
        <div className="py-4">
          <Label htmlFor="admission_number">Admission number</Label>
          <Input
            id="admission_number"
            className="mt-1.5"
            value={admissionNumber}
            onChange={(e) => setAdmissionNumber(e.target.value)}
            placeholder="e.g. GHS-2027-014"
          />
          <p className="text-xs text-muted-foreground mt-2">
            Fee record, library account, hostel/transport allocation and login creation are not
            yet wired to this action — see the TODO in <code className="bg-muted px-1 py-0.5 rounded">app/api/v1/admissions.py</code>.
          </p>
        </div>
        <DialogFooter>
          <Button onClick={handleConvert} disabled={!admissionNumber || convert.isPending}>
            {convert.isPending ? "Converting…" : "Convert"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function OverviewTab({ admissionId }: { admissionId: string }) {
  const { data: admission, isLoading } = useAdmission(admissionId);
  const updateAdmission = useUpdateAdmission(admissionId);

  if (isLoading) return <Skeleton className="h-40 w-full max-w-md" />;
  if (!admission) return null;

  const rows: [string, string][] = [
    ["Applicant name", admission.applicant_name],
    ["Email", admission.applicant_email ?? "—"],
    ["Phone", admission.applicant_phone ?? "—"],
    ["Status", admission.status.replace("_", " ")],
  ];

  const handleStatusChange = async (status: "under_review" | "accepted" | "rejected") => {
    try {
      await updateAdmission.mutateAsync({ status });
      toast.success(`Marked as ${status.replace("_", " ")}`);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to update status");
    }
  };

  return (
    <div className="space-y-4 max-w-md">
      <dl className="divide-y divide-border rounded-lg border border-border">
        {rows.map(([label, value]) => (
          <div key={label} className="flex justify-between px-4 py-3 text-sm">
            <dt className="text-muted-foreground">{label}</dt>
            <dd className="font-medium text-foreground capitalize">{value}</dd>
          </div>
        ))}
      </dl>

      {admission.status !== "converted" && (
        <div className="flex flex-wrap gap-2">
          {admission.status === "submitted" && (
            <Button size="sm" variant="outline" onClick={() => handleStatusChange("under_review")}>
              Mark under review
            </Button>
          )}
          {(admission.status === "submitted" || admission.status === "under_review") && (
            <>
              <Button size="sm" variant="outline" onClick={() => handleStatusChange("accepted")}>
                Accept
              </Button>
              <Button size="sm" variant="outline" onClick={() => handleStatusChange("rejected")}>
                Reject
              </Button>
            </>
          )}
          {admission.status === "accepted" && <ConvertDialog admissionId={admissionId} />}
        </div>
      )}
    </div>
  );
}

function AdmissionDetailPage({ id }: { id: string }) {
  const router = useRouter();
  const { data: admission } = useAdmission(id);

  return (
    <DetailPageTemplate
      title={admission?.applicant_name ?? "…"}
      subtitle="Admission application"
      statusBadge={
        admission
          ? { label: admission.status.replace("_", " "), variant: statusVariant[admission.status] }
          : undefined
      }
      tabs={[{ value: "overview", label: "Overview", content: <OverviewTab admissionId={id} /> }]}
      rightRail={
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-foreground">Quick actions</h3>
          <Button variant="outline" size="sm" className="w-full" onClick={() => router.push("/app/admissions")}>
            Back to all applications
          </Button>
        </div>
      }
    />
  );
}

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <RequirePermission permission="admissions:application:read">
      <AdmissionDetailPage id={id} />
    </RequirePermission>
  );
}
