"use client";

import Link from "next/link";
import { GraduationCap, Sparkles, ArrowRight } from "lucide-react";
import { useMe } from "@/hooks/use-me";
import { useStudents } from "@/hooks/use-students";
import { StatTile } from "@/components/widgets/stat-tile";
import { Button } from "@/components/ui/button";

export default function DashboardPage() {
  const { data: me } = useMe();
  const { data: students, isLoading } = useStudents({ page: 1, pageSize: 1 });

  const firstName = me?.full_name?.split(" ")[0];

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">
          {firstName ? `Welcome back, ${firstName}` : "Welcome"}
        </h1>
        <p className="text-sm text-muted-foreground capitalize">
          {me?.role.replace(/_/g, " ")} · Phase 1 workspace
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatTile
          label="Total students"
          value={students?.meta.total ?? 0}
          icon={GraduationCap}
          loading={isLoading}
        />
      </div>

      <div className="rounded-lg border border-border bg-card p-6 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="font-medium text-foreground flex items-center gap-2">
            <GraduationCap className="size-4 text-primary" />
            Students module is live
          </h2>
          <p className="text-sm text-muted-foreground mt-1 max-w-md">
            Add and manage student records now. Faculty, Attendance, Fees and Exams ship next
            in Phase 1.
          </p>
        </div>
        <Button asChild>
          <Link href="/app/students">
            Go to Students <ArrowRight className="size-4" />
          </Link>
        </Button>
      </div>

      <div className="rounded-lg border border-dashed border-border p-6 flex items-start gap-3">
        <Sparkles className="size-5 text-accent shrink-0 mt-0.5" />
        <div>
          <h2 className="font-medium text-foreground">AI Assistant — coming in Phase 3</h2>
          <p className="text-sm text-muted-foreground mt-1">
            A role-scoped copilot that can only see and do what you can — see{" "}
            <code className="text-xs bg-muted px-1 py-0.5 rounded">docs/10-ai-features.md</code>.
          </p>
        </div>
      </div>
    </div>
  );
}
