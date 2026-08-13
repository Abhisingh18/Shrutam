"use client";

import { use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Pencil } from "lucide-react";
import { RequirePermission } from "@/components/auth/require-permission";
import { DetailPageTemplate } from "@/components/templates/detail-page-template";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useDepartment } from "@/hooks/use-departments";
import { useSubjects } from "@/hooks/use-subjects";

function OverviewTab({ departmentId }: { departmentId: string }) {
  const { data: department, isLoading } = useDepartment(departmentId);

  if (isLoading) return <Skeleton className="h-40 w-full max-w-md" />;
  if (!department) return null;

  const rows: [string, string][] = [
    ["Name", department.name],
    ["Code", department.code],
  ];

  return (
    <dl className="max-w-md divide-y divide-border rounded-lg border border-border">
      {rows.map(([label, value]) => (
        <div key={label} className="flex justify-between px-4 py-3 text-sm">
          <dt className="text-muted-foreground">{label}</dt>
          <dd className="font-medium text-foreground">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

function SubjectsTab({ departmentId }: { departmentId: string }) {
  const router = useRouter();
  const { data, isLoading } = useSubjects({ page: 1, pageSize: 50, departmentId });

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button
          size="sm"
          onClick={() => router.push(`/app/academics/subjects/new?department_id=${departmentId}`)}
        >
          Add subject
        </Button>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Code</TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Credits</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading &&
            Array.from({ length: 3 }).map((_, i) => (
              <TableRow key={i}>
                {Array.from({ length: 3 }).map((__, j) => (
                  <TableCell key={j}>
                    <Skeleton className="h-4 w-full" />
                  </TableCell>
                ))}
              </TableRow>
            ))}

          {!isLoading && data?.data.length === 0 && (
            <TableRow>
              <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                No subjects in this department yet.
              </TableCell>
            </TableRow>
          )}

          {!isLoading &&
            data?.data.map((subject) => (
              <TableRow key={subject.id}>
                <TableCell className="font-mono text-xs">{subject.code}</TableCell>
                <TableCell className="font-medium text-foreground">{subject.name}</TableCell>
                <TableCell className="text-muted-foreground">{subject.credits}</TableCell>
              </TableRow>
            ))}
        </TableBody>
      </Table>
    </div>
  );
}

function DepartmentDetailPage({ id }: { id: string }) {
  const router = useRouter();
  const { data: department } = useDepartment(id);

  return (
    <DetailPageTemplate
      title={department?.name ?? "…"}
      subtitle={department ? `Code ${department.code}` : undefined}
      actions={
        <Button variant="outline" asChild>
          <Link href={`/app/academics/${id}/edit`}>
            <Pencil className="size-4" /> Edit
          </Link>
        </Button>
      }
      tabs={[
        { value: "overview", label: "Overview", content: <OverviewTab departmentId={id} /> },
        { value: "subjects", label: "Subjects in this department", content: <SubjectsTab departmentId={id} /> },
      ]}
      rightRail={
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-foreground">Quick actions</h3>
          <Button variant="outline" size="sm" className="w-full" onClick={() => router.push("/app/academics")}>
            Back to all departments
          </Button>
        </div>
      }
    />
  );
}

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <RequirePermission permission="courses:catalog:read">
      <DepartmentDetailPage id={id} />
    </RequirePermission>
  );
}
