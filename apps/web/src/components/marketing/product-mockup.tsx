import {
  GraduationCap,
  CalendarCheck,
  Wallet,
  ArrowUpRight,
  Sparkles,
  CheckCheck,
} from "lucide-react";

// Purely illustrative sample data — not a literal screenshot of the product,
// a stylized composition in the same design language (see globals.css tokens).
const WEEKLY_BARS = [62, 78, 55, 88, 71, 94, 83];

const STATS = [
  { icon: GraduationCap, label: "Students", value: "1,284" },
  { icon: CalendarCheck, label: "Attendance", value: "96%" },
  { icon: Wallet, label: "Collected", value: "₹42.8L" },
];

/**
 * Hero visual: two large, generously-spaced cards rather than a shrunk
 * replica of the full app shell — small text crammed into a mini "browser
 * window" reads as cluttered at hero scale, so this leans into bold
 * numbers, real whitespace and layered depth instead.
 */
export function ProductMockup() {
  return (
    <div className="relative py-6">
      {/* Ambient glow */}
      <div
        className="absolute -inset-10 rounded-[3rem] bg-gradient-to-br from-primary/25 via-accent/10 to-secondary/20 blur-3xl"
        aria-hidden
      />

      <div className="relative mx-auto max-w-md">
        {/* Primary card */}
        <div className="relative rounded-3xl border border-border bg-card shadow-2xl shadow-primary/15 p-7">
          <div className="flex items-center gap-2 mb-6">
            <span className="relative flex size-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success-solid opacity-75" />
              <span className="relative inline-flex size-2 rounded-full bg-success-solid" />
            </span>
            <span className="text-sm font-medium text-muted-foreground">
              Greenwood High School
            </span>
          </div>

          <div className="flex items-end justify-between gap-4">
            <div>
              <div className="text-5xl font-bold text-foreground tabular-nums tracking-tight">
                1,284
              </div>
              <div className="text-sm text-muted-foreground mt-1">Total students</div>
            </div>
            <span className="inline-flex items-center gap-1 rounded-full bg-success-bg px-2.5 py-1 text-xs font-semibold text-success mb-1">
              <ArrowUpRight className="size-3.5" />
              4.2%
            </span>
          </div>

          {/* Weekly trend bars */}
          <div className="mt-6 flex items-end gap-2 h-16">
            {WEEKLY_BARS.map((h, i) => (
              <div
                key={i}
                className="flex-1 rounded-t-md bg-gradient-to-t from-primary to-primary/40"
                style={{ height: `${h}%` }}
              />
            ))}
          </div>

          <div className="mt-6 pt-6 border-t border-border grid grid-cols-3 gap-3">
            {STATS.slice(1).map((s) => (
              <div key={s.label} className="flex items-center gap-2.5">
                <div className="flex items-center justify-center size-9 rounded-lg bg-muted text-foreground shrink-0">
                  <s.icon className="size-4" />
                </div>
                <div className="min-w-0">
                  <div className="text-base font-semibold text-foreground tabular-nums leading-tight">
                    {s.value}
                  </div>
                  <div className="text-xs text-muted-foreground truncate">{s.label}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Floating AI card */}
        <div className="absolute -bottom-8 -left-8 w-64 rounded-2xl border border-accent/20 bg-card shadow-xl shadow-accent/10 p-5 rotate-[-3deg] hover:rotate-0 transition-transform">
          <div className="flex items-center gap-2.5 mb-2.5">
            <div className="flex items-center justify-center size-8 rounded-lg bg-accent/15 text-accent shrink-0">
              <Sparkles className="size-4" />
            </div>
            <span className="text-sm font-semibold text-foreground">AI Assistant</span>
          </div>
          <p className="text-sm text-muted-foreground leading-snug">
            Drafted 3 parent replies about tomorrow&apos;s PTM — ready for your review.
          </p>
          <div className="flex items-center gap-1.5 mt-3 text-xs font-medium text-success">
            <CheckCheck className="size-3.5" />
            Awaiting approval
          </div>
        </div>

        {/* Floating fee-paid chip */}
        <div className="hidden sm:flex absolute -top-6 -right-6 items-center gap-2 rounded-full border border-border bg-card px-4 py-2.5 shadow-lg animate-float-slow">
          <span className="size-2 rounded-full bg-success-solid shrink-0" />
          <span className="text-sm font-medium text-foreground whitespace-nowrap">
            Invoice #4821 paid
          </span>
        </div>
      </div>
    </div>
  );
}
