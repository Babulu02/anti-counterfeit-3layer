import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../lib/auth";
import { listProducts, getRecentScans, type ProductOut, type ScanOut } from "../../lib/api";
import Card from "../../components/Card";
import VerdictBadge from "../../components/VerdictBadge";

export default function ManufacturerOverviewPage() {
  const { currentManufacturerApp, isWhitelistedManufacturer } = useAuth();
  const [products, setProducts] = useState<ProductOut[]>([]);
  const [scans, setScans] = useState<ScanOut[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([listProducts().catch(() => []), getRecentScans(50).catch(() => [])])
      .then(([p, s]) => {
        setProducts(p);
        setScans(s);
      })
      .finally(() => setLoading(false));
  }, []);

  const isApproved = currentManufacturerApp?.status === "approved" || isWhitelistedManufacturer;
  const totalEnrolled = products.length;
  const verifiedScans = scans.filter((s) => s.verdict === "Verified").length;
  const suspiciousScans = scans.filter((s) => s.verdict !== "Verified").length;

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-stark-border pb-5">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded bg-stark-cyan/10 border border-stark-cyan/30 text-stark-cyan text-[11px] font-mono mb-2">
            HACP5 // ORIGINAL MANUFACTURER WORKSPACE
          </div>
          <h1 className="text-2xl font-bold text-text-heading tracking-tight flex items-center gap-3">
            {currentManufacturerApp?.name || "Manufacturer Operations"}
          </h1>
          <p className="text-xs text-text-secondary mt-1">
            Production line management, dynamic QR code generation, NTAG 424 SUN AuthentiCoding, and market scan telemetry.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            to="/manufacturer/generate-tags"
            className="px-4 py-2 rounded-xl bg-stark-cyan text-white text-xs font-bold font-mono hover:bg-stark-cyan/90 transition-all shadow-sm flex items-center gap-1.5"
          >
            <span>⚡</span>
            <span>Enroll New Asset</span>
          </Link>
        </div>
      </div>

      {/* KYC / On-Chain Status Alert */}
      {!isApproved && (
        <div className="p-4 rounded-xl bg-stark-amber/10 border border-stark-amber/30 text-stark-amber text-xs flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="text-xl">⚠️</span>
            <div>
              <p className="font-bold">KYC Approval & Smart Contract Whitelist Pending</p>
              <p className="text-text-secondary mt-0.5">
                Your company registration is awaiting compliance review from the platform administrator before on-chain minting is unlocked.
              </p>
            </div>
          </div>
          <Link
            to="/manufacturer/profile"
            className="px-3 py-1.5 rounded-lg bg-stark-amber/20 hover:bg-stark-amber/30 text-stark-amber font-semibold shrink-0"
          >
            View KYC Details &rarr;
          </Link>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        <div className="p-4 rounded-xl bg-bg-card border border-stark-border shadow-sm flex flex-col justify-between">
          <span className="text-[11px] font-mono text-text-secondary uppercase">Enrolled Assets</span>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-extrabold text-text-heading font-mono">{totalEnrolled}</span>
            <span className="text-xs text-stark-cyan font-semibold">On-Chain</span>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-bg-card border border-stark-border shadow-sm flex flex-col justify-between">
          <span className="text-[11px] font-mono text-text-secondary uppercase">Active Brands</span>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-extrabold text-text-heading font-mono">
              {currentManufacturerApp?.brands?.length || 2}
            </span>
            <span className="text-xs text-text-secondary">Portfolios</span>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-bg-card border border-stark-border shadow-sm flex flex-col justify-between">
          <span className="text-[11px] font-mono text-text-secondary uppercase">Authentic Verifications</span>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-extrabold text-stark-emerald font-mono">{verifiedScans}</span>
            <span className="text-xs text-stark-emerald font-semibold">Genuine</span>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-bg-card border border-stark-border shadow-sm flex flex-col justify-between">
          <span className="text-[11px] font-mono text-text-secondary uppercase">Market Anomalies</span>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-extrabold text-stark-amber font-mono">{suspiciousScans}</span>
            <span className="text-xs text-stark-amber font-semibold">Investigating</span>
          </div>
        </div>
      </div>

      {/* Production Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card
          title="Batch Production & Lot Control"
          subtitle="Define production runs and lot numbers"
          icon={<span className="text-lg">📑</span>}
        >
          <p className="text-xs text-text-secondary leading-relaxed">
            Create production batches, set lot serial formats, and prepare assets for factory floor packaging.
          </p>
          <div className="mt-4">
            <Link
              to="/manufacturer/batches"
              className="text-xs font-mono text-stark-cyan hover:underline font-bold"
            >
              Manage Batches &rarr;
            </Link>
          </div>
        </Card>

        <Card
          title="Dynamic QR & Cryptographic Minting"
          subtitle="Signed QR tokens & AI image feature extraction"
          icon={<span className="text-lg">⚡</span>}
        >
          <p className="text-xs text-text-secondary leading-relaxed">
            Enroll physical assets on-chain, upload packaging photos for MobileNetV2 embeddings, and generate signed QR labels.
          </p>
          <div className="mt-4">
            <Link
              to="/manufacturer/generate-tags"
              className="text-xs font-mono text-stark-cyan hover:underline font-bold"
            >
              Launch Tag Generator &rarr;
            </Link>
          </div>
        </Card>

        <Card
          title="AuthentiCoding NFC Tag Encoder"
          subtitle="NTAG 424 SUN AES-128 cryptographic pairing"
          icon={<span className="text-lg">📡</span>}
        >
          <p className="text-xs text-text-secondary leading-relaxed">
            Pair factory hardware encoders to write encrypted rolling counters and CMAC cryptograms to tamper-evident tags.
          </p>
          <div className="mt-4">
            <Link
              to="/manufacturer/nfc-encoding"
              className="text-xs font-mono text-stark-cyan hover:underline font-bold"
            >
              NFC Encoder Station &rarr;
            </Link>
          </div>
        </Card>
      </div>

      {/* Recent Enrolled Assets */}
      <Card
        title={`Recent Enrolled Assets (${products.length})`}
        subtitle="Physical goods registered with on-chain cryptographic proof and MobileNetV2 embeddings"
        action={
          <Link
            to="/manufacturer/products"
            className="text-xs font-mono text-stark-cyan hover:underline"
          >
            Full Catalog &rarr;
          </Link>
        }
      >
        {products.length === 0 ? (
          <p className="text-xs text-text-secondary py-6 text-center font-mono">
            No products enrolled yet. Click "Enroll New Asset" to register your first product.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-text-secondary border-b border-stark-border font-mono text-[11px]">
                  <th className="pb-2 pr-3">Short ID</th>
                  <th className="pb-2 pr-3">Product Name</th>
                  <th className="pb-2 pr-3">Brand</th>
                  <th className="pb-2 pr-3">Serial No.</th>
                  <th className="pb-2 pr-3">Status</th>
                  <th className="pb-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {products.slice(0, 5).map((p) => (
                  <tr
                    key={p.product_id}
                    className="border-b border-stark-border/50 last:border-0 hover:bg-bg-elevated/40 transition-colors"
                  >
                    <td className="py-2.5 pr-3 font-mono font-bold text-stark-cyan">
                      {p.short_id || "PRD-LEGACY"}
                    </td>
                    <td className="py-2.5 pr-3 font-semibold text-text-heading">{p.name}</td>
                    <td className="py-2.5 pr-3 font-mono text-text-secondary">{p.brand}</td>
                    <td className="py-2.5 pr-3 font-mono text-text-muted">{p.serial}</td>
                    <td className="py-2.5 pr-3">
                      <span className="px-2 py-0.5 rounded-full font-mono text-[10px] bg-stark-emerald/10 text-stark-emerald border border-stark-emerald/30 font-bold uppercase">
                        {p.status}
                      </span>
                    </td>
                    <td className="py-2.5 text-right font-mono">
                      <Link
                        to={`/consumer/verify?pid=${p.short_id || p.product_id}`}
                        className="text-stark-cyan hover:underline text-[11px]"
                      >
                        Verify &rarr;
                      </Link>
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

