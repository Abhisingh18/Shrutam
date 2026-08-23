"use client";

import {
  Users,
  GraduationCap,
  ClipboardList,
  CalendarCheck,
  FileCheck2,
  Wallet,
  TrendingUp,
} from "lucide-react";
import { RequirePermission } from "@/components/auth/require-permission";
import { StatTile } from "@/components/widgets/stat-tile";
import { CircularProgress } from "@/components/widgets/circular-progress";
import { Reveal } from "@/components/shared/reveal";
import { useAnalyticsSummary } from "@/hooks/use-analytics";

function AnalyticsDashboard() {
  const { data, isLoading } = useAnalyticsSummary();

  const attendancePct =
    data && data.todays_attendance_total > 0
      ? Math.round((data.todays_attendance_present / data.todays_attendance_total) * 100)
      : null;

  return (
    <div className="p-6 space-y-8">
      <Reveal>
        <h1 className="text-xl font-semibold text-foreground">Analytics &amp; Reports</h1>
        <p className="text-sm text-muted-foreground">
          A live snapshot across students, faculty, attendance, exams and fees.
        </p>
      </Reveal>

      {!isLoading && attendancePct !== null && (
        <Reveal delay={40}>
          <div className="rounded-xl border border-border bg-card p-6 flex flex-wrap items-center gap-8">
            <CircularProgress
              value={attendancePct}
              size="lg"
              tone={attendancePct >= 90 ? "success" : attendancePct >= 75 ? "warning" : "destructive"}
              valueLabel={`${attendancePct}%`}
              label="Today's attendance"
            />
            <div className="flex-1 min-w-[200px] text-sm text-muted-foreground">
              <p>
                <strong className="text-foreground tabular-nums">
                  {data?.todays_attendance_present}
                </strong>{" "}
                of <strong className="text-foreground tabular-nums">{data?.todays_attendance_total}</strong>{" "}
                students marked present today.
              </p>
            </div>
          </div>
        </Reveal>
      )}

      <div>
        <h2 className="text-sm font-semibold text-foreground mb-3">Enrollment</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Reveal delay={0}>
            <StatTile
              label="Total students"
              value={data?.total_students ?? 0}
              icon={GraduationCap}
              loading={isLoading}
              tone="primary"
              trend={data ? { direction: "up", label: `${data.active_students} active` } : undefined}
            />
          </Reveal>
          <Reveal delay={60}>
            <StatTile label="Total faculty" value={data?.total_faculty ?? 0} icon={Users} loading={isLoading} tone="chart-2" />
          </Reveal>
          <Reveal delay={120}>
            <StatTile
              label="Pending admissions"
              value={data?.pending_admissions ?? 0}
              icon={ClipboardList}
              loading={isLoading}
              tone="chart-1"
            />
          </Reveal>
        </div>
      </div>

      <div>
        <h2 className="text-sm font-semibold text-foreground mb-3">Operations</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Reveal delay={0}>
            <StatTile
              label="Today's attendance"
              value={data ? `${data.todays_attendance_present}/${data.todays_attendance_total}` : "0/0"}
              icon={CalendarCheck}
              loading={isLoading}
              tone="chart-4"
            />
          </Reveal>
          <Reveal delay={60}>
            <StatTile label="Upcoming exams" value={data?.upcoming_exams ?? 0} icon={FileCheck2} loading={isLoading} tone="chart-2" />
          </Reveal>
        </div>
      </div>

      <div>
        <h2 className="text-sm font-semibold text-foreground mb-3">Finance</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Reveal delay={0}>
            <StatTile
              label="Pending invoices"
              value={data?.pending_invoices_count ?? 0}
              icon={Wallet}
              loading={isLoading}
              tone="chart-1"
              trend={
                data
                  ? { direction: "down", label: `₹${data.pending_invoices_amount} outstanding` }
                  : undefined
              }
            />
          </Reveal>
          <Reveal delay={60}>
            <StatTile
              label="Total revenue collected"
              value={data ? `₹${data.total_revenue_collected}` : "₹0"}
              icon={TrendingUp}
              loading={isLoading}
              tone="primary"
            />
          </Reveal>
        </div>
      </div>
    </div>
  );
}

export default function AnalyticsPage() {
  return (
    <RequirePermission permission="analytics:dashboard:read">
      <AnalyticsDashboard />
    </RequirePermission>
  );
}
