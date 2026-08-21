"use client";

import { useState } from "react";
import { Download, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useDeleteDocument, useDocuments, downloadDocument } from "@/hooks/use-documents";
import { ApiError } from "@/lib/api-client";
import type { Document } from "@/types/document";

const CATEGORY_LABELS: Record<Document["category"], string> = {
  photo: "Photo",
  id_proof: "ID Proof",
  certificate: "Certificate",
  other: "Other",
};

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function DocumentRow({
  document,
  onDelete,
  deleting,
}: {
  document: Document;
  onDelete: (id: string) => void;
  deleting: boolean;
}) {
  const [downloading, setDownloading] = useState(false);

  const handleDownload = async () => {
    setDownloading(true);
    try {
      await downloadDocument(document);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to download file");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="flex items-center justify-between gap-4 px-4 py-3 text-sm">
      <div className="flex min-w-0 items-center gap-3">
        <Badge variant="outline">{CATEGORY_LABELS[document.category]}</Badge>
        <span className="truncate font-medium text-foreground">{document.file_name}</span>
        <span className="shrink-0 text-muted-foreground">{formatSize(document.size_bytes)}</span>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={handleDownload}
          disabled={downloading}
          aria-label={`Download ${document.file_name}`}
        >
          {downloading ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => onDelete(document.id)}
          disabled={deleting}
          aria-label={`Delete ${document.file_name}`}
        >
          <Trash2 className="size-4 text-destructive" />
        </Button>
      </div>
    </div>
  );
}

export function DocumentList({
  ownerType,
  ownerId,
}: {
  ownerType: "student" | "faculty";
  ownerId: string;
}) {
  const { data, isLoading } = useDocuments(ownerType, ownerId);
  const deleteDocument = useDeleteDocument(ownerType, ownerId);
  const [pendingId, setPendingId] = useState<string | null>(null);

  const handleDelete = async (id: string) => {
    if (!window.confirm("Delete this document? This can't be undone.")) return;
    setPendingId(id);
    try {
      await deleteDocument.mutateAsync(id);
      toast.success("Document deleted");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to delete document");
    } finally {
      setPendingId(null);
    }
  };

  if (isLoading) return <Skeleton className="h-32 w-full max-w-2xl" />;

  const documents = data?.data ?? [];
  if (documents.length === 0) {
    return <p className="py-8 text-center text-sm text-muted-foreground">No documents uploaded yet.</p>;
  }

  return (
    <div className="max-w-2xl divide-y divide-border rounded-lg border border-border">
      {documents.map((document) => (
        <DocumentRow
          key={document.id}
          document={document}
          onDelete={handleDelete}
          deleting={pendingId === document.id}
        />
      ))}
    </div>
  );
}
