import { useState, useEffect } from "react";
import {
  listProducts,
  getScans,
  getRecentScans,
  type ProductOut,
  type ScanOut,
} from "../lib/api";
import VerdictBadge from "../components/VerdictBadge";
import Card from "../components/Card";

export default function DashboardPage() {
  const [products, setProducts] = useState<ProductOut[]>([]);
  const [selectedPid, setSelectedPid] = useState<string>("");
  const [selectedProductScans, setSelectedProductScans] = useState<ScanOut[]>([]);
  const [recentScans, setRecentScans] = useState<ScanOut[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load products and initial global scans
  useEffect(() => {
    setLoading(true);
    Promise.all([listProducts(), getRecentScans(100)])
      .then(([ps, recent]) => {
        setProducts(ps);
        setRecentScans(recent);
        if (ps.length > 0) {
          setSelectedPid(ps[0].product_id);
        }
      })
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false));
  }, []);

  // When selectedPid changes, fetch that product's scans
  useEffect(() => {
    if (!selectedPid) return;
    getScans(selectedPid)
      .then(setSelectedProductScans)
      .catch(() => {});
  }, [selectedPid]);

  const selectedProduct = products.find((p) => p.product_id === selectedPid);

  // Metrics computation from live data
  const totalProducts = products.length;
  const soldProducts = products.filter((p) => p.status === "sold").length;

  // Use recentScans for global counts; fallback to selectedProductScans if empty
  const allScans = recentScans.length > 0 ? recentScans : selectedProductScans;
  const totalScans = allScans.length;
  const verifiedScans = allScans.filter((s) => s.verdict === "Verified").length;
  const suspiciousScans = allScans.filter((s) => s.verdict === "Suspicious activity").length;
  const manualReviewScans = allScans.filter((s) => s.verdict === "Manual review").length;
  const unregisteredScans = allScans.filter((s) => s.verdict === "Unregistered product").length;

  // Distribution percentages
  const pctVerified = totalScans > 0 ? (verifiedScans / totalScans) * 100 : 0;
  const pctManual = totalScans > 0 ? (manualReviewScans / totalScans) * 100 : 0;
  const pctSuspicious = totalScans > 0 ? (suspiciousScans / totalScans) * 100 : 0;
  const pctUnregistered = totalScans > 0 ? (unregisteredScans / totalScans) * 100 : 0;

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* ── Dashboard Header ── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-[#26384B] pb-5">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded bg-[#00BFFF]/10 border border-[#00BFFF]/30 text-[#00BFFF] text-[11px] font-mono mb-2">
            STARK // THREAT INTELLIGENCE & TELEMETRY
          </div>
          <h1 className="text-2xl font-bold text-[#F1F6FC] tracking-tight">
            Security Analytics Workspace
          </h1>
          <p className="text-xs text-[#9BAFC5] mt-1">
            Real-time multi-signal telemetry aggregating smart contract transactions, identity verifications, and spatio-temporal AI risk.
          </p>
        </div>

        <div className="flex items-center gap-2 font-mono text-xs px-3 py-1.5 rounded-xl bg-[#111C29] border border-[#26384B] text-[#9BAFC5]">
          <span className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse" />
          <span>GANACHE 1337 LIVE</span>
        </div>
      </div>

      {error && (
        <div className="p-3.5 rounded-lg bg-[#EF4444]/10 border border-[#EF4444]/30 text-[#EF4444] text-xs">
          {error}
        </div>
      )}

      {/* ── 6 KPI Metrics Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3.5">
        {/* Total Products */}
        <div className="p-4 rounded-xl bg-[#111C29] border border-[#26384B] flex flex-col justify-between">
          <p className="text-[11px] font-mono text-[#9BAFC5] uppercase">Total Assets</p>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-extrabold text-[#F1F6FC] font-mono">
              {totalProducts}
            </span>
            <span className="text-xs text-[#00BFFF] font-semibold">Registered</span>
          </div>
        </div>

        {/* Total Scans */}
        <div className="p-4 rounded-xl bg-[#111C29] border border-[#26384B] flex flex-col justify-between">
          <p className="text-[11px] font-mono text-[#9BAFC5] uppercase">Total Scans</p>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-extrabold text-[#F1F6FC] font-mono">
              {totalScans}
            </span>
            <span className="text-xs text-[#9BAFC5]">Audit Events</span>
          </div>
        </div>

        {/* Verified */}
        <div className="p-4 rounded-xl bg-[#111C29] border border-[#26384B] flex flex-col justify-between">
          <p className="text-[11px] font-mono text-[#9BAFC5] uppercase">Verified</p>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-extrabold text-[#10B981] font-mono">
              {verifiedScans}
            </span>
            <span className="text-xs text-[#10B981] font-semibold">
              {totalScans > 0 ? `${pctVerified.toFixed(0)}%` : "—"}
            </span>
          </div>
        </div>

        {/* Manual Review */}
        <div className="p-4 rounded-xl bg-[#111C29] border border-[#26384B] flex flex-col justify-between">
          <p className="text-[11px] font-mono text-[#9BAFC5] uppercase">Manual Review</p>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-extrabold text-[#F59E0B] font-mono">
              {manualReviewScans}
            </span>
            <span className="text-xs text-[#F59E0B] font-semibold">
              {totalScans > 0 ? `${pctManual.toFixed(0)}%` : "—"}
            </span>
          </div>
        </div>

        {/* Suspicious */}
        <div className="p-4 rounded-xl bg-[#111C29] border border-[#26384B] flex flex-col justify-between">
          <p className="text-[11px] font-mono text-[#9BAFC5] uppercase">Suspicious</p>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-extrabold text-[#EF4444] font-mono">
              {suspiciousScans}
            </span>
            <span className="text-xs text-[#EF4444] font-semibold">
              {totalScans > 0 ? `${pctSuspicious.toFixed(0)}%` : "—"}
            </span>
          </div>
        </div>

        {/* Sold On-Chain */}
        <div className="p-4 rounded-xl bg-[#111C29] border border-[#26384B] flex flex-col justify-between">
          <p className="text-[11px] font-mono text-[#9BAFC5] uppercase">Sold Units</p>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-extrabold text-[#F1F6FC] font-mono">
              {soldProducts}
            </span>
            <span className="text-xs text-[#9BAFC5]">On-Chain</span>
          </div>
        </div>
      </div>

      {/* ── Status Distribution Visualization ── */}
      <Card
        title="Status Distribution & Risk Ratio"
        subtitle="Proportion of verdicts rendered by Layer 3 fusion engine"
        icon={
          <svg className="w-5 h-5 text-[#00BFFF]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
          </svg>
        }
      >
        {totalScans === 0 ? (
          <div className="py-6 text-center text-[#9BAFC5] text-xs">
            No scan events recorded yet. Run a verification on <code className="text-[#00BFFF]">/verify</code> to generate live analytics.
          </div>
        ) : (
          <div className="space-y-4">
            {/* Multi-segment distribution bar */}
            <div className="h-4 rounded-lg bg-[#080D14] overflow-hidden flex border border-[#26384B]">
              {pctVerified > 0 && (
                <div
                  style={{ width: `${pctVerified}%` }}
                  className="bg-[#10B981] transition-all duration-500"
                  title={`Verified: ${verifiedScans} (${pctVerified.toFixed(1)}%)`}
                />
              )}
              {pctManual > 0 && (
                <div
                  style={{ width: `${pctManual}%` }}
                  className="bg-[#F59E0B] transition-all duration-500"
                  title={`Manual Review: ${manualReviewScans} (${pctManual.toFixed(1)}%)`}
                />
              )}
              {pctSuspicious > 0 && (
                <div
                  style={{ width: `${pctSuspicious}%` }}
                  className="bg-[#EF4444] transition-all duration-500"
                  title={`Suspicious: ${suspiciousScans} (${pctSuspicious.toFixed(1)}%)`}
                />
              )}
              {pctUnregistered > 0 && (
                <div
                  style={{ width: `${pctUnregistered}%` }}
                  className="bg-[#5B708B] transition-all duration-500"
                  title={`Unregistered: ${unregisteredScans} (${pctUnregistered.toFixed(1)}%)`}
                />
              )}
            </div>

            {/* Legend */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs pt-1">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#10B981]" />
                <span className="text-[#9BAFC5]">Verified:</span>
                <span className="font-mono font-semibold text-[#F1F6FC]">
                  {verifiedScans} ({pctVerified.toFixed(1)}%)
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#F59E0B]" />
                <span className="text-[#9BAFC5]">Manual Review:</span>
                <span className="font-mono font-semibold text-[#F1F6FC]">
                  {manualReviewScans} ({pctManual.toFixed(1)}%)
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#EF4444]" />
                <span className="text-[#9BAFC5]">Suspicious:</span>
                <span className="font-mono font-semibold text-[#F1F6FC]">
                  {suspiciousScans} ({pctSuspicious.toFixed(1)}%)
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#5B708B]" />
                <span className="text-[#9BAFC5]">Unregistered:</span>
                <span className="font-mono font-semibold text-[#F1F6FC]">
                  {unregisteredScans} ({pctUnregistered.toFixed(1)}%)
                </span>
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* ── Product Specific Deep-Dive Selector ── */}
      <Card
        title="Asset Inspection Terminal"
        subtitle="Select an enrolled product to analyze its scan timeline and GPS audit trace"
        icon={
          <svg className="w-5 h-5 text-[#00BFFF]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
        }
      >
        {products.length === 0 ? (
          <p className="text-xs text-[#9BAFC5]">No products enrolled on the blockchain yet.</p>
        ) : (
          <div className="space-y-4">
            <select
              className="w-full rounded-lg bg-[#080D14] border border-[#26384B] px-3.5 py-2 text-xs font-mono text-[#F1F6FC] focus:outline-none focus:border-[#00BFFF]"
              value={selectedPid}
              onChange={(e) => setSelectedPid(e.target.value)}
            >
              {products.map((p) => (
                <option key={p.product_id} value={p.product_id}>
                  {p.name} — {p.brand} ({p.serial}) [{p.status.toUpperCase()}]
                </option>
              ))}
            </select>

            {selectedProduct && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 rounded-xl bg-[#080D14] border border-[#26384B] text-xs">
                <div>
                  <span className="text-[#9BAFC5] block text-[10px] font-mono">ASSET NAME</span>
                  <span className="font-semibold text-[#F1F6FC] mt-0.5 block">{selectedProduct.name}</span>
                </div>
                <div>
                  <span className="text-[#9BAFC5] block text-[10px] font-mono">BRAND</span>
                  <span className="font-semibold text-[#F1F6FC] mt-0.5 block">{selectedProduct.brand}</span>
                </div>
                <div>
                  <span className="text-[#9BAFC5] block text-[10px] font-mono">SERIAL</span>
                  <span className="font-mono text-[#00BFFF] mt-0.5 block">{selectedProduct.serial}</span>
                </div>
                <div>
                  <span className="text-[#9BAFC5] block text-[10px] font-mono">LIFECYCLE STATUS</span>
                  <span
                    className={`font-semibold mt-0.5 block ${
                      selectedProduct.status === "sold" ? "text-[#F59E0B]" : "text-[#10B981]"
                    }`}
                  >
                    {selectedProduct.status.toUpperCase()}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}
      </Card>

      {/* ── Scan Timeline & Activity Stream ── */}
      {selectedProductScans.length > 0 && (
        <Card
          title={`Scan Telemetry Timeline (${selectedProductScans.length} events)`}
          subtitle="Chronological audit trace of verifications for selected product"
        >
          <div className="relative border-l border-[#26384B] ml-3 space-y-4 py-2">
            {selectedProductScans.map((s, idx) => (
              <div key={s.id || idx} className="ml-5 relative">
                {/* Node marker */}
                <span className="absolute -left-[27px] top-1.5 w-3 h-3 rounded-full bg-[#080D14] border-2 border-[#00BFFF] shadow-[0_0_8px_rgba(0,191,255,0.6)]" />

                <div className="p-3 rounded-xl bg-[#080D14] border border-[#26384B] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <time className="text-xs font-mono text-[#9BAFC5]">
                      {new Date(s.ts).toLocaleString()}
                    </time>
                    <VerdictBadge verdict={s.verdict} size="sm" />
                    <span className="text-[11px] font-mono text-[#00BFFF] px-2 py-0.5 rounded bg-[#172536] border border-[#26384B]">
                      {s.channel.toUpperCase()}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 text-xs">
                    {s.risk_score !== null && (
                      <span className="font-mono text-[#9BAFC5]">
                        Risk: <strong className="text-[#F1F6FC]">{s.risk_score.toFixed(3)}</strong>
                      </span>
                    )}
                    {s.lat !== null && s.lon !== null && (
                      <a
                        href={`https://www.openstreetmap.org/?mlat=${s.lat}&mlon=${s.lon}&zoom=12`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[#00BFFF] hover:underline flex items-center gap-1 font-mono text-[11px]"
                      >
                        <span>📍</span>
                        <span>{s.lat.toFixed(2)}, {s.lon.toFixed(2)}</span>
                      </a>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* ── Global Live Scan Activity Table ── */}
      <Card
        title={`Live Global Audit Feed (${allScans.length} events)`}
        subtitle="Recent product verification queries logged across the network"
      >
        {allScans.length === 0 ? (
          <p className="text-xs text-[#9BAFC5] py-4 text-center">No scan telemetry recorded yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-[#9BAFC5] border-b border-[#26384B] font-mono text-[11px]">
                  <th className="pb-2 pr-3">#</th>
                  <th className="pb-2 pr-3">Timestamp</th>
                  <th className="pb-2 pr-3">Product ID</th>
                  <th className="pb-2 pr-3">Channel</th>
                  <th className="pb-2 pr-3">Verdict</th>
                  <th className="pb-2 pr-3">Identity</th>
                  <th className="pb-2 pr-3">Chain</th>
                  <th className="pb-2">ML Risk</th>
                </tr>
              </thead>
              <tbody>
                {allScans.slice(0, 25).map((s, idx) => (
                  <tr
                    key={s.id || idx}
                    className="border-b border-[#26384B]/40 last:border-0 hover:bg-[#172536]/30 transition-colors"
                  >
                    <td className="py-2.5 pr-3 font-mono text-[#5B708B]">{idx + 1}</td>
                    <td className="py-2.5 pr-3 font-mono text-[#9BAFC5] whitespace-nowrap">
                      {new Date(s.ts).toLocaleTimeString()}
                    </td>
                    <td className="py-2.5 pr-3 font-mono text-[#00BFFF] truncate max-w-[140px]">
                      {s.product_id}
                    </td>
                    <td className="py-2.5 pr-3 font-mono uppercase text-[#F1F6FC]">
                      {s.channel}
                    </td>
                    <td className="py-2.5 pr-3">
                      <VerdictBadge verdict={s.verdict} size="sm" />
                    </td>
                    <td className="py-2.5 pr-3 font-mono text-[#9BAFC5]">
                      {s.identity_result}
                    </td>
                    <td className="py-2.5 pr-3 font-mono text-[#9BAFC5]">
                      {s.chain_result}
                    </td>
                    <td className="py-2.5 font-mono text-[#F1F6FC]">
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
