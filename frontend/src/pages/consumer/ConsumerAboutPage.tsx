import React from "react";
import Card from "../../components/Card";

export default function ConsumerAboutPage() {
  return (
    <div className="space-y-8 max-w-4xl mx-auto pb-12">
      <div className="border-b border-stark-border pb-5">
        <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded bg-stark-cyan/10 border border-stark-cyan/30 text-stark-cyan text-[11px] font-mono mb-2">
          RESEARCH ARCHITECTURE // HACP5 ALIGNMENT
        </div>
        <h1 className="text-2xl font-bold text-text-heading tracking-tight">
          About AETHER v3.0 Platform
        </h1>
        <p className="text-xs text-text-secondary mt-1">
          Architectural overview, scientific paper alignment with HACP5, and multi-layer cryptographic extensions.
        </p>
      </div>

      <Card title="HACP5 Core Research Foundation">
        <div className="space-y-3 text-xs leading-relaxed text-text-secondary">
          <p>
            AETHER is modeled after the peer-reviewed <strong className="text-text-heading">Holistic Anti-Counterfeiting Platform (HACP5)</strong> architecture.
            The original paper addresses the vulnerability of static barcodes and RFID tags by introducing:
          </p>
          <ul className="list-disc list-inside space-y-1 font-mono text-[11px] text-text-primary">
            <li><strong>DynamicID:</strong> Generating unique cryptographic tokens dynamically per verification.</li>
            <li><strong>AuthentiCoding:</strong> Pairing physical NFC hardware (NTAG 424 SUN) with AES-128 CMAC and rolling counter cryptography.</li>
            <li><strong>Blockchain-backed Registry:</strong> Immutably storing product enrollment and scan receipts.</li>
            <li><strong>Role-Separated Portals:</strong> Independent interfaces for Admin, Manufacturer, and Consumer.</li>
          </ul>
        </div>
      </Card>

      <Card title="AETHER v3.0 Advanced Extensions">
        <div className="space-y-3 text-xs leading-relaxed text-text-secondary">
          <p>
            Our implementation significantly extends the original paper to solve real-world hardware constraints and advanced attack patterns:
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
            <div className="p-3.5 rounded-xl bg-bg-main border border-stark-border space-y-1">
              <h4 className="font-bold text-text-heading text-xs">1. Signed QR HMAC (Hardware-Free)</h4>
              <p className="text-[11px] text-text-secondary">
                Enables high-security anti-counterfeiting using standard smartphone cameras without requiring expensive NFC encoder hardware.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-bg-main border border-stark-border space-y-1">
              <h4 className="font-bold text-text-heading text-xs">2. MobileNetV2 + OCR Visual AI</h4>
              <p className="text-[11px] text-text-secondary">
                Computes 1280-d cosine similarities and Levenshtein string distance to catch lookalike counterfeit packaging (e.g. Bisleri vs Bislie).
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-bg-main border border-stark-border space-y-1">
              <h4 className="font-bold text-text-heading text-xs">3. Spatial Anomaly & Threat Engine</h4>
              <p className="text-[11px] text-text-secondary">
                ML-based risk scoring that detects impossible travel velocities, burst scanning, clone-first attacks, and post-sale resale fraud.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-bg-main border border-stark-border space-y-1">
              <h4 className="font-bold text-text-heading text-xs">4. Solidity Smart Contract Governance</h4>
              <p className="text-[11px] text-text-secondary">
                Production-grade ProductRegistry.sol with owner access control, manufacturer whitelisting, and deterministic Ganache integration.
              </p>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}

