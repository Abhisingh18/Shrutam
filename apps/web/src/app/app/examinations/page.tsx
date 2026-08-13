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
import { useExams } from "@/hooks/use-exams";
import type { Exam } from "@/types/examination";

const statusVariant: Record<Exam["status"], string> = {
  draft: "bg-muted text-muted-foreground border-transparent",
  scheduled: "bg-info-bg text-info border-transparent",
  ongoing: "bg-warning-bg text-warning border-transparent",
  completed: "bg-info-bg text-info border-transparent",
  results_published: "bg-success-bg text-success border-transparent",
};

function ExaminationsListPage() {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const pageSize = 20;

  const { data, isLoading, isFetching } = useExams({ page, pageSize, search });

  return (
    <ListPageTemplate
      title="Examinations"
      description="Exams scheduled across your institution."
      primaryAction={{ label: "Add exam", onClick: () => router.push("/app/examinations/new") }}
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
            <TableHead>Type</TableHead>
            <TableHead>Dates</TableHead>
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
                {search ? "No exams match your search." : "No exams yet — add your first one."}
              </TableCell>
            </TableRow>
          )}

          {!isLoading &&
            data?.data.map((exam) => (
              <TableRow
                key={exam.id}
                className={`cursor-pointer ${isFetching ? "opacity-60" : ""}`}
                onClick={() => router.push(`/app/examinations/${exam.id}`)}
              >
                <TableCell className="font-medium text-foreground">{exam.name}</TableCell>
                <TableCell className="text-muted-foreground">{exam.exam_type}</TableCell>
                <TableCell className="text-muted-foreground">
                  {exam.start_date} – {exam.end_date}
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className={statusVariant[exam.status]}>
                    {exam.status.replace("_", " ")}
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
                      <DropdownMenuItem onClick={() => router.push(`/app/examinations/${exam.id}`)}>
                        View exam
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => router.push(`/app/examinations/${exam.id}/edit`)}
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
    <RequirePermission permission="exams:schedule:read">
      <ExaminationsListPage />
    </RequirePermission>
  );
}
