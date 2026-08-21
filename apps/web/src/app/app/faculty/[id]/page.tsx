"use client";

import { use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Pencil } from "lucide-react";
import { RequirePermission } from "@/components/auth/require-permission";
import { DetailPageTemplate } from "@/components/templates/detail-page-template";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useFacultyMember } from "@/hooks/use-faculty";
import { DocumentList } from "@/components/documents/document-list";
import { DocumentUploader } from "@/components/documents/document-uploader";

function OverviewTab({ facultyId }: { facultyId: string }) {
  const { data: faculty, isLoading } = useFacultyMember(facultyId);

  if (isLoading) return <Skeleton className="h-40 w-full max-w-md" />;
  if (!faculty) return null;

  const rows: [string, string][] = [
    ["Full name", faculty.full_name],
    ["Email", faculty.email],
    ["Phone", faculty.phone ?? "—"],
    // TODO: resolve department_id -> department name once cross-module lookup to
    // the Academics module's departments table is wired up.
    ["Department", faculty.department_id ?? "—"],
    ["Designation", faculty.designation],
    ["Employment type", faculty.employment_type],
    ["Joining date", faculty.joining_date],
    ["Status", faculty.status],
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

function DocumentsTab({ facultyId }: { facultyId: string }) {
  return (
    <div className="space-y-4 max-w-2xl">
      <DocumentUploader ownerType="faculty" ownerId={facultyId} />
      <DocumentList ownerType="faculty" ownerId={facultyId} />
    </div>
  );
}

function FacultyDetailPage({ id }: { id: string }) {
  const router = useRouter();
  const { data: faculty } = useFacultyMember(id);

  return (
    <DetailPageTemplate
      title={faculty?.full_name ?? "…"}
      subtitle={faculty?.designation}
      statusBadge={
        faculty
          ? {
              label: faculty.status,
              variant: faculty.status === "active" ? "success" : "default",
            }
          : undefined
      }
      actions={
        <Button variant="outline" asChild>
          <Link href={`/app/faculty/${id}/edit`}>
            <Pencil className="size-4" /> Edit
          </Link>
        </Button>
      }
      tabs={[
        { value: "overview", label: "Overview", content: <OverviewTab facultyId={id} /> },
        { value: "documents", label: "Documents", content: <DocumentsTab facultyId={id} /> },
        { value: "attendance", label: "Attendance", content: <ComingSoonTab label="Attendance" /> },
        { value: "leaves", label: "Leaves", content: <ComingSoonTab label="Leaves" /> },
        { value: "payroll", label: "Payroll", content: <ComingSoonTab label="Payroll" /> },
      ]}
      rightRail={
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-foreground">Quick actions</h3>
          <Button variant="outline" size="sm" className="w-full" onClick={() => router.push("/app/faculty")}>
            Back to all faculty
          </Button>
        </div>
      }
    />
  );
}

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <RequirePermission permission="faculty:profile:read">
      <FacultyDetailPage id={id} />
    </RequirePermission>
  );
}
