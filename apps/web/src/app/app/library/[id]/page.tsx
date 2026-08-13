"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Pencil } from "lucide-react";
import { toast } from "sonner";
import { RequirePermission } from "@/components/auth/require-permission";
import { DetailPageTemplate } from "@/components/templates/detail-page-template";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useBook } from "@/hooks/use-books";
import { useBookIssues, useCreateBookIssue, useReturnBookIssue } from "@/hooks/use-book-issues";
import { ApiError } from "@/lib/api-client";
import type { BookIssue } from "@/types/library";

const issueStatusVariant: Record<BookIssue["status"], string> = {
  issued: "bg-info-bg text-info border-transparent",
  returned: "bg-success-bg text-success border-transparent",
  overdue: "bg-destructive-bg text-destructive border-transparent",
};

function OverviewTab({ bookId }: { bookId: string }) {
  const { data: book, isLoading } = useBook(bookId);

  if (isLoading) return <Skeleton className="h-40 w-full max-w-md" />;
  if (!book) return null;

  const rows: [string, string][] = [
    ["Title", book.title],
    ["Author", book.author],
    ["ISBN", book.isbn ?? "—"],
    ["Category", book.category ?? "—"],
    ["Total copies", String(book.total_copies)],
    ["Available copies", String(book.available_copies)],
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

function IssueToStudentForm({ bookId }: { bookId: string }) {
  const [studentId, setStudentId] = useState("");
  const [dueDate, setDueDate] = useState("");
  const createIssue = useCreateBookIssue();

  const onIssue = async () => {
    if (!studentId || !dueDate) {
      toast.error("Student ID and due date are required");
      return;
    }
    try {
      await createIssue.mutateAsync({ book_id: bookId, student_id: studentId, due_date: dueDate });
      toast.success("Book issued");
      setStudentId("");
      setDueDate("");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to issue book");
    }
  };

  return (
    <div className="flex flex-wrap items-end gap-3 rounded-lg border border-border p-4 mb-4">
      <div>
        <label className="block text-sm font-medium text-foreground mb-1.5" htmlFor="issue-student-id">
          Student ID
        </label>
        <Input
          id="issue-student-id"
          value={studentId}
          onChange={(e) => setStudentId(e.target.value)}
          placeholder="Student UUID"
          className="w-64"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-foreground mb-1.5" htmlFor="issue-due-date">
          Due date
        </label>
        <Input
          id="issue-due-date"
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
          className="w-44"
        />
      </div>
      <Button onClick={onIssue} disabled={createIssue.isPending}>
        {createIssue.isPending ? "Issuing…" : "Issue to student"}
      </Button>
    </div>
  );
}

function IssueHistoryTab({ bookId }: { bookId: string }) {
  const { data, isLoading } = useBookIssues({ page: 1, pageSize: 50, bookId });
  const returnIssue = useReturnBookIssue();

  const onReturn = async (issueId: string) => {
    try {
      await returnIssue.mutateAsync(issueId);
      toast.success("Book returned");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to return book");
    }
  };

  return (
    <div>
      <IssueToStudentForm bookId={bookId} />

      {isLoading && <Skeleton className="h-32 w-full" />}

      {!isLoading && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Student</TableHead>
              <TableHead>Issued</TableHead>
              <TableHead>Due</TableHead>
              <TableHead>Returned</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {data?.data.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                  No issue history for this book yet.
                </TableCell>
              </TableRow>
            )}
            {data?.data.map((issue) => (
              <TableRow key={issue.id}>
                <TableCell className="font-mono text-xs">{issue.student_id}</TableCell>
                <TableCell>{issue.issued_date}</TableCell>
                <TableCell>{issue.due_date}</TableCell>
                <TableCell>{issue.returned_date ?? "—"}</TableCell>
                <TableCell>
                  <Badge variant="outline" className={issueStatusVariant[issue.status]}>
                    {issue.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  {issue.status === "issued" && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onReturn(issue.id)}
                      disabled={returnIssue.isPending}
                    >
                      Return
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}

function BookDetailPage({ id }: { id: string }) {
  const router = useRouter();
  const { data: book } = useBook(id);

  return (
    <DetailPageTemplate
      title={book?.title ?? "…"}
      subtitle={book ? `by ${book.author}` : undefined}
      statusBadge={
        book
          ? {
              label: `${book.available_copies}/${book.total_copies} available`,
              variant: book.available_copies > 0 ? "success" : "error",
            }
          : undefined
      }
      actions={
        <Button variant="outline" asChild>
          <Link href={`/app/library/${id}/edit`}>
            <Pencil className="size-4" /> Edit
          </Link>
        </Button>
      }
      tabs={[
        { value: "overview", label: "Overview", content: <OverviewTab bookId={id} /> },
        { value: "issues", label: "Issue history", content: <IssueHistoryTab bookId={id} /> },
      ]}
      rightRail={
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-foreground">Quick actions</h3>
          <Button variant="outline" size="sm" className="w-full" onClick={() => router.push("/app/library")}>
            Back to library
          </Button>
        </div>
      }
    />
  );
}

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <RequirePermission permission="library:book:read">
      <BookDetailPage id={id} />
    </RequirePermission>
  );
}
