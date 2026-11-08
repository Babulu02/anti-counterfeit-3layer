import React from "react";
import Card from "../../components/Card";

interface EncodingSession {
  sessionId: string;
  lotNumber: string;
  brand: string;
  unitsEncoded: number;
  successRate: number;
  operator: string;
  hardwareDevice: string;
  date: string;
}

const HISTORY_DATA: EncodingSession[] = [
  {
    sessionId: "SES-2026-10-24",
    lotNumber: "LOT-2026-CH-901",
    brand: "AetherCare",
    unitsEncoded: 42,
    successRate: 100,
    operator: "Operator #02 (Geneva Plant)",
    hardwareDevice: "Identiv uTrust 3700 F",
    date: "2026-10-24 14:32:10",
  },
  {
    sessionId: "SES-2026-10-20",
    lotNumber: "LOT-2026-CH-901",
    brand: "AetherCare",
    unitsEncoded: 250,
    successRate: 99.6,
    operator: "Automated Conveyor Encoder A",
    hardwareDevice: "Feig Electronic OBID",
    date: "2026-10-20 09:15:44",
  },
  {
    sessionId: "SES-2026-10-15",
    lotNumber: "LOT-2026-CH-902",
    brand: "BioShield Vaccines",
    unitsEncoded: 1200,
    successRate: 100,
    operator: "Operator #05 (Zurich Plant)",
    hardwareDevice: "Identiv uTrust 3700 F",
    date: "2026-10-15 16:45:00",
  },
];

export default function EncodingHistoryPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-stark-border pb-5">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded bg-stark-cyan/10 border border-stark-cyan/30 text-stark-cyan text-[11px] font-mono mb-2">
            HACP5 // AUTHENTICODING SESSION LEDGER
          </div>
          <h1 className="text-2xl font-bold text-text-heading tracking-tight">
            NFC Encoding History & Quality Assurance
          </h1>
          <p className="text-xs text-text-secondary mt-1">
            Historical quality assurance logs for hardware programmer sessions, unit yields, and cryptographic tag programming.
          </p>
        </div>
      </div>

      <Card title={`Factory Floor Encoding Sessions (${HISTORY_DATA.length})`}>
        <div className="overflow-x-auto">
          <table className="w-full text-xs font-mono">
            <thead>
              <tr className="text-left text-text-secondary border-b border-stark-border font-mono text-[11px]">
                <th className="pb-2 pr-3">Session ID</th>
                <th className="pb-2 pr-3">Lot Number</th>
                <th className="pb-2 pr-3">Brand</th>
                <th className="pb-2 pr-3">Units Encoded</th>
                <th className="pb-2 pr-3">Yield Rate</th>
                <th className="pb-2 pr-3">Programmer Hardware</th>
                <th className="pb-2 text-right">Timestamp</th>
              </tr>
            </thead>
            <tbody>
              {HISTORY_DATA.map((s) => (
                <tr
                  key={s.sessionId}
                  className="border-b border-stark-border/50 last:border-0 hover:bg-bg-elevated/40 transition-colors"
                >
                  <td className="py-2.5 pr-3 font-bold text-stark-cyan">{s.sessionId}</td>
                  <td className="py-2.5 pr-3 text-text-heading font-semibold">{s.lotNumber}</td>
                  <td className="py-2.5 pr-3 text-text-secondary">{s.brand}</td>
                  <td className="py-2.5 pr-3 text-text-heading">{s.unitsEncoded} tags</td>
                  <td className="py-2.5 pr-3">
                    <span className="px-2 py-0.5 rounded-full text-[10px] bg-stark-emerald/10 text-stark-emerald border border-stark-emerald/30 font-bold">
                      {s.successRate}% Yield
                    </span>
                  </td>
                  <td className="py-2.5 pr-3 text-text-muted">{s.hardwareDevice}</td>
                  <td className="py-2.5 text-right text-text-secondary">{s.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

