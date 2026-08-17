import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import type { AnalyticsSummary } from "@/types/analytics";

export function useAnalyticsSummary(enabled: boolean = true) {
  return useQuery({
    queryKey: ["analytics", "summary"],
    queryFn: () => apiFetch<AnalyticsSummary>("/analytics/summary"),
    staleTime: 60_000,
    enabled,
  });
}
