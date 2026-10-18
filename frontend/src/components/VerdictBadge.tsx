/**
 * VerdictBadge — coloured badge for the four possible verdicts.
 */
type Verdict = "Verified" | "Manual review" | "Suspicious activity" | "Unregistered product";

const COLOURS: Record<string, string> = {
  "Verified":              "bg-green-100 text-green-800 border-green-300",
  "Manual review":         "bg-yellow-100 text-yellow-800 border-yellow-300",
  "Suspicious activity":   "bg-red-100 text-red-800 border-red-300",
  "Unregistered product":  "bg-gray-100 text-gray-700 border-gray-300",
};

const ICONS: Record<string, string> = {
  "Verified":              "✓",
  "Manual review":         "⚠",
  "Suspicious activity":   "✗",
  "Unregistered product":  "?",
};

export default function VerdictBadge({ verdict }: { verdict: string }) {
  const cls   = COLOURS[verdict] ?? "bg-gray-100 text-gray-700 border-gray-300";
  const icon  = ICONS[verdict]   ?? "?";
  return (
    <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full border text-sm font-semibold ${cls}`}>
      <span>{icon}</span> {verdict}
    </span>
  );
}
