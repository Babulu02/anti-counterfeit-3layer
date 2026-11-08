import React, { useState, useEffect } from "react";
import { useAuth, ManufacturerApplication } from "../../lib/auth";
import { getChainInfo, listManufacturers, createManufacturerRecord } from "../../lib/api";
import { isMetaMaskAvailable, checkIsManufacturer, whitelistManufacturer, revokeManufacturer } from "../../lib/metamask";
import Card from "../../components/Card";

export default function ManufacturerManagementPage() {
  const { applications, updateApplicationStatus, submitApplication, isOwner } = useAuth();
  const [filter, setFilter] = useState<"all" | "approved" | "pending" | "rejected">("all");
  const [contractAddress, setContractAddress] = useState("");
  const [onChainStatuses, setOnChainStatuses] = useState<Record<string, boolean>>({});
  const [checking, setChecking] = useState(false);
  const [busyAddr, setBusyAddr] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState<{ type: "success" | "error" | "info"; text: string } | null>(null);

  // New application modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [newName, setNewName] = useState("");
  const [newReg, setNewReg] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newWallet, setNewWallet] = useState("");
  const [newJurisdiction, setNewJurisdiction] = useState("");
  const [newBrands, setNewBrands] = useState("");

  useEffect(() => {
    getChainInfo()
      .then((info) => setContractAddress(info.contract_address))
      .catch(() => {});
  }, []);

  const refreshOnChainStatuses = async () => {
    if (!contractAddress || !isMetaMaskAvailable()) return;
    setChecking(true);
    const statuses: Record<string, boolean> = {};
    for (const app of applications) {
      try {
        const isMfr = await checkIsManufacturer(contractAddress, app.walletAddress);
        statuses[app.walletAddress.toLowerCase()] = isMfr;
      } catch {
        statuses[app.walletAddress.toLowerCase()] = false;
      }
    }
    setOnChainStatuses(statuses);
    setChecking(false);
  };

  useEffect(() => {
    if (contractAddress) {
      refreshOnChainStatuses();
    }
  }, [contractAddress, applications]);

  const filteredApps = applications.filter((a) => {
    if (filter === "all") return true;
    return a.status === filter;
  });

  const handleOnChainWhitelist = async (app: ManufacturerApplication) => {
    if (!contractAddress) return;
    setBusyAddr(app.walletAddress);
    setStatusMsg({ type: "info", text: `Sending addManufacturer transaction for ${app.name}...` });
    try {
      const tx = await whitelistManufacturer(contractAddress, app.walletAddress);
      updateApplicationStatus(app.id, "approved");
      await createManufacturerRecord(app.walletAddress, app.name).catch(() => {});
      setStatusMsg({
        type: "success",
        text: `Manufacturer ${app.name} (${app.walletAddress.slice(0, 8)}...) successfully whitelisted on-chain! Tx: ${tx.txHash.slice(0, 10)}...`,
      });
      await refreshOnChainStatuses();
    } catch (e: any) {
      setStatusMsg({
        type: "error",
        text: `Whitelist failed: ${e?.reason || e?.message || String(e)}`,
      });
    } finally {
      setBusyAddr(null);
    }
  };

  const handleOnChainRevoke = async (app: ManufacturerApplication) => {
    if (!contractAddress) return;
    setBusyAddr(app.walletAddress);
    setStatusMsg({ type: "info", text: `Sending removeManufacturer transaction for ${app.name}...` });
    try {
      const tx = await revokeManufacturer(contractAddress, app.walletAddress);
      updateApplicationStatus(app.id, "rejected");
      setStatusMsg({
        type: "success",
        text: `Manufacturer ${app.name} privileges revoked on-chain! Tx: ${tx.txHash.slice(0, 10)}...`,
      });
      await refreshOnChainStatuses();
    } catch (e: any) {
      setStatusMsg({
        type: "error",
        text: `Revocation failed: ${e?.reason || e?.message || String(e)}`,
      });
    } finally {
      setBusyAddr(null);
    }
  };

  const handleCreateApplicant = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName || !newWallet) return;
    submitApplication({
      name: newName,
      businessRegNumber: newReg || `REG-${Date.now().toString().slice(-6)}`,
      contactEmail: newEmail || "compliance@company.com",
      walletAddress: newWallet,
      jurisdiction: newJurisdiction || "Global",
      brands: newBrands ? newBrands.split(",").map((b) => b.trim()) : ["Primary Brand"],
    });
    setShowAddModal(false);
    setNewName("");
    setNewReg("");
    setNewEmail("");
    setNewWallet("");
    setNewJurisdiction("");
    setNewBrands("");
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-stark-border pb-5">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded bg-stark-cyan/10 border border-stark-cyan/30 text-stark-cyan text-[11px] font-mono mb-2">
            HACP5 // ORIGINAL MANUFACTURER ENROLLMENT
          </div>
          <h1 className="text-2xl font-bold text-text-heading tracking-tight">
            Manufacturer Directory & Governance
          </h1>
          <p className="text-xs text-text-secondary mt-1">
            Review KYC business compliance, authorize smart contract minting rights, and maintain manufacturer authorizations.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
          <button
            type="button"
            onClick={refreshOnChainStatuses}
            disabled={checking}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-bg-elevated hover:bg-bg-secondary border border-stark-border text-xs font-mono text-stark-cyan transition-colors min-h-[44px] flex items-center justify-center text-center"
          >
            {checking ? "Checking Ledger..." : "🔄 Verify On-Chain"}
          </button>
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-stark-cyan text-white text-xs font-bold font-mono hover:bg-stark-cyan/90 transition-all shadow-sm flex items-center justify-center gap-1.5 min-h-[44px] text-center"
          >
            <span>+</span>
            <span>Enroll Manufacturer</span>
          </button>
        </div>
      </div>

      {statusMsg && (
        <div
          className={`p-3.5 rounded-xl border text-xs leading-relaxed flex items-center justify-between ${
            statusMsg.type === "success"
              ? "bg-stark-emerald/10 border-stark-emerald/30 text-stark-emerald"
              : statusMsg.type === "error"
              ? "bg-stark-red/10 border-stark-red/30 text-stark-red"
              : "bg-stark-cyan/10 border-stark-cyan/30 text-stark-cyan"
          }`}
        >
          <p className="font-semibold">{statusMsg.text}</p>
          <button
            type="button"
            onClick={() => setStatusMsg(null)}
            className="text-xs opacity-75 hover:opacity-100"
          >
            ✕
          </button>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-stark-border pb-3 overflow-x-auto no-scrollbar">
        {(["all", "approved", "pending", "rejected"] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setFilter(tab)}
            className={`px-3.5 py-2 min-h-[40px] shrink-0 rounded-xl text-xs font-mono uppercase transition-all flex items-center justify-center ${
              filter === tab
                ? "bg-stark-cyan text-white font-bold shadow-sm"
                : "bg-bg-card hover:bg-bg-elevated border border-stark-border text-text-secondary"
            }`}
          >
            {tab} (
            {tab === "all"
              ? applications.length
              : applications.filter((a) => a.status === tab).length}
            )
          </button>
        ))}
      </div>

      {/* Manufacturer Cards / Table */}
      <div className="space-y-4">
        {filteredApps.map((app) => {
          const isWhitelistedOnChain = onChainStatuses[app.walletAddress.toLowerCase()];
          const isBusy = busyAddr === app.walletAddress;

          return (
            <Card key={app.id}>
              <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
                <div className="space-y-2 flex-1">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <span className="text-base font-bold text-text-heading">{app.name}</span>
                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 rounded-full border font-bold uppercase ${
                        app.status === "approved"
                          ? "bg-stark-emerald/10 text-stark-emerald border-stark-emerald/30"
                          : app.status === "pending"
                          ? "bg-stark-amber/10 text-stark-amber border-stark-amber/30"
                          : "bg-stark-red/10 text-stark-red border-stark-red/30"
                      }`}
                    >
                      KYC: {app.status}
                    </span>
                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 rounded-full border font-bold ${
                        isWhitelistedOnChain
                          ? "bg-stark-cyan/10 text-stark-cyan border-stark-cyan/30"
                          : "bg-text-muted/10 text-text-muted border-stark-border"
                      }`}
                    >
                      {isWhitelistedOnChain ? "⛓️ ON-CHAIN AUTHORIZED" : "⛓️ NOT WHITELISTED"}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs text-text-secondary pt-1 font-mono">
                    <div>
                      <span className="text-text-muted block text-[10px]">BUSINESS REG</span>
                      <span>{app.businessRegNumber}</span>
                    </div>
                    <div>
                      <span className="text-text-muted block text-[10px]">JURISDICTION</span>
                      <span>{app.jurisdiction}</span>
                    </div>
                    <div>
                      <span className="text-text-muted block text-[10px]">CONTACT</span>
                      <span>{app.contactEmail}</span>
                    </div>
                  </div>

                  <div className="text-xs font-mono text-text-muted flex flex-wrap items-center gap-3 pt-1">
                    <span>
                      ETH WALLET: <strong className="text-text-heading">{app.walletAddress}</strong>
                    </span>
                    <span>&bull;</span>
                    <span>
                      BRANDS: <strong className="text-stark-cyan">{app.brands.join(", ")}</strong>
                    </span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  {app.status === "pending" && (
                    <button
                      type="button"
                      onClick={() => updateApplicationStatus(app.id, "approved")}
                      className="px-3 py-1.5 rounded-xl bg-stark-emerald/10 hover:bg-stark-emerald/20 border border-stark-emerald/30 text-stark-emerald text-xs font-semibold"
                    >
                      ✓ Approve KYC
                    </button>
                  )}

                  {!isWhitelistedOnChain ? (
                    <button
                      type="button"
                      disabled={isBusy || !isOwner}
                      onClick={() => handleOnChainWhitelist(app)}
                      className="px-3.5 py-1.5 rounded-xl bg-stark-emerald hover:opacity-90 text-white text-xs font-bold font-mono transition-all disabled:opacity-40 shadow-sm"
                      title={!isOwner ? "Requires Contract Owner Account #0" : ""}
                    >
                      {isBusy ? "Signing..." : "⚡ Whitelist on Blockchain"}
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={isBusy || !isOwner}
                      onClick={() => handleOnChainRevoke(app)}
                      className="px-3.5 py-1.5 rounded-xl bg-stark-red hover:opacity-90 text-white text-xs font-bold font-mono transition-all disabled:opacity-40 shadow-sm"
                      title={!isOwner ? "Requires Contract Owner Account #0" : ""}
                    >
                      {isBusy ? "Signing..." : "🚫 Revoke Authorization"}
                    </button>
                  )}

                  {app.status !== "rejected" && (
                    <button
                      type="button"
                      onClick={() => updateApplicationStatus(app.id, "rejected")}
                      className="px-2.5 py-1.5 rounded-xl hover:bg-bg-elevated border border-stark-border text-text-muted hover:text-stark-red text-xs transition-colors"
                    >
                      Reject
                    </button>
                  )}
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
          <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl bg-bg-card border border-stark-border shadow-2xl p-4 sm:p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-stark-border pb-3">
              <h3 className="text-base font-bold text-text-heading">Enroll New Manufacturer Application</h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-text-muted hover:text-text-heading"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateApplicant} className="space-y-3 text-xs">
              <div>
                <label className="block text-text-secondary font-mono mb-1">Company Legal Name *</label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. Apex Biotech Pharma Inc"
                  className="w-full rounded-lg bg-bg-input border border-stark-border px-3 py-2 text-text-primary focus:outline-none focus:border-stark-cyan"
                />
              </div>

              <div>
                <label className="block text-text-secondary font-mono mb-1">Ethereum Wallet Address (0x...) *</label>
                <input
                  type="text"
                  required
                  value={newWallet}
                  onChange={(e) => setNewWallet(e.target.value)}
                  placeholder="0x..."
                  className="w-full rounded-lg bg-bg-input border border-stark-border px-3 py-2 font-mono text-text-primary focus:outline-none focus:border-stark-cyan"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-text-secondary font-mono mb-1">Business Registration</label>
                  <input
                    type="text"
                    value={newReg}
                    onChange={(e) => setNewReg(e.target.value)}
                    placeholder="CORP-12345"
                    className="w-full rounded-lg bg-bg-input border border-stark-border px-3 py-2 text-text-primary focus:outline-none focus:border-stark-cyan"
                  />
                </div>
                <div>
                  <label className="block text-text-secondary font-mono mb-1">Jurisdiction</label>
                  <input
                    type="text"
                    value={newJurisdiction}
                    onChange={(e) => setNewJurisdiction(e.target.value)}
                    placeholder="e.g. London, UK"
                    className="w-full rounded-lg bg-bg-input border border-stark-border px-3 py-2 text-text-primary focus:outline-none focus:border-stark-cyan"
                  />
                </div>
              </div>

              <div>
                <label className="block text-text-secondary font-mono mb-1">Official Compliance Email</label>
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="verify@company.com"
                  className="w-full rounded-lg bg-bg-input border border-stark-border px-3 py-2 text-text-primary focus:outline-none focus:border-stark-cyan"
                />
              </div>

              <div>
                <label className="block text-text-secondary font-mono mb-1">Authorized Brands (comma separated)</label>
                <input
                  type="text"
                  value={newBrands}
                  onChange={(e) => setNewBrands(e.target.value)}
                  placeholder="Brand A, Brand B"
                  className="w-full rounded-lg bg-bg-input border border-stark-border px-3 py-2 text-text-primary focus:outline-none focus:border-stark-cyan"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-stark-border">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl bg-bg-elevated hover:bg-bg-secondary border border-stark-border text-text-secondary font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-stark-cyan text-white font-bold hover:bg-stark-cyan/90 transition-all shadow-sm"
                >
                  Submit Application
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

