"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ApiError } from "@/lib/api-client";
import { useBulkImportStudents, type BulkImportResult } from "@/hooks/use-students-bulk";

/**
 * Self-contained bulk CSV importer for the Students module. Renders its own
 * trigger button, so it can be dropped straight into any toolbar with zero
 * props — e.g. `<StudentsBulkImportDialog />` next to "Add student".
 */
export function StudentsBulkImportDialog() {
  const [open, setOpen] = useState(false);
  const [result, setResult] = useState<BulkImportResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bulkImport = useBulkImportStudents();

  const handleImport = async () => {
    const file = fileInputRef.current?.files?.[0];
    if (!file) {
      toast.error("Choose a CSV file first");
      return;
    }
    try {
      const res = await bulkImport.mutateAsync(file);
      setResult(res);
      if (res.errors.length === 0) {
        toast.success(`Imported ${res.created} student${res.created === 1 ? "" : "s"}`);
      }
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Import failed");
    }
  };

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) {
      setResult(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline">Import CSV</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Import students from CSV</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <p className="text-sm text-muted-foreground">
            CSV needs a header row with columns: admission_number, full_name, email, phone,
            gender, date_of_birth. Rows with an admission number that already exists are
            skipped, not overwritten.
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            className="block w-full text-sm text-foreground file:mr-3 file:rounded-lg file:border file:border-border file:bg-background file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-foreground"
          />
          {result && (
            <div className="rounded-lg border border-border p-3 text-sm space-y-2">
              <p>
                <span className="font-medium text-foreground">{result.created}</span> created,{" "}
                <span className="font-medium text-foreground">{result.skipped_duplicates}</span>{" "}
                skipped as duplicates.
              </p>
              {result.errors.length > 0 && (
                <div className="max-h-40 overflow-y-auto space-y-1 border-t border-border pt-2">
                  {result.errors.map((e, i) => (
                    <p key={i} className="text-destructive text-xs">
                      Row {e.row}: {e.message}
                    </p>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
        <DialogFooter>
          <Button onClick={handleImport} disabled={bulkImport.isPending}>
            {bulkImport.isPending ? "Importing…" : "Import"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
