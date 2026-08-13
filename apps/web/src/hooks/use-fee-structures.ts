import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import type {
  FeeStructure,
  FeeStructureCreateInput,
  FeeStructureListResponse,
} from "@/types/finance";

export function useFeeStructures(params: { page: number; pageSize: number }) {
  return useQuery({
    queryKey: ["fee-structures", params],
    queryFn: () =>
      apiFetch<FeeStructureListResponse>("/finance/fee-structures", {
        params: { page: params.page, page_size: params.pageSize },
      }),
    placeholderData: (prev) => prev,
  });
}

export function useCreateFeeStructure() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: FeeStructureCreateInput) =>
      apiFetch<FeeStructure>("/finance/fee-structures", { method: "POST", body: input }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["fee-structures"] }),
  });
}
