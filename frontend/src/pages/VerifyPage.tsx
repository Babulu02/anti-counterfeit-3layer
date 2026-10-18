/**
 * VerifyPage.tsx
 * ==============
 * Product verification interface.
 *
 * Input options:
 *  - QR scan via camera (html5-qrcode)
 *  - Paste / type a QR payload URL directly
 *  - Simulate NFC tap (enter uid + counter + cmac manually; or auto-fill
 *    from a previously registered product for demo purposes)
 *  - Web NFC (Android Chrome only) — if window.NDEFReader is available
 *
 * After submission the verdict, risk score, per-signal breakdown and
 * chain status are shown.
 *
 * Location: requests Geolocation API permission (optional).
 */

import { useState, useRef, useEffect } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { postScan, type ScanResponse } from "../lib/api";
import VerdictBadge from "../components/VerdictBadge";
import SignalRow    from "../components/SignalRow";
import Card         from "../components/Card";

type Channel = "qr" | "nfc";
type InputMode = "camera" | "paste" | "nfc_manual" | "nfc_web";

export default function VerifyPage() {
  const [channel,    setChannel]    = useState<Channel>("qr");
  const [inputMode,  setInputMode]  = useState<InputMode>("camera");
  const [qrText,     setQrText]     = useState("");
  const [nfcUid,     setNfcUid]     = useState("");
  const [nfcCounter, setNfcCounter] = useState("");
  const [nfcCmac,    setNfcCmac]    = useState("");
  const [productId,  setProductId]  = useState("");
  const [location,   setLocation]   = useState<{ lat: number; lon: number } | null>(null);
  const [locPerm,    setLocPerm]    = useState<"none" | "granted" | "denied">("none");
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState<string | null>(null);
  const [result,     setResult]     = useState<ScanResponse | null>(null);
  const [scanning,   setScanning]   = useState(false);
  const qrRef    = useRef<Html5Qrcode | null>(null);
  const divId    = "qr-reader";

  // Web NFC available only on Android Chrome
  const webNfcAvailable = typeof window !== "undefined" &&
    "NDEFReader" in window;

  // Request geolocation
  function requestLocation() {
    if (!navigator.geolocation) { setLocPerm("denied"); return; }
    navigator.geolocation.getCurrentPosition(
      pos => {
        setLocation({ lat: pos.coords.latitude, lon: pos.coords.longitude });
        setLocPerm("granted");
      },
      () => setLocPerm("denied")
    );
  }

  // Start camera QR scan
  async function startCamera() {
    if (scanning) return;
    setScanning(true);
    setError(null);
    try {
      const html5 = new Html5Qrcode(divId);
      qrRef.current = html5;
      await html5.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: 250 },
        (text) => {
          setQrText(text);
          stopCamera();
        },
        () => {}   // ignore non-fatal errors
      );
    } catch (e) {
      setError(`Camera error: ${e}`);
      setScanning(false);
    }
  }

  async function stopCamera() {
    setScanning(false);
    if (qrRef.current) {
      try { await qrRef.current.stop(); } catch {}
      qrRef.current = null;
    }
  }

  useEffect(() => { return () => { stopCamera(); }; }, []);

  // Web NFC read
  async function readWebNfc() {
    if (!webNfcAvailable) return;
    setError(null);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const reader = new (window as any).NDEFReader();
      await reader.scan();
      reader.onreading = (event: { message: { records: { data: { text(): string } }[] } }) => {
        const text = event.message.records[0]?.data?.text() ?? "";
        setQrText(text);
      };
    } catch (e) {
      setError(`Web NFC error: ${e}`);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setResult(null);
    setLoading(true);
    try {
      let body: Parameters<typeof postScan>[0];
      if (channel === "qr") {
        if (!qrText && !productId) { setError("Scan a QR or paste a URL first."); setLoading(false); return; }
        // Extract product_id from the QR URL if not set manually
        let pid = productId;
        if (!pid && qrText) {
          const m = new URL(qrText).searchParams.get("pid");
          pid = m ?? qrText;
        }
        body = {
          product_id: pid,
          channel: "qr",
          qr_payload: qrText || undefined,
          lat:  location?.lat,
          lon:  location?.lon,
          device_id: navigator.userAgent.slice(0, 60),
        };
      } else {
        if (!nfcUid || !nfcCounter || !nfcCmac || !productId) {
          setError("Product ID, UID, counter and CMAC are required for NFC."); setLoading(false); return;
        }
        body = {
          product_id:  productId,
          channel:     "nfc",
          nfc_uid:     nfcUid,
          nfc_counter: parseInt(nfcCounter, 10),
          nfc_cmac:    nfcCmac,
          lat:  location?.lat,
          lon:  location?.lon,
          device_id: navigator.userAgent.slice(0, 60),
        };
      }
      const res = await postScan(body);
      setResult(res);
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold text-sky-800">Verify Product</h1>

      {/* Channel selector */}
      <div className="flex gap-2">
        {(["qr", "nfc"] as Channel[]).map(ch => (
          <button key={ch}
            onClick={() => { setChannel(ch); setResult(null); setError(null); }}
            className={`px-4 py-1.5 rounded text-sm font-medium border transition-colors
              ${channel === ch ? "bg-sky-600 text-white border-sky-600" : "text-gray-600 border-gray-300 hover:bg-gray-50"}`}>
            {ch.toUpperCase()}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {channel === "qr" && (
          <Card title="QR Code Input">
            {/* Mode tabs */}
            <div className="flex gap-2 mb-3">
              <button type="button" onClick={() => setInputMode("camera")}
                className={`text-xs px-3 py-1 rounded ${inputMode === "camera" ? "bg-sky-100 text-sky-700 font-medium" : "text-gray-500"}`}>
                Camera scan
              </button>
              <button type="button" onClick={() => setInputMode("paste")}
                className={`text-xs px-3 py-1 rounded ${inputMode === "paste" ? "bg-sky-100 text-sky-700 font-medium" : "text-gray-500"}`}>
                Paste URL
              </button>
              {webNfcAvailable && (
                <button type="button" onClick={() => { setInputMode("nfc_web"); readWebNfc(); }}
                  className={`text-xs px-3 py-1 rounded ${inputMode === "nfc_web" ? "bg-sky-100 text-sky-700 font-medium" : "text-gray-500"}`}>
                  Web NFC
                </button>
              )}
            </div>

            {inputMode === "camera" && (
              <div>
                <div id={divId} className="w-full max-w-xs rounded overflow-hidden border" />
                <div className="flex gap-2 mt-2">
                  {!scanning
                    ? <button type="button" onClick={startCamera}
                        className="text-sm px-3 py-1.5 bg-sky-600 text-white rounded hover:bg-sky-700">
                        Start camera
                      </button>
                    : <button type="button" onClick={stopCamera}
                        className="text-sm px-3 py-1.5 bg-gray-400 text-white rounded">
                        Stop
                      </button>}
                </div>
                {qrText && <p className="mt-2 text-xs text-green-700 break-all">Scanned: {qrText}</p>}
              </div>
            )}

            {inputMode === "paste" && (
              <textarea
                className="w-full border rounded px-3 py-2 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-sky-400"
                rows={3}
                placeholder="Paste QR payload URL here…"
                value={qrText}
                onChange={e => setQrText(e.target.value)}
              />
            )}
          </Card>
        )}

        {channel === "nfc" && (
          <Card title="NFC Tap (emulated)">
            <p className="text-xs text-gray-500 mb-3 italic">
              NFC is emulated. Enter the uid/counter/cmac from the NFC payload JSON, or use
              the Demo page to generate a simulated tap.
            </p>
            {[
              { label: "Product ID (0x…)",   value: productId,  set: setProductId  },
              { label: "UID (hex)",           value: nfcUid,     set: setNfcUid     },
              { label: "Counter (integer)",   value: nfcCounter, set: setNfcCounter },
              { label: "CMAC (hex)",          value: nfcCmac,    set: setNfcCmac    },
            ].map(({ label, value, set }) => (
              <div key={label} className="mb-2">
                <label className="text-xs text-gray-500 block mb-0.5">{label}</label>
                <input className="w-full border rounded px-3 py-1.5 text-sm font-mono"
                  value={value} onChange={e => set(e.target.value)} placeholder={label} />
              </div>
            ))}
          </Card>
        )}

        {channel === "qr" && (
          <div>
            <label className="text-xs text-gray-500 block mb-0.5">Product ID (0x…) — auto-extracted from QR URL if blank</label>
            <input className="w-full border rounded px-3 py-1.5 text-sm font-mono"
              value={productId} onChange={e => setProductId(e.target.value)} placeholder="0x…" />
          </div>
        )}

        {/* Location */}
        <div className="flex items-center gap-3">
          {locPerm === "none"
            ? <button type="button" onClick={requestLocation}
                className="text-xs text-sky-600 hover:underline">
                Add location (optional)
              </button>
            : locPerm === "granted" && location
            ? <span className="text-xs text-green-700">
                Location: {location.lat.toFixed(4)}, {location.lon.toFixed(4)}
              </span>
            : <span className="text-xs text-gray-400">Location denied</span>}
        </div>

        {error && <p className="text-red-600 text-sm">{error}</p>}

        <button type="submit" disabled={loading}
          className="w-full py-2 bg-sky-600 text-white rounded hover:bg-sky-700 disabled:opacity-50 font-medium text-sm">
          {loading ? "Verifying…" : "Verify"}
        </button>
      </form>

      {/* Result */}
      {result && (
        <Card title="Verification Result">
          <div className="mb-4">
            <VerdictBadge verdict={result.verdict} />
          </div>
          <p className="text-sm text-gray-700 mb-4">{result.reason}</p>
          <table className="w-full text-sm">
            <tbody>
              <SignalRow label="Chain result"     value={result.chain_result}    ok={result.on_chain} />
              <SignalRow label="On-chain"         value={result.on_chain ? "Yes" : "No"} ok={result.on_chain} />
              <SignalRow label="Sold"             value={result.sold ? "Yes" : "No"}     ok={!result.sold} />
              <SignalRow label="Identity check"   value={result.identity_result}  ok={result.identity_result === "valid"} />
              <SignalRow label="Risk score"       value={result.risk_score !== null ? result.risk_score.toFixed(3) : "n/a"}
                         ok={result.risk_score === null || result.risk_score < 0.3} />
              <SignalRow label="logScan tx"       value={result.chain_tx ? result.chain_tx.slice(0, 18) + "…" : "—"} />
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
