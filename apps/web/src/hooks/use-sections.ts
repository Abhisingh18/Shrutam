import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import type {
  Section,
  SectionCreateInput,
  SectionListResponse,
  SectionUpdateInput,
} from "@/types/academics";

const sectionsKey = (params?: Record<string, unknown>) => ["sections", params] as const;

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

export function useSection(id: string | undefined) {
  return useQuery({
    queryKey: ["sections", "detail", id],
    queryFn: () => apiFetch<Section>(`/academics/sections/${id}`),
    enabled: Boolean(id),
  });
}

export function useCreateSection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: SectionCreateInput) =>
      apiFetch<Section>("/academics/sections", { method: "POST", body: input }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["sections"] }),
  });
}

export function useUpdateSection(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: SectionUpdateInput) =>
      apiFetch<Section>(`/academics/sections/${id}`, { method: "PATCH", body: input }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sections"] });
      qc.invalidateQueries({ queryKey: ["sections", "detail", id] });
    },
  });
}
