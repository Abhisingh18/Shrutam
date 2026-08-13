import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import type { Book, BookCreateInput, BookListResponse, BookUpdateInput } from "@/types/library";

const booksKey = (params?: Record<string, unknown>) => ["books", params] as const;

export function useBooks(params: { page: number; pageSize: number; search?: string }) {
  return useQuery({
    queryKey: booksKey(params),
    queryFn: () =>
      apiFetch<BookListResponse>("/library", {
        params: {
          page: params.page,
          page_size: params.pageSize,
          search: params.search || undefined,
        },
      }),
    placeholderData: (prev) => prev,
  });
}

export function useBook(id: string | undefined) {
  return useQuery({
    queryKey: ["books", "detail", id],
    queryFn: () => apiFetch<Book>(`/library/${id}`),
    enabled: Boolean(id),
  });
}

// Cache invalidation keyed to backend domain events, mirroring use-students.ts —
// no live event stream yet in this scaffold, so we invalidate directly after each mutation.
export function useCreateBook() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: BookCreateInput) =>
      apiFetch<Book>("/library", { method: "POST", body: input }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["books"] }),
  });
}

export function useUpdateBook(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: BookUpdateInput) =>
      apiFetch<Book>(`/library/${id}`, { method: "PATCH", body: input }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["books"] });
      qc.invalidateQueries({ queryKey: ["books", "detail", id] });
    },
  });
}

export function useDeleteBook() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiFetch<void>(`/library/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["books"] }),
  });
}
