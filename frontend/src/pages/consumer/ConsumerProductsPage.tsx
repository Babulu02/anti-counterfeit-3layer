import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { listProducts, type ProductOut } from "../../lib/api";
import Card from "../../components/Card";

export default function ConsumerProductsPage() {
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
      (p.short_id && p.short_id.toLowerCase().includes(term))
    );
  });

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      <div className="border-b border-stark-border pb-5">
        <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded bg-stark-cyan/10 border border-stark-cyan/30 text-stark-cyan text-[11px] font-mono mb-2">
          APPROVED CATALOG // PUBLIC LOOKUP
        </div>
        <h1 className="text-2xl font-bold text-text-heading tracking-tight">
          Approved Product Directory
        </h1>
        <p className="text-xs text-text-secondary mt-1">
          Browse verified genuine physical assets certified by legitimate manufacturers on the AETHER platform.
        </p>
      </div>

      <div className="max-w-md">
        <input
          type="text"
          placeholder="Search genuine brands, product names, short codes..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-xl bg-bg-card border border-stark-border px-3.5 py-2.5 text-xs font-mono text-text-primary focus:outline-none focus:border-stark-cyan shadow-sm"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <p className="text-xs text-text-secondary py-12 text-center col-span-3 font-mono">
            Loading verified catalog...
          </p>
        ) : filtered.length === 0 ? (
          <p className="text-xs text-text-secondary py-12 text-center col-span-3">
            No approved products matching your search.
          </p>
        ) : (
          filtered.map((p) => (
            <Card key={p.product_id} className="flex flex-col justify-between">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 rounded font-mono text-[10px] bg-stark-cyan/10 text-stark-cyan border border-stark-cyan/30 font-bold">
                    {p.short_id || "PRD-LEGACY"}
                  </span>
                  <span className="px-2 py-0.5 rounded-full font-mono text-[9px] bg-stark-emerald/10 text-stark-emerald border border-stark-emerald/30 font-bold uppercase">
                    {p.status}
                  </span>
                </div>

                <h3 className="font-bold text-text-heading text-sm">{p.name}</h3>
                <p className="text-xs font-mono text-text-secondary">Brand: {p.brand}</p>
                <p className="text-[11px] font-mono text-text-muted">Serial Format: {p.serial}</p>
              </div>

              <div className="pt-4 mt-3 border-t border-stark-border/60 flex items-center justify-between">
                <span className="text-[10px] font-mono text-text-muted">
                  Enrolled: {new Date(p.created_at).toLocaleDateString()}
                </span>
                <Link
                  to={`/consumer/verify?pid=${p.short_id || p.product_id}`}
                  className="text-xs font-mono font-bold text-stark-cyan hover:underline"
                >
                  Verify Authenticity &rarr;
                </Link>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}

