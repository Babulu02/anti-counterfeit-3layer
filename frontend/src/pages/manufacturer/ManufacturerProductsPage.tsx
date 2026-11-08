import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { listProducts, type ProductOut } from "../../lib/api";
import Card from "../../components/Card";

export default function ManufacturerProductsPage() {
  const [products, setProducts] = useState<ProductOut[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listProducts()
      .then(setProducts)
      .finally(() => setLoading(false));
  }, []);

  const filtered = products.filter((p) => {
    const term = search.toLowerCase();
    return (
      p.name.toLowerCase().includes(term) ||
      p.brand.toLowerCase().includes(term) ||
      p.product_id.toLowerCase().includes(term) ||
      (p.short_id && p.short_id.toLowerCase().includes(term))
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-stark-border pb-5">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded bg-stark-cyan/10 border border-stark-cyan/30 text-stark-cyan text-[11px] font-mono mb-2">
            HACP5 // PRODUCT ENROLLMENT LEDGER
          </div>
          <h1 className="text-2xl font-bold text-text-heading tracking-tight">
            Manufacturer Asset Catalog
          </h1>
          <p className="text-xs text-text-secondary mt-1">
            Physical items enrolled on the Ethereum blockchain with SHA-256 record hashes and dynamic QR tokens.
          </p>
        </div>

        <Link
          to="/manufacturer/generate-tags"
          className="px-4 py-2 rounded-xl bg-stark-cyan text-white text-xs font-bold font-mono hover:bg-stark-cyan/90 transition-all shadow-sm flex items-center gap-1.5"
        >
          <span>+</span>
          <span>Enroll New Asset</span>
        </Link>
      </div>

      <div className="flex items-center gap-3">
        <input
          type="text"
          placeholder="Filter by Short ID, Product Name, Brand, or Serial..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full max-w-md rounded-xl bg-bg-card border border-stark-border px-3.5 py-2 text-xs font-mono text-text-primary focus:outline-none focus:border-stark-cyan"
        />
      </div>

      <Card title={`Enrolled Physical Products (${filtered.length})`}>
        {loading ? (
          <p className="text-xs text-text-secondary py-8 text-center font-mono">Loading assets...</p>
        ) : filtered.length === 0 ? (
          <div className="py-8 text-center space-y-3">
            <p className="text-xs text-text-secondary">No products enrolled yet matching your search.</p>
            <Link
              to="/manufacturer/generate-tags"
              className="inline-block px-4 py-2 rounded-xl bg-stark-cyan text-white text-xs font-bold font-mono"
            >
              Enroll Your First Product &rarr;
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-text-secondary border-b border-stark-border font-mono text-[11px]">
                  <th className="pb-2 pr-3">Short ID (Option B)</th>
                  <th className="pb-2 pr-3">Asset Name</th>
                  <th className="pb-2 pr-3">Brand</th>
                  <th className="pb-2 pr-3">Serial</th>
                  <th className="pb-2 pr-3">On-Chain Hash</th>
                  <th className="pb-2 pr-3">Status</th>
                  <th className="pb-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => (
                  <tr
                    key={p.product_id}
                    className="border-b border-stark-border/50 last:border-0 hover:bg-bg-elevated/40 transition-colors"
                  >
                    <td className="py-2.5 pr-3 font-mono">
                      <span className="px-2 py-0.5 rounded bg-bg-elevated border border-stark-border text-stark-cyan font-bold">
                        {p.short_id || "PRD-LEGACY"}
                      </span>
                    </td>
                    <td className="py-2.5 pr-3 font-semibold text-text-heading">{p.name}</td>
                    <td className="py-2.5 pr-3 font-mono text-text-secondary">{p.brand}</td>
                    <td className="py-2.5 pr-3 font-mono text-text-muted">{p.serial}</td>
                    <td className="py-2.5 pr-3 font-mono text-[11px] text-text-secondary" title={p.record_hash}>
                      {p.record_hash.slice(0, 10)}...{p.record_hash.slice(-6)}
                    </td>
                    <td className="py-2.5 pr-3">
                      <span className="px-2 py-0.5 rounded-full font-mono text-[10px] bg-stark-emerald/10 text-stark-emerald border border-stark-emerald/30 font-bold uppercase">
                        {p.status}
                      </span>
                    </td>
                    <td className="py-2.5 text-right whitespace-nowrap">
                      <Link
                        to={`/consumer/verify?pid=${p.short_id || p.product_id}`}
                        className="px-2.5 py-1 rounded bg-bg-elevated hover:bg-bg-secondary border border-stark-border text-stark-cyan text-[11px] font-mono"
                      >
                        ⚡ Test Verify
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

