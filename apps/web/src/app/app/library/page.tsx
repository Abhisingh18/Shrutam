"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, ChevronDown, ChevronUp, MoreHorizontal } from "lucide-react";
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
import { useBooks } from "@/hooks/use-books";
import { useOverdueBookIssues } from "@/hooks/use-book-issues";

function OverduePanel() {
  const [open, setOpen] = useState(false);
  const { data, isLoading } = useOverdueBookIssues();
  const count = data?.length ?? 0;

  return (
    <div className="rounded-lg border border-border mb-4 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-sm hover:bg-muted/40 transition-colors"
      >
        <span className="flex items-center gap-2 font-medium text-foreground">
          <AlertTriangle className="size-4 text-destructive" />
          Overdue books
          {!isLoading && (
            <Badge variant="outline" className="bg-destructive-bg text-destructive border-transparent">
              {count}
            </Badge>
          )}
        </span>
        {open ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
      </button>
      {open && (
        <div className="px-4 pb-4 border-t border-border pt-3">
          {isLoading && <Skeleton className="h-20 w-full" />}
          {!isLoading && count === 0 && (
            <p className="text-sm text-muted-foreground py-2">No overdue books right now.</p>
          )}
          {!isLoading && count > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Book</TableHead>
                  <TableHead>Due date</TableHead>
                  <TableHead>Days overdue</TableHead>
                  <TableHead>Projected fine</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data?.map((issue) => (
                  <TableRow key={issue.id}>
                    <TableCell className="font-medium text-foreground">{issue.book_title}</TableCell>
                    <TableCell className="text-muted-foreground">{issue.due_date}</TableCell>
                    <TableCell className="tabular-nums text-destructive font-semibold">
                      {issue.days_overdue}
                    </TableCell>
                    <TableCell className="tabular-nums text-muted-foreground">
                      ₹{issue.projected_fine}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      )}
    </div>
  );
}

function BooksListPage() {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const pageSize = 20;

  const { data, isLoading, isFetching } = useBooks({ page, pageSize, search });

  return (
    <ListPageTemplate
      title="Library"
      description="Every book in your institution's catalogue."
      primaryAction={{ label: "Add book", onClick: () => router.push("/app/library/new") }}
      search={{
        value: search,
        onChange: (v) => {
          setSearch(v);
          setPage(1);
        },
        placeholder: "Search by title…",
      }}
      page={page}
      pageSize={pageSize}
      total={data?.meta.total ?? 0}
      onPageChange={setPage}
    >
      <OverduePanel />
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Title</TableHead>
            <TableHead>Author</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>Copies</TableHead>
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
                {search ? "No books match your search." : "No books yet — add your first one."}
              </TableCell>
            </TableRow>
          )}

          {!isLoading &&
            data?.data.map((book) => (
              <TableRow
                key={book.id}
                className={`cursor-pointer ${isFetching ? "opacity-60" : ""}`}
                onClick={() => router.push(`/app/library/${book.id}`)}
              >
                <TableCell className="font-medium text-foreground">{book.title}</TableCell>
                <TableCell className="text-muted-foreground">{book.author}</TableCell>
                <TableCell className="text-muted-foreground">{book.category ?? "—"}</TableCell>
                <TableCell>
                  <Badge
                    variant="outline"
                    className={
                      book.available_copies > 0
                        ? "bg-success-bg text-success border-transparent"
                        : "bg-destructive-bg text-destructive border-transparent"
                    }
                  >
                    {book.available_copies} / {book.total_copies}
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
                      <DropdownMenuItem onClick={() => router.push(`/app/library/${book.id}`)}>
                        View book
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => router.push(`/app/library/${book.id}/edit`)}>
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
    <RequirePermission permission="library:book:read">
      <BooksListPage />
    </RequirePermission>
  );
}
