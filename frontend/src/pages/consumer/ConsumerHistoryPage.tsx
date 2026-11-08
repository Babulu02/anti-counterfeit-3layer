import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import Card from "../../components/Card";
import VerdictBadge from "../../components/VerdictBadge";

interface HistoryScan {
  id: string;
  productId: string;
  channel: string;
  verdict: string;
  reason: string;
  riskScore: number | null;
  timestamp: string;
}

const SAMPLE_HISTORY: HistoryScan[] = [
  {
    id: "hist-01",
    productId: "PRD-A49F2E",
    channel: "qr",
    verdict: "Verified",
    reason: "On-chain record confirmed, valid HMAC signature, visual packaging verified",
    riskScore: 0.021,
    timestamp: new Date(Date.now() - 3600000 * 2).toISOString(),
  },
  {
    id: "hist-02",
    productId: "PRD-9B10C3",
    channel: "nfc",
    verdict: "Verified",
    reason: "Valid NTAG 424 SUN AES-128 CMAC, counter increment verified on L1",
    riskScore: 0.045,
    timestamp: new Date(Date.now() - 86400000).toISOString(),
  },
];

export default function ConsumerHistoryPage() {
  const [history, setHistory] = useState<HistoryScan[]>(() => {
    try {
      const saved = localStorage.getItem("aether_consumer_history");
      return saved ? JSON.parse(saved) : SAMPLE_HISTORY;
    } catch {
      return SAMPLE_HISTORY;
    }
  });

  const clearHistory = () => {
    setHistory([]);
    localStorage.removeItem("aether_consumer_history");
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-stark-border pb-5">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded bg-stark-cyan/10 border border-stark-cyan/30 text-stark-cyan text-[11px] font-mono mb-2">
            CONSUMER LEDGER // PREVIOUS AUDITS
          </div>
          <h1 className="text-2xl font-bold text-text-heading tracking-tight">
            Personal Verification History
          </h1>
          <p className="text-xs text-text-secondary mt-1">
            Permanent chronological log of all physical products authenticated from this device.
          </p>
        </div>

        {history.length > 0 && (
          <button
            type="button"
            onClick={clearHistory}
            className="w-full sm:w-auto px-3.5 py-2 min-h-[38px] rounded-xl bg-bg-elevated hover:bg-bg-secondary border border-stark-border text-xs font-mono text-text-muted hover:text-stark-red transition-colors flex items-center justify-center"
          >
            Clear History
          </button>
        )}
      </div>

      <Card title={`Authenticated Products (${history.length})`}>
        {history.length === 0 ? (
          <div className="py-12 text-center space-y-3">
            <span className="text-4xl block">🕒</span>
            <p className="text-xs text-text-secondary">No verification scans recorded yet on this device.</p>
            <Link
              to="/consumer/verify"
              className="inline-flex items-center justify-center w-full sm:w-auto px-5 py-2.5 min-h-[44px] rounded-xl bg-stark-cyan text-white text-xs font-bold font-mono hover:bg-stark-cyan/90 transition-all shadow-sm"
            >
              Scan Your First Product &rarr;
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {history.map((scan) => (
              <div
                key={scan.id}
                className="p-4 rounded-xl bg-bg-main border border-stark-border hover:border-stark-cyan/40 transition-colors flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 font-mono"
              >
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-bold text-stark-cyan">{scan.productId}</span>
                    <VerdictBadge verdict={scan.verdict} size="sm" />
                    <span className="text-[10px] uppercase px-2 py-0.5 rounded bg-bg-elevated border border-stark-border text-text-muted">
                      {scan.channel}
                    </span>
                  </div>
                  <p className="text-[11px] text-text-secondary">{scan.reason}</p>
                  <span className="text-[10px] text-text-muted block">
                    {new Date(scan.timestamp).toLocaleString()}
                  </span>
                </div>

                <div className="shrink-0 w-full sm:w-auto">
                  <Link
                    to={`/consumer/result?pid=${scan.productId}&verdict=${scan.verdict}`}
                    className="w-full sm:w-auto px-4 py-2 min-h-[38px] rounded-lg bg-bg-elevated hover:bg-bg-secondary border border-stark-border text-xs text-stark-cyan font-semibold flex items-center justify-center text-center"
                  >
                    View Proof &rarr;
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

