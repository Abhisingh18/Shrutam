"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Download, Pencil, Trophy } from "lucide-react";
import { toast } from "sonner";
import { RequirePermission } from "@/components/auth/require-permission";
import { DetailPageTemplate } from "@/components/templates/detail-page-template";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { GradeBadge } from "@/components/widgets/grade-badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  downloadExamReportCard,
  useExam,
  useExamAnalytics,
  useExamMarks,
  useExamRankList,
  usePublishExam,
  useUpdateExamMarks,
} from "@/hooks/use-exams";
import { useStudents } from "@/hooks/use-students";
import { ApiError } from "@/lib/api-client";
import type { ExamMarkEntry } from "@/types/examination";

function OverviewTab({ examId }: { examId: string }) {
  const { data: exam, isLoading } = useExam(examId);
  const publishExam = usePublishExam(examId);

  if (isLoading) return <Skeleton className="h-40 w-full max-w-md" />;
  if (!exam) return null;

  const rows: [string, string][] = [
    ["Name", exam.name],
    ["Exam type", exam.exam_type],
    ["Start date", exam.start_date],
    ["End date", exam.end_date],
    ["Max marks", String(exam.max_marks)],
    ["Status", exam.status.replace("_", " ")],
  ];

  const canPublish = exam.status !== "results_published";

  const onPublish = async () => {
    try {
      await publishExam.mutateAsync();
      toast.success("Results published");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to publish results");
    }
  };

  return (
    <div className="space-y-4 max-w-md">
      <dl className="divide-y divide-border rounded-lg border border-border">
        {rows.map(([label, value]) => (
          <div key={label} className="flex justify-between px-4 py-3 text-sm">
            <dt className="text-muted-foreground">{label}</dt>
            <dd className="font-medium text-foreground capitalize">{value}</dd>
          </div>
        ))}
      </dl>
      {canPublish && (
        <Button onClick={onPublish} disabled={publishExam.isPending}>
          {publishExam.isPending ? "Publishing…" : "Publish results"}
        </Button>
      )}
    </div>
  );
}

