interface SignalRowProps {
  label: string;
  value: string | number | null;
  ok?: boolean;
  mono?: boolean;
}

/**
 * SignalRow — Theme-aware diagnostic row with telemetry indicator light.
 */
export default function SignalRow({
  label,
  value,
  ok,
  mono = false,
}: SignalRowProps) {
  const dotColor =
    ok === undefined
      ? "bg-text-muted"
      : ok
      ? "bg-stark-emerald shadow-[0_0_8px_var(--success-border)]"
      : "bg-stark-red shadow-[0_0_8px_var(--danger-border)]";

  return (
    <tr className="border-b border-stark-border/50 last:border-0 hover:bg-bg-elevated/60 transition-colors">
      <td className="py-2.5 pr-4 text-xs font-medium text-text-secondary whitespace-nowrap">
        {label}
      </td>
      <td className="py-2.5 text-xs text-text-primary font-medium flex items-center gap-2.5">
        <span className={`inline-block h-2 w-2 rounded-full shrink-0 ${dotColor}`} />
        <span className={`truncate ${mono ? "font-mono text-stark-cyan font-semibold" : ""}`}>
          {value === null || value === "" ? "—" : String(value)}
        </span>
      </td>
    </tr>
  );
}
