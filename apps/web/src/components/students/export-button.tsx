"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/stores/auth-store";
import { API_BASE_URL } from "@/lib/env";

/**
 * Self-contained CSV export trigger for the Students module — zero props,
 * drop it into any toolbar. `apiFetch` (lib/api-client.ts) always parses the
 * response body as JSON, but this endpoint returns raw text/csv, so we do a
 * direct authenticated fetch here instead, mirroring apiFetch's base-URL /
 * tenant / auth-header conventions rather than modifying the shared helper.
 */
export function StudentsExportButton() {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const { tenantId, accessToken } = useAuthStore.getState();
      const headers: Record<string, string> = {};
      if (tenantId) headers["X-Tenant-ID"] = tenantId;
      if (accessToken) headers["Authorization"] = `Bearer ${accessToken}`;

      const res = await fetch(`${API_BASE_URL}/students/export`, { headers });
      if (!res.ok) {
        throw new Error(`Export failed (${res.status})`);
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "students.csv";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Export failed");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Button variant="outline" onClick={handleExport} disabled={isExporting}>
      {isExporting ? "Exporting…" : "Export CSV"}
    </Button>
  );
}
