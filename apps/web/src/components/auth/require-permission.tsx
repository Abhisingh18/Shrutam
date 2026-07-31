"use client";

import { ShieldX } from "lucide-react";
import { useMe, usePermissions } from "@/hooks/use-me";

export function PermissionDeniedScreen() {
  return (
    <div className="flex flex-col items-center justify-center h-full py-24 text-center px-4">
      <ShieldX className="size-12 text-muted-foreground mb-4" />
      <h2 className="text-lg font-semibold">You don&apos;t have access to this page</h2>
      <p className="text-sm text-muted-foreground mt-1 max-w-sm">
        Your role doesn&apos;t include the permission required here. Ask your institution admin
        if you believe this is a mistake.
      </p>
    </div>
  );
}

/** docs/09-frontend-architecture.md §6 — page-level guard, server-checked by the API regardless. */
export function RequirePermission({
  permission,
  children,
}: {
  permission: string;
  children: React.ReactNode;
}) {
  const { data: me, isLoading } = useMe();
  const permissions = usePermissions();

  if (isLoading) return null;
  if (me?.role === "super_admin" || permissions.has(permission)) {
    return <>{children}</>;
  }
  return <PermissionDeniedScreen />;
}
