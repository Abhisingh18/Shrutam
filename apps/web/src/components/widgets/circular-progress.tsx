const SIZE_CONFIG = {
  sm: { box: 72, stroke: 6, text: "text-base" },
  md: { box: 104, stroke: 8, text: "text-2xl" },
  lg: { box: 140, stroke: 9, text: "text-3xl" },
} as const;

/** Reusable ring gauge — attendance %, CGPA-as-percent, etc. */
export function CircularProgress({
  value,
  max = 100,
  size = "md",
  label,
  valueLabel,
  tone = "primary",
}: {
  value: number;
  max?: number;
  size?: keyof typeof SIZE_CONFIG;
  label?: string;
  /** Override the number shown in the center (e.g. "9.2" instead of "72%"). */
  valueLabel?: string;
  tone?: "primary" | "success" | "warning" | "destructive";
}) {
  const { box, stroke, text } = SIZE_CONFIG[size];
  const radius = (box - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const pct = Math.max(0, Math.min(1, max > 0 ? value / max : 0));
  const dashOffset = circumference * (1 - pct);

  const toneVar =
    tone === "success"
      ? "var(--success-solid)"
      : tone === "warning"
        ? "var(--warning-solid)"
        : tone === "destructive"
          ? "var(--destructive-solid)"
          : "var(--primary)";

  return (
    <div className="inline-flex flex-col items-center gap-2">
      <div className="relative" style={{ width: box, height: box }}>
        <svg width={box} height={box} className="-rotate-90">
          <circle
            cx={box / 2}
            cy={box / 2}
            r={radius}
            fill="none"
            stroke="var(--border)"
            strokeWidth={stroke}
          />
          <circle
            cx={box / 2}
            cy={box / 2}
            r={radius}
            fill="none"
            stroke={toneVar}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            style={{ transition: "stroke-dashoffset 0.6s ease-out" }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={`font-bold text-foreground tabular-nums ${text}`}>
            {valueLabel ?? `${Math.round(pct * 100)}%`}
          </span>
        </div>
      </div>
      {label && <span className="text-xs text-muted-foreground text-center">{label}</span>}
    </div>
  );
}
