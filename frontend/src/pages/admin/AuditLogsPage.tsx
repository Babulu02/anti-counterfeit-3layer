import React, { useState, useEffect } from "react";
import { getRecentScans, listProducts, type ScanOut, type ProductOut } from "../../lib/api";
import { useAuth } from "../../lib/auth";
import Card from "../../components/Card";
import VerdictBadge from "../../components/VerdictBadge";

interface AuditEntry {
  id: string;
  category: "BLOCKCHAIN_TX" | "VERIFICATION" | "MANUFACTURER" | "SECURITY" | "TAG";
  timestamp: string;
  summary: string;
  detail: string;
  actor: string;
  status: "success" | "warning" | "danger" | "info";
}

export default function AuditLogsPage() {
  const { applications } = useAuth();
  const [scans, setScans] = useState<ScanOut[]>([]);
  const [products, setProducts] = useState<ProductOut[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterCategory, setFilterCategory] = useState<string>("all");

  useEffect(() => {
    Promise.all([getRecentScans(100).catch(() => []), listProducts().catch(() => [])])
      .then(([s, p]) => {
        setScans(s);
        setProducts(p);
      })
      .finally(() => setLoading(false));
  }, []);

  // Assemble comprehensive unified audit stream
  const auditEntries: AuditEntry[] = [];

  // Product registrations
  products.forEach((p) => {
    auditEntries.push({
      id: `prod-${p.product_id}`,
      category: "BLOCKCHAIN_TX",
      timestamp: p.created_at,
      summary: `Product Enrolled: ${p.name} (${p.short_id || "PRD-LEGACY"})`,
      detail: `Record Hash: ${p.record_hash.slice(0, 18)}... | Serial: ${p.serial} | Mfr: ${p.manufacturer_address.slice(0, 10)}...`,
      actor: p.manufacturer_address.slice(0, 10) + "...",
      status: "success",
    });
  });

  // Manufacturer KYC applications
  applications.forEach((a) => {
    auditEntries.push({
      id: `mfr-${a.id}`,
      category: "MANUFACTURER",
      timestamp: a.submittedAt,
      summary: `Manufacturer Application: ${a.name}`,
      detail: `Reg: ${a.businessRegNumber} | Status: ${a.status.toUpperCase()} | Wallet: ${a.walletAddress.slice(0, 10)}...`,
      actor: "Compliance Officer",
      status: a.status === "approved" ? "success" : a.status === "pending" ? "warning" : "danger",
    });
  });

  // Verification scans
  scans.forEach((s) => {
    const isThreat = s.verdict !== "Verified";
    auditEntries.push({
      id: `scan-${s.id}`,
      category: isThreat ? "SECURITY" : "VERIFICATION",
      timestamp: s.ts,
      summary: `Audit Event: ${s.verdict} via ${s.channel.toUpperCase()}`,
      detail: `Asset: ${s.product_id.slice(0, 12)}... | Identity: ${s.identity_result} | Reason: ${s.reason}`,
      actor: s.device_hash ? `Device ${s.device_hash.slice(0, 8)}` : "Public Inspector",
      status: s.verdict === "Verified" ? "info" : s.verdict === "Suspicious activity" ? "danger" : "warning",
    });
  });

  // Sort descending by timestamp
  auditEntries.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  const filtered = auditEntries.filter((e) => {
    if (filterCategory === "all") return true;
    return e.category === filterCategory;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-stark-border pb-5">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded bg-stark-cyan/10 border border-stark-cyan/30 text-stark-cyan text-[11px] font-mono mb-2">
            IMMUTABLE // THREE-LAYER AUDIT TRAIL
          </div>
          <h1 className="text-2xl font-bold text-text-heading tracking-tight">
            Comprehensive Audit & Event Stream
          </h1>
          <p className="text-xs text-text-secondary mt-1">
            End-to-end cryptographic trace of blockchain transactions, manufacturer approvals, asset registrations, and verification attempts.
          </p>
        </div>

        <div className="flex items-center gap-2 font-mono text-xs">
          <span className="px-3 py-1.5 rounded-xl bg-bg-card border border-stark-border text-text-heading">
            Total Logged Events: <strong className="text-stark-cyan">{auditEntries.length}</strong>
          </span>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-stark-border pb-3">
        {[
          { key: "all", label: "All Audit Events" },
          { key: "BLOCKCHAIN_TX", label: "Blockchain Tx & Assets" },
          { key: "MANUFACTURER", label: "Manufacturer KYC" },
          { key: "VERIFICATION", label: "Verified Scans" },
          { key: "SECURITY", label: "Security & Fraud Incidents" },
        ].map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setFilterCategory(tab.key)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-mono transition-all ${
              filterCategory === tab.key
                ? "bg-stark-cyan text-white font-bold"
                : "bg-bg-card hover:bg-bg-elevated border border-stark-border text-text-secondary"
            }`}
          >
            {tab.label} (
            {tab.key === "all"
              ? auditEntries.length
              : auditEntries.filter((e) => e.category === tab.key).length}
            )
          </button>
        ))}
      </div>

      {/* Audit Stream Table */}
      <Card title={`Chronological System Audit Feed (${filtered.length})`}>
        {loading ? (
          <p className="text-xs text-text-secondary py-8 text-center font-mono">Aggregating audit logs...</p>
        ) : filtered.length === 0 ? (
          <p className="text-xs text-text-secondary py-8 text-center">No logs matching this category.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-text-secondary border-b border-stark-border font-mono text-[11px]">
                  <th className="pb-2 pr-3">Timestamp</th>
                  <th className="pb-2 pr-3">Category</th>
                  <th className="pb-2 pr-3">Event Summary</th>
                  <th className="pb-2 pr-3">Diagnostic Detail</th>
                  <th className="pb-2 pr-3">Initiating Actor</th>
                  <th className="pb-2 text-right">Ledger Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((item) => (
                  <tr
                    key={item.id}
                    className="border-b border-stark-border/50 last:border-0 hover:bg-bg-elevated/40 transition-colors"
                  >
                    <td className="py-2.5 pr-3 font-mono text-text-secondary whitespace-nowrap">
                      {new Date(item.timestamp).toLocaleString()}
                    </td>
                    <td className="py-2.5 pr-3">
                      <span className="px-2 py-0.5 rounded font-mono text-[10px] bg-bg-elevated border border-stark-border text-text-heading font-semibold">
                        {item.category}
                      </span>
                    </td>
                    <td className="py-2.5 pr-3 font-semibold text-text-heading">{item.summary}</td>
                    <td className="py-2.5 pr-3 font-mono text-text-secondary text-[11px] max-w-xs truncate" title={item.detail}>
                      {item.detail}
                    </td>
                    <td className="py-2.5 pr-3 font-mono text-[11px] text-text-muted">{item.actor}</td>
                    <td className="py-2.5 text-right">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded font-mono text-[10px] font-bold uppercase ${
                          item.status === "success"
                            ? "bg-stark-emerald/10 text-stark-emerald border border-stark-emerald/30"
                            : item.status === "danger"
                            ? "bg-stark-red/10 text-stark-red border border-stark-red/30"
                            : item.status === "warning"
                            ? "bg-stark-amber/10 text-stark-amber border border-stark-amber/30"
                            : "bg-stark-cyan/10 text-stark-cyan border border-stark-cyan/30"
                        }`}
                      >
                        {item.status}
                      </span>
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

