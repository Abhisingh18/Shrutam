"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Pencil } from "lucide-react";
import { toast } from "sonner";
import { RequirePermission } from "@/components/auth/require-permission";
import { DetailPageTemplate } from "@/components/templates/detail-page-template";
import { Button } from "@/components/ui/button";
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
import { useExam, useExamMarks, usePublishExam, useUpdateExamMarks } from "@/hooks/use-exams";
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
