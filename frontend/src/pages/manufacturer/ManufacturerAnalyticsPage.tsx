import React, { useState, useEffect } from "react";
import { getRecentScans, listProducts, type ScanOut, type ProductOut } from "../../lib/api";
import Card from "../../components/Card";
import VerdictBadge from "../../components/VerdictBadge";

export default function ManufacturerAnalyticsPage() {
  const [scans, setScans] = useState<ScanOut[]>([]);
  const [products, setProducts] = useState<ProductOut[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getRecentScans(100).catch(() => []), listProducts().catch(() => [])])
      .then(([s, p]) => {
        setScans(s);
        setProducts(p);
      })
      .finally(() => setLoading(false));
  }, []);

  const total = scans.length;
  const verified = scans.filter((s) => s.verdict === "Verified").length;
  const suspicious = scans.filter((s) => s.verdict === "Suspicious activity").length;
  const manual = scans.filter((s) => s.verdict === "Manual review").length;

  const qrCount = scans.filter((s) => s.channel === "qr").length;
  const nfcCount = scans.filter((s) => s.channel === "nfc").length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-stark-border pb-5">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded bg-stark-cyan/10 border border-stark-cyan/30 text-stark-cyan text-[11px] font-mono mb-2">
            HACP5 // MARKET TELEMETRY & PRODUCT ANALYTICS
          </div>
          <h1 className="text-2xl font-bold text-text-heading tracking-tight">
            Product Verification Analytics
          </h1>
          <p className="text-xs text-text-secondary mt-1">
            Real-time insight into consumer scans, authentic verification rates, channel usage, and supply-chain leakage.
          </p>
        </div>

        <div className="flex items-center gap-2 font-mono text-xs">
          <span className="px-3 py-1.5 rounded-xl bg-bg-card border border-stark-border text-text-heading">
            Total Scans Logged: <strong className="text-stark-cyan">{total}</strong>
          </span>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        <div className="p-4 rounded-xl bg-bg-card border border-stark-border shadow-sm">
          <span className="text-[11px] font-mono text-text-secondary uppercase">Verified Genuine</span>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-extrabold text-stark-emerald font-mono">{verified}</span>
            <span className="text-xs text-stark-emerald font-semibold">
              {total > 0 ? `${((verified / total) * 100).toFixed(0)}%` : "—"}
            </span>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-bg-card border border-stark-border shadow-sm">
          <span className="text-[11px] font-mono text-text-secondary uppercase">Suspicious Flagged</span>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-extrabold text-stark-red font-mono">{suspicious}</span>
            <span className="text-xs text-stark-red font-semibold">
              {total > 0 ? `${((suspicious / total) * 100).toFixed(0)}%` : "—"}
            </span>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-bg-card border border-stark-border shadow-sm">
          <span className="text-[11px] font-mono text-text-secondary uppercase">Dynamic QR Scans</span>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-extrabold text-stark-cyan font-mono">{qrCount}</span>
            <span className="text-xs text-text-secondary">Camera Scans</span>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-bg-card border border-stark-border shadow-sm">
          <span className="text-[11px] font-mono text-text-secondary uppercase">NTAG 424 SUN Taps</span>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-extrabold text-text-heading font-mono">{nfcCount}</span>
            <span className="text-xs text-text-secondary">NFC Hardware</span>
          </div>
        </div>
      </div>

      {/* Channel & Risk Distribution */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card title="Verification Verdict Distribution">
          <div className="space-y-4">
            <div className="h-4 rounded-lg bg-bg-main overflow-hidden flex border border-stark-border">
              {verified > 0 && (
                <div style={{ width: `${(verified / total) * 100}%` }} className="bg-stark-emerald" />
              )}
              {manual > 0 && (
                <div style={{ width: `${(manual / total) * 100}%` }} className="bg-stark-amber" />
              )}
              {suspicious > 0 && (
                <div style={{ width: `${(suspicious / total) * 100}%` }} className="bg-stark-red" />
              )}
            </div>

            <div className="grid grid-cols-3 gap-2 text-xs font-mono">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-stark-emerald" />
                <span className="text-text-secondary">Verified: {verified}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-stark-amber" />
                <span className="text-text-secondary">Disputed: {manual}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-stark-red" />
                <span className="text-text-secondary">Counterfeit: {suspicious}</span>
              </div>
            </div>
          </div>
        </Card>

        <Card title="Inspection Channel Split">
          <div className="space-y-4">
            <div className="h-4 rounded-lg bg-bg-main overflow-hidden flex border border-stark-border">
              {qrCount > 0 && (
                <div style={{ width: `${(qrCount / total) * 100}%` }} className="bg-stark-cyan" />
              )}
              {nfcCount > 0 && (
                <div style={{ width: `${(nfcCount / total) * 100}%` }} className="bg-text-heading" />
              )}
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs font-mono">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-stark-cyan" />
                <span className="text-text-secondary">QR Code (Mobile Camera): {qrCount}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-text-heading" />
                <span className="text-text-secondary">NFC NTAG 424 SUN Taps: {nfcCount}</span>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Verification Log */}
      <Card title="Live Market Verification Activity">
        {loading ? (
          <p className="text-xs text-text-secondary py-8 text-center font-mono">Loading telemetry...</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs font-mono">
              <thead>
                <tr className="text-left text-text-secondary border-b border-stark-border font-mono text-[11px]">
                  <th className="pb-2 pr-3">Timestamp</th>
                  <th className="pb-2 pr-3">Product ID</th>
                  <th className="pb-2 pr-3">Channel</th>
                  <th className="pb-2 pr-3">Verdict</th>
                  <th className="pb-2 pr-3">Location</th>
                  <th className="pb-2 text-right">Anomaly Score</th>
                </tr>
              </thead>
              <tbody>
                {scans.slice(0, 10).map((s, i) => (
                  <tr
                    key={s.id || i}
                    className="border-b border-stark-border/50 last:border-0 hover:bg-bg-elevated/40 transition-colors"
                  >
                    <td className="py-2.5 pr-3 text-text-secondary whitespace-nowrap">
                      {new Date(s.ts).toLocaleString()}
                    </td>
                    <td className="py-2.5 pr-3 text-stark-cyan font-bold">{s.product_id.slice(0, 10)}...</td>
                    <td className="py-2.5 pr-3 uppercase text-text-heading">{s.channel}</td>
                    <td className="py-2.5 pr-3">
                      <VerdictBadge verdict={s.verdict} size="sm" />
                    </td>
                    <td className="py-2.5 pr-3 text-text-muted">
                      {s.lat && s.lon ? `${s.lat.toFixed(2)}, ${s.lon.toFixed(2)}` : "Online API"}
                    </td>
                    <td className="py-2.5 text-right font-bold text-text-heading">
                      {s.risk_score !== null ? s.risk_score.toFixed(3) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

