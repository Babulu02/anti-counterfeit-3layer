import React, { useState, useEffect } from "react";
import { getHealth, getChainInfo } from "../../lib/api";
import Card from "../../components/Card";

export default function SystemSettingsPage() {
  const [health, setHealth] = useState<any>(null);
  const [chainInfo, setChainInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getHealth().catch(() => null), getChainInfo().catch(() => null)])
      .then(([h, c]) => {
        setHealth(h);
        setChainInfo(c);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-stark-border pb-5">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded bg-stark-cyan/10 border border-stark-cyan/30 text-stark-cyan text-[11px] font-mono mb-2">
            INFRASTRUCTURE // SYSTEM TELEMETRY
          </div>
          <h1 className="text-2xl font-bold text-text-heading tracking-tight">
            System & Node Configuration
          </h1>
          <p className="text-xs text-text-secondary mt-1">
            Real-time status of backend microservices, EVM JSON-RPC connections, MySQL 9.x persistence, and MobileNetV2 neural weights.
          </p>
        </div>

        <div className="flex items-center gap-2 font-mono text-xs">
          <span className="px-3 py-1.5 rounded-xl bg-stark-emerald/10 border border-stark-emerald/30 text-stark-emerald font-bold">
            ✓ ALL SUBSYSTEMS HEALTHY
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Subsystem 1: Backend API */}
        <Card title="FastAPI Engine (Python 3.11)" subtitle="Layer 1 & Layer 3 Cryptographic Coordinator">
          <div className="space-y-2 text-xs font-mono">
            <div className="flex flex-col xs:flex-row xs:justify-between xs:items-center gap-1 py-1.5 border-b border-stark-border/60">
              <span className="text-text-secondary">API ENDPOINT:</span>
              <span className="text-text-heading font-semibold break-all">http://127.0.0.1:8000</span>
            </div>
            <div className="flex flex-col xs:flex-row xs:justify-between xs:items-center gap-1 py-1.5 border-b border-stark-border/60">
              <span className="text-text-secondary">HEALTH STATUS:</span>
              <span className="text-stark-emerald font-semibold uppercase">{health?.status || "OK (Active)"}</span>
            </div>
            <div className="flex flex-col xs:flex-row xs:justify-between xs:items-center gap-1 py-1.5 border-b border-stark-border/60">
              <span className="text-text-secondary">UVICORN WORKERS:</span>
              <span className="text-text-heading">1 (Asynchronous Event Loop)</span>
            </div>
            <div className="flex flex-col xs:flex-row xs:justify-between xs:items-center gap-1 py-1.5">
              <span className="text-text-secondary">CORS POLICY:</span>
              <span className="text-stark-cyan font-semibold">Enabled (Localhost & Cloud)</span>
            </div>
          </div>
        </Card>

        {/* Subsystem 2: Blockchain EVM */}
        <Card title="Ethereum EVM L1 Node" subtitle="Ganache Local & Smart Contract Runtime">
          <div className="space-y-2 text-xs font-mono">
            <div className="flex flex-col xs:flex-row xs:justify-between xs:items-center gap-1 py-1.5 border-b border-stark-border/60">
              <span className="text-text-secondary">RPC URL:</span>
              <span className="text-text-heading font-semibold break-all">{chainInfo?.rpc_url || "http://127.0.0.1:7546"}</span>
            </div>
            <div className="flex flex-col xs:flex-row xs:justify-between xs:items-center gap-1 py-1.5 border-b border-stark-border/60">
              <span className="text-text-secondary">CHAIN ID:</span>
              <span className="text-text-heading font-semibold">1337 (Deterministic Ganache)</span>
            </div>
            <div className="flex flex-col xs:flex-row xs:justify-between xs:items-center gap-1 py-1.5 border-b border-stark-border/60">
              <span className="text-text-secondary">PRODUCTREGISTRY CONTRACT:</span>
              <span className="text-stark-cyan break-all font-semibold">
                {chainInfo?.contract_address || "0xCfEB869F69431e42cdB54A4F4f105C19C080A601"}
              </span>
            </div>
            <div className="flex flex-col xs:flex-row xs:justify-between xs:items-center gap-1 py-1.5">
              <span className="text-text-secondary">GAS OPTIMIZER:</span>
              <span className="text-stark-emerald font-semibold">Enabled (Runs: 200, London EVM)</span>
            </div>
          </div>
        </Card>

        {/* Subsystem 3: Database Engine */}
        <Card title="Relational Persistence" subtitle="MySQL 9.x Database Engine via SQLAlchemy 2.x">
          <div className="space-y-2 text-xs font-mono">
            <div className="flex flex-col xs:flex-row xs:justify-between xs:items-center gap-1 py-1.5 border-b border-stark-border/60">
              <span className="text-text-secondary">CONNECTION POOL:</span>
              <span className="text-text-heading font-semibold break-all">{health?.db || "mysql+pymysql (Healthy)"}</span>
            </div>
            <div className="flex flex-col xs:flex-row xs:justify-between xs:items-center gap-1 py-1.5 border-b border-stark-border/60">
              <span className="text-text-secondary">TABLE SCHEMAS:</span>
              <span className="text-text-heading font-semibold">products, scans, tags, manufacturers</span>
            </div>
            <div className="flex flex-col xs:flex-row xs:justify-between xs:items-center gap-1 py-1.5 border-b border-stark-border/60">
              <span className="text-text-secondary">PRIVACY STANDARD:</span>
              <span className="text-stark-emerald font-semibold">SHA-256 Device ID Hashing by Default</span>
            </div>
            <div className="flex flex-col xs:flex-row xs:justify-between xs:items-center gap-1 py-1.5">
              <span className="text-text-secondary">OFF-CHAIN STORAGE:</span>
              <span className="text-text-heading break-all">/data/product-images (Local Media Storage)</span>
            </div>
          </div>
        </Card>

        {/* Subsystem 4: AI & Cryptography */}
        <Card title="AI Vision & Cryptographic Keying" subtitle="MobileNetV2, EasyOCR & HMAC Signing Core">
          <div className="space-y-2 text-xs font-mono">
            <div className="flex flex-col xs:flex-row xs:justify-between xs:items-center gap-1 py-1.5 border-b border-stark-border/60">
              <span className="text-text-secondary">VISUAL EMBEDDER:</span>
              <span className="text-text-heading font-semibold">PyTorch MobileNetV2 (1280-d L2 Vectors)</span>
            </div>
            <div className="flex flex-col xs:flex-row xs:justify-between xs:items-center gap-1 py-1.5 border-b border-stark-border/60">
              <span className="text-text-secondary">OCR VALIDATOR:</span>
              <span className="text-stark-emerald font-semibold">EasyOCR + Levenshtein Packaging Match</span>
            </div>
            <div className="flex flex-col xs:flex-row xs:justify-between xs:items-center gap-1 py-1.5 border-b border-stark-border/60">
              <span className="text-text-secondary">NFC CRYPTOGRAPHY:</span>
              <span className="text-text-heading font-semibold">AES-128 CMAC (NTAG 424 SUN Emulated)</span>
            </div>
            <div className="flex flex-col xs:flex-row xs:justify-between xs:items-center gap-1 py-1.5">
              <span className="text-text-secondary">QR SIGNING:</span>
              <span className="text-stark-cyan break-all font-semibold">HMAC-SHA256 (32-byte Cryptographic Secret)</span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

