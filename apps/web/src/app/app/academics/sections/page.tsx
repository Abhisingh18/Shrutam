"use client";

import { useState } from "react";
import { MoreHorizontal, Plus, UserCircle2 } from "lucide-react";
import { toast } from "sonner";
import { RequirePermission } from "@/components/auth/require-permission";
import { AcademicsSubNav } from "@/components/academics/academics-subnav";
import { Button } from "@/components/ui/button";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useFacultyList } from "@/hooks/use-faculty";
import { usePrograms } from "@/hooks/use-programs";
import {
  useCreateSection,
  useDeleteSection,
  useSections,
  useUpdateSection,
} from "@/hooks/use-sections";
import { useSemesters } from "@/hooks/use-semesters";
import { ApiError } from "@/lib/api-client";
import type { Section } from "@/types/academics";

const ALL = "all";
const NONE = "none";

interface FormTarget {
  mode: "create" | "edit";
  section?: Section;
}

function SectionFormDialog({ target, onClose }: { target: FormTarget; onClose: () => void }) {
  const isEdit = target.mode === "edit" && target.section;
  const [name, setName] = useState(target.section?.name ?? "");
  const [programId, setProgramId] = useState(target.section?.program_id ?? "");
  const [semesterId, setSemesterId] = useState(target.section?.semester_id ?? "");
  const [capacity, setCapacity] = useState(String(target.section?.capacity ?? 40));
  const [classTeacherId, setClassTeacherId] = useState(target.section?.class_teacher_id ?? NONE);

  const { data: programs } = usePrograms({ page: 1, pageSize: 100 });
  const { data: semesters } = useSemesters({ page: 1, pageSize: 100 });
  const { data: faculty } = useFacultyList({ page: 1, pageSize: 200 });

  const createSection = useCreateSection();
  const updateSection = useUpdateSection(target.section?.id ?? "");
  const deleteSection = useDeleteSection();
  const isPending = createSection.isPending || updateSection.isPending || deleteSection.isPending;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const teacher = classTeacherId === NONE ? null : classTeacherId;
    try {
      if (isEdit && target.section) {
        await updateSection.mutateAsync({
          name,
          capacity: Number(capacity),
          class_teacher_id: teacher,
        });
        toast.success("Section updated");
      } else {
        if (!programId || !semesterId) {
          toast.error("Select a program and semester");
          return;
        }
        await createSection.mutateAsync({
          name,
          program_id: programId,
          semester_id: semesterId,
          capacity: Number(capacity),
          class_teacher_id: teacher,
        });
        toast.success("Section added");
      }
      onClose();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to save section");
    }
  };

  const handleDelete = async () => {
    if (!target.section) return;
    try {
      await deleteSection.mutateAsync(target.section.id);
      toast.success("Section deleted");
      onClose();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to delete section");
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{isEdit ? "Edit section" : "Add section"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="sec-name">Name</Label>
              <Input
                id="sec-name"
                className="mt-1.5"
                placeholder="Section A"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            {!isEdit && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="sec-program">Program</Label>
                  <Select value={programId} onValueChange={setProgramId}>
                    <SelectTrigger id="sec-program" className="mt-1.5 w-full">
                      <SelectValue placeholder="Select…" />
                    </SelectTrigger>
                    <SelectContent>
                      {programs?.data.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="sec-semester">Semester</Label>
                  <Select value={semesterId} onValueChange={setSemesterId}>
                    <SelectTrigger id="sec-semester" className="mt-1.5 w-full">
                      <SelectValue placeholder="Select…" />
                    </SelectTrigger>
                    <SelectContent>
                      {semesters?.data.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
            <div>
              <Label htmlFor="sec-capacity">Capacity</Label>
              <Input
                id="sec-capacity"
                type="number"
                min={0}
                className="mt-1.5"
                value={capacity}
                onChange={(e) => setCapacity(e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="sec-teacher">Class teacher</Label>
              <Select value={classTeacherId} onValueChange={setClassTeacherId}>
                <SelectTrigger id="sec-teacher" className="mt-1.5 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>Unassigned</SelectItem>
                  {faculty?.data.map((f) => (
                    <SelectItem key={f.id} value={f.id}>
                      {f.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            {isEdit && (
              <Button type="button" variant="destructive" onClick={handleDelete} disabled={isPending}>
                Delete
              </Button>
            )}
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Saving…" : isEdit ? "Save changes" : "Add section"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function SectionsListPage() {
  const [page, setPage] = useState(1);
  const [programFilter, setProgramFilter] = useState(ALL);
  const [semesterFilter, setSemesterFilter] = useState(ALL);
  const pageSize = 20;

  const { data, isLoading } = useSections({
    page,
    pageSize,
    programId: programFilter === ALL ? undefined : programFilter,
    semesterId: semesterFilter === ALL ? undefined : semesterFilter,
  });
  const { data: programs } = usePrograms({ page: 1, pageSize: 100 });
  const { data: semesters } = useSemesters({ page: 1, pageSize: 100 });
  const { data: faculty } = useFacultyList({ page: 1, pageSize: 200 });
  const [formTarget, setFormTarget] = useState<FormTarget | null>(null);

  const programName = (id: string) => programs?.data.find((p) => p.id === id)?.name ?? "—";
  const semesterName = (id: string) => semesters?.data.find((s) => s.id === id)?.name ?? "—";
  const teacherName = (id: string | null) =>
    id ? faculty?.data.find((f) => f.id === id)?.full_name : undefined;

  return (
    <div className="flex flex-col h-full">
      <AcademicsSubNav />
      <div className="flex items-start justify-between gap-4 px-6 py-5 border-b border-border">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Sections</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Class groups within a program and semester, each with a class teacher.
          </p>
        </div>
        <Button onClick={() => setFormTarget({ mode: "create" })}>
          <Plus className="size-4" /> Add section
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-3 px-6 py-3 border-b border-border bg-muted/40">
        <Select
          value={programFilter}
          onValueChange={(v) => {
            setProgramFilter(v);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-52">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All programs</SelectItem>
            {programs?.data.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={semesterFilter}
          onValueChange={(v) => {
            setSemesterFilter(v);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-52">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All semesters</SelectItem>
            {semesters?.data.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex-1 overflow-auto px-6 py-4">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Program</TableHead>
              <TableHead>Semester</TableHead>
              <TableHead>Capacity</TableHead>
              <TableHead>Class teacher</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading &&
              Array.from({ length: 4 }).map((_, i) => (
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
                  No sections yet — add your first one.
                </TableCell>
              </TableRow>
            )}

            {!isLoading &&
              data?.data.map((section) => {
                const teacher = teacherName(section.class_teacher_id);
                return (
                  <TableRow key={section.id}>
                    <TableCell className="font-medium text-foreground">{section.name}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {programName(section.program_id)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {semesterName(section.semester_id)}
                    </TableCell>
                    <TableCell className="tabular-nums text-muted-foreground">
                      {section.capacity}
                    </TableCell>
                    <TableCell>
                      {teacher ? (
                        <span className="inline-flex items-center gap-1.5 text-sm text-foreground">
                          <UserCircle2 className="size-4 text-primary" />
                          {teacher}
                        </span>
                      ) : (
                        <span className="text-sm text-muted-foreground">Unassigned</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="size-8">
                            <MoreHorizontal className="size-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setFormTarget({ mode: "edit", section })}>
                            Edit
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
          </TableBody>
        </Table>
      </div>

      {formTarget && <SectionFormDialog target={formTarget} onClose={() => setFormTarget(null)} />}
    </div>
  );
}

export default function Page() {
  return (
    <RequirePermission permission="courses:catalog:read">
      <SectionsListPage />
    </RequirePermission>
  );
}
