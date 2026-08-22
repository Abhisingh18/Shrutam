"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RequirePermission } from "@/components/auth/require-permission";
import { AcademicsSubNav } from "@/components/academics/academics-subnav";
import { ListPageTemplate } from "@/components/templates/list-page-template";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { useDepartments } from "@/hooks/use-departments";

function DepartmentsListPage() {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const pageSize = 20;

  const { data, isLoading, isFetching } = useDepartments({ page, pageSize, search });

  return (
    <div className="flex flex-col h-full">
      <AcademicsSubNav />
      <div className="flex-1 min-h-0">
      <ListPageTemplate
        title="Departments"
        description="Departments across your institution — the root of programs, subjects, and sections."
        primaryAction={{ label: "Add department", onClick: () => router.push("/app/academics/departments/new") }}
        search={{
          value: search,
          onChange: (v) => {
            setSearch(v);
            setPage(1);
          },
          placeholder: "Search by name…",
        }}
        page={page}
        pageSize={pageSize}
        total={data?.meta.total ?? 0}
        onPageChange={setPage}
      >
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Code</TableHead>
              <TableHead>Name</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading &&
              Array.from({ length: 5 }).map((_, i) => (
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
                <TableCell colSpan={3} className="text-center py-12 text-muted-foreground">
                  {search ? "No departments match your search." : "No departments yet — add your first one."}
                </TableCell>
              </TableRow>
            )}

            {!isLoading &&
              data?.data.map((department) => (
                <TableRow
                  key={department.id}
                  className={`cursor-pointer ${isFetching ? "opacity-60" : ""}`}
                  onClick={() => router.push(`/app/academics/departments/${department.id}`)}
                >
                  <TableCell className="font-mono text-xs">{department.code}</TableCell>
                  <TableCell className="font-medium text-foreground">{department.name}</TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => router.push(`/app/academics/departments/${department.id}/edit`)}
                    >
                      Edit
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </ListPageTemplate>
      </div>
    </div>
  );
}

export default function Page() {
  return (
    <RequirePermission permission="courses:catalog:read">
      <DepartmentsListPage />
    </RequirePermission>
  );
}
