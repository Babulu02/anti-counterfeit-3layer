import React, { useState } from "react";
import Card from "../../components/Card";

interface EncodeLog {
  id: string;
  tagUid: string;
  lotNumber: string;
  counter: number;
  cmac: string;
  status: "success" | "failed";
  timestamp: string;
}

export default function NfcEncodingPage() {
  const [selectedBatch, setSelectedBatch] = useState("LOT-2026-CH-901");
  const [encoderConnected, setEncoderConnected] = useState(true);
  const [encodingCount, setEncodingCount] = useState(42);
  const [isEncoding, setIsEncoding] = useState(false);
  const [lastCmac, setLastCmac] = useState("A9F84B210DE35C18");
  const [logs, setLogs] = useState<EncodeLog[]>([
    {
      id: "enc-1",
      tagUid: "04A2F8B9C10280",
      lotNumber: "LOT-2026-CH-901",
      counter: 42,
      cmac: "A9F84B210DE35C18",
      status: "success",
      timestamp: new Date(Date.now() - 120000).toLocaleTimeString(),
    },
    {
      id: "enc-2",
      tagUid: "04E3197C4B0180",
      lotNumber: "LOT-2026-CH-901",
      counter: 41,
      cmac: "C38E0124B89FA110",
      status: "success",
      timestamp: new Date(Date.now() - 240000).toLocaleTimeString(),
    },
  ]);

  const triggerEncode = () => {
    setIsEncoding(true);
    setTimeout(() => {
      const nextCounter = encodingCount + 1;
      const fakeUid = `04${Math.random().toString(16).slice(2, 14).toUpperCase()}`;
      const fakeCmac = Math.random().toString(16).slice(2, 18).toUpperCase();

      const newLog: EncodeLog = {
        id: `enc-${Date.now()}`,
        tagUid: fakeUid,
        lotNumber: selectedBatch,
        counter: nextCounter,
        cmac: fakeCmac,
        status: "success",
        timestamp: new Date().toLocaleTimeString(),
      };

      setLogs([newLog, ...logs]);
      setEncodingCount(nextCounter);
      setLastCmac(fakeCmac);
      setIsEncoding(false);
    }, 1200);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-stark-border pb-5">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded bg-stark-cyan/10 border border-stark-cyan/30 text-stark-cyan text-[11px] font-mono mb-2">
            HACP5 // NFC AUTHENTICODING & DYNAMIC ID ENCODER
          </div>
          <h1 className="text-2xl font-bold text-text-heading tracking-tight">
            NFC Hardware Tag Encoding Station
          </h1>
          <p className="text-xs text-text-secondary mt-1">
            Program physical NXP NTAG 424 SUN chips with AES-128 master keys and rolling counters for clone-resistant tap authentication.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-stark-emerald/10 border border-stark-emerald/30 text-stark-emerald text-xs font-mono font-bold">
            <span className="w-2 h-2 rounded-full bg-stark-emerald animate-pulse" />
            ENCODER HARDWARE PAIRED
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Encoder Controls */}
        <div className="lg:col-span-5 space-y-4">
          <Card title="AuthentiCoding Station Setup" subtitle="Select production batch and trigger tag write sequence">
            <div className="space-y-4 text-xs font-mono">
              <div>
                <label className="block text-text-secondary mb-1">Target Production Batch</label>
                <select
                  value={selectedBatch}
                  onChange={(e) => setSelectedBatch(e.target.value)}
                  className="w-full rounded-xl bg-bg-input border border-stark-border px-3.5 py-2.5 min-h-[44px] text-text-primary focus:outline-none focus:border-stark-cyan"
                >
                  <option value="LOT-2026-CH-901">LOT-2026-CH-901 (AetherCare 500 units)</option>
                  <option value="LOT-2026-CH-902">LOT-2026-CH-902 (BioShield 1200 units)</option>
                </select>
              </div>

              <div className="p-3.5 rounded-xl bg-bg-main border border-stark-border space-y-2">
                <div className="flex flex-col xs:flex-row xs:justify-between gap-0.5">
                  <span className="text-text-secondary">CHIP PROFILE:</span>
                  <span className="text-text-heading font-semibold">NXP NTAG 424 SUN (AES-128)</span>
                </div>
                <div className="flex flex-col xs:flex-row xs:justify-between gap-0.5">
                  <span className="text-text-secondary">PROTOCOL:</span>
                  <span className="text-stark-cyan font-semibold">HACP5 DynamicID AuthentiCoding</span>
                </div>
                <div className="flex flex-col xs:flex-row xs:justify-between gap-0.5">
                  <span className="text-text-secondary">TAGS ENCODED IN BATCH:</span>
                  <span className="text-stark-emerald font-semibold">{encodingCount} Units</span>
                </div>
                <div className="flex flex-col xs:flex-row xs:justify-between gap-0.5">
                  <span className="text-text-secondary">LAST GENERATED CMAC:</span>
                  <span className="text-text-heading font-mono text-[11px] break-all">{lastCmac}</span>
                </div>
              </div>

              <button
                type="button"
                disabled={isEncoding}
                onClick={triggerEncode}
                className="w-full py-3.5 min-h-[44px] rounded-xl bg-stark-cyan text-white text-xs font-bold font-mono hover:bg-stark-cyan/90 transition-all shadow-md disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isEncoding ? (
                  <>
                    <span className="animate-spin">🔄</span>
                    <span>Transmitting AES Keys to NTAG 424 SUN...</span>
                  </>
                ) : (
                  <>
                    <span>📡</span>
                    <span>Encode Next Tag on Line (Simulate Tap)</span>
                  </>
                )}
              </button>
            </div>
          </Card>
        </div>

        {/* Encoding Log */}
        <div className="lg:col-span-7">
          <Card title="Live Factory Floor Encoding Trace">
            <div className="overflow-x-auto">
              <table className="w-full text-xs font-mono">
                <thead>
                  <tr className="text-left text-text-secondary border-b border-stark-border font-mono text-[11px]">
                    <th className="pb-2 pr-3">Time</th>
                    <th className="pb-2 pr-3">7-Byte Tag UID</th>
                    <th className="pb-2 pr-3">Lot</th>
                    <th className="pb-2 pr-3">Counter</th>
                    <th className="pb-2 pr-3">AES CMAC</th>
                    <th className="pb-2 text-right">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr
                      key={log.id}
                      className="border-b border-stark-border/50 last:border-0 hover:bg-bg-elevated/40 transition-colors"
                    >
                      <td className="py-2.5 pr-3 text-text-muted">{log.timestamp}</td>
                      <td className="py-2.5 pr-3 font-bold text-stark-cyan">{log.tagUid}</td>
                      <td className="py-2.5 pr-3 text-text-secondary">{log.lotNumber}</td>
                      <td className="py-2.5 pr-3 text-text-heading font-semibold">#{log.counter}</td>
                      <td className="py-2.5 pr-3 text-[11px] text-text-secondary">{log.cmac}</td>
                      <td className="py-2.5 text-right">
                        <span className="px-2 py-0.5 rounded-full text-[10px] bg-stark-emerald/10 text-stark-emerald border border-stark-emerald/30 font-bold uppercase">
                          {log.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

