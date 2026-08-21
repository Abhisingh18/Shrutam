import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";

export interface BulkImportError {
  row: number;
  message: string;
}

export interface BulkImportResult {
  created: number;
  skipped_duplicates: number;
  errors: BulkImportError[];
}

export function useBulkImportStudents() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      return apiFetch<BulkImportResult>("/students/bulk-import", {
        method: "POST",
        body: formData,
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["students"] }),
  });
}
