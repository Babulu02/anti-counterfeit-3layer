import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
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
  const [refreshing, setRefreshing] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Core data fetcher
  const fetchData = useCallback(async (silent = false) => {
    if (!silent) setRefreshing(true);
    try {
      const [ps, recent] = await Promise.all([listProducts(), getRecentScans(100)]);
      setProducts(ps);
      setRecentScans(recent);
      setLastRefreshed(new Date());
      setError(null);

      // Default selectedPid if none set
      setSelectedPid((prev) => {
        if (!prev && ps.length > 0) return ps[0].product_id;
        return prev;
      });
    } catch (e) {
      if (!silent) setError(String(e));
    } finally {
      if (!silent) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchData(false);
  }, [fetchData]);

  // Real-time auto-refresh polling interval (every 4 seconds)
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      fetchData(true);
    }, 4000);
    return () => clearInterval(interval);
  }, [autoRefresh, fetchData]);

  // When selectedPid changes, fetch that product's specific scan history
  useEffect(() => {
    if (!selectedPid) return;
    getScans(selectedPid)
      .then(setSelectedProductScans)
      .catch(() => {});
  }, [selectedPid]);

  const selectedProduct = products.find((p) => p.product_id === selectedPid);

  // Copy helper
  function copyToClipboard(text: string, label: string) {
    navigator.clipboard.writeText(text);
    setCopiedId(label);
    setTimeout(() => setCopiedId(null), 2000);
  }

  // Metrics computation from live data
  const totalProducts = products.length;
  const soldProducts = products.filter((p) => p.status === "sold").length;

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

  // Quick lookup helper for product short IDs in recent scan table
  const pidToProductMap = new Map<string, ProductOut>();
  products.forEach((p) => pidToProductMap.set(p.product_id, p));

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* ── Real-Time Workspace Header ── */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-stark-border pb-5">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded bg-stark-cyan/10 border border-stark-cyan/30 text-stark-cyan text-[11px] font-mono mb-2">
            STARK // REAL-TIME SECURITY ANALYTICS WORKSPACE
          </div>
          <h1 className="text-2xl font-bold text-text-heading tracking-tight flex items-center gap-3">
            Threat Intelligence & Telemetry Hub
            {autoRefresh && (
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-stark-emerald opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-stark-emerald"></span>
              </span>
            )}
          </h1>
          <p className="text-xs text-text-secondary mt-1">
            Live multi-signal telemetry aggregating smart contract transactions, short-code resolution, and spatial AI risk.
          </p>
        </div>

        {/* Real-time controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Auto Refresh Toggle */}
          <button
            type="button"
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-mono transition-all ${
              autoRefresh
                ? "bg-stark-emerald/10 border-stark-emerald/30 text-stark-emerald"
                : "bg-bg-card border-stark-border text-text-muted"
            }`}
            title={autoRefresh ? "Auto-refresh active (polls every 4s)" : "Auto-refresh paused"}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                autoRefresh ? "bg-stark-emerald animate-pulse" : "bg-text-muted"
              }`}
            />
            <span>{autoRefresh ? "LIVE POLLING (4s)" : "PAUSED"}</span>
          </button>

          {/* Manual Refresh Button */}
          <button
            type="button"
            onClick={() => fetchData(false)}
            disabled={refreshing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-bg-elevated hover:bg-bg-secondary border border-stark-border text-xs font-mono text-stark-cyan transition-colors disabled:opacity-50"
          >
            <span className={refreshing ? "animate-spin" : ""}>🔄</span>
            <span>{refreshing ? "Syncing..." : "Refresh Stream"}</span>
          </button>

          {/* Node Health Pill */}
          <div className="flex items-center gap-2 font-mono text-[11px] px-3 py-1.5 rounded-xl bg-bg-card border border-stark-border text-text-secondary">
            <span className="text-stark-cyan">CHAIN:</span>
            <span className="text-text-heading font-semibold">GANACHE 1337</span>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-3.5 rounded-lg bg-stark-red/10 border border-stark-red/30 text-stark-red text-xs">
          {error}
        </div>
      )}

      {/* ── System Status & Node Health Bar ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 rounded-xl bg-bg-card border border-stark-border text-xs font-mono shadow-sm">
        <div className="flex items-center gap-2.5">
          <span className="w-2.5 h-2.5 rounded-full bg-stark-emerald" />
          <div>
            <span className="text-text-secondary block text-[10px]">SMART CONTRACT</span>
            <span className="text-text-heading font-semibold">ProductRegistry (L1)</span>
          </div>
        </div>
        <div className="flex items-center gap-2.5">
          <span className="w-2.5 h-2.5 rounded-full bg-stark-emerald" />
          <div>
            <span className="text-text-secondary block text-[10px]">DATABASE ENGINE</span>
            <span className="text-text-heading font-semibold">MySQL 9.x (Active)</span>
          </div>
        </div>
        <div className="flex items-center gap-2.5">
          <span className="w-2.5 h-2.5 rounded-full bg-stark-cyan" />
          <div>
            <span className="text-text-secondary block text-[10px]">AI VERIFICATION</span>
            <span className="text-text-heading font-semibold">MobileNetV2 + OCR</span>
          </div>
        </div>
        <div className="flex items-center gap-2.5">
          <span className="w-2.5 h-2.5 rounded-full bg-stark-amber" />
          <div>
            <span className="text-text-secondary block text-[10px]">LAST SYNC</span>
            <span className="text-text-heading font-semibold">
              {lastRefreshed.toLocaleTimeString()}
            </span>
          </div>
        </div>
      </div>

      {/* ── 6 KPI Metrics Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3.5">
        {/* Total Products */}
        <div className="p-4 rounded-xl bg-bg-card border border-stark-border flex flex-col justify-between shadow-sm">
          <p className="text-[11px] font-mono text-text-secondary uppercase">Total Assets</p>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-extrabold text-text-heading font-mono">
              {totalProducts}
            </span>
            <span className="text-xs text-stark-cyan font-semibold">Enrolled</span>
          </div>
        </div>

        {/* Total Scans */}
        <div className="p-4 rounded-xl bg-bg-card border border-stark-border flex flex-col justify-between shadow-sm">
          <p className="text-[11px] font-mono text-text-secondary uppercase">Total Scans</p>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-extrabold text-text-heading font-mono">
              {totalScans}
            </span>
            <span className="text-xs text-text-secondary">Audit Events</span>
          </div>
        </div>

        {/* Verified */}
        <div className="p-4 rounded-xl bg-bg-card border border-stark-border flex flex-col justify-between shadow-sm">
          <p className="text-[11px] font-mono text-text-secondary uppercase">Verified</p>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-extrabold text-stark-emerald font-mono">
              {verifiedScans}
            </span>
            <span className="text-xs text-stark-emerald font-semibold">
              {totalScans > 0 ? `${pctVerified.toFixed(0)}%` : "—"}
            </span>
          </div>
        </div>

        {/* Manual Review */}
        <div className="p-4 rounded-xl bg-bg-card border border-stark-border flex flex-col justify-between shadow-sm">
          <p className="text-[11px] font-mono text-text-secondary uppercase">Manual Review</p>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-extrabold text-stark-amber font-mono">
              {manualReviewScans}
            </span>
            <span className="text-xs text-stark-amber font-semibold">
              {totalScans > 0 ? `${pctManual.toFixed(0)}%` : "—"}
            </span>
          </div>
        </div>

        {/* Suspicious */}
        <div className="p-4 rounded-xl bg-bg-card border border-stark-border flex flex-col justify-between shadow-sm">
          <p className="text-[11px] font-mono text-text-secondary uppercase">Suspicious</p>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-extrabold text-stark-red font-mono">
              {suspiciousScans}
            </span>
            <span className="text-xs text-stark-red font-semibold">
              {totalScans > 0 ? `${pctSuspicious.toFixed(0)}%` : "—"}
            </span>
          </div>
        </div>

        {/* Sold On-Chain */}
        <div className="p-4 rounded-xl bg-bg-card border border-stark-border flex flex-col justify-between shadow-sm">
          <p className="text-[11px] font-mono text-text-secondary uppercase">Sold Units</p>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-extrabold text-text-heading font-mono">
              {soldProducts}
            </span>
            <span className="text-xs text-text-secondary">On-Chain</span>
          </div>
        </div>
      </div>

      {/* ── Status Distribution Visualization ── */}
      <Card
        title="Status Distribution & Multi-Signal Risk Breakdown"
        subtitle="Proportion of verdicts rendered across smart contract, NFC cryptograms, and visual OCR checks"
        icon={
          <svg className="w-5 h-5 text-stark-cyan" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
          </svg>
        }
      >
        {totalScans === 0 ? (
          <div className="py-6 text-center text-text-secondary text-xs">
            No scan events recorded yet. Run a verification on <Link to="/verify" className="text-stark-cyan underline">/verify</Link> to generate live analytics.
          </div>
        ) : (
          <div className="space-y-4">
            <div className="h-4 rounded-lg bg-bg-main overflow-hidden flex border border-stark-border">
              {pctVerified > 0 && (
                <div
                  style={{ width: `${pctVerified}%` }}
                  className="bg-stark-emerald transition-all duration-500"
                  title={`Verified: ${verifiedScans} (${pctVerified.toFixed(1)}%)`}
                />
              )}
              {pctManual > 0 && (
                <div
                  style={{ width: `${pctManual}%` }}
                  className="bg-stark-amber transition-all duration-500"
                  title={`Manual Review: ${manualReviewScans} (${pctManual.toFixed(1)}%)`}
                />
              )}
              {pctSuspicious > 0 && (
                <div
                  style={{ width: `${pctSuspicious}%` }}
                  className="bg-stark-red transition-all duration-500"
                  title={`Suspicious: ${suspiciousScans} (${pctSuspicious.toFixed(1)}%)`}
                />
              )}
              {pctUnregistered > 0 && (
                <div
                  style={{ width: `${pctUnregistered}%` }}
                  className="bg-text-muted transition-all duration-500"
                  title={`Unregistered: ${unregisteredScans} (${pctUnregistered.toFixed(1)}%)`}
                />
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs pt-1">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-stark-emerald" />
                <span className="text-text-secondary">Verified:</span>
                <span className="font-mono font-semibold text-text-heading">
                  {verifiedScans} ({pctVerified.toFixed(1)}%)
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-stark-amber" />
                <span className="text-text-secondary">Manual Review:</span>
                <span className="font-mono font-semibold text-text-heading">
                  {manualReviewScans} ({pctManual.toFixed(1)}%)
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-stark-red" />
                <span className="text-text-secondary">Suspicious:</span>
                <span className="font-mono font-semibold text-text-heading">
                  {suspiciousScans} ({pctSuspicious.toFixed(1)}%)
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-text-muted" />
                <span className="text-text-secondary">Unregistered:</span>
                <span className="font-mono font-semibold text-text-heading">
                  {unregisteredScans} ({pctUnregistered.toFixed(1)}%)
                </span>
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* ── Product Specific Deep-Dive Terminal (Option B Short ID Support) ── */}
      <Card
        title="Asset Inspection Terminal (Short ID & Smart Contract Details)"
        subtitle="Inspect enrolled physical assets with human-friendly Short ID (Option B) and blockchain traces"
        icon={
          <svg className="w-5 h-5 text-stark-cyan" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
        }
      >
        {products.length === 0 ? (
          <p className="text-xs text-text-secondary">No products enrolled on the blockchain yet.</p>
        ) : (
          <div className="space-y-4">
            {/* Product Selector Dropdown */}
            <div>
              <label className="block text-xs font-mono text-text-secondary mb-1.5">
                SELECT ASSET TO INSPECT:
              </label>
              <select
                className="w-full rounded-lg bg-bg-input border border-stark-border px-3.5 py-2 text-xs font-mono text-text-primary focus:outline-none focus:border-stark-cyan"
                value={selectedPid}
                onChange={(e) => setSelectedPid(e.target.value)}
              >
                {products.map((p) => (
                  <option key={p.product_id} value={p.product_id}>
                    [{p.short_id || "PRD-LEGACY"}] {p.name} — {p.brand} ({p.serial}) [{p.status.toUpperCase()}]
                  </option>
                ))}
              </select>
            </div>

            {selectedProduct && (
              <div className="p-4 rounded-xl bg-bg-main border border-stark-border space-y-4">
                {/* Short ID Highlight Card */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3 rounded-lg bg-stark-cyan/10 border border-stark-cyan/30">
                  <div className="flex items-center gap-2.5">
                    <span className="text-lg">🏷️</span>
                    <div>
                      <span className="text-[10px] font-mono text-text-secondary uppercase block">
                        Short Human Product ID (Option B)
                      </span>
                      <span className="text-base font-bold font-mono text-stark-cyan">
                        {selectedProduct.short_id || "PRD-LEGACY"}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        copyToClipboard(
                          selectedProduct.short_id || selectedProduct.product_id,
                          "short"
                        )
                      }
                      className="px-2.5 py-1 rounded bg-bg-elevated hover:bg-bg-secondary border border-stark-border text-[11px] font-mono text-stark-cyan transition-colors"
                    >
                      {copiedId === "short" ? "✓ Copied!" : "📋 Copy Short ID"}
                    </button>
                    <Link
                      to={`/verify?pid=${selectedProduct.short_id || selectedProduct.product_id}`}
                      className="px-3 py-1 rounded bg-stark-cyan hover:bg-stark-cyan/90 text-white text-[11px] font-bold font-mono transition-colors flex items-center gap-1 shadow-sm"
                    >
                      <span>⚡</span> Test Verify
                    </Link>
                  </div>
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div>
                    <span className="text-text-secondary block text-[10px] font-mono">ASSET NAME</span>
                    <span className="font-semibold text-text-heading mt-0.5 block">
                      {selectedProduct.name}
                    </span>
                  </div>
                  <div>
                    <span className="text-text-secondary block text-[10px] font-mono">BRAND / MAKER</span>
                    <span className="font-semibold text-text-heading mt-0.5 block">
                      {selectedProduct.brand}
                    </span>
                  </div>
                  <div>
                    <span className="text-text-secondary block text-[10px] font-mono">SERIAL NO.</span>
                    <span className="font-mono text-stark-cyan mt-0.5 block">
                      {selectedProduct.serial}
                    </span>
                  </div>
                  <div>
                    <span className="text-text-secondary block text-[10px] font-mono">LIFECYCLE STATUS</span>
                    <span
                      className={`font-semibold mt-0.5 block ${
                        selectedProduct.status === "sold" ? "text-stark-amber" : "text-stark-emerald"
                      }`}
                    >
                      {selectedProduct.status.toUpperCase()}
                    </span>
                  </div>
                </div>

                {/* Full Blockchain Hash Row */}
                <div className="pt-2 border-t border-stark-border/60 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <span className="text-text-secondary font-mono text-[11px]">
                    Blockchain Native Hash (bytes32):
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[11px] text-text-secondary break-all">
                      {selectedProduct.product_id}
                    </span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(selectedProduct.product_id, "full")}
                      className="text-[10px] font-mono text-stark-cyan hover:underline"
                    >
                      {copiedId === "full" ? "✓ Copied" : "Copy"}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </Card>

      {/* ── Scan Timeline & Activity Stream for Selected Asset ── */}
      {selectedProductScans.length > 0 && (
        <Card
          title={`Scan Telemetry Timeline (${selectedProductScans.length} events)`}
          subtitle={`Chronological audit trace of verifications for ${selectedProduct?.name || "asset"}`}
        >
          <div className="relative border-l border-stark-border ml-3 space-y-4 py-2">
            {selectedProductScans.map((s, idx) => (
              <div key={s.id || idx} className="ml-5 relative">
                <span className="absolute -left-[27px] top-1.5 w-3 h-3 rounded-full bg-bg-card border-2 border-stark-cyan shadow-[0_0_8px_rgba(7,136,206,0.4)] dark:shadow-[0_0_8px_rgba(0,191,255,0.6)]" />

                <div className="p-3 rounded-xl bg-bg-main border border-stark-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <time className="text-xs font-mono text-text-secondary">
                      {new Date(s.ts).toLocaleString()}
                    </time>
                    <VerdictBadge verdict={s.verdict} size="sm" />
                    <span className="text-[11px] font-mono text-stark-cyan px-2 py-0.5 rounded bg-bg-elevated border border-stark-border">
                      {s.channel.toUpperCase()}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 text-xs">
                    {s.risk_score !== null && (
                      <span className="font-mono text-text-secondary">
                        Risk: <strong className="text-text-heading">{s.risk_score.toFixed(3)}</strong>
                      </span>
                    )}
                    {s.lat !== null && s.lon !== null && (
                      <a
                        href={`https://www.openstreetmap.org/?mlat=${s.lat}&mlon=${s.lon}&zoom=12`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-stark-cyan hover:underline flex items-center gap-1 font-mono text-[11px]"
                      >
                        <span>📍</span>
                        <span>
                          {s.lat.toFixed(2)}, {s.lon.toFixed(2)}
                        </span>
                      </a>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* ── Global Real-Time Audit Feed Table ── */}
      <Card
        title={`Live Global Audit Feed (${allScans.length} events logged)`}
        subtitle="Live verification queries arriving from consumers, retailers, and mobile inspection cameras"
        action={
          <span className="px-2 py-0.5 rounded-full bg-stark-emerald/10 text-stark-emerald border border-stark-emerald/30 text-[10px] font-mono font-medium">
            AUTO-STREAMING
          </span>
        }
      >
        {allScans.length === 0 ? (
          <p className="text-xs text-text-secondary py-4 text-center">
            No scan telemetry recorded yet.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-text-secondary border-b border-stark-border font-mono text-[11px]">
                  <th className="pb-2 pr-3">#</th>
                  <th className="pb-2 pr-3">Timestamp</th>
                  <th className="pb-2 pr-3">Asset / Short ID</th>
                  <th className="pb-2 pr-3">Channel</th>
                  <th className="pb-2 pr-3">Verdict</th>
                  <th className="pb-2 pr-3">Identity</th>
                  <th className="pb-2 pr-3">Chain</th>
                  <th className="pb-2">ML Risk</th>
                </tr>
              </thead>
              <tbody>
                {allScans.slice(0, 25).map((s, idx) => {
                  const prod = pidToProductMap.get(s.product_id);
                  const displayId = prod?.short_id || (s.product_id.length > 14 ? `${s.product_id.slice(0, 8)}...${s.product_id.slice(-4)}` : s.product_id);

                  return (
                    <tr
                      key={s.id || idx}
                      className="border-b border-stark-border/50 last:border-0 hover:bg-bg-elevated/40 transition-colors"
                    >
                      <td className="py-2.5 pr-3 font-mono text-text-muted">{idx + 1}</td>
                      <td className="py-2.5 pr-3 font-mono text-text-secondary whitespace-nowrap">
                        {new Date(s.ts).toLocaleTimeString()}
                      </td>
                      <td className="py-2.5 pr-3 font-mono">
                        <span className="px-2 py-0.5 rounded bg-bg-elevated border border-stark-border text-stark-cyan font-bold">
                          {displayId}
                        </span>
                        {prod && (
                          <span className="ml-1.5 text-text-secondary text-[11px]">
                            {prod.name}
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 pr-3 font-mono uppercase text-text-heading">
                        {s.channel}
                      </td>
                      <td className="py-2.5 pr-3">
                        <VerdictBadge verdict={s.verdict} size="sm" />
                      </td>
                      <td className="py-2.5 pr-3 font-mono text-text-secondary">
                        {s.identity_result}
                      </td>
                      <td className="py-2.5 pr-3 font-mono text-text-secondary">
                        {s.chain_result}
                      </td>
                      <td className="py-2.5 font-mono text-text-heading">
                        {s.risk_score !== null ? s.risk_score.toFixed(3) : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
