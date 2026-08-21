import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch, ApiError } from "@/lib/api-client";
import { API_BASE_URL } from "@/lib/env";
import { useAuthStore } from "@/stores/auth-store";
import type { Document, DocumentListResponse } from "@/types/document";

type OwnerType = "student" | "faculty";

const documentsKey = (ownerType: OwnerType, ownerId: string | undefined) =>
  ["documents", ownerType, ownerId] as const;

export function useDocuments(ownerType: OwnerType, ownerId: string | undefined) {
  return useQuery({
    queryKey: documentsKey(ownerType, ownerId),
    queryFn: () =>
      apiFetch<DocumentListResponse>("/documents", {
        params: { owner_type: ownerType, owner_id: ownerId },
      }),
    enabled: Boolean(ownerId),
  });
}

export function useUploadDocument(ownerType: OwnerType, ownerId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ category, file }: { category: Document["category"]; file: File }) => {
      const formData = new FormData();
      formData.append("owner_type", ownerType);
      formData.append("owner_id", ownerId);
      formData.append("category", category);
      formData.append("file", file);
      // apiFetch skips JSON.stringify for FormData bodies (see lib/api-client.ts)
      // so the browser can set its own multipart/form-data boundary.
      return apiFetch<Document>("/documents/upload", { method: "POST", body: formData });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: documentsKey(ownerType, ownerId) }),
  });
}

export function useDeleteDocument(ownerType: OwnerType, ownerId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (documentId: string) =>
      apiFetch<void>(`/documents/${documentId}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: documentsKey(ownerType, ownerId) }),
  });
}

/**
 * `<a href>` can't carry an Authorization header, and the API server runs on a
 * different origin/port than the frontend dev server, so a plain download link
 * would hit an unauthenticated (or cross-origin, cookie-less) URL. Instead we
 * fetch the file with the same bearer-token headers apiFetch uses, then trigger
 * a client-side blob download via a throwaway <a> tag.
 */
export async function downloadDocument(doc: Document): Promise<void> {
  const { tenantId, accessToken } = useAuthStore.getState();
  const headers: Record<string, string> = {};
  if (tenantId) headers["X-Tenant-ID"] = tenantId;
  if (accessToken) headers["Authorization"] = `Bearer ${accessToken}`;

  const res = await fetch(`${API_BASE_URL}${doc.download_url}`, { headers });
  if (!res.ok) {
    throw new ApiError(res.status, "download_failed", "Failed to download file");
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const link = window.document.createElement("a");
  link.href = url;
  link.download = doc.file_name;
  window.document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
