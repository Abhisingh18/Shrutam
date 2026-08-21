"use client";

import { useRef, useState } from "react";
import { Loader2, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useUploadDocument } from "@/hooks/use-documents";
import { ApiError } from "@/lib/api-client";
import type { Document } from "@/types/document";

const CATEGORY_OPTIONS: { value: Document["category"]; label: string }[] = [
  { value: "photo", label: "Photo" },
  { value: "id_proof", label: "ID Proof" },
  { value: "certificate", label: "Certificate" },
  { value: "other", label: "Other" },
];

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
    <div className="flex flex-wrap items-end gap-3 rounded-lg border border-border p-4">
      <div className="flex flex-col gap-1.5">
        <label className="text-xs text-muted-foreground" htmlFor="document-category">
          Category
        </label>
        <Select value={category} onValueChange={(v) => setCategory(v as Document["category"])}>
          <SelectTrigger id="document-category" className="w-40">
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

      <div className="flex flex-col gap-1.5">
        <label className="text-xs text-muted-foreground" htmlFor="document-file">
          File
        </label>
        <input
          ref={fileInputRef}
          id="document-file"
          type="file"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="h-8 w-64 rounded-lg border border-input bg-transparent text-sm file:mr-3 file:h-full file:border-0 file:bg-muted file:px-2.5 file:text-sm file:font-medium file:text-foreground"
        />
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
  );
}
