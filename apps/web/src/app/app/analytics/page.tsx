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
import { useAnalyticsSummary } from "@/hooks/use-analytics";

function AnalyticsDashboard() {
  const { data, isLoading } = useAnalyticsSummary();

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Analytics & Reports</h1>
        <p className="text-sm text-muted-foreground">
          A live snapshot across students, faculty, attendance, exams and fees.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatTile
          label="Total students"
          value={data?.total_students ?? 0}
          icon={GraduationCap}
          loading={isLoading}
          trend={
            data ? { direction: "up", label: `${data.active_students} active` } : undefined
          }
        />
        <StatTile
          label="Total faculty"
          value={data?.total_faculty ?? 0}
          icon={Users}
          loading={isLoading}
        />
        <StatTile
          label="Pending admissions"
          value={data?.pending_admissions ?? 0}
          icon={ClipboardList}
          loading={isLoading}
        />
        <StatTile
          label="Today's attendance"
          value={
            data ? `${data.todays_attendance_present}/${data.todays_attendance_total}` : "0/0"
          }
          icon={CalendarCheck}
          loading={isLoading}
        />
        <StatTile
          label="Upcoming exams"
          value={data?.upcoming_exams ?? 0}
          icon={FileCheck2}
          loading={isLoading}
        />
        <StatTile
          label="Pending invoices"
          value={data?.pending_invoices_count ?? 0}
          icon={Wallet}
          loading={isLoading}
          trend={
            data
              ? { direction: "down", label: `₹${data.pending_invoices_amount} outstanding` }
              : undefined
          }
        />
        <StatTile
          label="Total revenue collected"
          value={data ? `₹${data.total_revenue_collected}` : "₹0"}
          icon={TrendingUp}
          loading={isLoading}
        />
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
