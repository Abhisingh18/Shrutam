import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import type { AcademicsSummary } from "@/types/academics";

export function useAcademicsSummary() {
  return useQuery({
    queryKey: ["academics", "summary"],
    queryFn: () => apiFetch<AcademicsSummary>("/academics/summary"),
  });
}
