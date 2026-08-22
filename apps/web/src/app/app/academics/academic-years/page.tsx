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
import {
  useAcademicYears,
  useCreateAcademicYear,
  useDeleteAcademicYear,
  useUpdateAcademicYear,
} from "@/hooks/use-academic-years";
import { ApiError } from "@/lib/api-client";
import type { AcademicYear } from "@/types/academics";

interface FormTarget {
  mode: "create" | "edit";
  year?: AcademicYear;
}

function YearFormDialog({ target, onClose }: { target: FormTarget; onClose: () => void }) {
  const isEdit = target.mode === "edit" && target.year;
  const [name, setName] = useState(target.year?.name ?? "");
  const [startDate, setStartDate] = useState(target.year?.start_date ?? "");
  const [endDate, setEndDate] = useState(target.year?.end_date ?? "");
  const [isCurrent, setIsCurrent] = useState(target.year?.is_current ?? false);

  const createYear = useCreateAcademicYear();
  const updateYear = useUpdateAcademicYear(target.year?.id ?? "");
  const deleteYear = useDeleteAcademicYear();
  const isPending = createYear.isPending || updateYear.isPending || deleteYear.isPending;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (isEdit && target.year) {
        await updateYear.mutateAsync({ name, start_date: startDate, end_date: endDate, is_current: isCurrent });
        toast.success("Academic year updated");
      } else {
        await createYear.mutateAsync({ name, start_date: startDate, end_date: endDate, is_current: isCurrent });
        toast.success("Academic year added");
      }
      onClose();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to save academic year");
    }
  };

  const handleDelete = async () => {
    if (!target.year) return;
    try {
      await deleteYear.mutateAsync(target.year.id);
      toast.success("Academic year deleted");
      onClose();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to delete academic year");
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{isEdit ? "Edit academic year" : "Add academic year"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="ay-name">Name</Label>
              <Input
                id="ay-name"
                className="mt-1.5"
                placeholder="2026-2027"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="ay-start">Start date</Label>
                <Input
                  id="ay-start"
                  type="date"
                  className="mt-1.5"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  required
                />
              </div>
              <div>
                <Label htmlFor="ay-end">End date</Label>
                <Input
                  id="ay-end"
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
                <Label htmlFor="ay-current">Current year</Label>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Marks this as the active academic year.
                </p>
              </div>
              <Switch id="ay-current" checked={isCurrent} onCheckedChange={setIsCurrent} />
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
              {isPending ? "Saving…" : isEdit ? "Save changes" : "Add year"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function AcademicYearsListPage() {
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const { data, isLoading } = useAcademicYears({ page, pageSize });
  const [formTarget, setFormTarget] = useState<FormTarget | null>(null);

  return (
    <div className="flex flex-col h-full">
      <AcademicsSubNav />
      <div className="flex items-start justify-between gap-4 px-6 py-5 border-b border-border">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Academic Years</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            e.g. 2026–2027 — the top-level container for semesters.
          </p>
        </div>
        <Button onClick={() => setFormTarget({ mode: "create" })}>
          <Plus className="size-4" /> Add year
        </Button>
      </div>

      <div className="flex-1 overflow-auto px-6 py-4">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
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
                  No academic years yet — add your first one.
                </TableCell>
              </TableRow>
            )}

            {!isLoading &&
              data?.data.map((year) => (
                <TableRow key={year.id}>
                  <TableCell className="font-medium text-foreground">{year.name}</TableCell>
                  <TableCell className="text-muted-foreground">{year.start_date}</TableCell>
                  <TableCell className="text-muted-foreground">{year.end_date}</TableCell>
                  <TableCell>
                    {year.is_current && (
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
                        <DropdownMenuItem onClick={() => setFormTarget({ mode: "edit", year })}>
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

      {formTarget && <YearFormDialog target={formTarget} onClose={() => setFormTarget(null)} />}
    </div>
  );
}

export default function Page() {
  return (
    <RequirePermission permission="courses:catalog:read">
      <AcademicYearsListPage />
    </RequirePermission>
  );
}
