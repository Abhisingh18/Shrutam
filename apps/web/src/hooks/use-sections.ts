import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import type { SectionListResponse } from "@/types/academics";

const sectionsKey = (params?: Record<string, unknown>) => ["sections", params] as const;

// No single-section GET exists on the backend (app/api/v1/academics.py only
// exposes list + create for sections) — list-only, per use-departments.ts conventions.
export function useSections(params: {
  page: number;
  pageSize: number;
  programId?: string;
  semesterId?: string;
}) {
  return useQuery({
    queryKey: sectionsKey(params),
    queryFn: () =>
      apiFetch<SectionListResponse>("/academics/sections", {
        params: {
          page: params.page,
          page_size: params.pageSize,
          program_id: params.programId || undefined,
          semester_id: params.semesterId || undefined,
        },
      }),
    placeholderData: (prev) => prev,
  });
}
