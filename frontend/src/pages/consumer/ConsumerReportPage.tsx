import React, { useState } from "react";
import Card from "../../components/Card";

interface CounterfeitReport {
  reportId: string;
  productId: string;
  retailerName: string;
  city: string;
  description: string;
  timestamp: string;
  status: "submitted" | "under_investigation" | "confirmed_counterfeit";
}

const DEFAULT_REPORTS: CounterfeitReport[] = [
  {
    reportId: "REP-2026-9041",
    productId: "PRD-FAKE01",
    retailerName: "Unauthorized Market Stall #14",
    city: "Metropolis",
    description: "Packaging printing had misspelled logo (Bislie instead of Bisleri). QR code returned invalid HMAC.",
    timestamp: new Date(Date.now() - 86400000 * 2).toLocaleDateString(),
    status: "under_investigation",
  },
];

export default function ConsumerReportPage() {
  const [reports, setReports] = useState<CounterfeitReport[]>(() => {
    try {
      const saved = localStorage.getItem("aether_counterfeit_reports");
      return saved ? JSON.parse(saved) : DEFAULT_REPORTS;
    } catch {
      return DEFAULT_REPORTS;
    }
  });

  const [productId, setProductId] = useState("");
  const [retailer, setRetailer] = useState("");
  const [city, setCity] = useState("");
  const [description, setDescription] = useState("");
  const [successId, setSuccessId] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!productId || !description) return;
    const newReport: CounterfeitReport = {
      reportId: `REP-${Date.now().toString().slice(-6)}`,
      productId,
      retailerName: retailer || "Unknown Vendor",
      city: city || "Unspecified",
      description,
      timestamp: new Date().toLocaleDateString(),
      status: "submitted",
    };
    const updated = [newReport, ...reports];
    setReports(updated);
    localStorage.setItem("aether_counterfeit_reports", JSON.stringify(updated));
    setSuccessId(newReport.reportId);
    setProductId("");
    setRetailer("");
    setCity("");
    setDescription("");
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      <div className="border-b border-stark-border pb-5">
        <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded bg-stark-red/10 border border-stark-red/30 text-stark-red text-[11px] font-mono mb-2">
          CONSUMER PROTECTION // FRAUD REPORTING
        </div>
        <h1 className="text-2xl font-bold text-text-heading tracking-tight">
          Report Counterfeit or Suspicious Product
        </h1>
        <p className="text-xs text-text-secondary mt-1">
          Help protect legitimate manufacturers and consumers by flagging deceptive packaging, tampered QR tags, or counterfeit goods.
        </p>
      </div>

      {successId && (
        <div className="p-4 rounded-xl bg-stark-emerald/10 border border-stark-emerald/30 text-stark-emerald text-xs font-mono space-y-1">
          <p className="font-bold">✓ Counterfeit report submitted successfully!</p>
          <p className="text-[11px] text-text-secondary">
            Your tracking ID is <strong className="text-text-heading">{successId}</strong>. The platform security team and brand owner have been notified.
          </p>
        </div>
      )}

      {/* Report Submission Form */}
      <Card title="File a Counterfeit Incident Report">
        <form onSubmit={handleSubmit} className="space-y-4 text-xs font-mono">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-text-secondary mb-1">Product ID or Short Code (if available) *</label>
              <input
                type="text"
                required
                value={productId}
                onChange={(e) => setProductId(e.target.value)}
                placeholder="e.g. PRD-A49F2E or printed serial"
                className="w-full rounded-xl bg-bg-input border border-stark-border px-3.5 py-2.5 text-text-primary focus:outline-none focus:border-stark-cyan"
              />
            </div>

            <div>
              <label className="block text-text-secondary mb-1">Store / Retailer / Website Name</label>
              <input
                type="text"
                value={retailer}
                onChange={(e) => setRetailer(e.target.value)}
                placeholder="e.g. Corner Pharmacy, Online Shop"
                className="w-full rounded-xl bg-bg-input border border-stark-border px-3.5 py-2.5 text-text-primary focus:outline-none focus:border-stark-cyan"
              />
            </div>
          </div>

          <div>
            <label className="block text-text-secondary mb-1">Purchase Location / City</label>
            <input
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="e.g. Chicago, IL or URL"
              className="w-full rounded-xl bg-bg-input border border-stark-border px-3.5 py-2.5 text-text-primary focus:outline-none focus:border-stark-cyan"
            />
          </div>

          <div>
            <label className="block text-text-secondary mb-1">Description of Suspicious Activity *</label>
            <textarea
              rows={3}
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe packaging anomalies, broken seals, blurred print, scanner warning messages, or unusual pricing..."
              className="w-full rounded-xl bg-bg-input border border-stark-border px-3.5 py-2.5 text-text-primary focus:outline-none focus:border-stark-cyan"
            />
          </div>

          <div className="flex justify-end pt-2 border-t border-stark-border">
            <button
              type="submit"
              className="w-full sm:w-auto px-6 py-3 min-h-[44px] rounded-xl bg-stark-red text-white text-xs font-bold font-mono hover:bg-stark-red/90 transition-all shadow-md flex items-center justify-center text-center"
            >
              Submit Fraud Report
            </button>
          </div>
        </form>
      </Card>

      {/* Your Submitted Reports Tracker */}
      <Card title={`Filed Counterfeit Reports Tracker (${reports.length})`}>
        <div className="space-y-3">
          {reports.map((r) => (
            <div
              key={r.reportId}
              className="p-4 rounded-xl bg-bg-main border border-stark-border space-y-2 font-mono text-xs"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-stark-red">{r.reportId}</span>
                  <span className="text-text-muted">|</span>
                  <span className="text-text-heading">Asset: {r.productId}</span>
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-stark-amber/10 text-stark-amber border border-stark-amber/30">
                  {r.status.replace("_", " ")}
                </span>
              </div>
              <p className="text-text-secondary">{r.description}</p>
              <div className="text-[10px] text-text-muted flex justify-between pt-1 border-t border-stark-border/40">
                <span>Vendor: {r.retailerName} ({r.city})</span>
                <span>Date: {r.timestamp}</span>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

