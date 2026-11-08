import React, { useState } from "react";
import { useAuth } from "../../lib/auth";
import Card from "../../components/Card";

interface BrandItem {
  id: string;
  name: string;
  trademarkNumber: string;
  category: string;
  description: string;
  activeProducts: number;
  status: "verified" | "pending";
}

const DEFAULT_BRANDS: BrandItem[] = [
  {
    id: "b-001",
    name: "AetherCare",
    trademarkNumber: "TM-CH-849201",
    category: "Pharmaceuticals & Therapeutics",
    description: "Cold-chain prescription biologics and pharmaceutical ampoules.",
    activeProducts: 4,
    status: "verified",
  },
  {
    id: "b-002",
    name: "BioShield Vaccines",
    trademarkNumber: "TM-CH-910244",
    category: "Immunology & Vaccine Vials",
    description: "High-potency injectable vaccines with anti-tamper NFC seals.",
    activeProducts: 2,
    status: "verified",
  },
];

export default function BrandManagementPage() {
  const { currentManufacturerApp } = useAuth();
  const [brands, setBrands] = useState<BrandItem[]>(() => {
    try {
      const saved = localStorage.getItem("aether_mfr_brands");
      return saved ? JSON.parse(saved) : DEFAULT_BRANDS;
    } catch {
      return DEFAULT_BRANDS;
    }
  });

  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState("");
  const [tm, setTm] = useState("");
  const [category, setCategory] = useState("Pharmaceuticals");
  const [desc, setDesc] = useState("");

  const handleCreateBrand = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;
    const item: BrandItem = {
      id: `b-${Date.now()}`,
      name,
      trademarkNumber: tm || `TM-${Math.floor(100000 + Math.random() * 900000)}`,
      category,
      description: desc || "Authorized trade brand under corporate parent.",
      activeProducts: 0,
      status: "verified",
    };
    const updated = [item, ...brands];
    setBrands(updated);
    localStorage.setItem("aether_mfr_brands", JSON.stringify(updated));
    setShowModal(false);
    setName("");
    setTm("");
    setDesc("");
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-stark-border pb-5">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded bg-stark-cyan/10 border border-stark-cyan/30 text-stark-cyan text-[11px] font-mono mb-2">
            HACP5 // BRAND PORTFOLIO MANAGEMENT
          </div>
          <h1 className="text-2xl font-bold text-text-heading tracking-tight">
            Registered Brand Portfolio
          </h1>
          <p className="text-xs text-text-secondary mt-1">
            Maintain sub-brands and registered trademarks managed by {currentManufacturerApp?.name || "your company"}.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowModal(true)}
          className="px-4 py-2 rounded-xl bg-stark-cyan text-white text-xs font-bold font-mono hover:bg-stark-cyan/90 transition-all shadow-sm flex items-center gap-1.5"
        >
          <span>+</span>
          <span>Register Brand</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {brands.map((b) => (
          <Card key={b.id}>
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-text-heading text-base">{b.name}</h3>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-stark-emerald/10 text-stark-emerald border border-stark-emerald/30 font-bold uppercase">
                    {b.status}
                  </span>
                </div>
                <p className="text-xs text-text-secondary">{b.description}</p>
              </div>
              <span className="text-2xl">✨</span>
            </div>

            <div className="mt-4 pt-3 border-t border-stark-border/60 grid grid-cols-2 gap-2 text-xs font-mono">
              <div>
                <span className="text-text-muted text-[10px] block">TRADEMARK ID</span>
                <span className="text-text-heading">{b.trademarkNumber}</span>
              </div>
              <div>
                <span className="text-text-muted text-[10px] block">CATEGORY</span>
                <span className="text-text-heading truncate block">{b.category}</span>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl bg-bg-card border border-stark-border shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-stark-border pb-3">
              <h3 className="text-base font-bold text-text-heading">Register New Brand</h3>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="text-text-muted hover:text-text-heading"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateBrand} className="space-y-3 text-xs">
              <div>
                <label className="block text-text-secondary font-mono mb-1">Brand Name *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. BioGuard Defense"
                  className="w-full rounded-lg bg-bg-input border border-stark-border px-3 py-2 text-text-primary focus:outline-none focus:border-stark-cyan"
                />
              </div>

              <div>
                <label className="block text-text-secondary font-mono mb-1">Trademark Registration No.</label>
                <input
                  type="text"
                  value={tm}
                  onChange={(e) => setTm(e.target.value)}
                  placeholder="TM-123456"
                  className="w-full rounded-lg bg-bg-input border border-stark-border px-3 py-2 text-text-primary focus:outline-none focus:border-stark-cyan"
                />
              </div>

              <div>
                <label className="block text-text-secondary font-mono mb-1">Product Category</label>
                <input
                  type="text"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="e.g. Luxury Goods, Pharmaceuticals, Spirits"
                  className="w-full rounded-lg bg-bg-input border border-stark-border px-3 py-2 text-text-primary focus:outline-none focus:border-stark-cyan"
                />
              </div>

              <div>
                <label className="block text-text-secondary font-mono mb-1">Description / Tagline</label>
                <textarea
                  rows={2}
                  value={desc}
                  onChange={(e) => setDesc(e.target.value)}
                  placeholder="Brief description of the brand line..."
                  className="w-full rounded-lg bg-bg-input border border-stark-border px-3 py-2 text-text-primary focus:outline-none focus:border-stark-cyan"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-stark-border">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl bg-bg-elevated hover:bg-bg-secondary border border-stark-border text-text-secondary font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-stark-cyan text-white font-bold hover:bg-stark-cyan/90 transition-all shadow-sm"
                >
                  Save Brand
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

