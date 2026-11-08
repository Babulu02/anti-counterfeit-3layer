import React, { useState } from "react";
import Card from "../../components/Card";

interface BatchItem {
  id: string;
  lotNumber: string;
  name: string;
  brand: string;
  unitCount: number;
  mfgDate: string;
  expDate: string;
  status: "active" | "completed" | "scheduled";
}

const DEFAULT_BATCHES: BatchItem[] = [
  {
    id: "batch-01",
    lotNumber: "LOT-2026-CH-901",
    name: "AetherCare Injectable Vial Lot A",
    brand: "AetherCare",
    unitCount: 500,
    mfgDate: "2026-10-01",
    expDate: "2028-10-01",
    status: "active",
  },
  {
    id: "batch-02",
    lotNumber: "LOT-2026-CH-902",
    name: "BioShield Lyophilized Powder Lot B",
    brand: "BioShield Vaccines",
    unitCount: 1200,
    mfgDate: "2026-09-15",
    expDate: "2027-09-15",
    status: "completed",
  },
];

export default function BatchManagementPage() {
  const [batches, setBatches] = useState<BatchItem[]>(() => {
    try {
      const saved = localStorage.getItem("aether_mfr_batches");
      return saved ? JSON.parse(saved) : DEFAULT_BATCHES;
    } catch {
      return DEFAULT_BATCHES;
    }
  });

  const [showModal, setShowModal] = useState(false);
  const [lotNumber, setLotNumber] = useState("");
  const [name, setName] = useState("");
  const [brand, setBrand] = useState("AetherCare");
  const [unitCount, setUnitCount] = useState(100);
  const [mfgDate, setMfgDate] = useState(new Date().toISOString().slice(0, 10));
  const [expDate, setExpDate] = useState("2028-12-31");

  const handleCreateBatch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !lotNumber) return;
    const newBatch: BatchItem = {
      id: `batch-${Date.now()}`,
      lotNumber,
      name,
      brand,
      unitCount: Number(unitCount),
      mfgDate,
      expDate,
      status: "active",
    };
    const updated = [newBatch, ...batches];
    setBatches(updated);
    localStorage.setItem("aether_mfr_batches", JSON.stringify(updated));
    setShowModal(false);
    setLotNumber("");
    setName("");
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-stark-border pb-5">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded bg-stark-cyan/10 border border-stark-cyan/30 text-stark-cyan text-[11px] font-mono mb-2">
            HACP5 // PRODUCTION LOT CONTROL
          </div>
          <h1 className="text-2xl font-bold text-text-heading tracking-tight">
            Production Batch Management
          </h1>
          <p className="text-xs text-text-secondary mt-1">
            Group physical product runs into traceable manufacturing lots with scheduled expiration and NFC hardware pairing.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowModal(true)}
          className="px-4 py-2 rounded-xl bg-stark-cyan text-white text-xs font-bold font-mono hover:bg-stark-cyan/90 transition-all shadow-sm flex items-center gap-1.5"
        >
          <span>+</span>
          <span>Create Production Batch</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 font-mono text-xs">
        <div className="p-3.5 rounded-xl bg-bg-card border border-stark-border shadow-sm">
          <span className="text-[10px] text-text-secondary uppercase block">Total Batches</span>
          <span className="text-xl font-bold text-text-heading mt-1 block">{batches.length}</span>
        </div>
        <div className="p-3.5 rounded-xl bg-bg-card border border-stark-border shadow-sm">
          <span className="text-[10px] text-text-secondary uppercase block">Active Factory Runs</span>
          <span className="text-xl font-bold text-stark-emerald mt-1 block">
            {batches.filter((b) => b.status === "active").length}
          </span>
        </div>
        <div className="p-3.5 rounded-xl bg-bg-card border border-stark-border shadow-sm">
          <span className="text-[10px] text-text-secondary uppercase block">Manufactured Units</span>
          <span className="text-xl font-bold text-stark-cyan mt-1 block">
            {batches.reduce((acc, b) => acc + b.unitCount, 0).toLocaleString()}
          </span>
        </div>
      </div>

      <Card title={`Manufacturing Lots & Production Runs (${batches.length})`}>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-text-secondary border-b border-stark-border font-mono text-[11px]">
                <th className="pb-2 pr-3">Lot Number</th>
                <th className="pb-2 pr-3">Batch Name</th>
                <th className="pb-2 pr-3">Brand</th>
                <th className="pb-2 pr-3">Planned Units</th>
                <th className="pb-2 pr-3">Mfg Date</th>
                <th className="pb-2 pr-3">Expiry Date</th>
                <th className="pb-2 text-right">Status</th>
              </tr>
            </thead>
            <tbody>
              {batches.map((b) => (
                <tr
                  key={b.id}
                  className="border-b border-stark-border/50 last:border-0 hover:bg-bg-elevated/40 transition-colors"
                >
                  <td className="py-2.5 pr-3 font-mono font-bold text-stark-cyan">{b.lotNumber}</td>
                  <td className="py-2.5 pr-3 font-semibold text-text-heading">{b.name}</td>
                  <td className="py-2.5 pr-3 font-mono text-text-secondary">{b.brand}</td>
                  <td className="py-2.5 pr-3 font-mono text-text-heading">{b.unitCount.toLocaleString()} units</td>
                  <td className="py-2.5 pr-3 font-mono text-text-muted">{b.mfgDate}</td>
                  <td className="py-2.5 pr-3 font-mono text-text-muted">{b.expDate}</td>
                  <td className="py-2.5 text-right">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-mono text-[10px] font-bold uppercase ${
                        b.status === "active"
                          ? "bg-stark-emerald/10 text-stark-emerald border border-stark-emerald/30"
                          : b.status === "completed"
                          ? "bg-stark-cyan/10 text-stark-cyan border border-stark-cyan/30"
                          : "bg-stark-amber/10 text-stark-amber border border-stark-amber/30"
                      }`}
                    >
                      {b.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl bg-bg-card border border-stark-border shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-stark-border pb-3">
              <h3 className="text-base font-bold text-text-heading">Create Production Batch</h3>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="text-text-muted hover:text-text-heading"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateBatch} className="space-y-3 text-xs">
              <div>
                <label className="block text-text-secondary font-mono mb-1">Lot / Batch Number *</label>
                <input
                  type="text"
                  required
                  value={lotNumber}
                  onChange={(e) => setLotNumber(e.target.value)}
                  placeholder="e.g. LOT-2026-CH-903"
                  className="w-full rounded-lg bg-bg-input border border-stark-border px-3 py-2 text-text-primary focus:outline-none focus:border-stark-cyan"
                />
              </div>

              <div>
                <label className="block text-text-secondary font-mono mb-1">Batch Description / Name *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Primary Ampoule Production"
                  className="w-full rounded-lg bg-bg-input border border-stark-border px-3 py-2 text-text-primary focus:outline-none focus:border-stark-cyan"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-text-secondary font-mono mb-1">Brand</label>
                  <input
                    type="text"
                    value={brand}
                    onChange={(e) => setBrand(e.target.value)}
                    className="w-full rounded-lg bg-bg-input border border-stark-border px-3 py-2 text-text-primary focus:outline-none focus:border-stark-cyan"
                  />
                </div>
                <div>
                  <label className="block text-text-secondary font-mono mb-1">Planned Units</label>
                  <input
                    type="number"
                    value={unitCount}
                    onChange={(e) => setUnitCount(Number(e.target.value))}
                    className="w-full rounded-lg bg-bg-input border border-stark-border px-3 py-2 text-text-primary focus:outline-none focus:border-stark-cyan"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-text-secondary font-mono mb-1">Manufacturing Date</label>
                  <input
                    type="date"
                    value={mfgDate}
                    onChange={(e) => setMfgDate(e.target.value)}
                    className="w-full rounded-lg bg-bg-input border border-stark-border px-3 py-2 text-text-primary focus:outline-none focus:border-stark-cyan"
                  />
                </div>
                <div>
                  <label className="block text-text-secondary font-mono mb-1">Expiry Date</label>
                  <input
                    type="date"
                    value={expDate}
                    onChange={(e) => setExpDate(e.target.value)}
                    className="w-full rounded-lg bg-bg-input border border-stark-border px-3 py-2 text-text-primary focus:outline-none focus:border-stark-cyan"
                  />
                </div>
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
                  Create Batch
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

