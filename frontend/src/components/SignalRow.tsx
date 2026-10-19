interface SignalRowProps {
  label: string;
  value: string | number | null;
  ok?: boolean;
  mono?: boolean;
}

/**
 * SignalRow — Stark-Tech diagnostic row with telemetry indicator light.
 */
export default function SignalRow({
  label,
  value,
  ok,
  mono = false,
}: SignalRowProps) {
  const dotColor =
    ok === undefined
      ? "bg-[#5B708B]"
      : ok
      ? "bg-[#10B981] shadow-[0_0_8px_rgba(16,185,129,0.5)]"
      : "bg-[#EF4444] shadow-[0_0_8px_rgba(239,68,68,0.5)]";

  return (
    <tr className="border-b border-[#26384B]/40 last:border-0 hover:bg-[#172536]/40 transition-colors">
      <td className="py-2.5 pr-4 text-xs font-medium text-[#9BAFC5] whitespace-nowrap">
        {label}
      </td>
      <td className="py-2.5 text-xs text-[#F1F6FC] font-medium flex items-center gap-2.5">
        <span className={`inline-block h-2 w-2 rounded-full shrink-0 ${dotColor}`} />
        <span className={`truncate ${mono ? "font-mono text-[#00BFFF]" : ""}`}>
          {value === null || value === "" ? "—" : String(value)}
        </span>
      </td>
    </tr>
  );
}
