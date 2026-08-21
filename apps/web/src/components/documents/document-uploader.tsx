"use client";

import { useRef, useState } from "react";
import { FileText, Loader2, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useUploadDocument } from "@/hooks/use-documents";
import { ApiError } from "@/lib/api-client";
import type { Document } from "@/types/document";

const CATEGORY_OPTIONS: { value: Document["category"]; label: string }[] = [
  { value: "photo", label: "Photo" },
  { value: "id_proof", label: "ID Proof" },
  { value: "certificate", label: "Certificate" },
  { value: "other", label: "Other" },
];

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function DocumentUploader({
  ownerType,
  ownerId,
  onUploaded,
}: {
  ownerType: "student" | "faculty";
  ownerId: string;
  onUploaded?: (document: Document) => void;
}) {
  const uploadDocument = useUploadDocument(ownerType, ownerId);
  const [category, setCategory] = useState<Document["category"]>("other");
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async () => {
    if (!file) {
      toast.error("Choose a file first");
      return;
    }
    try {
      const document = await uploadDocument.mutateAsync({ category, file });
      toast.success(`${document.file_name} uploaded`);
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      onUploaded?.(document);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to upload document");
    }
  };

  return (
    <div className="rounded-lg border border-border p-4 space-y-4">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          const dropped = e.dataTransfer.files?.[0];
          if (dropped) setFile(dropped);
        }}
        onClick={() => fileInputRef.current?.click()}
        className={cn(
          "flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-6 text-center cursor-pointer transition-colors",
          dragging
            ? "border-primary bg-primary/5"
            : "border-border hover:border-primary/40 hover:bg-muted/40",
        )}
      >
        {file ? (
          <>
            <div className="flex items-center gap-2 rounded-md bg-muted px-3 py-1.5">
              <FileText className="size-4 text-primary shrink-0" />
              <span className="text-sm font-medium text-foreground truncate max-w-56">
                {file.name}
              </span>
              <span className="text-xs text-muted-foreground shrink-0">{formatSize(file.size)}</span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setFile(null);
                  if (fileInputRef.current) fileInputRef.current.value = "";
                }}
                className="text-muted-foreground hover:text-destructive shrink-0"
                aria-label="Remove file"
              >
                <X className="size-3.5" />
              </button>
            </div>
            <p className="text-xs text-muted-foreground">Click to choose a different file</p>
          </>
        ) : (
          <>
            <Upload className="size-6 text-muted-foreground" />
            <p className="text-sm text-foreground">
              <span className="font-medium text-primary">Click to upload</span> or drag and drop
            </p>
            <p className="text-xs text-muted-foreground">Up to 10MB</p>
          </>
        )}
        <input
          ref={fileInputRef}
          type="file"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="hidden"
        />
      </div>

      <div className="flex items-end gap-3">
        <div className="flex flex-col gap-1.5 flex-1">
          <label className="text-xs text-muted-foreground" htmlFor="document-category">
            Category
          </label>
          <Select value={category} onValueChange={(v) => setCategory(v as Document["category"])}>
            <SelectTrigger id="document-category" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CATEGORY_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button onClick={handleUpload} disabled={uploadDocument.isPending || !file}>
          {uploadDocument.isPending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Upload className="size-4" />
          )}
          Upload
        </Button>
      </div>
    </div>
  );
}
