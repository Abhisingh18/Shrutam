"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MoreHorizontal } from "lucide-react";
import { toast } from "sonner";
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
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useDeleteSubject, useSubjects, useUpdateSubject } from "@/hooks/use-subjects";
import { ApiError } from "@/lib/api-client";
import type { Subject } from "@/types/academics";

function EditSubjectDialog({ subject, onClose }: { subject: Subject; onClose: () => void }) {
  const [name, setName] = useState(subject.name);
  const [code, setCode] = useState(subject.code);
  const [credits, setCredits] = useState(String(subject.credits));
  const updateSubject = useUpdateSubject(subject.id);
  const deleteSubject = useDeleteSubject();

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateSubject.mutateAsync({ name, code, credits: Number(credits) });
      toast.success("Subject updated");
      onClose();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to update subject");
    }
  };

  const handleDelete = async () => {
    try {
      await deleteSubject.mutateAsync(subject.id);
      toast.success("Subject deleted");
      onClose();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to delete subject");
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <form onSubmit={handleSave}>
          <DialogHeader>
            <DialogTitle>Edit subject</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="subj-name">Name</Label>
              <Input id="subj-name" className="mt-1.5" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div>
              <Label htmlFor="subj-code">Code</Label>
              <Input id="subj-code" className="mt-1.5" value={code} onChange={(e) => setCode(e.target.value)} required />
            </div>
            <div>
              <Label htmlFor="subj-credits">Credits</Label>
              <Input
                id="subj-credits"
                type="number"
                min={0}
                className="mt-1.5"
                value={credits}
                onChange={(e) => setCredits(e.target.value)}
                required
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="destructive" onClick={handleDelete} disabled={deleteSubject.isPending}>
              Delete
            </Button>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={updateSubject.isPending}>
              {updateSubject.isPending ? "Saving…" : "Save changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function SubjectsListPage() {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Subject | null>(null);
  const pageSize = 20;

  const { data, isLoading, isFetching } = useSubjects({ page, pageSize, search });

  return (
    <div className="flex flex-col h-full">
      <AcademicsSubNav />
      <div className="flex-1 min-h-0">
      <ListPageTemplate
        title="Subjects"
        description="Every taught subject across your institution's departments."
        primaryAction={{
          label: "Add subject",
          onClick: () => router.push("/app/academics/subjects/new"),
        }}
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
              <TableHead>Credits</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading &&
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 4 }).map((__, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))}

            {!isLoading && data?.data.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-12 text-muted-foreground">
                  {search ? "No subjects match your search." : "No subjects yet — add your first one."}
                </TableCell>
              </TableRow>
            )}

            {!isLoading &&
              data?.data.map((subject) => (
                <TableRow key={subject.id} className={isFetching ? "opacity-60" : ""}>
                  <TableCell className="font-mono text-xs">{subject.code}</TableCell>
                  <TableCell className="font-medium text-foreground">{subject.name}</TableCell>
                  <TableCell className="text-muted-foreground">{subject.credits}</TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="size-8">
                          <MoreHorizontal className="size-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setEditing(subject)}>Edit</DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => router.push(`/app/academics/departments/${subject.department_id}`)}
                        >
                          View department
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </ListPageTemplate>
      </div>

      {editing && <EditSubjectDialog subject={editing} onClose={() => setEditing(null)} />}
    </div>
  );
}

export default function Page() {
  return (
    <RequirePermission permission="courses:catalog:read">
      <SubjectsListPage />
    </RequirePermission>
  );
}
