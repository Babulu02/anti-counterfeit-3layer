import React, { useState } from "react";
import { useAuth } from "../../lib/auth";
import Card from "../../components/Card";

export default function CompanyProfilePage() {
  const { currentManufacturerApp, submitApplication, isWhitelistedManufacturer, walletAddress } = useAuth();

  const [companyName, setCompanyName] = useState(currentManufacturerApp?.name || "");
  const [regNumber, setRegNumber] = useState(currentManufacturerApp?.businessRegNumber || "");
  const [email, setEmail] = useState(currentManufacturerApp?.contactEmail || "");
  const [jurisdiction, setJurisdiction] = useState(currentManufacturerApp?.jurisdiction || "");
  const [brands, setBrands] = useState(currentManufacturerApp?.brands?.join(", ") || "");
  const [savedMsg, setSavedMsg] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    submitApplication({
      name: companyName,
      businessRegNumber: regNumber,
      contactEmail: email,
      walletAddress: walletAddress || "0x22d491Bde2303f2f43325b2108D26f1eAbA1e32b",
      jurisdiction,
      brands: brands.split(",").map((b) => b.trim()).filter(Boolean),
    });
    setSavedMsg(true);
    setTimeout(() => setSavedMsg(false), 3000);
  };

  const isApproved = currentManufacturerApp?.status === "approved" || isWhitelistedManufacturer;

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="border-b border-stark-border pb-5">
        <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded bg-stark-cyan/10 border border-stark-cyan/30 text-stark-cyan text-[11px] font-mono mb-2">
          HACP5 // ORIGINAL MANUFACTURER PROFILE
        </div>
        <h1 className="text-2xl font-bold text-text-heading tracking-tight">
          Company Profile & KYC Compliance
        </h1>
        <p className="text-xs text-text-secondary mt-1">
          Provide authenticated corporate registration documents and cryptographic wallet addresses for platform verification.
        </p>
      </div>

      {/* KYC Status Banner */}
      <div
        className={`p-4 rounded-xl border text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
          isApproved
            ? "bg-stark-emerald/10 border-stark-emerald/30 text-stark-emerald"
            : "bg-stark-amber/10 border-stark-amber/30 text-stark-amber"
        }`}
      >
        <div className="flex items-center gap-3">
          <span className="text-2xl">{isApproved ? "🛡️" : "⏳"}</span>
          <div>
            <h3 className="font-bold text-sm">
              {isApproved ? "KYC Verified & Smart Contract Authorized" : "KYC Review In Progress"}
            </h3>
            <p className="text-text-secondary mt-0.5 text-xs">
              {isApproved
                ? "Your company is authorized to mint cryptographic dynamic QR tokens and NTAG 424 SUN chips on the Ethereum blockchain."
                : "Your business registration is currently under review by the platform administrator. You will be notified once approved."}
            </p>
          </div>
        </div>

        <span className="px-3 py-1 rounded-full font-mono text-[11px] font-bold uppercase bg-bg-card border border-stark-border shrink-0">
          {currentManufacturerApp?.status || "PENDING"}
        </span>
      </div>

      {savedMsg && (
        <div className="p-3.5 rounded-xl bg-stark-emerald/10 border border-stark-emerald/30 text-stark-emerald text-xs font-semibold">
          ✓ Company profile information submitted successfully for administrator review!
        </div>
      )}

      {/* Company Form */}
      <Card title="Corporate Verification Details">
        <form onSubmit={handleSubmit} className="space-y-4 text-xs font-mono">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-text-secondary mb-1">Company Legal Name *</label>
              <input
                type="text"
                required
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="e.g. Acme Pharmaceuticals AG"
                className="w-full rounded-xl bg-bg-input border border-stark-border px-3.5 py-2.5 min-h-[44px] text-text-primary focus:outline-none focus:border-stark-cyan"
              />
            </div>

            <div>
              <label className="block text-text-secondary mb-1">Business Registration Number (UID/CIN) *</label>
              <input
                type="text"
                required
                value={regNumber}
                onChange={(e) => setRegNumber(e.target.value)}
                placeholder="e.g. CHE-109.821.432"
                className="w-full rounded-xl bg-bg-input border border-stark-border px-3.5 py-2.5 min-h-[44px] text-text-primary focus:outline-none focus:border-stark-cyan"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-text-secondary mb-1">Compliance & Security Email *</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="compliance@company.com"
                className="w-full rounded-xl bg-bg-input border border-stark-border px-3.5 py-2.5 min-h-[44px] text-text-primary focus:outline-none focus:border-stark-cyan"
              />
            </div>

            <div>
              <label className="block text-text-secondary mb-1">Corporate Jurisdiction / Head Office *</label>
              <input
                type="text"
                required
                value={jurisdiction}
                onChange={(e) => setJurisdiction(e.target.value)}
                placeholder="e.g. Basel, Switzerland"
                className="w-full rounded-xl bg-bg-input border border-stark-border px-3.5 py-2.5 min-h-[44px] text-text-primary focus:outline-none focus:border-stark-cyan"
              />
            </div>
          </div>

          <div>
            <label className="block text-text-secondary mb-1">Primary Registered Brands (comma separated)</label>
            <input
              type="text"
              value={brands}
              onChange={(e) => setBrands(e.target.value)}
              placeholder="e.g. AetherCare, BioShield, Chronos"
              className="w-full rounded-xl bg-bg-input border border-stark-border px-3.5 py-2.5 min-h-[44px] text-text-primary focus:outline-none focus:border-stark-cyan"
            />
          </div>

          <div className="p-3.5 rounded-xl bg-bg-main border border-stark-border">
            <span className="text-text-muted text-[10px] uppercase block mb-1">
              AUTHORIZED ETHEREUM SIGNING ADDRESS
            </span>
            <span className="text-stark-cyan font-bold break-all">
              {walletAddress || currentManufacturerApp?.walletAddress || "0x22d491Bde2303f2f43325b2108D26f1eAbA1e32b"}
            </span>
            <p className="text-[11px] text-text-secondary mt-1">
              This address must be whitelisted on ProductRegistry.sol to authorize registerProduct() transactions.
            </p>
          </div>

          <div className="flex justify-end pt-3 border-t border-stark-border">
            <button
              type="submit"
              className="w-full sm:w-auto px-5 py-2.5 min-h-[44px] rounded-xl bg-stark-cyan text-white font-bold hover:bg-stark-cyan/90 transition-all shadow-md flex items-center justify-center text-center"
            >
              Update & Resubmit Verification
            </button>
          </div>
        </form>
      </Card>
    </div>
  );
}

