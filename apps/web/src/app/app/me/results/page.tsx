"use client";

import { useState } from "react";
import { FileCheck2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { ChildSelector } from "@/components/me/child-selector";
import { CircularProgress } from "@/components/widgets/circular-progress";
import { GradeBadge } from "@/components/widgets/grade-badge";
import { useMyResults } from "@/hooks/use-me-portal";

export default function MyResultsPage() {
  const [studentId, setStudentId] = useState<string | undefined>();
  const { data, isLoading } = useMyResults(studentId);

  const cgpa = data?.cgpa.cgpa;
  const tone = cgpa === null || cgpa === undefined ? "primary" : cgpa >= 8 ? "success" : cgpa >= 6 ? "warning" : "destructive";

  return (
    <div className="p-6 space-y-8">
      <div>
        <h1 className="text-xl font-semibold text-foreground">My Results</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Only published results appear here — nothing shows before your institution
          publishes it.
        </p>
        <div className="mt-3">
          <ChildSelector selectedId={studentId} onSelect={setStudentId} />
        </div>
      </div>

      {data && (
        <div className="rounded-xl border border-border bg-card p-6 flex flex-col sm:flex-row items-center gap-8">
          <CircularProgress
            value={cgpa ?? 0}
            max={10}
            size="lg"
            tone={tone}
            valueLabel={cgpa !== null && cgpa !== undefined ? cgpa.toFixed(1) : "—"}
            label="CGPA (10-point scale)"
          />
          <div className="flex-1 text-sm text-muted-foreground">
            <p>
              Based on <strong className="text-foreground">{data.cgpa.exams_graded}</strong>{" "}
              published exam{data.cgpa.exams_graded === 1 ? "" : "s"}, weighted by each exam&apos;s
              maximum marks.
            </p>
          </div>
        </div>
      )}

      <div>
        <h2 className="text-sm font-semibold text-foreground mb-3">Exam results</h2>
        {isLoading && (
          <div className="space-y-2">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        )}
        {!isLoading && data?.results.length === 0 && (
          <div className="rounded-lg border border-dashed border-border p-10 text-center">
            <FileCheck2 className="size-8 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No published results yet.</p>
          </div>
        )}
        <div className="space-y-2">
          {data?.results.map((r) => (
            <div
              key={r.exam_id}
              className="flex items-center justify-between gap-4 rounded-lg border border-border bg-card p-4"
            >
              <div className="min-w-0">
                <div className="font-medium text-foreground truncate">{r.exam_name}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{r.exam_type}</div>
              </div>
              <div className="flex items-center gap-4 shrink-0">
                <div className="text-right">
                  <div className="text-sm font-medium text-foreground tabular-nums">
                    {r.marks_obtained ?? "—"} / {r.max_marks}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {r.marks_obtained !== null
                      ? `${Math.round((r.marks_obtained / r.max_marks) * 100)}%`
                      : ""}
                  </div>
                </div>
                <GradeBadge grade={r.grade} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
