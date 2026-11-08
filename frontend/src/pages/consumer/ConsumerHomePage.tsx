import React from "react";
import { Link } from "react-router-dom";
import Card from "../../components/Card";

export default function ConsumerHomePage() {
  return (
    <div className="space-y-12 pb-12">
      {/* ── Hero Banner ── */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-bg-card via-bg-card to-bg-elevated border border-stark-border p-8 sm:p-12 shadow-xl">
        <div className="relative z-10 max-w-3xl space-y-5">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-stark-cyan/10 border border-stark-cyan/30 text-stark-cyan text-xs font-mono font-bold">
            <span>🛡️</span> AETHER CRYPTOGRAPHIC VERIFICATION
          </div>

          <h1 className="text-3xl sm:text-5xl font-extrabold text-text-heading tracking-tight leading-tight">
            Verify Physical Authenticity with{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-stark-cyan to-[#168BFF]">
              Three-Layer Security
            </span>
          </h1>

          <p className="text-sm sm:text-base text-text-secondary leading-relaxed max-w-2xl">
            Legacy barcodes and static QR codes are easily photocopied. AETHER protects you by fusing
            signed cryptographic QR codes, tamper-evident NTAG 424 SUN chips, Ethereum blockchain records,
            and MobileNetV2 computer vision lookalike detection.
          </p>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-3">
            <Link
              to="/consumer/verify"
              className="px-6 py-3.5 rounded-2xl bg-stark-cyan text-white text-sm font-bold font-mono tracking-wide hover:bg-stark-cyan/90 transition-all shadow-lg shadow-stark-cyan/20 text-center flex items-center justify-center gap-2"
            >
              <span>⚡</span>
              <span>Verify Product Now</span>
            </Link>

            <Link
              to="/consumer/about"
              className="px-6 py-3.5 rounded-2xl bg-bg-elevated hover:bg-bg-secondary border border-stark-border text-sm font-semibold text-text-secondary text-center transition-all"
            >
              How It Works &rarr;
            </Link>
          </div>
        </div>

        {/* Background glow ornament */}
        <div className="absolute right-0 top-0 w-96 h-96 bg-stark-cyan/5 rounded-full blur-3xl pointer-events-none" />
      </section>

      {/* ── Why Legacy Barcodes Fail vs AETHER ── */}
      <section className="space-y-4">
        <div className="text-center max-w-2xl mx-auto space-y-1.5">
          <span className="text-xs font-mono text-stark-cyan uppercase tracking-wider block">
            RESEARCH PAPER FOUNDATION // HACP5
          </span>
          <h2 className="text-2xl font-bold text-text-heading">
            Why Traditional Verification Is Broken
          </h2>
          <p className="text-xs text-text-secondary leading-relaxed">
            Counterfeiters duplicate packaging barcodes in seconds. AETHER introduces a multi-signal pipeline where forgery in any one layer triggers an immediate alert.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-4">
          <Card
            title="Layer 1a: Dynamic Tokens"
            subtitle="Signed QR HMAC & NTAG 424 SUN"
            icon={<span className="text-xl">🏷️</span>}
          >
            <p className="text-xs text-text-secondary leading-relaxed">
              Every QR and NFC tap generates an encrypted rolling CMAC code that cannot be duplicated or photocopied.
            </p>
          </Card>

          <Card
            title="Layer 1b: Blockchain Proof"
            subtitle="Ethereum EVM ProductRegistry"
            icon={<span className="text-xl">⛓️</span>}
          >
            <p className="text-xs text-text-secondary leading-relaxed">
              Permanent immutable ledger records manufacturer authorization, lifecycle status, and prevents double-selling.
            </p>
          </Card>

          <Card
            title="Layer 2: Spatial AI Risk"
            subtitle="Machine Learning Anomaly Engine"
            icon={<span className="text-xl">🧠</span>}
          >
            <p className="text-xs text-text-secondary leading-relaxed">
              Real-time anomaly scoring flags impossible travel, burst scanning, clone-first attacks, and duplicate taps.
            </p>
          </Card>

          <Card
            title="Layer 3: Visual Inspection"
            subtitle="MobileNetV2 + OCR Verification"
            icon={<span className="text-xl">👁️</span>}
          >
            <p className="text-xs text-text-secondary leading-relaxed">
              Compares physical packaging photos against registered embeddings and detects lookalike counterfeit brand text.
            </p>
          </Card>
        </div>
      </section>

      {/* ── Consumer Features Grid ── */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 rounded-2xl bg-bg-card border border-stark-border shadow-sm space-y-3">
          <div className="w-12 h-12 rounded-xl bg-stark-cyan/10 border border-stark-cyan/30 flex items-center justify-center text-2xl">
            📷
          </div>
          <h3 className="font-bold text-text-heading text-base">QR Camera Scanner</h3>
          <p className="text-xs text-text-secondary leading-relaxed">
            Scan physical tags directly using your smartphone camera or webcam with real-time video stream decoding.
          </p>
          <Link
            to="/consumer/verify"
            className="text-xs font-mono font-bold text-stark-cyan hover:underline inline-block pt-1"
          >
            Open Scanner &rarr;
          </Link>
        </div>

        <div className="p-6 rounded-2xl bg-bg-card border border-stark-border shadow-sm space-y-3">
          <div className="w-12 h-12 rounded-xl bg-stark-emerald/10 border border-stark-emerald/30 flex items-center justify-center text-2xl">
            📜
          </div>
          <h3 className="font-bold text-text-heading text-base">Verification History</h3>
          <p className="text-xs text-text-secondary leading-relaxed">
            Keep track of all your authenticated items with permanent cryptographic receipts stored on your device.
          </p>
          <Link
            to="/consumer/history"
            className="text-xs font-mono font-bold text-stark-emerald hover:underline inline-block pt-1"
          >
            View History Ledger &rarr;
          </Link>
        </div>

        <div className="p-6 rounded-2xl bg-bg-card border border-stark-border shadow-sm space-y-3">
          <div className="w-12 h-12 rounded-xl bg-stark-red/10 border border-stark-red/30 flex items-center justify-center text-2xl">
            ⚠️
          </div>
          <h3 className="font-bold text-text-heading text-base">Report Counterfeits</h3>
          <p className="text-xs text-text-secondary leading-relaxed">
            Found a suspicious fake product? Submit photographic evidence to protect the community and notify brand owners.
          </p>
          <Link
            to="/consumer/report"
            className="text-xs font-mono font-bold text-stark-red hover:underline inline-block pt-1"
          >
            File Fraud Incident &rarr;
          </Link>
        </div>
      </section>
    </div>
  );
}

