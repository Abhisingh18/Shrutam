"use client";

import { useState } from "react";
import { MoreHorizontal, Plus } from "lucide-react";
import { toast } from "sonner";
import { RequirePermission } from "@/components/auth/require-permission";
import { AcademicsSubNav } from "@/components/academics/academics-subnav";
import { Badge } from "@/components/ui/badge";
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
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAcademicYears } from "@/hooks/use-academic-years";
import {
  useCreateSemester,
  useDeleteSemester,
  useSemesters,
  useUpdateSemester,
} from "@/hooks/use-semesters";
import { ApiError } from "@/lib/api-client";
import type { Semester } from "@/types/academics";

const ALL = "all";

interface FormTarget {
  mode: "create" | "edit";
  semester?: Semester;
}

function SemesterFormDialog({ target, onClose }: { target: FormTarget; onClose: () => void }) {
  const isEdit = target.mode === "edit" && target.semester;
  const [name, setName] = useState(target.semester?.name ?? "");
  const [academicYearId, setAcademicYearId] = useState(target.semester?.academic_year_id ?? "");
  const [startDate, setStartDate] = useState(target.semester?.start_date ?? "");
  const [endDate, setEndDate] = useState(target.semester?.end_date ?? "");
  const [isCurrent, setIsCurrent] = useState(target.semester?.is_current ?? false);

  const { data: years } = useAcademicYears({ page: 1, pageSize: 100 });
  const createSemester = useCreateSemester();
  const updateSemester = useUpdateSemester(target.semester?.id ?? "");
  const deleteSemester = useDeleteSemester();
  const isPending = createSemester.isPending || updateSemester.isPending || deleteSemester.isPending;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (isEdit && target.semester) {
        await updateSemester.mutateAsync({ name, start_date: startDate, end_date: endDate, is_current: isCurrent });
        toast.success("Semester updated");
      } else {
        if (!academicYearId) {
          toast.error("Select an academic year");
          return;
        }
        await createSemester.mutateAsync({
          name,
          academic_year_id: academicYearId,
          start_date: startDate,
          end_date: endDate,
          is_current: isCurrent,
        });
        toast.success("Semester added");
      }
      onClose();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to save semester");
    }
  };

  const handleDelete = async () => {
    if (!target.semester) return;
    try {
      await deleteSemester.mutateAsync(target.semester.id);
      toast.success("Semester deleted");
      onClose();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to delete semester");
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{isEdit ? "Edit semester" : "Add semester"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="sem-name">Name</Label>
              <Input
                id="sem-name"
                className="mt-1.5"
                placeholder="Semester 1"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            {!isEdit && (
              <div>
                <Label htmlFor="sem-year">Academic year</Label>
                <Select value={academicYearId} onValueChange={setAcademicYearId}>
                  <SelectTrigger id="sem-year" className="mt-1.5 w-full">
                    <SelectValue placeholder="Select…" />
                  </SelectTrigger>
                  <SelectContent>
                    {years?.data.map((y) => (
                      <SelectItem key={y.id} value={y.id}>
                        {y.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="sem-start">Start date</Label>
                <Input
                  id="sem-start"
                  type="date"
                  className="mt-1.5"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  required
                />
              </div>
              <div>
                <Label htmlFor="sem-end">End date</Label>
                <Input
                  id="sem-end"
                  type="date"
                  className="mt-1.5"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  required
                />
              </div>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2.5">
              <div>
                <Label htmlFor="sem-current">Current semester</Label>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Marks this as the active semester.
                </p>
              </div>
              <Switch id="sem-current" checked={isCurrent} onCheckedChange={setIsCurrent} />
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
              {isPending ? "Saving…" : isEdit ? "Save changes" : "Add semester"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function SemestersListPage() {
  const [page, setPage] = useState(1);
  const [yearFilter, setYearFilter] = useState(ALL);
  const pageSize = 20;
  const { data, isLoading } = useSemesters({
    page,
    pageSize,
    academicYearId: yearFilter === ALL ? undefined : yearFilter,
  });
  const { data: years } = useAcademicYears({ page: 1, pageSize: 100 });
  const [formTarget, setFormTarget] = useState<FormTarget | null>(null);

  const yearName = (id: string) => years?.data.find((y) => y.id === id)?.name ?? "—";

  return (
    <div className="flex flex-col h-full">
      <AcademicsSubNav />
      <div className="flex items-start justify-between gap-4 px-6 py-5 border-b border-border">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Semesters</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Terms within an academic year.</p>
        </div>
        <Button onClick={() => setFormTarget({ mode: "create" })}>
          <Plus className="size-4" /> Add semester
        </Button>
      </div>

      <div className="flex items-center gap-3 px-6 py-3 border-b border-border bg-muted/40">
        <Select
          value={yearFilter}
          onValueChange={(v) => {
            setYearFilter(v);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-56">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All academic years</SelectItem>
            {years?.data.map((y) => (
              <SelectItem key={y.id} value={y.id}>
                {y.name}
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
              <TableHead>Academic year</TableHead>
              <TableHead>Start date</TableHead>
              <TableHead>End date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading &&
              Array.from({ length: 3 }).map((_, i) => (
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
                  No semesters yet — add your first one.
                </TableCell>
              </TableRow>
            )}

            {!isLoading &&
              data?.data.map((semester) => (
                <TableRow key={semester.id}>
                  <TableCell className="font-medium text-foreground">{semester.name}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {yearName(semester.academic_year_id)}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{semester.start_date}</TableCell>
                  <TableCell className="text-muted-foreground">{semester.end_date}</TableCell>
                  <TableCell>
                    {semester.is_current && (
                      <Badge variant="outline" className="bg-success-bg text-success border-transparent">
                        Current
                      </Badge>
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
                        <DropdownMenuItem onClick={() => setFormTarget({ mode: "edit", semester })}>
                          Edit
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </div>

      {formTarget && <SemesterFormDialog target={formTarget} onClose={() => setFormTarget(null)} />}
    </div>
  );
}

export default function Page() {
  return (
    <RequirePermission permission="courses:catalog:read">
      <SemestersListPage />
    </RequirePermission>
  );
}
