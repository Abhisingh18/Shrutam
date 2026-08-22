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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useDepartments } from "@/hooks/use-departments";
import { useCreateProgram, useDeleteProgram, usePrograms, useUpdateProgram } from "@/hooks/use-programs";
import { ApiError } from "@/lib/api-client";
import type { Program } from "@/types/academics";

const DEGREE_OPTIONS: { value: Program["degree_type"]; label: string }[] = [
  { value: "undergraduate", label: "Undergraduate" },
  { value: "postgraduate", label: "Postgraduate" },
  { value: "diploma", label: "Diploma" },
];

const DEGREE_LABEL: Record<Program["degree_type"], string> = {
  undergraduate: "UG",
  postgraduate: "PG",
  diploma: "Diploma",
};

interface FormTarget {
  mode: "create" | "edit";
  program?: Program;
}

function ProgramFormDialog({ target, onClose }: { target: FormTarget; onClose: () => void }) {
  const isEdit = target.mode === "edit" && target.program;
  const [name, setName] = useState(target.program?.name ?? "");
  const [code, setCode] = useState(target.program?.code ?? "");
  const [departmentId, setDepartmentId] = useState(target.program?.department_id ?? "");
  const [degreeType, setDegreeType] = useState<Program["degree_type"]>(
    target.program?.degree_type ?? "undergraduate",
  );

  const { data: departments } = useDepartments({ page: 1, pageSize: 100 });
  const createProgram = useCreateProgram();
  const updateProgram = useUpdateProgram(target.program?.id ?? "");
  const deleteProgram = useDeleteProgram();
  const isPending = createProgram.isPending || updateProgram.isPending || deleteProgram.isPending;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (isEdit && target.program) {
        await updateProgram.mutateAsync({ name, code, degree_type: degreeType });
        toast.success("Program updated");
      } else {
        if (!departmentId) {
          toast.error("Select a department");
          return;
        }
        await createProgram.mutateAsync({ name, code, department_id: departmentId, degree_type: degreeType });
        toast.success("Program added");
      }
      onClose();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to save program");
    }
  };

  const handleDelete = async () => {
    if (!target.program) return;
    try {
      await deleteProgram.mutateAsync(target.program.id);
      toast.success("Program deleted");
      onClose();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to delete program");
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{isEdit ? "Edit program" : "Add program"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="prog-name">Name</Label>
              <Input id="prog-name" className="mt-1.5" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div>
              <Label htmlFor="prog-code">Code</Label>
              <Input id="prog-code" className="mt-1.5" value={code} onChange={(e) => setCode(e.target.value)} required />
            </div>
            {!isEdit && (
              <div>
                <Label htmlFor="prog-dept">Department</Label>
                <Select value={departmentId} onValueChange={setDepartmentId}>
                  <SelectTrigger id="prog-dept" className="mt-1.5 w-full">
                    <SelectValue placeholder="Select…" />
                  </SelectTrigger>
                  <SelectContent>
                    {departments?.data.map((d) => (
                      <SelectItem key={d.id} value={d.id}>
                        {d.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div>
              <Label htmlFor="prog-degree">Degree type</Label>
              <Select value={degreeType} onValueChange={(v) => setDegreeType(v as Program["degree_type"])}>
                <SelectTrigger id="prog-degree" className="mt-1.5 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DEGREE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
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
              {isPending ? "Saving…" : isEdit ? "Save changes" : "Add program"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ProgramsListPage() {
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const { data, isLoading } = usePrograms({ page, pageSize });
  const { data: departments } = useDepartments({ page: 1, pageSize: 100 });
  const [formTarget, setFormTarget] = useState<FormTarget | null>(null);

  const departmentName = (id: string) => departments?.data.find((d) => d.id === id)?.name ?? "—";

  return (
    <div className="flex flex-col h-full">
      <AcademicsSubNav />
      <div className="flex items-start justify-between gap-4 px-6 py-5 border-b border-border">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Programs</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Degrees offered under each department.
          </p>
        </div>
        <Button onClick={() => setFormTarget({ mode: "create" })}>
          <Plus className="size-4" /> Add program
        </Button>
      </div>

      <div className="flex-1 overflow-auto px-6 py-4">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Code</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Department</TableHead>
              <TableHead>Type</TableHead>
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
                  No programs yet — add your first one.
                </TableCell>
              </TableRow>
            )}

            {!isLoading &&
              data?.data.map((program) => (
                <TableRow key={program.id}>
                  <TableCell className="font-mono text-xs">{program.code}</TableCell>
                  <TableCell className="font-medium text-foreground">{program.name}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {departmentName(program.department_id)}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{DEGREE_LABEL[program.degree_type]}</Badge>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="size-8">
                          <MoreHorizontal className="size-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setFormTarget({ mode: "edit", program })}>
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

      {formTarget && <ProgramFormDialog target={formTarget} onClose={() => setFormTarget(null)} />}
    </div>
  );
}

export default function Page() {
  return (
    <RequirePermission permission="courses:catalog:read">
      <ProgramsListPage />
    </RequirePermission>
  );
}
