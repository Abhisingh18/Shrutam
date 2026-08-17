import {
  LayoutDashboard,
  GraduationCap,
  Users,
  CalendarCheck,
  Wallet,
  Search,
  Bell,
  ArrowUpRight,
} from "lucide-react";

const NAV = [
  { icon: LayoutDashboard, label: "Dashboard", active: true },
  { icon: GraduationCap, label: "Students" },
  { icon: Users, label: "Faculty" },
  { icon: CalendarCheck, label: "Attendance" },
  { icon: Wallet, label: "Fees & Finance" },
];

const STATS = [
  { label: "Total students", value: "1,284", trend: "+4.2%", tone: "success" as const },
  { label: "Attendance today", value: "96%", trend: "+1.1%", tone: "success" as const },
  { label: "Fees collected", value: "₹42.8L", trend: "+8.9%", tone: "success" as const },
];

const ROWS = [
  { name: "Ananya Krishnan", cls: "Grade 10 · B", status: "Present", tone: "success" as const },
  { name: "Rohit Sharma", cls: "Grade 10 · B", status: "Present", tone: "success" as const },
  { name: "Priya Singh", cls: "Grade 10 · A", status: "Late", tone: "warning" as const },
];

const toneClasses: Record<"success" | "warning", string> = {
  success: "bg-success-bg text-success",
  warning: "bg-warning-bg text-warning",
};

/**
 * Illustrative product mockup for the marketing hero — built from the same
 * design tokens as the real app shell (src/components/app-shell/*), not a
 * screenshot. Sample data only.
 */
export function ProductMockup() {
  return (
    <div className="relative">
      {/* Ambient glow behind the card */}
      <div
        className="absolute -inset-6 rounded-[2rem] bg-gradient-to-br from-primary/20 via-accent/10 to-secondary/20 blur-2xl"
        aria-hidden
      />

      <div className="relative rounded-2xl border border-border bg-card shadow-2xl shadow-primary/10 overflow-hidden">
        {/* Browser chrome */}
        <div className="flex items-center gap-1.5 border-b border-border bg-muted/50 px-4 py-3">
          <span className="size-2.5 rounded-full bg-destructive-solid/60" />
          <span className="size-2.5 rounded-full bg-warning-solid/60" />
          <span className="size-2.5 rounded-full bg-success-solid/60" />
          <div className="ml-3 flex-1 rounded-md bg-background/80 border border-border px-3 py-1 text-[11px] text-muted-foreground">
            app.sutram.io/dashboard
          </div>
        </div>

        {/* App shell replica */}
        <div className="flex h-[340px] sm:h-[380px]">
          <div className="hidden sm:flex w-40 shrink-0 flex-col border-r border-border bg-sidebar py-3">
            <div className="flex items-center gap-2 px-4 pb-3 mb-1">
              <span className="inline-flex size-5 items-center justify-center rounded bg-sidebar-primary text-sidebar-primary-foreground text-[10px] font-bold">
                S
              </span>
              <span className="text-xs font-semibold text-sidebar-foreground">Sutram</span>
            </div>
            {NAV.map((item) => (
              <div
                key={item.label}
                className={`mx-2 mb-0.5 flex items-center gap-2 rounded-md px-2.5 py-1.5 text-[11px] ${
                  item.active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                    : "text-sidebar-foreground/70"
                }`}
              >
                <item.icon className="size-3.5 shrink-0" />
                {item.label}
              </div>
            ))}
          </div>

          <div className="flex-1 min-w-0 flex flex-col">
            <div className="flex items-center gap-2 border-b border-border px-4 py-2.5">
              <div className="flex-1 flex items-center gap-1.5 rounded-md border border-input bg-background px-2 py-1 text-[11px] text-muted-foreground max-w-[160px]">
                <Search className="size-3 shrink-0" />
                Search…
              </div>
              <div className="ml-auto flex items-center gap-2">
                <Bell className="size-3.5 text-muted-foreground" />
                <span className="size-5 rounded-full bg-primary text-primary-foreground text-[9px] font-medium flex items-center justify-center">
                  AK
                </span>
              </div>
            </div>

            <div className="flex-1 overflow-hidden p-3 space-y-3">
              <div className="grid grid-cols-3 gap-2">
                {STATS.map((s) => (
                  <div key={s.label} className="rounded-lg border border-border bg-card p-2.5">
                    <div className="text-[9px] text-muted-foreground truncate">{s.label}</div>
                    <div className="text-sm font-bold text-foreground tabular-nums mt-0.5">
                      {s.value}
                    </div>
                    <div className="mt-1 inline-flex items-center gap-0.5 text-[9px] font-medium text-success">
                      <ArrowUpRight className="size-2.5" />
                      {s.trend}
                    </div>
                  </div>
                ))}
              </div>

              <div className="rounded-lg border border-border bg-card overflow-hidden">
                <div className="px-3 py-2 border-b border-border text-[10px] font-medium text-foreground">
                  Today&apos;s attendance
                </div>
                <div className="divide-y divide-border">
                  {ROWS.map((r) => (
                    <div key={r.name} className="flex items-center justify-between px-3 py-1.5">
                      <div>
                        <div className="text-[10px] font-medium text-foreground">{r.name}</div>
                        <div className="text-[9px] text-muted-foreground">{r.cls}</div>
                      </div>
                      <span
                        className={`rounded-full px-1.5 py-0.5 text-[9px] font-medium ${toneClasses[r.tone]}`}
                      >
                        {r.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Floating accent chips for depth */}
      <div className="hidden lg:flex absolute -right-6 top-10 items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 shadow-lg animate-float-slow">
        <span className="size-2 rounded-full bg-success-solid" />
        <span className="text-xs font-medium text-foreground">Invoice paid</span>
      </div>
      <div className="hidden lg:flex absolute -left-8 bottom-16 items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 shadow-lg animate-float-slow-reverse">
        <span className="size-2 rounded-full bg-accent" />
        <span className="text-xs font-medium text-foreground">AI drafted 3 replies</span>
      </div>
    </div>
  );
}
