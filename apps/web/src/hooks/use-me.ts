import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import { useAuthStore } from "@/stores/auth-store";
import type { MeResponse } from "@/types/auth";

export function useMe() {
  const accessToken = useAuthStore((s) => s.accessToken);

  return useQuery({
    queryKey: ["auth", "me"],
    queryFn: () => apiFetch<MeResponse>("/auth/me"),
    enabled: Boolean(accessToken),
    staleTime: 5 * 60_000,
  });
}

export function usePermissions(): Set<string> {
  const { data } = useMe();
  return new Set(data?.permissions ?? []);
}
