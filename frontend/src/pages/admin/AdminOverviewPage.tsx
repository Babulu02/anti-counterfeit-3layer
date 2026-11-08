import React, { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { listProducts, getRecentScans, getHealth, getChainInfo, type ProductOut, type ScanOut } from "../../lib/api";
import { useAuth } from "../../lib/auth";
import VerdictBadge from "../../components/VerdictBadge";
import Card from "../../components/Card";

export default function AdminOverviewPage() {
  const { applications } = useAuth();
  const [products, setProducts] = useState<ProductOut[]>([]);
  const [recentScans, setRecentScans] = useState<ScanOut[]>([]);
  const [health, setHealth] = useState<{ status: string; db: string; chain: string; contract: string } | null>(null);
  const [chainInfo, setChainInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastSync, setLastSync] = useState<Date>(new Date());

  const fetchData = useCallback(async (silent = false) => {
    try {
      const [ps, scans, h, c] = await Promise.all([
        listProducts(),
        getRecentScans(50),
        getHealth().catch(() => null),
        getChainInfo().catch(() => null),
      ]);
      setProducts(ps);
      setRecentScans(scans);
      if (h) setHealth(h);
      if (c) setChainInfo(c);
      setLastSync(new Date());
    } catch (e) {
      console.warn("Failed fetching overview telemetry:", e);
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData(false);
  }, [fetchData]);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => fetchData(true), 4000);
    return () => clearInterval(interval);
  }, [autoRefresh, fetchData]);

  const totalProducts = products.length;
  const totalScans = recentScans.length;
  const verifiedScans = recentScans.filter((s) => s.verdict === "Verified").length;
  const suspiciousScans = recentScans.filter((s) => s.verdict === "Suspicious activity").length;
  const manualReviewScans = recentScans.filter((s) => s.verdict === "Manual review").length;
  const pendingApprovals = applications.filter((a) => a.status === "pending").length;
  const approvedMfrs = applications.filter((a) => a.status === "approved").length;

  return (
    <div className="space-y-6">
      {/* ── Top Bar ── */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-stark-border pb-5">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded bg-stark-cyan/10 border border-stark-cyan/30 text-stark-cyan text-[11px] font-mono mb-2">
            STARK // SYSTEM INTELLIGENCE & TELEMETRY
          </div>
          <h1 className="text-2xl font-bold text-text-heading tracking-tight flex items-center gap-3">
            Platform Command Center
            {autoRefresh && (
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-stark-emerald opacity-75" />
                <span className="relative inline-flex rounded-full h-3 w-3 bg-stark-emerald" />
              </span>
            )}
          </h1>
          <p className="text-xs text-text-secondary mt-1">
            Real-time security surveillance, smart contract transaction counts, and manufacturer lifecycle overview.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-2.5 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-3.5 py-2 min-h-[40px] rounded-xl border text-xs font-mono transition-all ${
              autoRefresh
                ? "bg-stark-emerald/10 border-stark-emerald/30 text-stark-emerald"
                : "bg-bg-card border-stark-border text-text-muted"
            }`}
          >
            <span className={`w-2 h-2 rounded-full shrink-0 ${autoRefresh ? "bg-stark-emerald animate-pulse" : "bg-text-muted"}`} />
            <span>{autoRefresh ? "LIVE (4s)" : "PAUSED"}</span>
          </button>

          <button
            type="button"
            onClick={() => fetchData(false)}
            className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3.5 py-2 min-h-[40px] rounded-xl bg-bg-elevated hover:bg-bg-secondary border border-stark-border text-xs font-mono text-stark-cyan transition-colors"
          >
            <span>🔄</span>
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* ── System Status & Node Health Bar ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 rounded-xl bg-bg-card border border-stark-border text-xs font-mono shadow-sm">
        <div className="flex items-center gap-2.5">
          <span className="w-2.5 h-2.5 rounded-full bg-stark-emerald" />
          <div>
            <span className="text-text-secondary block text-[10px]">SMART CONTRACT</span>
            <span className="text-text-heading font-semibold">
              {health?.contract?.includes("ok") ? "ProductRegistry (L1)" : "Ganache 1337"}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2.5">
          <span className="w-2.5 h-2.5 rounded-full bg-stark-emerald" />
          <div>
            <span className="text-text-secondary block text-[10px]">DATABASE ENGINE</span>
            <span className="text-text-heading font-semibold">{health?.db || "MySQL 9.x (Active)"}</span>
          </div>
        </div>
        <div className="flex items-center gap-2.5">
          <span className="w-2.5 h-2.5 rounded-full bg-stark-cyan" />
          <div>
            <span className="text-text-secondary block text-[10px]">AI IMAGE FUSION</span>
            <span className="text-text-heading font-semibold">MobileNetV2 + OCR</span>
          </div>
        </div>
        <div className="flex items-center gap-2.5">
          <span className="w-2.5 h-2.5 rounded-full bg-stark-amber" />
          <div>
            <span className="text-text-secondary block text-[10px]">LAST SYNC</span>
            <span className="text-text-heading font-semibold">{lastSync.toLocaleTimeString()}</span>
          </div>
        </div>
      </div>

      {/* ── Key Metrics Grid ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
        <div className="p-3.5 rounded-xl bg-bg-card border border-stark-border shadow-sm">
          <span className="text-[10px] font-mono text-text-secondary uppercase block">Manufacturers</span>
          <span className="text-2xl font-bold font-mono text-text-heading mt-1 block">{approvedMfrs}</span>
          <span className="text-[10px] text-stark-emerald font-semibold">Approved</span>
        </div>

        <div className="p-3.5 rounded-xl bg-bg-card border border-stark-border shadow-sm">
          <span className="text-[10px] font-mono text-text-secondary uppercase block">Pending KYC</span>
          <span className={`text-2xl font-bold font-mono mt-1 block ${pendingApprovals > 0 ? "text-stark-amber" : "text-text-heading"}`}>
            {pendingApprovals}
          </span>
          <Link to="/admin/manufacturers" className="text-[10px] text-stark-cyan hover:underline">
            Review Queue &rarr;
          </Link>
        </div>

        <div className="p-3.5 rounded-xl bg-bg-card border border-stark-border shadow-sm">
          <span className="text-[10px] font-mono text-text-secondary uppercase block">Products</span>
          <span className="text-2xl font-bold font-mono text-text-heading mt-1 block">{totalProducts}</span>
          <span className="text-[10px] text-stark-cyan font-semibold">On-Chain</span>
        </div>

        <div className="p-3.5 rounded-xl bg-bg-card border border-stark-border shadow-sm">
          <span className="text-[10px] font-mono text-text-secondary uppercase block">Total Scans</span>
          <span className="text-2xl font-bold font-mono text-text-heading mt-1 block">{totalScans}</span>
          <span className="text-[10px] text-text-secondary">Telemetry</span>
        </div>

        <div className="p-3.5 rounded-xl bg-bg-card border border-stark-border shadow-sm">
          <span className="text-[10px] font-mono text-text-secondary uppercase block">Verified</span>
          <span className="text-2xl font-bold font-mono text-stark-emerald mt-1 block">{verifiedScans}</span>
          <span className="text-[10px] text-stark-emerald font-semibold">
            {totalScans > 0 ? `${((verifiedScans / totalScans) * 100).toFixed(0)}%` : "0%"}
          </span>
        </div>

        <div className="p-3.5 rounded-xl bg-bg-card border border-stark-border shadow-sm">
          <span className="text-[10px] font-mono text-text-secondary uppercase block">Suspicious</span>
          <span className="text-2xl font-bold font-mono text-stark-red mt-1 block">{suspiciousScans}</span>
          <span className="text-[10px] text-stark-red font-semibold">Flagged</span>
        </div>

        <div className="p-3.5 rounded-xl bg-bg-card border border-stark-border shadow-sm">
          <span className="text-[10px] font-mono text-text-secondary uppercase block">Manual Review</span>
          <span className="text-2xl font-bold font-mono text-stark-amber mt-1 block">{manualReviewScans}</span>
          <span className="text-[10px] text-stark-amber font-semibold">Investigate</span>
        </div>

        <div className="p-3.5 rounded-xl bg-bg-card border border-stark-border shadow-sm">
          <span className="text-[10px] font-mono text-text-secondary uppercase block">Blockchain Tx</span>
          <span className="text-2xl font-bold font-mono text-text-heading mt-1 block">{totalProducts + totalScans}</span>
          <span className="text-[10px] text-text-secondary font-mono">EVM Block L1</span>
        </div>
      </div>

      {/* ── Quick Governance Action Cards ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card
          title="Manufacturer Governance"
          subtitle="Review and authorize physical product creators"
          icon={<span className="text-lg">🏭</span>}
        >
          <p className="text-xs text-text-secondary leading-relaxed">
            {pendingApprovals} manufacturer applications awaiting KYC compliance check and smart contract whitelist activation.
          </p>
          <div className="mt-4 flex gap-2">
            <Link
              to="/admin/manufacturers"
              className="px-3.5 py-1.5 rounded-xl bg-stark-cyan text-white text-xs font-bold font-mono hover:bg-stark-cyan/90 transition-all shadow-sm"
            >
              Manage Manufacturers &rarr;
            </Link>
          </div>
        </Card>

        <Card
          title="Smart Contract Operations"
          subtitle="ProductRegistry.sol status & on-chain whitelist"
          icon={<span className="text-lg">⛓️</span>}
        >
          <p className="text-xs text-text-secondary leading-relaxed">
            Connected to EVM 1337. Verify contract owner privileges and execute on-chain whitelist or revocation transactions.
          </p>
          <div className="mt-4 flex gap-2">
            <Link
              to="/admin/blockchain"
              className="px-3.5 py-1.5 rounded-xl bg-bg-elevated hover:bg-bg-secondary border border-stark-border text-xs font-bold font-mono text-stark-cyan transition-all"
            >
              Contract Console &rarr;
            </Link>
          </div>
        </Card>

        <Card
          title="Fraud Surveillance Engine"
          subtitle="Real-time multi-signal attack pattern detector"
          icon={<span className="text-lg">🚨</span>}
        >
          <p className="text-xs text-text-secondary leading-relaxed">
            Surveillance for impossible travel, clone-first, replay, and visual label tampering with automated threat scoring.
          </p>
          <div className="mt-4 flex gap-2">
            <Link
              to="/admin/security"
              className="px-3.5 py-1.5 rounded-xl bg-bg-elevated hover:bg-bg-secondary border border-stark-border text-xs font-bold font-mono text-stark-red transition-all"
            >
              Security Telemetry &rarr;
            </Link>
          </div>
        </Card>
      </div>

      {/* ── Recent Global Audit Telemetry Feed ── */}
      <Card
        title={`Live Global Audit Feed (${recentScans.length} events logged)`}
        subtitle="Live verification queries arriving from consumers, retailers, and mobile inspection cameras"
        action={
          <Link
            to="/admin/audit"
            className="px-2.5 py-1 rounded bg-bg-elevated border border-stark-border text-[11px] font-mono text-stark-cyan hover:underline"
          >
            View Full Audit Logs &rarr;
          </Link>
        }
      >
        {recentScans.length === 0 ? (
          <p className="text-xs text-text-secondary py-6 text-center">No scan telemetry recorded yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-text-secondary border-b border-stark-border font-mono text-[11px]">
                  <th className="pb-2 pr-3">#</th>
                  <th className="pb-2 pr-3">Timestamp</th>
                  <th className="pb-2 pr-3">Asset ID</th>
                  <th className="pb-2 pr-3">Channel</th>
                  <th className="pb-2 pr-3">Verdict</th>
                  <th className="pb-2 pr-3">Identity</th>
                  <th className="pb-2 pr-3">Chain</th>
                  <th className="pb-2 text-right">ML Risk</th>
                </tr>
              </thead>
              <tbody>
                {recentScans.slice(0, 10).map((s, idx) => (
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
                        {s.product_id.length > 14 ? `${s.product_id.slice(0, 8)}...${s.product_id.slice(-4)}` : s.product_id}
                      </span>
                    </td>
                    <td className="py-2.5 pr-3 font-mono uppercase text-text-heading">{s.channel}</td>
                    <td className="py-2.5 pr-3">
                      <VerdictBadge verdict={s.verdict} size="sm" />
                    </td>
                    <td className="py-2.5 pr-3 font-mono text-text-secondary">{s.identity_result}</td>
                    <td className="py-2.5 pr-3 font-mono text-text-secondary">{s.chain_result}</td>
                    <td className="py-2.5 text-right font-mono text-text-heading">
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

