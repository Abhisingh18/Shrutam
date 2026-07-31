"use client";

import { use } from "react";
import { Construction } from "lucide-react";
import { NAV_ITEMS, PLATFORM_NAV_ITEM } from "@/config/nav.config";

export default function ModuleStubPage({
  params,
}: {
  params: Promise<{ module: string }>;
}) {
  const { module } = use(params);
  const item =
    [...NAV_ITEMS, PLATFORM_NAV_ITEM].find((i) => i.href === `/app/${module}`) ?? null;

  return (
    <div className="flex flex-col items-center justify-center h-full py-24 text-center px-4">
      <Construction className="size-12 text-muted-foreground mb-4" />
      <h1 className="text-lg font-semibold text-foreground">
        {item?.label ?? "This module"} is coming in Phase {item?.phase ?? "2-3"}
      </h1>
      <p className="text-sm text-muted-foreground mt-1 max-w-sm">
        Students is the first fully-built module in this scaffold — see{" "}
        <code className="text-xs bg-muted px-1 py-0.5 rounded">docs/01-prd.md</code> for the
        full phase breakdown.
      </p>
    </div>
  );
}
