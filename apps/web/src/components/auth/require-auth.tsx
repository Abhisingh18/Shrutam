"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/auth-store";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Page-level route guard — docs/09-frontend-architecture.md §6: nav-level
 * hiding is only half the story, direct-URL access must be blocked too.
 *
 * Zustand's `persist` rehydration API is browser-only — reading
 * `useAuthStore.persist.hasHydrated()` during the server-side render pass
 * (which Next.js still does once for "use client" components) throws, so
 * hydration state is tracked via useEffect instead of read at render time.
 */
export function RequireAuth({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const accessToken = useAuthStore((s) => s.accessToken);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(useAuthStore.persist.hasHydrated());
    const unsub = useAuthStore.persist.onFinishHydration(() => setHydrated(true));
    return unsub;
  }, []);

  useEffect(() => {
    if (hydrated && !accessToken) {
      router.replace("/login");
    }
  }, [hydrated, accessToken, router]);

  if (!hydrated || !accessToken) {
    return (
      <div className="p-6 space-y-3">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  return <>{children}</>;
}
