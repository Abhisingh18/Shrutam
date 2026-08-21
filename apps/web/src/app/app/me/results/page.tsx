"use client";

import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { ChildSelector } from "@/components/me/child-selector";
import { useMyResults } from "@/hooks/use-me-portal";

export default function MyResultsPage() {
  const [studentId, setStudentId] = useState<string | undefined>();
  const { data, isLoading } = useMyResults(studentId);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">My Results</h1>
        <p className="text-sm text-muted-foreground">
          Only published results appear here — nothing shows before your institution
          publishes it.
        </p>
      </div>

      <ChildSelector selectedId={studentId} onSelect={setStudentId} />

      {data && (
        <div className="rounded-lg border border-border bg-card p-4 max-w-xs">
          <div className="text-sm text-muted-foreground">CGPA</div>
          <div className="text-2xl font-bold text-foreground tabular-nums mt-1">
            {data.cgpa.cgpa ?? "—"}
          </div>
          <div className="text-xs text-muted-foreground mt-0.5">
            {data.cgpa.exams_graded} exam{data.cgpa.exams_graded === 1 ? "" : "s"} · {data.cgpa.scale}
          </div>
        </div>
      )}

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Exam</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Marks</TableHead>
            <TableHead>Grade</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading && (
            <TableRow>
              <TableCell colSpan={4}>
                <Skeleton className="h-4 w-full" />
              </TableCell>
            </TableRow>
          )}
          {!isLoading && data?.results.length === 0 && (
            <TableRow>
              <TableCell colSpan={4} className="text-center py-12 text-muted-foreground">
                No published results yet.
              </TableCell>
            </TableRow>
          )}
          {data?.results.map((r) => (
            <TableRow key={r.exam_id}>
              <TableCell className="font-medium text-foreground">{r.exam_name}</TableCell>
              <TableCell className="text-muted-foreground">{r.exam_type}</TableCell>
              <TableCell className="tabular-nums">
                {r.marks_obtained ?? "—"} / {r.max_marks}
              </TableCell>
              <TableCell className="font-medium">{r.grade ?? "—"}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
