import { ApiError } from "@/lib/api-client";
import { API_BASE_URL } from "@/lib/env";
import { useAuthStore } from "@/stores/auth-store";

/**
 * `<a href>` can't carry an Authorization header, so PDF endpoints (report
 * cards, ID cards, receipts…) are fetched with the same bearer-token headers
 * apiFetch uses, then handed to the browser as a blob download — same
 * approach as downloadDocument() in hooks/use-documents.ts.
 */
export async function downloadPdf(
  path: string,
  filename: string,
  options: { method?: "GET" | "POST"; body?: unknown } = {},
): Promise<void> {
  const { tenantId, accessToken } = useAuthStore.getState();
  const headers: Record<string, string> = {};
  if (tenantId) headers["X-Tenant-ID"] = tenantId;
  if (accessToken) headers["Authorization"] = `Bearer ${accessToken}`;
  if (options.body !== undefined) headers["Content-Type"] = "application/json";

  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: options.method ?? "GET",
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });
  if (!res.ok) {
    throw new ApiError(res.status, "download_failed", "Failed to generate PDF");
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
