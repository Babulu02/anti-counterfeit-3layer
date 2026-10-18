/**
 * SignalRow — one row in the per-signal breakdown table.
 */
export default function SignalRow({
  label, value, ok,
}: {
  label: string;
  value: string | number | null;
  ok?: boolean;
}) {
  const dot = ok === undefined
    ? "bg-gray-300"
    : ok ? "bg-green-500" : "bg-red-400";
  return (
    <tr className="border-b last:border-0">
      <td className="py-1.5 pr-4 text-sm text-gray-500 whitespace-nowrap">{label}</td>
      <td className="py-1.5 text-sm font-medium flex items-center gap-2">
        <span className={`inline-block h-2 w-2 rounded-full ${dot}`} />
        {value === null ? "—" : String(value)}
      </td>
    </tr>
  );
}
