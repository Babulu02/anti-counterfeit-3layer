interface VerdictBadgeProps {
  verdict: string;
  size?: "sm" | "md" | "lg";
  showGlow?: boolean;
}

const BADGE_STYLES: Record<string, { bg: string; text: string; border: string; glow: string; dot: string; icon: string }> = {
  "Verified": {
    bg: "bg-[#10B981]/10",
    text: "text-[#10B981]",
    border: "border-[#10B981]/40",
    glow: "shadow-[0_0_12px_rgba(16,185,129,0.25)]",
    dot: "bg-[#10B981]",
    icon: "✓",
  },
  "Manual review": {
    bg: "bg-[#F59E0B]/10",
    text: "text-[#F59E0B]",
    border: "border-[#F59E0B]/40",
    glow: "shadow-[0_0_12px_rgba(245,158,11,0.25)]",
    dot: "bg-[#F59E0B]",
    icon: "⚠",
  },
  "Suspicious activity": {
    bg: "bg-[#EF4444]/10",
    text: "text-[#EF4444]",
    border: "border-[#EF4444]/40",
    glow: "shadow-[0_0_12px_rgba(239,68,68,0.25)]",
    dot: "bg-[#EF4444]",
    icon: "✕",
  },
  "Unregistered product": {
    bg: "bg-[#26384B]/40",
    text: "text-[#9BAFC5]",
    border: "border-[#F59E0B]/30",
    glow: "shadow-[0_0_8px_rgba(155,175,197,0.15)]",
    dot: "bg-[#9BAFC5]",
    icon: "?",
  },
};

export default function VerdictBadge({
  verdict,
  size = "md",
  showGlow = true,
}: VerdictBadgeProps) {
  const style = BADGE_STYLES[verdict] ?? BADGE_STYLES["Unregistered product"];

  const sizeClasses = {
    sm: "px-2 py-0.5 text-xs gap-1.5",
    md: "px-3 py-1 text-xs font-semibold gap-2",
    lg: "px-4 py-2 text-sm font-bold gap-2.5",
  }[size];

  return (
    <span
      className={`inline-flex items-center rounded-lg border font-mono tracking-wide transition-all ${
        style.bg
      } ${style.text} ${style.border} ${showGlow ? style.glow : ""} ${sizeClasses}`}
    >
      <span className="relative flex h-2 w-2">
        <span
          className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${style.dot}`}
        />
        <span className={`relative inline-flex rounded-full h-2 w-2 ${style.dot}`} />
      </span>
      <span>{style.icon}</span>
      <span className="font-sans font-medium uppercase tracking-wider">{verdict}</span>
    </span>
  );
}
