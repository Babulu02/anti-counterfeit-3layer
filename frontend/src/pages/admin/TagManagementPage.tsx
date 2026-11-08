import React, { useState, useEffect } from "react";
import { listTags, updateTagState, listProducts, type TagOut, type ProductOut } from "../../lib/api";
import Card from "../../components/Card";

export default function TagManagementPage() {
  const [tags, setTags] = useState<TagOut[]>([]);
  const [products, setProducts] = useState<ProductOut[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "ok" | "disputed">("all");
  const [updatingUid, setUpdatingUid] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([listTags().catch(() => []), listProducts().catch(() => [])])
      .then(([t, p]) => {
        setTags(t);
        setProducts(p);
      })
      .finally(() => setLoading(false));
  }, []);

  const pidMap = new Map<string, ProductOut>();
  products.forEach((p) => pidMap.set(p.product_id, p));

  const toggleState = async (tag: TagOut) => {
    const nextState = tag.state === "ok" ? "disputed" : "ok";
    setUpdatingUid(tag.uid);
    try {
      await updateTagState(tag.uid, nextState);
      setTags((prev) =>
        prev.map((t) => (t.uid === tag.uid ? { ...t, state: nextState } : t))
      );
    } catch (e) {
      console.warn("Could not update tag state:", e);
    } finally {
      setUpdatingUid(null);
    }
  };

  const filtered = tags.filter((t) => {
    if (filter === "all") return true;
    return t.state === filter;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-stark-border pb-5">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded bg-stark-cyan/10 border border-stark-cyan/30 text-stark-cyan text-[11px] font-mono mb-2">
            HACP5 // NFC NTAG 424 SUN & QR TOKENS
          </div>
          <h1 className="text-2xl font-bold text-text-heading tracking-tight">
            Cryptographic Tag & Token Management
          </h1>
          <p className="text-xs text-text-secondary mt-1">
            Supervise physical NFC tag UIDs, monitor rolling CMAC counters, and manage activation/deactivation of compromised chips.
          </p>
        </div>

        <div className="flex items-center gap-2 font-mono text-xs">
          <span className="px-3 py-1.5 rounded-xl bg-bg-card border border-stark-border text-text-heading">
            Total Tags: <strong className="text-stark-cyan">{tags.length}</strong>
          </span>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex overflow-x-auto no-scrollbar sm:flex-wrap items-center gap-2 border-b border-stark-border pb-3">
        {(["all", "ok", "disputed"] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setFilter(tab)}
            className={`whitespace-nowrap min-h-[38px] px-3.5 py-1.5 rounded-xl text-xs font-mono uppercase transition-all flex items-center justify-center ${
              filter === tab
                ? "bg-stark-cyan text-white font-bold"
                : "bg-bg-card hover:bg-bg-elevated border border-stark-border text-text-secondary"
            }`}
          >
            {tab === "ok" ? "Active (OK)" : tab === "disputed" ? "Deactivated (Disputed)" : "All Tags"} (
            {tab === "all" ? tags.length : tags.filter((t) => t.state === tab).length})
          </button>
        ))}
      </div>

      {/* Tag Directory Table */}
      <Card title={`Enrolled Physical Tags & Tokens (${filtered.length})`}>
        {loading ? (
          <p className="text-xs text-text-secondary py-8 text-center font-mono">Loading tags from database...</p>
        ) : filtered.length === 0 ? (
          <div className="py-8 text-center text-xs text-text-secondary">
            No tags registered under this filter. Enroll products in the Manufacturer portal to mint NFC tags.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-text-secondary border-b border-stark-border font-mono text-[11px]">
                  <th className="pb-2 pr-3">NFC UID (7-Byte)</th>
                  <th className="pb-2 pr-3">Bound Asset</th>
                  <th className="pb-2 pr-3">Channel</th>
                  <th className="pb-2 pr-3">Last Counter</th>
                  <th className="pb-2 pr-3">Cryptographic State</th>
                  <th className="pb-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((t) => {
                  const prod = pidMap.get(t.product_id);
                  const isBusy = updatingUid === t.uid;
                  return (
                    <tr
                      key={t.uid}
                      className="border-b border-stark-border/50 last:border-0 hover:bg-bg-elevated/40 transition-colors"
                    >
                      <td className="py-2.5 pr-3 font-mono font-bold text-stark-cyan">
                        {t.uid}
                      </td>
                      <td className="py-2.5 pr-3">
                        <div className="font-semibold text-text-heading">{prod?.name || "Asset"}</div>
                        <div className="text-[11px] font-mono text-text-muted">
                          {prod?.short_id || t.product_id.slice(0, 10) + "..."}
                        </div>
                      </td>
                      <td className="py-2.5 pr-3 font-mono uppercase text-text-secondary">
                        {t.channel}
                      </td>
                      <td className="py-2.5 pr-3 font-mono text-text-heading font-semibold">
                        #{t.last_counter}
                      </td>
                      <td className="py-2.5 pr-3">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-mono text-[10px] font-bold uppercase ${
                            t.state === "ok"
                              ? "bg-stark-emerald/10 text-stark-emerald border border-stark-emerald/30"
                              : "bg-stark-red/10 text-stark-red border border-stark-red/30"
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              t.state === "ok" ? "bg-stark-emerald" : "bg-stark-red"
                            }`}
                          />
                          {t.state === "ok" ? "ACTIVE / SECURE" : "DISPUTED / DEACTIVATED"}
                        </span>
                      </td>
                      <td className="py-2.5 text-right whitespace-nowrap">
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => toggleState(t)}
                          className={`px-3 py-1 rounded-lg font-mono text-[11px] font-semibold transition-all ${
                            t.state === "ok"
                              ? "bg-stark-red/10 hover:bg-stark-red/20 text-stark-red border border-stark-red/30"
                              : "bg-stark-emerald/10 hover:bg-stark-emerald/20 text-stark-emerald border border-stark-emerald/30"
                          }`}
                        >
                          {isBusy ? "Updating..." : t.state === "ok" ? "Deactivate Tag" : "Reactivate Tag"}
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
    </div>
  );
}

