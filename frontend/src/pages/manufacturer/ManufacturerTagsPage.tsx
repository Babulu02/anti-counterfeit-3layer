import React, { useState, useEffect } from "react";
import { listTags, updateTagState, listProducts, type TagOut, type ProductOut } from "../../lib/api";
import Card from "../../components/Card";

export default function ManufacturerTagsPage() {
  const [tags, setTags] = useState<TagOut[]>([]);
  const [products, setProducts] = useState<ProductOut[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyUid, setBusyUid] = useState<string | null>(null);

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

  const toggleTag = async (tag: TagOut) => {
    const nextState = tag.state === "ok" ? "disputed" : "ok";
    setBusyUid(tag.uid);
    try {
      await updateTagState(tag.uid, nextState);
      setTags((prev) =>
        prev.map((t) => (t.uid === tag.uid ? { ...t, state: nextState } : t))
      );
    } catch (e) {
      console.warn("Failed updating tag state:", e);
    } finally {
      setBusyUid(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-stark-border pb-5">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded bg-stark-cyan/10 border border-stark-cyan/30 text-stark-cyan text-[11px] font-mono mb-2">
            HACP5 // PHYSICAL NFC / QR TAG DIRECTORY
          </div>
          <h1 className="text-2xl font-bold text-text-heading tracking-tight">
            Assigned Tags & Deactivation Controls
          </h1>
          <p className="text-xs text-text-secondary mt-1">
            Track active NFC tags bound to physical product units. In the event of packaging compromise, deactivate tags instantly.
          </p>
        </div>

        <div className="flex items-center gap-2 font-mono text-xs">
          <span className="px-3 py-1.5 rounded-xl bg-bg-card border border-stark-border text-text-heading">
            Total Active Tags: <strong className="text-stark-cyan">{tags.length}</strong>
          </span>
        </div>
      </div>

      <Card title={`Active Cryptographic Tags (${tags.length})`}>
        {loading ? (
          <p className="text-xs text-text-secondary py-8 text-center font-mono">Loading tags...</p>
        ) : tags.length === 0 ? (
          <div className="py-8 text-center space-y-2 text-xs text-text-secondary">
            <p>No tags currently assigned. Generate tags during product enrollment.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs font-mono">
              <thead>
                <tr className="text-left text-text-secondary border-b border-stark-border font-mono text-[11px]">
                  <th className="pb-2 pr-3">NFC UID (7-Byte)</th>
                  <th className="pb-2 pr-3">Bound Product</th>
                  <th className="pb-2 pr-3">Channel</th>
                  <th className="pb-2 pr-3">Counter</th>
                  <th className="pb-2 pr-3">Security Status</th>
                  <th className="pb-2 text-right">Emergency Action</th>
                </tr>
              </thead>
              <tbody>
                {tags.map((t) => {
                  const prod = pidMap.get(t.product_id);
                  const isBusy = busyUid === t.uid;
                  return (
                    <tr
                      key={t.uid}
                      className="border-b border-stark-border/50 last:border-0 hover:bg-bg-elevated/40 transition-colors"
                    >
                      <td className="py-2.5 pr-3 font-bold text-stark-cyan">{t.uid}</td>
                      <td className="py-2.5 pr-3 font-sans">
                        <div className="font-semibold text-text-heading">{prod?.name || "Asset"}</div>
                        <div className="text-[11px] font-mono text-text-muted">{prod?.short_id || t.product_id.slice(0, 8)}</div>
                      </td>
                      <td className="py-2.5 pr-3 uppercase text-text-secondary">{t.channel}</td>
                      <td className="py-2.5 pr-3 font-semibold text-text-heading">#{t.last_counter}</td>
                      <td className="py-2.5 pr-3">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            t.state === "ok"
                              ? "bg-stark-emerald/10 text-stark-emerald border border-stark-emerald/30"
                              : "bg-stark-red/10 text-stark-red border border-stark-red/30"
                          }`}
                        >
                          {t.state === "ok" ? "ACTIVE / SECURE" : "DISPUTED"}
                        </span>
                      </td>
                      <td className="py-2.5 text-right whitespace-nowrap">
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => toggleTag(t)}
                          className={`px-3.5 py-1.5 min-h-[38px] rounded-lg text-[11px] font-bold transition-all ${
                            t.state === "ok"
                              ? "bg-stark-red/10 hover:bg-stark-red/20 text-stark-red border border-stark-red/30"
                              : "bg-stark-emerald/10 hover:bg-stark-emerald/20 text-stark-emerald border border-stark-emerald/30"
                          }`}
                        >
                          {isBusy ? "Updating..." : t.state === "ok" ? "Deactivate Tag" : "Reactivate"}
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

