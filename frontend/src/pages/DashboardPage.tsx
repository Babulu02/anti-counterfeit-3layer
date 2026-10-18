/**
 * DashboardPage.tsx
 * =================
 * Shows:
 *  - A dropdown to select a registered product.
 *  - Scan timeline (chart-free — a vertical list with colour-coded verdicts).
 *  - Scan table with sortable columns.
 *  - Location list (lat/lon of each scan with city note).
 *
 * No map library is included to keep the bundle small. A simple table of
 * coordinates links to OpenStreetMap for manual inspection.
 */

import { useState, useEffect } from "react";
import { listProducts, getScans, type ProductOut, type ScanOut } from "../lib/api";
import VerdictBadge from "../components/VerdictBadge";
import Card from "../components/Card";

export default function DashboardPage() {
  const [products, setProducts] = useState<ProductOut[]>([]);
  const [selected, setSelected] = useState<string>("");
  const [scans,    setScans]    = useState<ScanOut[]>([]);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState<string | null>(null);

  useEffect(() => {
    listProducts()
      .then(ps => {
        setProducts(ps);
        if (ps.length > 0) setSelected(ps[0].product_id);
      })
      .catch(e => setError(String(e)));
  }, []);

  useEffect(() => {
    if (!selected) return;
    setLoading(true);
    setError(null);
    getScans(selected)
      .then(setScans)
      .catch(e => setError(String(e)))
      .finally(() => setLoading(false));
  }, [selected]);

  const product = products.find(p => p.product_id === selected);

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold text-sky-800">Dashboard</h1>

      {/* Product selector */}
      <Card title="Select product">
        {products.length === 0 ? (
          <p className="text-sm text-gray-500">No products registered yet.</p>
        ) : (
          <select
            className="border rounded px-3 py-1.5 text-sm w-full max-w-lg"
            value={selected}
            onChange={e => setSelected(e.target.value)}
          >
            {products.map(p => (
              <option key={p.product_id} value={p.product_id}>
                {p.name} — {p.brand} ({p.serial}) [{p.status}]
              </option>
            ))}
          </select>
        )}
      </Card>

      {product && (
        <Card title="Product info">
          <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
            <span className="text-gray-500">Name</span>   <span>{product.name}</span>
            <span className="text-gray-500">Brand</span>  <span>{product.brand}</span>
            <span className="text-gray-500">Serial</span> <span>{product.serial}</span>
            <span className="text-gray-500">Status</span> <span className={product.status === "sold" ? "text-orange-600" : "text-green-700"}>{product.status}</span>
            <span className="text-gray-500">ID</span>     <span className="font-mono text-xs break-all">{product.product_id}</span>
          </div>
        </Card>
      )}

      {error && <p className="text-red-600 text-sm">{error}</p>}

      {/* Timeline */}
      {scans.length > 0 && (
        <Card title={`Scan timeline (${scans.length} events)`}>
          <ol className="relative border-l border-gray-200 ml-2 space-y-3">
            {scans.map((s, i) => (
              <li key={s.id} className="ml-4">
                <span className="absolute -left-1.5 w-3 h-3 rounded-full bg-sky-400 border-2 border-white" />
                <div className="flex flex-wrap gap-2 items-center">
                  <time className="text-xs text-gray-400">
                    {new Date(s.ts).toLocaleString()}
                  </time>
                  <VerdictBadge verdict={s.verdict} />
                  <span className="text-xs text-gray-500">{s.channel.toUpperCase()}</span>
                  {s.risk_score !== null && (
                    <span className="text-xs text-gray-400">risk={s.risk_score.toFixed(3)}</span>
                  )}
                </div>
              </li>
            ))}
          </ol>
        </Card>
      )}

      {/* Scan table */}
      {scans.length > 0 && (
        <Card title="Scan table">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-gray-500 border-b">
                  <th className="pb-1 pr-3">#</th>
                  <th className="pb-1 pr-3">Time</th>
                  <th className="pb-1 pr-3">Channel</th>
                  <th className="pb-1 pr-3">Verdict</th>
                  <th className="pb-1 pr-3">Identity</th>
                  <th className="pb-1 pr-3">Chain</th>
                  <th className="pb-1">Risk</th>
                </tr>
              </thead>
              <tbody>
                {scans.map((s, i) => (
                  <tr key={s.id} className="border-b last:border-0 hover:bg-gray-50">
                    <td className="py-1 pr-3 text-gray-400">{i + 1}</td>
                    <td className="py-1 pr-3 whitespace-nowrap">{new Date(s.ts).toLocaleString()}</td>
                    <td className="py-1 pr-3 uppercase">{s.channel}</td>
                    <td className="py-1 pr-3"><VerdictBadge verdict={s.verdict} /></td>
                    <td className="py-1 pr-3">{s.identity_result}</td>
                    <td className="py-1 pr-3">{s.chain_result}</td>
                    <td className="py-1">{s.risk_score !== null ? s.risk_score.toFixed(3) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Location list */}
      {scans.filter(s => s.lat !== null).length > 0 && (
        <Card title="Scan locations">
          <ul className="space-y-1 text-sm">
            {scans
              .filter(s => s.lat !== null && s.lon !== null)
              .map(s => (
                <li key={s.id}>
                  <a
                    href={`https://www.openstreetmap.org/?mlat=${s.lat}&mlon=${s.lon}&zoom=12`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sky-600 hover:underline"
                  >
                    {new Date(s.ts).toLocaleDateString()} — {s.lat?.toFixed(4)}, {s.lon?.toFixed(4)}
                  </a>
                  <span className="ml-2 text-gray-400 text-xs">{s.verdict}</span>
                </li>
              ))}
          </ul>
        </Card>
      )}

      {loading && <p className="text-sm text-gray-400">Loading…</p>}
      {!loading && scans.length === 0 && selected && (
        <p className="text-sm text-gray-400">No scans recorded for this product yet.</p>
      )}
    </div>
  );
}
