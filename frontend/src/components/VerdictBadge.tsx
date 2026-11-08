interface VerdictBadgeProps {
  verdict: string;
  size?: "sm" | "md" | "lg";
  showGlow?: boolean;
}

const BADGE_CONFIG: Record<
  string,
  {
    bgClass: string;
    textClass: string;
    borderClass: string;
    glowClass: string;
    dotClass: string;
    icon: string;
  }
> = {
  "Verified": {
    bgClass: "bg-stark-emerald/10 dark:bg-stark-emerald/15",
    textClass: "text-stark-emerald font-semibold",
    borderClass: "border-stark-emerald/40",
    glowClass: "shadow-[0_0_12px_var(--success-border)]",
    dotClass: "bg-stark-emerald",
    icon: "✓",
  },
  "Manual review": {
    bgClass: "bg-stark-amber/10 dark:bg-stark-amber/15",
    textClass: "text-stark-amber font-semibold",
    borderClass: "border-stark-amber/40",
    glowClass: "shadow-[0_0_12px_var(--warning-border)]",
    dotClass: "bg-stark-amber",
    icon: "⚠",
  },
  "Suspicious activity": {
    bgClass: "bg-stark-red/10 dark:bg-stark-red/15",
    textClass: "text-stark-red font-semibold",
    borderClass: "border-stark-red/40",
    glowClass: "shadow-[0_0_12px_var(--danger-border)]",
    dotClass: "bg-stark-red",
    icon: "✕",
  },
  "Unregistered product": {
    bgClass: "bg-bg-elevated",
    textClass: "text-text-secondary font-semibold",
    borderClass: "border-stark-border",
    glowClass: "shadow-sm",
    dotClass: "bg-text-secondary",
    icon: "?",
  },
};

export default function VerdictBadge({
  verdict,
  size = "md",
  showGlow = true,
}: VerdictBadgeProps) {
  const style = BADGE_CONFIG[verdict] ?? BADGE_CONFIG["Unregistered product"];

  const sizeClasses = {
    sm: "px-2 py-0.5 text-xs gap-1.5",
    md: "px-3 py-1 text-xs font-semibold gap-2",
    lg: "px-4 py-2 text-sm font-bold gap-2.5",
  }[size];

  return (
    <span
      className={`inline-flex items-center rounded-lg border font-mono tracking-wide transition-all ${
        style.bgClass
      } ${style.textClass} ${style.borderClass} ${
        showGlow ? style.glowClass : ""
      } ${sizeClasses}`}
    >
      <span className="relative flex h-2 w-2">
        <span
          className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${style.dotClass}`}
        />
        <span
          className={`relative inline-flex rounded-full h-2 w-2 ${style.dotClass}`}
        />
      </span>
      <span>{style.icon}</span>
      <span className="font-sans font-medium uppercase tracking-wider">
        {verdict}
      </span>
    </span>
  );
}
