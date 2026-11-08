import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { listProducts, sellProduct, type ProductOut } from "../../lib/api";
import Card from "../../components/Card";

export default function ProductManagementPage() {
  const [products, setProducts] = useState<ProductOut[]>([]);
  const [search, setSearch] = useState("");
  const [selectedBrand, setSelectedBrand] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [loading, setLoading] = useState(true);
  const [flaggedIds, setFlaggedIds] = useState<Set<string>>(new Set());
  const [inspectProduct, setInspectProduct] = useState<ProductOut | null>(null);

  useEffect(() => {
    listProducts()
      .then(setProducts)
      .finally(() => setLoading(false));
  }, []);

  const brands = Array.from(new Set(products.map((p) => p.brand).filter(Boolean)));

  const filtered = products.filter((p) => {
    const term = search.toLowerCase();
    const matchesSearch =
      p.name.toLowerCase().includes(term) ||
      p.product_id.toLowerCase().includes(term) ||
      (p.short_id && p.short_id.toLowerCase().includes(term)) ||
      p.serial.toLowerCase().includes(term);

    const matchesBrand = selectedBrand === "all" || p.brand === selectedBrand;
    const matchesStatus = selectedStatus === "all" || p.status === selectedStatus;

    return matchesSearch && matchesBrand && matchesStatus;
  });

  const toggleFlag = (pid: string) => {
    setFlaggedIds((prev) => {
      const next = new Set(prev);
      if (next.has(pid)) next.delete(pid);
      else next.add(pid);
      return next;
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-stark-border pb-5">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded bg-stark-cyan/10 border border-stark-cyan/30 text-stark-cyan text-[11px] font-mono mb-2">
            HACP5 // PHYSICAL PRODUCT REGISTRY
          </div>
          <h1 className="text-2xl font-bold text-text-heading tracking-tight">
            Enrolled Products Master Directory
          </h1>
          <p className="text-xs text-text-secondary mt-1">
            Audit registered physical assets, examine cryptographic record hashes, and supervise on-chain lifecycle states.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3 py-1.5 rounded-xl bg-bg-card border border-stark-border text-xs font-mono text-text-heading">
            Total Assets: <strong className="text-stark-cyan">{products.length}</strong>
          </span>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3">
        <div>
          <input
            type="text"
            placeholder="Search by Product ID, Short ID, name, serial..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl bg-bg-card border border-stark-border px-3.5 py-2.5 min-h-[44px] text-xs font-mono text-text-primary focus:outline-none focus:border-stark-cyan shadow-sm"
          />
        </div>

        <div>
          <select
            value={selectedBrand}
            onChange={(e) => setSelectedBrand(e.target.value)}
            className="w-full rounded-xl bg-bg-card border border-stark-border px-3.5 py-2.5 min-h-[44px] text-xs font-mono text-text-primary focus:outline-none focus:border-stark-cyan shadow-sm"
          >
            <option value="all">All Brands ({brands.length})</option>
            {brands.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
        </div>

        <div>
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="w-full rounded-xl bg-bg-card border border-stark-border px-3.5 py-2.5 min-h-[44px] text-xs font-mono text-text-primary focus:outline-none focus:border-stark-cyan shadow-sm"
          >
            <option value="all">All Lifecycle States</option>
            <option value="registered">Registered (In Circulation)</option>
            <option value="sold">Sold (Marked On-Chain)</option>
          </select>
        </div>
      </div>

      {/* Product Table */}
      <Card title={`Registered Physical Products (${filtered.length})`}>
        {loading ? (
          <p className="text-xs text-text-secondary py-8 text-center font-mono">Querying MySQL & EVM records...</p>
        ) : filtered.length === 0 ? (
          <p className="text-xs text-text-secondary py-8 text-center">No products matched the filter criteria.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-text-secondary border-b border-stark-border font-mono text-[11px]">
                  <th className="pb-2 pr-3">Short ID</th>
                  <th className="pb-2 pr-3">Product Name & Brand</th>
                  <th className="pb-2 pr-3">Serial No.</th>
                  <th className="pb-2 pr-3">Manufacturer Address</th>
                  <th className="pb-2 pr-3">Lifecycle State</th>
                  <th className="pb-2 pr-3">Enrolled At</th>
                  <th className="pb-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => {
                  const isFlagged = flaggedIds.has(p.product_id);
                  return (
                    <tr
                      key={p.product_id}
                      className="border-b border-stark-border/50 last:border-0 hover:bg-bg-elevated/40 transition-colors"
                    >
                      <td className="py-2.5 pr-3 font-mono">
                        <span className="px-2 py-0.5 rounded bg-bg-elevated border border-stark-border text-stark-cyan font-bold">
                          {p.short_id || "PRD-LEGACY"}
                        </span>
                      </td>
                      <td className="py-2.5 pr-3">
                        <div className="font-semibold text-text-heading">{p.name}</div>
                        <div className="text-[11px] font-mono text-text-muted">{p.brand}</div>
                      </td>
                      <td className="py-2.5 pr-3 font-mono text-text-secondary">{p.serial}</td>
                      <td className="py-2.5 pr-3 font-mono text-[11px] text-text-secondary">
                        {p.manufacturer_address.slice(0, 6)}...{p.manufacturer_address.slice(-4)}
                      </td>
                      <td className="py-2.5 pr-3">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-mono text-[10px] font-bold uppercase ${
                            p.status === "sold"
                              ? "bg-stark-amber/10 text-stark-amber border border-stark-amber/30"
                              : "bg-stark-emerald/10 text-stark-emerald border border-stark-emerald/30"
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              p.status === "sold" ? "bg-stark-amber" : "bg-stark-emerald"
                            }`}
                          />
                          {p.status}
                        </span>
                      </td>
                      <td className="py-2.5 pr-3 font-mono text-text-secondary whitespace-nowrap">
                        {new Date(p.created_at).toLocaleDateString()}
                      </td>
                      <td className="py-2.5 text-right space-x-1.5 whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => setInspectProduct(p)}
                          className="px-2.5 py-1 rounded bg-bg-elevated hover:bg-bg-secondary border border-stark-border text-[11px] font-mono text-stark-cyan"
                        >
                          Inspect
                        </button>
                        <button
                          type="button"
                          onClick={() => toggleFlag(p.product_id)}
                          className={`px-2.5 py-1 rounded border text-[11px] font-mono ${
                            isFlagged
                              ? "bg-stark-red text-white border-stark-red"
                              : "bg-bg-elevated hover:bg-bg-secondary border-stark-border text-text-secondary"
                          }`}
                        >
                          {isFlagged ? "🚩 Flagged" : "Flag"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Inspect Modal */}
      {inspectProduct && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-2xl rounded-2xl bg-bg-card border border-stark-border shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-stark-border pb-3">
              <div>
                <span className="text-[10px] font-mono text-stark-cyan uppercase block">Cryptographic Asset Inspection</span>
                <h3 className="text-base font-bold text-text-heading">
                  {inspectProduct.name} ({inspectProduct.short_id || "PRD-LEGACY"})
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setInspectProduct(null)}
                className="text-text-muted hover:text-text-heading text-lg"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs font-mono">
              <div className="p-3 rounded-xl bg-bg-main border border-stark-border space-y-2">
                <div>
                  <span className="text-text-muted block text-[10px]">ON-CHAIN PRODUCT ID (BYTES32)</span>
                  <span className="text-stark-cyan break-all font-bold">{inspectProduct.product_id}</span>
                </div>
                <div>
                  <span className="text-text-muted block text-[10px]">RECORD HASH (HASH(NAME|BRAND|SERIAL|IMAGE))</span>
                  <span className="text-text-heading break-all">{inspectProduct.record_hash}</span>
                </div>
                {inspectProduct.image_sha256 && (
                  <div>
                    <span className="text-text-muted block text-[10px]">IMAGE SHA-256</span>
                    <span className="text-text-secondary break-all">{inspectProduct.image_sha256}</span>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-bg-main border border-stark-border">
                <div>
                  <span className="text-text-muted block text-[10px]">BRAND</span>
                  <span className="text-text-heading font-semibold">{inspectProduct.brand}</span>
                </div>
                <div>
                  <span className="text-text-muted block text-[10px]">SERIAL NO.</span>
                  <span className="text-text-heading font-semibold">{inspectProduct.serial}</span>
                </div>
                <div>
                  <span className="text-text-muted block text-[10px]">MANUFACTURER ADDRESS</span>
                  <span className="text-text-heading break-all">{inspectProduct.manufacturer_address}</span>
                </div>
                <div>
                  <span className="text-text-muted block text-[10px]">LIFECYCLE STATUS</span>
                  <span className="text-stark-emerald font-semibold uppercase">{inspectProduct.status}</span>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-stark-border">
              <Link
                to={`/consumer/verify?pid=${inspectProduct.short_id || inspectProduct.product_id}`}
                className="px-4 py-2 rounded-xl bg-stark-cyan text-white text-xs font-bold font-mono hover:bg-stark-cyan/90 transition-all shadow-sm"
              >
                ⚡ Test in Consumer Verify
              </Link>
              <button
                type="button"
                onClick={() => setInspectProduct(null)}
                className="px-4 py-2 rounded-xl bg-bg-elevated hover:bg-bg-secondary border border-stark-border text-xs font-semibold text-text-secondary"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

