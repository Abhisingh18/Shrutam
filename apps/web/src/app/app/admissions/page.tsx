"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
import { useAdmissions } from "@/hooks/use-admissions";
import type { AdmissionStatus } from "@/types/admission";

const statusVariant: Record<AdmissionStatus, string> = {
  submitted: "bg-info-bg text-info border-transparent",
  under_review: "bg-warning-bg text-warning border-transparent",
  accepted: "bg-success-bg text-success border-transparent",
  rejected: "bg-destructive-bg text-destructive border-transparent",
  converted: "bg-muted text-muted-foreground border-transparent",
};

function AdmissionsListPage() {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const pageSize = 20;

  const { data, isLoading, isFetching } = useAdmissions({ page, pageSize, search });

  return (
    <ListPageTemplate
      title="Admissions"
      description="Applications from first submission through conversion to a student."
      primaryAction={{ label: "Add application", onClick: () => router.push("/app/admissions/new") }}
      search={{
        value: search,
        onChange: (v) => {
          setSearch(v);
          setPage(1);
        },
        placeholder: "Search by applicant name…",
      }}
      page={page}
      pageSize={pageSize}
      total={data?.meta.total ?? 0}
      onPageChange={setPage}
    >
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Applicant</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Phone</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading &&
            Array.from({ length: 5 }).map((_, i) => (
              <TableRow key={i}>
                {Array.from({ length: 4 }).map((__, j) => (
                  <TableCell key={j}>
                    <Skeleton className="h-4 w-full" />
                  </TableCell>
                ))}
              </TableRow>
            ))}

          {!isLoading && data?.data.length === 0 && (
            <TableRow>
              <TableCell colSpan={4} className="text-center py-12 text-muted-foreground">
                {search ? "No applications match your search." : "No applications yet — add the first one."}
              </TableCell>
            </TableRow>
          )}

          {!isLoading &&
            data?.data.map((admission) => (
              <TableRow
                key={admission.id}
                className={`cursor-pointer ${isFetching ? "opacity-60" : ""}`}
                onClick={() => router.push(`/app/admissions/${admission.id}`)}
              >
                <TableCell className="font-medium text-foreground">{admission.applicant_name}</TableCell>
                <TableCell className="text-muted-foreground">{admission.applicant_email ?? "—"}</TableCell>
                <TableCell className="text-muted-foreground">{admission.applicant_phone ?? "—"}</TableCell>
                <TableCell>
                  <Badge variant="outline" className={statusVariant[admission.status]}>
                    {admission.status.replace("_", " ")}
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
    <RequirePermission permission="admissions:application:read">
      <AdmissionsListPage />
    </RequirePermission>
  );
}
