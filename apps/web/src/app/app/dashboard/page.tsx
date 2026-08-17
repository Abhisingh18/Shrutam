"use client";

import Link from "next/link";
import {
  GraduationCap,
  Users,
  CalendarCheck,
  Wallet,
  ArrowRight,
  Clock,
} from "lucide-react";
import { useMe, usePermissions } from "@/hooks/use-me";
import { useAnalyticsSummary } from "@/hooks/use-analytics";
import { StatTile } from "@/components/widgets/stat-tile";
import { PLATFORM_NAV_ITEM, visibleNavItems } from "@/config/nav.config";

function QuickStats() {
  const permissions = usePermissions();
  const canSeeAnalytics = permissions.has("analytics:dashboard:read");
  const { data, isLoading } = useAnalyticsSummary(canSeeAnalytics);

  if (!canSeeAnalytics) return null;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <StatTile
        label="Total students"
        value={data?.total_students ?? 0}
        icon={GraduationCap}
        loading={isLoading}
        trend={data ? { direction: "up", label: `${data.active_students} active` } : undefined}
      />
      <StatTile label="Total faculty" value={data?.total_faculty ?? 0} icon={Users} loading={isLoading} />
      <StatTile
        label="Today's attendance"
        value={data ? `${data.todays_attendance_present}/${data.todays_attendance_total}` : "0/0"}
        icon={CalendarCheck}
        loading={isLoading}
      />
      <StatTile
        label="Pending invoices"
        value={data?.pending_invoices_count ?? 0}
        icon={Wallet}
        loading={isLoading}
        trend={
          data ? { direction: "down", label: `₹${data.pending_invoices_amount} outstanding` } : undefined
        }
      />
    </div>
  );
}

export default function DashboardPage() {
  const { data: me } = useMe();
  const permissions = usePermissions();

  const firstName = me?.full_name?.split(" ")[0];
  const role = me?.role ?? "guest";

  const allVisible = visibleNavItems(role, permissions, me?.institution_type);
  const workspaceItems = allVisible.filter(
    (item) => item.implemented && item.href !== "/app/dashboard" && item.href !== PLATFORM_NAV_ITEM.href,
  );
  const comingSoonItems = allVisible.filter((item) => !item.implemented);
  const platformVisible = allVisible.some((item) => item.href === PLATFORM_NAV_ITEM.href);

  return (
    <div className="p-6 space-y-8">
      <div>
        <h1 className="text-xl font-semibold text-foreground">
          {firstName ? `Welcome back, ${firstName}` : "Welcome"}
        </h1>
        <p className="text-sm text-muted-foreground capitalize">
          {role.replace(/_/g, " ")}
          {me?.institution_name && ` · ${me.institution_name}`}
          {me?.institution_type && ` (${me.institution_type.replace(/_/g, " ")})`}
        </p>
      </div>

      <QuickStats />

      <div>
        <h2 className="text-sm font-semibold text-foreground mb-1">Your workspace</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Everything you have access to, in one place — click any card to open it.
        </p>

        {platformVisible && (
          <Link
            href={PLATFORM_NAV_ITEM.href}
            className="group mb-3 flex items-center gap-4 rounded-lg border border-dashed border-primary/40 bg-primary/5 p-4 hover:border-primary transition-colors"
          >
            <div className="inline-flex items-center justify-center size-10 rounded-lg bg-primary/10 text-primary shrink-0">
              <PLATFORM_NAV_ITEM.icon className="size-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-medium text-foreground">{PLATFORM_NAV_ITEM.label}</div>
              <div className="text-sm text-muted-foreground truncate">{PLATFORM_NAV_ITEM.description}</div>
            </div>
            <ArrowRight className="size-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0" />
          </Link>
        )}

        {workspaceItems.length === 0 ? (
          <p className="text-sm text-muted-foreground rounded-lg border border-dashed border-border p-6 text-center">
            Your role doesn&apos;t have access to any modules yet — ask your institution admin
            to check your permissions.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {workspaceItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="group flex items-start gap-3 rounded-lg border border-border bg-card p-4 hover:border-primary/40 hover:shadow-sm transition-all"
              >
                <div className="inline-flex items-center justify-center size-10 rounded-lg bg-muted text-foreground shrink-0 group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                  <item.icon className="size-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-foreground flex items-center gap-1.5">
                    {item.label}
                    <ArrowRight className="size-3.5 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all text-primary" />
                  </div>
                  <div className="text-sm text-muted-foreground mt-0.5">{item.description}</div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {comingSoonItems.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-foreground mb-1 flex items-center gap-1.5">
            <Clock className="size-4 text-muted-foreground" /> Coming soon
          </h2>
          <p className="text-sm text-muted-foreground mb-4">
            Wired into navigation already, but not built yet — so you know what to expect.
          </p>
          <div className="flex flex-wrap gap-2">
            {comingSoonItems.map((item) => (
              <span
                key={item.href}
                className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-border px-3 py-1.5 text-sm text-muted-foreground"
              >
                <item.icon className="size-3.5" />
                {item.label}
                <span className="text-[10px] uppercase tracking-wide text-muted-foreground/70">
                  Phase {item.phase}
                </span>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