function MarksTab({ examId }: { examId: string }) {
  const { data: students, isLoading: studentsLoading } = useStudents({ page: 1, pageSize: 200 });
  const { data: marks, isLoading: marksLoading } = useExamMarks(examId);
  const updateMarks = useUpdateExamMarks(examId);

  const [entries, setEntries] = useState<Record<string, { marks_obtained: string; grade: string }>>({});

  useEffect(() => {
    if (!students) return;
    const byStudent = new Map((marks ?? []).map((m) => [m.student_id, m]));
    const next: Record<string, { marks_obtained: string; grade: string }> = {};
    for (const student of students.data) {
      const existing = byStudent.get(student.id);
      next[student.id] = {
        marks_obtained: existing?.marks_obtained != null ? String(existing.marks_obtained) : "",
        grade: existing?.grade ?? "",
      };
    }
    setEntries(next);
  }, [students, marks]);

  if (studentsLoading || marksLoading) return <Skeleton className="h-64 w-full" />;
  if (!students || students.data.length === 0) {
    return <p className="text-sm text-muted-foreground py-8 text-center">No students to mark yet.</p>;
  }

  const onSave = async () => {
    const payload: ExamMarkEntry[] = students.data.map((student) => {
      const entry = entries[student.id] ?? { marks_obtained: "", grade: "" };
      return {
        student_id: student.id,
        marks_obtained: entry.marks_obtained === "" ? null : Number(entry.marks_obtained),
        grade: entry.grade === "" ? null : entry.grade,
        remarks: null,
      };
    });
    try {
      await updateMarks.mutateAsync({ marks: payload });
      toast.success("Marks saved");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to save marks");
    }
  };

  return (
    <div className="space-y-4">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Admission #</TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Marks obtained</TableHead>
            <TableHead>Grade</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {students.data.map((student) => (
            <TableRow key={student.id}>
              <TableCell className="font-mono text-xs">{student.admission_number}</TableCell>
              <TableCell className="font-medium text-foreground">{student.full_name}</TableCell>
              <TableCell>
                <Input
                  type="number"
                  className="w-28"
                  value={entries[student.id]?.marks_obtained ?? ""}
                  onChange={(e) =>
                    setEntries((prev) => ({
                      ...prev,
                      [student.id]: { ...prev[student.id], marks_obtained: e.target.value, grade: prev[student.id]?.grade ?? "" },
                    }))
                  }
                />
              </TableCell>
              <TableCell>
                <Input
                  className="w-20"
                  value={entries[student.id]?.grade ?? ""}
                  onChange={(e) =>
                    setEntries((prev) => ({
                      ...prev,
                      [student.id]: { ...prev[student.id], grade: e.target.value, marks_obtained: prev[student.id]?.marks_obtained ?? "" },
                    }))
                  }
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <Button onClick={onSave} disabled={updateMarks.isPending}>
        {updateMarks.isPending ? "Saving…" : "Save marks"}
      </Button>
    </div>
  );
}

function RankListTab({ examId }: { examId: string }) {
  const { data: rankList, isLoading: rankLoading } = useExamRankList(examId);
  const { data: analytics, isLoading: analyticsLoading } = useExamAnalytics(examId);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const handleDownload = async (studentId: string, studentName: string) => {
    setDownloadingId(studentId);
    try {
      await downloadExamReportCard(studentId, studentName.replace(/\s+/g, "-").toLowerCase());
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to download report card");
    } finally {
      setDownloadingId(null);
    }
  };

  if (rankLoading || analyticsLoading) return <Skeleton className="h-64 w-full" />;

  return (
    <div className="space-y-6">
      {analytics && analytics.students_graded > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="rounded-lg border border-border bg-card p-4">
            <div className="text-xs text-muted-foreground">Average</div>
            <div className="text-xl font-bold text-foreground tabular-nums mt-1">
              {analytics.average_marks}
            </div>
          </div>
          <div className="rounded-lg border border-border bg-card p-4">
            <div className="text-xs text-muted-foreground">Highest</div>
            <div className="text-xl font-bold text-success tabular-nums mt-1">
              {analytics.highest_marks}
            </div>
          </div>
          <div className="rounded-lg border border-border bg-card p-4">
            <div className="text-xs text-muted-foreground">Lowest</div>
            <div className="text-xl font-bold text-destructive tabular-nums mt-1">
              {analytics.lowest_marks}
            </div>
          </div>
          <div className="rounded-lg border border-border bg-card p-4">
            <div className="text-xs text-muted-foreground">Pass rate</div>
            <div className="text-xl font-bold text-foreground tabular-nums mt-1">
              {analytics.pass_percentage}%
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">
              {analytics.pass_count} passed · {analytics.fail_count} failed
            </div>
          </div>
        </div>
      )}

      {(!rankList || rankList.data.length === 0) && (
        <p className="text-sm text-muted-foreground py-8 text-center">
          No marks entered yet — enter marks in the Marks tab to see rankings.
        </p>
      )}

      {rankList && rankList.data.length > 0 && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16">Rank</TableHead>
              <TableHead>Student</TableHead>
              <TableHead>Marks</TableHead>
              <TableHead>Percentage</TableHead>
              <TableHead>Grade</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rankList.data.map((entry) => (
              <TableRow key={entry.student_id}>
                <TableCell>
                  <Badge
                    variant="outline"
                    className={
                      entry.rank === 1
                        ? "bg-warning-bg text-warning border-transparent"
                        : "border-transparent bg-muted"
                    }
                  >
                    {entry.rank === 1 && <Trophy className="size-3 mr-1" />}#{entry.rank}
                  </Badge>
                </TableCell>
                <TableCell className="font-medium text-foreground">{entry.student_name}</TableCell>
                <TableCell className="tabular-nums">
                  {entry.marks_obtained} / {rankList.max_marks}
                </TableCell>
                <TableCell className="tabular-nums text-muted-foreground">
                  {entry.percentage}%
                </TableCell>
                <TableCell>
                  <GradeBadge grade={entry.grade} size="sm" />
                </TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    disabled={downloadingId === entry.student_id}
                    onClick={() => handleDownload(entry.student_id, entry.student_name)}
                    aria-label={`Download report card for ${entry.student_name}`}
                  >
                    <Download className="size-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}

function ExaminationDetailPage({ id }: { id: string }) {
  const router = useRouter();
  const { data: exam } = useExam(id);

  return (
    <DetailPageTemplate
      title={exam?.name ?? "…"}
      subtitle={exam?.exam_type}
      statusBadge={
        exam
          ? {
              label: exam.status.replace("_", " "),
              variant: exam.status === "results_published" ? "success" : "default",
            }
          : undefined
      }
      actions={
        <Button variant="outline" asChild>
          <Link href={`/app/examinations/${id}/edit`}>
            <Pencil className="size-4" /> Edit
          </Link>
        </Button>
      }
      tabs={[
        { value: "overview", label: "Overview", content: <OverviewTab examId={id} /> },
        { value: "marks", label: "Marks", content: <MarksTab examId={id} /> },
        { value: "rank-list", label: "Rank List", content: <RankListTab examId={id} /> },
      ]}
      rightRail={
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-foreground">Quick actions</h3>
          <Button variant="outline" size="sm" className="w-full" onClick={() => router.push("/app/examinations")}>
            Back to all exams
          </Button>
        </div>
      }
    />
  );
}

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <RequirePermission permission="exams:schedule:read">
      <ExaminationDetailPage id={id} />
    </RequirePermission>
  );
}
