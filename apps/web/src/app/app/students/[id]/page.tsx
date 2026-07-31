"use client";

import { use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Pencil } from "lucide-react";
import { RequirePermission } from "@/components/auth/require-permission";
import { DetailPageTemplate } from "@/components/templates/detail-page-template";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useStudent } from "@/hooks/use-students";

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

function StudentDetailPage({ id }: { id: string }) {
  const router = useRouter();
  const { data: student } = useStudent(id);

  return (
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
        <Button variant="outline" asChild>
          <Link href={`/app/students/${id}/edit`}>
            <Pencil className="size-4" /> Edit
          </Link>
        </Button>
      }
      tabs={[
        { value: "overview", label: "Overview", content: <OverviewTab studentId={id} /> },
        { value: "guardians", label: "Guardians", content: <ComingSoonTab label="Guardians" /> },
        { value: "attendance", label: "Attendance", content: <ComingSoonTab label="Attendance" /> },
        { value: "fees", label: "Fees", content: <ComingSoonTab label="Fees" /> },
        { value: "documents", label: "Documents", content: <ComingSoonTab label="Documents" /> },
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
