import React, { useState, useEffect } from "react";
import { getRecentScans, type ScanOut } from "../../lib/api";
import Card from "../../components/Card";
import VerdictBadge from "../../components/VerdictBadge";

interface InvestigationNote {
  scanId: number;
  note: string;
  admin: string;
  timestamp: string;
}

export default function SecurityMonitoringPage() {
  const [scans, setScans] = useState<ScanOut[]>([]);
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState<InvestigationNote[]>(() => {
    try {
      const saved = localStorage.getItem("aether_fraud_notes");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [activeScan, setActiveScan] = useState<ScanOut | null>(null);
  const [newNote, setNewNote] = useState("");
  const [filterAttack, setFilterAttack] = useState<string>("all");

  useEffect(() => {
    getRecentScans(100)
      .then(setScans)
      .finally(() => setLoading(false));
  }, []);

  const saveNote = (scanId: number) => {
    if (!newNote.trim()) return;
    const entry: InvestigationNote = {
      scanId,
      note: newNote.trim(),
      admin: "Security Officer (Admin)",
      timestamp: new Date().toISOString(),
    };
    const updated = [entry, ...notes];
    setNotes(updated);
    localStorage.setItem("aether_fraud_notes", JSON.stringify(updated));
    setNewNote("");
  };

  // Attack category classifier from scan reasons & verdicts
  const categorizedScans = scans.map((s) => {
    let attackType = "Normal Verification";
    const r = (s.reason || "").toLowerCase();
    const v = (s.verdict || "").toLowerCase();

    if (r.includes("replay") || r.includes("counter")) attackType = "NFC Replay Attack";
    else if (r.includes("clone") || r.includes("cmac") || r.includes("bad_mac")) attackType = "Clone-First / Bad CMAC";
    else if (r.includes("burst") || r.includes("frequency")) attackType = "Burst Scanning Attack";
    else if (r.includes("travel") || r.includes("location") || r.includes("distance")) attackType = "Impossible Travel Anomaly";
    else if (r.includes("duplicate") || r.includes("tampered") || r.includes("hmac")) attackType = "Tampered / Forged QR";
    else if (r.includes("sold")) attackType = "Post-Sale Resale Fraud";
    else if (r.includes("counterfeit") || r.includes("lookalike") || r.includes("similarity")) attackType = "Packaging Lookalike / OCR Failure";
    else if (v.includes("suspicious")) attackType = "Multi-Signal Anomaly";
    else if (v.includes("manual")) attackType = "Policy Dispute";

    return { ...s, attackType };
  });

  const suspiciousList = categorizedScans.filter((s) => s.verdict !== "Verified");

  const filtered = suspiciousList.filter((s) => {
    if (filterAttack === "all") return true;
    return s.attackType === filterAttack;
  });

  const attackCategories = Array.from(new Set(suspiciousList.map((s) => s.attackType)));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-stark-border pb-5">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded bg-stark-red/10 border border-stark-red/30 text-stark-red text-[11px] font-mono mb-2">
            STARK // THREAT INTELLIGENCE & FRAUD ENGINE
          </div>
          <h1 className="text-2xl font-bold text-text-heading tracking-tight">
            Security & Attack Detection Center
          </h1>
          <p className="text-xs text-text-secondary mt-1">
            Automated detection for impossible travel, clone-first NFC replay, forged QR HMACs, burst scanning, and AI visual counterfeits.
          </p>
        </div>

        <div className="flex items-center gap-2 font-mono text-xs">
          <span className="px-3 py-1.5 rounded-xl bg-stark-red/10 border border-stark-red/30 text-stark-red font-bold">
            {suspiciousList.length} Threats Detected
          </span>
        </div>
      </div>

      {/* ── Attack Vectors Overview ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 text-xs font-mono">
        <div className="p-3 rounded-xl bg-bg-card border border-stark-border shadow-sm">
          <span className="text-text-muted text-[10px] block">NFC REPLAY</span>
          <span className="text-lg font-bold text-stark-amber mt-1 block">
            {suspiciousList.filter((s) => s.attackType.includes("Replay")).length}
          </span>
          <span className="text-[10px] text-text-secondary">Disputed Taps</span>
        </div>

        <div className="p-3 rounded-xl bg-bg-card border border-stark-border shadow-sm">
          <span className="text-text-muted text-[10px] block">CLONE-FIRST</span>
          <span className="text-lg font-bold text-stark-red mt-1 block">
            {suspiciousList.filter((s) => s.attackType.includes("Clone")).length}
          </span>
          <span className="text-[10px] text-text-secondary">Bad CMAC</span>
        </div>

        <div className="p-3 rounded-xl bg-bg-card border border-stark-border shadow-sm">
          <span className="text-text-muted text-[10px] block">FORGED QR</span>
          <span className="text-lg font-bold text-stark-red mt-1 block">
            {suspiciousList.filter((s) => s.attackType.includes("QR")).length}
          </span>
          <span className="text-[10px] text-text-secondary">HMAC Failure</span>
        </div>

        <div className="p-3 rounded-xl bg-bg-card border border-stark-border shadow-sm">
          <span className="text-text-muted text-[10px] block">IMPOSSIBLE TRAVEL</span>
          <span className="text-lg font-bold text-stark-amber mt-1 block">
            {suspiciousList.filter((s) => s.attackType.includes("Travel")).length}
          </span>
          <span className="text-[10px] text-text-secondary">Spatial Jumps</span>
        </div>

        <div className="p-3 rounded-xl bg-bg-card border border-stark-border shadow-sm">
          <span className="text-text-muted text-[10px] block">LOOKALIKE PACK</span>
          <span className="text-lg font-bold text-stark-amber mt-1 block">
            {suspiciousList.filter((s) => s.attackType.includes("Lookalike")).length}
          </span>
          <span className="text-[10px] text-text-secondary">OCR Label Check</span>
        </div>

        <div className="p-3 rounded-xl bg-bg-card border border-stark-border shadow-sm">
          <span className="text-text-muted text-[10px] block">POST-SALE FRAUD</span>
          <span className="text-lg font-bold text-stark-red mt-1 block">
            {suspiciousList.filter((s) => s.attackType.includes("Post-Sale")).length}
          </span>
          <span className="text-[10px] text-text-secondary">Sold Resale Scan</span>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex overflow-x-auto no-scrollbar sm:flex-wrap items-center gap-2 border-b border-stark-border pb-3">
        <button
          type="button"
          onClick={() => setFilterAttack("all")}
          className={`whitespace-nowrap min-h-[38px] px-3.5 py-1.5 rounded-xl text-xs font-mono transition-all flex items-center justify-center ${
            filterAttack === "all"
              ? "bg-stark-red text-white font-bold"
              : "bg-bg-card border border-stark-border text-text-secondary hover:bg-bg-elevated"
          }`}
        >
          All Incident Patterns ({suspiciousList.length})
        </button>
        {attackCategories.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setFilterAttack(cat)}
            className={`whitespace-nowrap min-h-[38px] px-3.5 py-1.5 rounded-xl text-xs font-mono transition-all flex items-center justify-center ${
              filterAttack === cat
                ? "bg-stark-red text-white font-bold"
                : "bg-bg-card border border-stark-border text-text-secondary hover:bg-bg-elevated"
            }`}
          >
            {cat} ({suspiciousList.filter((s) => s.attackType === cat).length})
          </button>
        ))}
      </div>

      {/* Threat List */}
      <Card title={`Active Threat Incidents & Investigation Queue (${filtered.length})`}>
        {loading ? (
          <p className="text-xs text-text-secondary py-8 text-center font-mono">Analyzing scan telemetry...</p>
        ) : filtered.length === 0 ? (
          <div className="py-8 text-center text-xs text-text-secondary">
            No incidents detected in this attack category.
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((s) => {
              const scanNotes = notes.filter((n) => n.scanId === s.id);
              return (
                <div
                  key={s.id}
                  className="p-4 rounded-xl bg-bg-main border border-stark-border hover:border-stark-red/40 transition-colors space-y-3"
                >
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="px-2 py-0.5 rounded font-mono text-[10px] bg-stark-red/10 text-stark-red border border-stark-red/30 font-bold uppercase">
                        {s.attackType}
                      </span>
                      <VerdictBadge verdict={s.verdict} size="sm" />
                      <span className="text-xs font-mono text-text-muted">
                        {new Date(s.ts).toLocaleString()}
                      </span>
                    </div>

                    <div className="flex flex-wrap sm:flex-nowrap items-center justify-between sm:justify-end gap-2 font-mono text-xs w-full sm:w-auto mt-2 sm:mt-0">
                      {s.risk_score !== null && (
                        <span className="px-2 py-0.5 rounded bg-bg-elevated border border-stark-border text-text-heading">
                          Risk: <strong>{s.risk_score.toFixed(3)}</strong>
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => setActiveScan(activeScan?.id === s.id ? null : s)}
                        className="w-full sm:w-auto px-3.5 py-1.5 min-h-[38px] rounded-lg bg-bg-elevated hover:bg-bg-secondary border border-stark-border text-[11px] text-stark-cyan flex items-center justify-center text-center"
                      >
                        {activeScan?.id === s.id ? "Hide Investigation" : "Investigate & Add Notes"}
                      </button>
                    </div>
                  </div>

                  <div className="text-xs text-text-secondary leading-relaxed bg-bg-card p-3 rounded-lg border border-stark-border/60 font-mono">
                    <div className="text-text-muted text-[10px] uppercase mb-0.5">Fusion Diagnostics Reason:</div>
                    <p className="text-text-primary">{s.reason}</p>
                    <div className="mt-2 text-[11px] text-text-muted flex flex-wrap gap-4 pt-1 border-t border-stark-border/40">
                      <span>PRODUCT ID: <strong className="text-stark-cyan">{s.product_id}</strong></span>
                      <span>CHANNEL: <strong className="text-text-heading uppercase">{s.channel}</strong></span>
                      <span>IDENTITY SIGNAL: <strong className="text-stark-amber">{s.identity_result}</strong></span>
                      <span>ON-CHAIN: <strong className="text-text-heading">{s.chain_result}</strong></span>
                    </div>
                  </div>

                  {/* Investigation Accordion */}
                  {activeScan?.id === s.id && (
                    <div className="p-3.5 rounded-xl bg-bg-card border border-stark-border space-y-3 animate-in fade-in duration-150">
                      <div className="text-xs font-bold text-text-heading flex items-center justify-between">
                        <span>📝 Security Officer Incident Log</span>
                        <span className="text-[11px] font-mono text-text-muted">{scanNotes.length} notes recorded</span>
                      </div>

                      {scanNotes.length > 0 && (
                        <div className="space-y-2">
                          {scanNotes.map((n, i) => (
                            <div key={i} className="p-2.5 rounded-lg bg-bg-main border border-stark-border text-xs">
                              <p className="text-text-primary">{n.note}</p>
                              <div className="mt-1 text-[10px] font-mono text-text-muted flex justify-between">
                                <span>{n.admin}</span>
                                <span>{new Date(n.timestamp).toLocaleString()}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="flex flex-col sm:flex-row gap-2">
                        <input
                          type="text"
                          placeholder="Record investigation findings, vendor contact, or containment steps..."
                          value={newNote}
                          onChange={(e) => setNewNote(e.target.value)}
                          className="flex-1 rounded-xl bg-bg-input border border-stark-border px-3.5 py-2.5 min-h-[44px] text-xs font-mono text-text-primary focus:outline-none focus:border-stark-cyan"
                        />
                        <button
                          type="button"
                          onClick={() => saveNote(s.id)}
                          className="w-full sm:w-auto px-4 py-2.5 min-h-[44px] rounded-xl bg-stark-cyan text-white text-xs font-bold font-mono hover:bg-stark-cyan/90 transition-all shadow-sm flex items-center justify-center text-center"
                        >
                          Add Note
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}

