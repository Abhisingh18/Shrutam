"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

interface DetailTab {
  value: string;
  label: string;
  content: React.ReactNode;
}

interface DetailPageTemplateProps {
  title: string;
  subtitle?: string;
  statusBadge?: { label: string; variant?: "default" | "success" | "warning" | "error" };
  actions?: React.ReactNode;
  tabs: DetailTab[];
  defaultTab?: string;
  rightRail?: React.ReactNode;
}

const badgeClassByVariant: Record<string, string> = {
  success: "bg-success-bg text-success border-transparent",
  warning: "bg-warning-bg text-warning border-transparent",
  error: "bg-destructive-bg text-destructive border-transparent",
  default: "",
};

/** docs/11-figma-design-system.md §8 DetailPageTemplate: identity header + tabs + right rail. */
export function DetailPageTemplate({
  title,
  subtitle,
  statusBadge,
  actions,
  tabs,
  defaultTab,
  rightRail,
}: DetailPageTemplateProps) {
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-start justify-between gap-4 px-6 py-5 border-b border-border">
        <div className="flex items-center gap-4">
          <Avatar className="size-12">
            <AvatarFallback className="bg-primary text-primary-foreground">
              {title.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-semibold text-foreground">{title}</h1>
              {statusBadge && (
                <Badge
                  variant="outline"
                  className={badgeClassByVariant[statusBadge.variant ?? "default"]}
                >
                  {statusBadge.label}
                </Badge>
              )}
            </div>
            {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
          </div>
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>

      <div className="flex flex-1 min-h-0">
        <div className="flex-1 min-w-0 overflow-auto">
          <Tabs defaultValue={defaultTab ?? tabs[0]?.value} className="h-full">
            <TabsList className="mx-6 mt-4">
              {tabs.map((tab) => (
                <TabsTrigger key={tab.value} value={tab.value}>
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>
            {tabs.map((tab) => (
              <TabsContent key={tab.value} value={tab.value} className="px-6 py-4">
                {tab.content}
              </TabsContent>
            ))}
          </Tabs>
        </div>

        {rightRail && (
          <aside className="hidden xl:block w-80 border-l border-border overflow-auto p-4 shrink-0">
            {rightRail}
          </aside>
        )}
      </div>
    </div>
  );
}

export { Button as DetailActionButton };
