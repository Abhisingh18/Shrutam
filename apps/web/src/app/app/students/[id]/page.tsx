"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CreditCard, FileOutput, Pencil } from "lucide-react";
import { toast } from "sonner";
import { RequirePermission } from "@/components/auth/require-permission";
import { DetailPageTemplate } from "@/components/templates/detail-page-template";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { CircularProgress } from "@/components/widgets/circular-progress";
import { useAttendanceSummary } from "@/hooks/use-attendance";
import { useStudent } from "@/hooks/use-students";
import { ApiError } from "@/lib/api-client";
import { downloadPdf } from "@/lib/pdf-download";
import { DocumentList } from "@/components/documents/document-list";
import { DocumentUploader } from "@/components/documents/document-uploader";

function OverviewTab({ studentId }: { studentId: string }) {
  const { data: student, isLoading } = useStudent(studentId);

  if (isLoading) return <Skeleton className="h-40 w-full max-w-md" />;
  if (!student) return null;

  const rows: [string, string][] = [
    ["Admission number", student.admission_number],
    ["Full name", student.full_name],
    ["Gender", student.gender ?? "—"],
    ["Date of birth", student.date_of_birth ?? "—"],
    ["Email", student.email ?? "—"],
    ["Phone", student.phone ?? "—"],
    ["Status", student.status],
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

function ComingSoonTab({ label }: { label: string }) {
  return (
    <p className="text-sm text-muted-foreground py-8 text-center">
      {label} is coming in a later phase — see{" "}
      <code className="text-xs bg-muted px-1 py-0.5 rounded">docs/02-information-architecture.md</code>.
    </p>
  );
}

function AttendanceTab({ studentId }: { studentId: string }) {
  const { data: summary, isLoading } = useAttendanceSummary(studentId);

  if (isLoading) return <Skeleton className="h-40 w-full max-w-md" />;
  if (!summary || summary.total_days === 0) {
    return (
      <p className="text-sm text-muted-foreground py-8 text-center">
        No attendance recorded for this student yet.
      </p>
    );
  }

  const tone =
    summary.attendance_percentage === null
      ? "primary"
      : summary.attendance_percentage >= 75
        ? "success"
        : "destructive";

  return (
    <div className="flex flex-col sm:flex-row items-center gap-8 max-w-lg">
      <CircularProgress
        value={summary.attendance_percentage ?? 0}
        max={100}
        size="lg"
        tone={tone}
        valueLabel={
          summary.attendance_percentage !== null ? `${summary.attendance_percentage}%` : "—"
        }
        label="Overall attendance"
      />
      <dl className="flex-1 w-full divide-y divide-border rounded-lg border border-border text-sm">
        {(
          [
            ["Total days", summary.total_days],
            ["Present", summary.present_days],
            ["Late", summary.late_days],
            ["Absent", summary.absent_days],
            ["Excused", summary.excused_days],
          ] as const
        ).map(([label, value]) => (
          <div key={label} className="flex justify-between px-4 py-2.5">
            <dt className="text-muted-foreground">{label}</dt>
            <dd className="font-medium text-foreground tabular-nums">{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function DocumentsTab({ studentId }: { studentId: string }) {
  return (
    <div className="space-y-4 max-w-2xl">
      <DocumentUploader ownerType="student" ownerId={studentId} />
      <DocumentList ownerType="student" ownerId={studentId} />
    </div>
  );
}

function TransferCertificateDialog({
  studentId,
  admissionNumber,
  open,
  onOpenChange,
}: {
  studentId: string;
  admissionNumber: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [reason, setReason] = useState("");
  const [conduct, setConduct] = useState("Good");
  const [pending, setPending] = useState(false);

  const handleIssue = async () => {
    if (!reason.trim()) {
      toast.error("Enter a reason for leaving");
      return;
    }
    setPending(true);
    try {
      await downloadPdf(
        `/students/${studentId}/transfer-certificate.pdf`,
        `transfer-certificate-${admissionNumber}.pdf`,
        { method: "POST", body: { reason, conduct } },
      );
      toast.success("Transfer certificate generated");
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to generate certificate");
    } finally {
      setPending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Issue transfer certificate</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <Label htmlFor="tc-reason">Reason for leaving</Label>
            <Input
              id="tc-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Family relocation"
              className="mt-1.5"
            />
          </div>
          <div>
            <Label htmlFor="tc-conduct">Conduct</Label>
            <Input
              id="tc-conduct"
              value={conduct}
              onChange={(e) => setConduct(e.target.value)}
              className="mt-1.5"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleIssue} disabled={pending}>
            {pending ? "Generating…" : "Generate PDF"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function StudentDetailPage({ id }: { id: string }) {
  const router = useRouter();
  const { data: student } = useStudent(id);
  const [tcOpen, setTcOpen] = useState(false);
  const [downloadingIdCard, setDownloadingIdCard] = useState(false);

  const handleDownloadIdCard = async () => {
    if (!student) return;
    setDownloadingIdCard(true);
    try {
      await downloadPdf(`/students/${id}/id-card.pdf`, `id-card-${student.admission_number}.pdf`);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to download ID card");
    } finally {
      setDownloadingIdCard(false);
    }
  };

  return (
    <>
    <DetailPageTemplate
      title={student?.full_name ?? "…"}
      subtitle={student ? `Admission #${student.admission_number}` : undefined}
      statusBadge={
        student
          ? {
              label: student.status,
              variant: student.status === "active" ? "success" : "default",
            }
          : undefined
      }
      actions={
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleDownloadIdCard} disabled={downloadingIdCard}>
            <CreditCard className="size-4" /> ID card
          </Button>
          <Button variant="outline" onClick={() => setTcOpen(true)}>
            <FileOutput className="size-4" /> Transfer certificate
          </Button>
          <Button variant="outline" asChild>
            <Link href={`/app/students/${id}/edit`}>
              <Pencil className="size-4" /> Edit
            </Link>
          </Button>
        </div>
      }
      tabs={[
        { value: "overview", label: "Overview", content: <OverviewTab studentId={id} /> },
        { value: "guardians", label: "Guardians", content: <ComingSoonTab label="Guardians" /> },
        { value: "attendance", label: "Attendance", content: <AttendanceTab studentId={id} /> },
        { value: "fees", label: "Fees", content: <ComingSoonTab label="Fees" /> },
        { value: "documents", label: "Documents", content: <DocumentsTab studentId={id} /> },
      ]}
      rightRail={
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-foreground">Quick actions</h3>
          <Button variant="outline" size="sm" className="w-full" onClick={() => router.push("/app/students")}>
            Back to all students
          </Button>
        </div>
      }
    />
    {student && (
      <TransferCertificateDialog
        studentId={id}
        admissionNumber={student.admission_number}
        open={tcOpen}
        onOpenChange={setTcOpen}
      />
    )}
    </>
  );
}

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <RequirePermission permission="students:profile:read">
      <StudentDetailPage id={id} />
    </RequirePermission>
  );
}
