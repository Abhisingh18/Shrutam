"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MoreHorizontal } from "lucide-react";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { useStudents } from "@/hooks/use-students";
import type { Student } from "@/types/student";

const statusVariant: Record<Student["status"], string> = {
  active: "bg-success-bg text-success border-transparent",
  inactive: "bg-muted text-muted-foreground border-transparent",
  graduated: "bg-info-bg text-info border-transparent",
  transferred: "bg-warning-bg text-warning border-transparent",
  expelled: "bg-destructive-bg text-destructive border-transparent",
};

function StudentsListPage() {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const pageSize = 20;

  const { data, isLoading, isFetching } = useStudents({ page, pageSize, search });

  return (
    <ListPageTemplate
      title="Students"
      description="Every enrolled student across your institution."
      primaryAction={{ label: "Add student", onClick: () => router.push("/app/students/new") }}
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
            <TableHead>Admission #</TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="w-10" />
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
                {search ? "No students match your search." : "No students yet — add your first one."}
              </TableCell>
            </TableRow>
          )}

          {!isLoading &&
            data?.data.map((student) => (
              <TableRow
                key={student.id}
                className={`cursor-pointer ${isFetching ? "opacity-60" : ""}`}
                onClick={() => router.push(`/app/students/${student.id}`)}
              >
                <TableCell className="font-mono text-xs">{student.admission_number}</TableCell>
                <TableCell className="font-medium text-foreground">{student.full_name}</TableCell>
                <TableCell className="text-muted-foreground">{student.email ?? "—"}</TableCell>
                <TableCell>
                  <Badge variant="outline" className={statusVariant[student.status]}>
                    {student.status}
                  </Badge>
                </TableCell>
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="size-8">
                        <MoreHorizontal className="size-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => router.push(`/app/students/${student.id}`)}>
                        View profile
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => router.push(`/app/students/${student.id}/edit`)}
                      >
                        Edit
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
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
    <RequirePermission permission="students:profile:read">
      <StudentsListPage />
    </RequirePermission>
  );
}
