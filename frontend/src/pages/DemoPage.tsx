/**
 * DemoPage.tsx
 * =============
 * Demo / presentation page.
 *
 * Provides buttons to generate simulated attack scenarios for live demos.
 * Each button:
 *  1. Creates a fresh registered product (POST /products with a test key).
 *  2. Fires one or more scan calls that trigger the target attack pattern.
 *  3. Shows the verdict returned by the full fusion engine.
 *
 * All data is purely for demonstration — no real products or scans.
 *
 * IMPORTANT: Demo mode uses the hardcoded Ganache account[2] manufacturer key
 * which is public on the deterministic Ganache node. Never use on a real chain.
 */

import { useState } from "react";
import { registerProduct, postScan, sellProduct, type ScanResponse } from "../lib/api";
import VerdictBadge from "../components/VerdictBadge";
import Card from "../components/Card";

// Public Ganache account[2] key — deterministic, not a real secret
const DEMO_MFR_ADDR = "0x22d491Bde2303f2f43325b2108D26f1eAbA1e32b";
const DEMO_MFR_KEY  = "0x6370fd033278c143179d81c5526140625662b8daa446c22ee2d73db3707e620c";

interface DemoResult {
  label:   string;
  scans:   ScanResponse[];
  error?:  string;
}

/** Register a demo product and return its product_id and qr_payload. */
async function createDemoProduct(suffix: string) {
  const form = new FormData();
  form.append("name",                 `Demo Product ${suffix}`);
  form.append("brand",                "DemoBrand");
  form.append("serial",               `DEMO-${Date.now()}`);
  form.append("manufacturer_address", DEMO_MFR_ADDR);
  form.append("manufacturer_key",     DEMO_MFR_KEY);
  const r = await registerProduct(form);
  return { pid: r.product.product_id, qr: r.qr_payload, nfc: r.nfc_payload };
}

/** Demo scenarios */
const SCENARIOS = [
  {
    id: "verified",
    label: "Normal scan (Verified)",
    description: "One genuine QR scan on a registered product.",
    run: async (): Promise<ScanResponse[]> => {
      const { pid, qr } = await createDemoProduct("Normal");
      return [await postScan({ product_id: pid, channel: "qr", qr_payload: qr })];
    },
  },
  {
    id: "bad_qr",
    label: "Tampered QR (Suspicious)",
    description: "QR payload has an invalid HMAC — attacker forged it.",
    run: async (): Promise<ScanResponse[]> => {
      const { pid } = await createDemoProduct("BadQR");
      const fake_payload = `https://verify.example.com/v?pid=${pid}&ser=001&sig=${"0".repeat(32)}`;
      return [await postScan({ product_id: pid, channel: "qr", qr_payload: fake_payload })];
    },
  },
  {
    id: "bad_mac",
    label: "NFC bad MAC (Suspicious)",
    description: "Clone tag produces a random CMAC — rejected immediately.",
    run: async (): Promise<ScanResponse[]> => {
      const { pid } = await createDemoProduct("BadMAC");
      return [await postScan({
        product_id: pid, channel: "nfc",
        nfc_uid: "aabbccddeeff00", nfc_counter: 1, nfc_cmac: "deadbeefdeadbeef",
      })];
    },
  },
  {
    id: "nfc_replay",
    label: "NFC replay (Manual review)",
    description: "Genuine tap accepted, then same tap replayed → disputed.",
    run: async (): Promise<ScanResponse[]> => {
      const { pid, nfc } = await createDemoProduct("Replay");
      const first = await postScan({
        product_id: pid, channel: "nfc",
        nfc_uid: nfc.uid, nfc_counter: nfc.counter, nfc_cmac: nfc.cmac,
      });
      const replay = await postScan({
        product_id: pid, channel: "nfc",
        nfc_uid: nfc.uid, nfc_counter: nfc.counter, nfc_cmac: nfc.cmac,
      });
      return [first, replay];
    },
  },
  {
    id: "sold",
    label: "Already sold (Manual review)",
    description: "Product marked sold then scanned again.",
    run: async (): Promise<ScanResponse[]> => {
      const { pid, qr } = await createDemoProduct("Sold");
      // Sell it via the backend
      await sellProduct(pid);
      return [await postScan({ product_id: pid, channel: "qr", qr_payload: qr })];
    },
  },
  {
    id: "unregistered",
    label: "Unknown product ID (Unregistered)",
    description: "A product_id that was never registered on-chain.",
    run: async (): Promise<ScanResponse[]> => {
      const fakePid = "0x" + "ff".repeat(32);
      const fakeQr  = `https://verify.example.com/v?pid=${fakePid}&ser=001&sig=${"aa".repeat(16)}`;
      return [await postScan({ product_id: fakePid, channel: "qr", qr_payload: fakeQr })];
    },
  },
];

export default function DemoPage() {
  const [running,  setRunning]  = useState<string | null>(null);
  const [results,  setResults]  = useState<Record<string, DemoResult>>({});

  async function runScenario(id: string) {
    const sc = SCENARIOS.find(s => s.id === id)!;
    setRunning(id);
    try {
      const scans = await sc.run();
      setResults(prev => ({ ...prev, [id]: { label: sc.label, scans } }));
    } catch (e) {
      setResults(prev => ({ ...prev, [id]: { label: sc.label, scans: [], error: String(e) } }));
    } finally {
      setRunning(null);
    }
  }

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold text-sky-800">Demo — Attack Scenarios</h1>
      <p className="text-sm text-gray-500">
        Each button registers a fresh product and fires a simulated scan. Results come from the live
        backend + blockchain + ML fusion. Uses the public Ganache account[2] key — never run on a real network.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {SCENARIOS.map(sc => {
          const res = results[sc.id];
          const busy = running === sc.id;
          return (
            <Card key={sc.id} className="flex flex-col gap-2">
              <div>
                <p className="font-medium text-sm">{sc.label}</p>
                <p className="text-xs text-gray-500">{sc.description}</p>
              </div>
              <button
                onClick={() => runScenario(sc.id)}
                disabled={busy || running !== null}
                className="self-start px-4 py-1.5 bg-sky-600 text-white rounded text-sm hover:bg-sky-700 disabled:opacity-50"
              >
                {busy ? "Running…" : "Run"}
              </button>
              {res && (
                <div className="space-y-1 mt-1">
                  {res.error ? (
                    <p className="text-red-600 text-xs">{res.error}</p>
                  ) : (
                    res.scans.map((s, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <span className="text-xs text-gray-400">Scan {i + 1}</span>
                        <VerdictBadge verdict={s.verdict} />
                        <span className="text-xs text-gray-400">{s.identity_result}</span>
                      </div>
                    ))
                  )}
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
