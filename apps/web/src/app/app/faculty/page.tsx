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
import { useFacultyList } from "@/hooks/use-faculty";
import type { Faculty } from "@/types/faculty";

const statusVariant: Record<Faculty["status"], string> = {
  active: "bg-success-bg text-success border-transparent",
  on_leave: "bg-warning-bg text-warning border-transparent",
  resigned: "bg-muted text-muted-foreground border-transparent",
  retired: "bg-muted text-muted-foreground border-transparent",
};

function FacultyListPage() {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const pageSize = 20;

  const { data, isLoading, isFetching } = useFacultyList({ page, pageSize, search });

  return (
    <ListPageTemplate
      title="Faculty"
      description="Every faculty member across your institution."
      primaryAction={{ label: "Add faculty", onClick: () => router.push("/app/faculty/new") }}
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
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Department</TableHead>
            <TableHead>Designation</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="w-10" />
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
                {search ? "No faculty match your search." : "No faculty yet — add your first one."}
              </TableCell>
            </TableRow>
          )}

          {!isLoading &&
            data?.data.map((member) => (
              <TableRow
                key={member.id}
                className={`cursor-pointer ${isFetching ? "opacity-60" : ""}`}
                onClick={() => router.push(`/app/faculty/${member.id}`)}
              >
                <TableCell className="font-medium text-foreground">{member.full_name}</TableCell>
                <TableCell className="text-muted-foreground">{member.email}</TableCell>
                {/* TODO: resolve department_id -> department name once cross-module
                    lookup to the Academics module's departments table is wired up. */}
                <TableCell className="text-muted-foreground">
                  {member.department_id ?? "—"}
                </TableCell>
                <TableCell className="text-muted-foreground">{member.designation}</TableCell>
                <TableCell>
                  <Badge variant="outline" className={statusVariant[member.status]}>
                    {member.status}
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
                      <DropdownMenuItem onClick={() => router.push(`/app/faculty/${member.id}`)}>
                        View profile
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => router.push(`/app/faculty/${member.id}/edit`)}
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
    <RequirePermission permission="faculty:profile:read">
      <FacultyListPage />
    </RequirePermission>
  );
}
