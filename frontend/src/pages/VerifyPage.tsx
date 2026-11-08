import { useState, useRef, useEffect } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { postScan, sellProduct, type ScanResponse } from "../lib/api";
import VerdictBadge from "../components/VerdictBadge";
import SignalRow from "../components/SignalRow";
import Card from "../components/Card";

export default function VerifyPage() {
  const [channel, setChannel] = useState<"qr" | "nfc">("qr");
  const [productId, setProductId] = useState("");
  const [qrPayload, setQrPayload] = useState("");

  // NFC mode inputs
  const [nfcUid, setNfcUid] = useState("");
  const [nfcCounter, setNfcCounter] = useState(1);
  const [nfcCmac, setNfcCmac] = useState("");

  // Location capture
  const [useLocation, setUseLocation] = useState(false);
  const [lat, setLat] = useState<number | undefined>();
  const [lon, setLon] = useState<number | undefined>();

  // Image signal (Phase 8)
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  // Verification state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [result, setResult] = useState<ScanResponse | null>(null);
  const [scanning, setScanning] = useState(false);

  // Point of sale / mark sold state
  const [markingSold, setMarkingSold] = useState(false);
  const [soldMsg, setSoldMsg] = useState<string | null>(null);
  const [manualSoldId, setManualSoldId] = useState("");

  const qrRef = useRef<Html5Qrcode | null>(null);
  const divId = "verify-qr-reader";

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const pid = params.get("pid");
    if (pid) {
      setProductId(pid);
    }
    return () => {
      stopCamera();
    };
  }, []);

  async function startCamera() {
    setError(null);
    setCameraError(null);
    setScanning(true);
    try {
      if (!qrRef.current) {
        qrRef.current = new Html5Qrcode(divId);
      }
      await qrRef.current.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 220, height: 220 } },
        async (decodedText) => {
          await stopCamera();
          setQrPayload(decodedText);
          try {
            const url = new URL(decodedText);
            const pid = url.searchParams.get("pid");
            if (pid) setProductId(pid);
          } catch {
            setProductId(decodedText);
          }
        },
        () => {}
      );
    } catch (err: any) {
      setScanning(false);
      setCameraError(
        err?.message?.includes("Permission")
          ? "Camera permission denied. Please allow camera access in browser settings."
          : `Camera error: ${err?.message || err}`
      );
    }
  }

  async function stopCamera() {
    if (qrRef.current && qrRef.current.isScanning) {
      try {
        await qrRef.current.stop();
      } catch {}
    }
    setScanning(false);
  }

  function handleLocationToggle(checked: boolean) {
    setUseLocation(checked);
    if (checked && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLat(pos.coords.latitude);
          setLon(pos.coords.longitude);
        },
        (err) => {
          console.warn("Geolocation query error:", err.message);
        }
      );
    } else {
      setLat(undefined);
      setLon(undefined);
    }
  }

  function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Please select a valid image file.");
      return;
    }

    setImageFile(file);
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setImagePreview(dataUrl);
      const base64Content = dataUrl.split(",")[1];
      setImageBase64(base64Content);
    };
    reader.readAsDataURL(file);
    setError(null);
  }

  function removeImage() {
    setImageFile(null);
    setImagePreview(null);
    setImageBase64(null);
    if (imageInputRef.current) {
      imageInputRef.current.value = "";
    }
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setResult(null);
    setSoldMsg(null);

    let cleanPid = productId.trim();

    // Auto-parse pid if user provided full QR URL
    if (cleanPid.includes("pid=")) {
      try {
        const url = new URL(cleanPid);
        cleanPid = url.searchParams.get("pid") || cleanPid;
      } catch {}
    }

    if (!cleanPid && !qrPayload.trim() && channel === "qr") {
      setError("Please provide a Product ID, short code, or scan a valid QR code.");
      return;
    }

    if (channel === "nfc" && !cleanPid) {
      setError("Product ID or short code is required for NFC telemetry.");
      return;
    }

    setLoading(true);
    try {
      const body: any = {
        product_id: cleanPid || "0x" + "0".repeat(64),
        channel,
        lat: lat ?? null,
        lon: lon ?? null,
      };

      if (channel === "qr") {
        body.qr_payload = qrPayload.trim() || undefined;
      } else {
        body.nfc_uid = nfcUid.trim() || undefined;
        body.nfc_counter = nfcCounter;
        body.nfc_cmac = nfcCmac.trim() || undefined;
      }

      if (imageBase64) {
        body.image_base64 = imageBase64;
      }

      const res = await postScan(body);
      setResult(res);
    } catch (err: any) {
      setError(String(err?.message || err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      {/* ── Page Header ── */}
      <div className="text-center py-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-stark-cyan/10 border border-stark-cyan/30 text-stark-cyan text-xs font-mono mb-2">
          <span>🛡️</span> MULTI-SIGNAL SECURITY ENGINE
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-text-heading tracking-tight">
          Verify Product Authenticity
        </h1>
        <p className="text-xs sm:text-sm text-text-secondary mt-1 max-w-xl mx-auto">
          Audit physical tokens, smart-contract registration, and spatio-temporal telemetry with deterministic fusion rules.
        </p>
      </div>

      {/* ── Channel Selector Tabs ── */}
      <div className="grid grid-cols-2 gap-3 p-1 rounded-xl bg-bg-secondary border border-stark-border shadow-sm">
        <button
          type="button"
          onClick={() => {
            setChannel("qr");
            stopCamera();
          }}
          className={`py-2.5 rounded-lg text-xs font-semibold tracking-wide flex items-center justify-center gap-2 transition-all ${
            channel === "qr"
              ? "bg-bg-card text-stark-cyan shadow-sm border border-stark-cyan/40"
              : "text-text-secondary hover:text-text-primary"
          }`}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
          </svg>
          <span>Layer 1a: Signed QR Token</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setChannel("nfc");
            stopCamera();
          }}
          className={`py-2.5 rounded-lg text-xs font-semibold tracking-wide flex items-center justify-center gap-2 transition-all ${
            channel === "nfc"
              ? "bg-bg-card text-stark-cyan shadow-sm border border-stark-cyan/40"
              : "text-text-secondary hover:text-text-primary"
          }`}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          <span>Layer 1b: NFC Emulation (NTAG 424)</span>
        </button>
      </div>

      {/* ── Verification Inputs Form ── */}
      <Card
        title={channel === "qr" ? "QR Token Inspection" : "NFC Dynamic CMAC Telemetry"}
        subtitle="Submit physical payload for multi-signal fusion analysis"
      >
        <form onSubmit={handleVerify} className="space-y-4">
          {/* QR Channel View */}
          {channel === "qr" && (
            <div className="space-y-3">
              {/* Camera Scanner Viewport */}
              <div className="p-3.5 rounded-xl bg-bg-main border border-stark-border shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-text-secondary flex items-center gap-1.5">
                    <span>📷</span> Camera QR Reader
                  </span>
                  {!scanning ? (
                    <button
                      type="button"
                      onClick={startCamera}
                      className="px-3 py-1 rounded-lg bg-stark-cyan/10 border border-stark-cyan/40 text-stark-cyan hover:bg-stark-cyan/20 text-xs font-semibold transition"
                    >
                      Activate Camera
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={stopCamera}
                      className="text-xs text-stark-red hover:underline font-medium"
                    >
                      Stop Camera
                    </button>
                  )}
                </div>
                <div id={divId} className="w-full max-w-xs mx-auto rounded-lg overflow-hidden" />
                {cameraError && (
                  <p className="text-xs text-stark-red mt-2 font-mono">{cameraError}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1">
                  Product ID or Short Code (e.g. PRD-A49F2E or 0x... bytes32 hex)
                </label>
                <input
                  type="text"
                  className="w-full rounded-lg bg-bg-input border border-stark-border px-3.5 py-2 text-xs font-mono text-text-primary placeholder-text-muted focus:outline-none focus:border-stark-cyan focus:ring-1 focus:ring-stark-cyan shadow-sm transition-colors"
                  placeholder="e.g. PRD-A49F2E or 0x..."
                  value={productId}
                  onChange={(e) => setProductId(e.target.value.trim())}
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1">
                  QR Payload URL / Token (Optional if Product ID provided)
                </label>
                <input
                  type="text"
                  className="w-full rounded-lg bg-bg-input border border-stark-border px-3.5 py-2 text-xs font-mono text-text-primary placeholder-text-muted focus:outline-none focus:border-stark-cyan focus:ring-1 focus:ring-stark-cyan shadow-sm transition-colors"
                  placeholder="https://verify.example.com/v?pid=..."
                  value={qrPayload}
                  onChange={(e) => setQrPayload(e.target.value.trim())}
                />
              </div>
            </div>
          )}

          {/* NFC Channel View */}
          {channel === "nfc" && (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1">
                  Product ID or Short Code (e.g. PRD-A49F2E or 0x... bytes32 hex)
                </label>
                <input
                  type="text"
                  className="w-full rounded-lg bg-bg-input border border-stark-border px-3.5 py-2 text-xs font-mono text-text-primary placeholder-text-muted focus:outline-none focus:border-stark-cyan focus:ring-1 focus:ring-stark-cyan shadow-sm transition-colors"
                  placeholder="e.g. PRD-A49F2E or 0x..."
                  value={productId}
                  onChange={(e) => setProductId(e.target.value.trim())}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-text-secondary mb-1">
                    Tag UID (7 bytes hex)
                  </label>
                  <input
                    type="text"
                    className="w-full rounded-lg bg-bg-input border border-stark-border px-3 py-2 text-xs font-mono text-text-primary placeholder-text-muted focus:outline-none focus:border-stark-cyan focus:ring-1 focus:ring-stark-cyan shadow-sm transition-colors"
                    placeholder="04a1b2c3d4e5f6"
                    value={nfcUid}
                    onChange={(e) => setNfcUid(e.target.value.trim())}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-text-secondary mb-1">
                    Rolling Counter (SUN)
                  </label>
                  <input
                    type="number"
                    min="1"
                    className="w-full rounded-lg bg-bg-input border border-stark-border px-3 py-2 text-xs font-mono text-text-primary placeholder-text-muted focus:outline-none focus:border-stark-cyan focus:ring-1 focus:ring-stark-cyan shadow-sm transition-colors"
                    value={nfcCounter}
                    onChange={(e) => setNfcCounter(Number(e.target.value))}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-text-secondary mb-1">
                    AES-128 CMAC (8 bytes hex)
                  </label>
                  <input
                    type="text"
                    className="w-full rounded-lg bg-bg-input border border-stark-border px-3 py-2 text-xs font-mono text-text-primary placeholder-text-muted focus:outline-none focus:border-stark-cyan focus:ring-1 focus:ring-stark-cyan shadow-sm transition-colors"
                    placeholder="a1b2c3d4e5f60718"
                    value={nfcCmac}
                    onChange={(e) => setNfcCmac(e.target.value.trim())}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Spatio-temporal Telemetry Options */}
          <div className="pt-2 border-t border-stark-border/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <label className="flex items-center gap-2 cursor-pointer text-xs text-text-secondary hover:text-text-primary">
              <input
                type="checkbox"
                checked={useLocation}
                onChange={(e) => handleLocationToggle(e.target.checked)}
                className="rounded bg-bg-input border-stark-border text-stark-cyan focus:ring-0"
              />
              <span>Attach Device GPS (Audits Spatio-Temporal Velocity)</span>
            </label>

            {useLocation && lat !== undefined && lon !== undefined && (
              <span className="text-[11px] font-mono text-stark-emerald bg-stark-emerald/10 px-2 py-0.5 rounded border border-stark-emerald/30">
                GPS: {lat.toFixed(4)}, {lon.toFixed(4)}
              </span>
            )}
          </div>

          {/* Layer 2: Visual Physical Verification (Stolen Tag / Refill Protection) */}
          <div className="pt-3 border-t border-stark-border/60 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-semibold text-text-heading flex items-center gap-2">
                  <span>📸</span> Layer 2: Physical Product Photo (Detect Stolen QR/NFC Tags)
                </h4>
                <p className="text-[11px] text-text-secondary mt-0.5">
                  Protects against Tag Reapplication attacks. If a genuine tag was peeled or stolen and stuck on a fake item, MobileNetV2 verifies texture and packaging features.
                </p>
              </div>
              {imageFile && (
                <button
                  type="button"
                  onClick={removeImage}
                  className="text-[11px] text-stark-red hover:underline"
                >
                  Remove Photo
                </button>
              )}
            </div>

            {!imagePreview ? (
              <label className="flex flex-col items-center justify-center p-4 rounded-xl border border-dashed border-stark-border hover:border-stark-cyan/60 bg-bg-main/60 hover:bg-bg-elevated/40 cursor-pointer transition group shadow-sm">
                <input
                  ref={imageInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={handleImageUpload}
                />
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-stark-cyan/10 border border-stark-cyan/25 flex items-center justify-center text-stark-cyan group-hover:scale-105 transition shadow-sm">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-text-primary group-hover:text-stark-cyan transition">
                      Upload or Snap Product Photo
                    </p>
                    <p className="text-[10px] text-text-muted">
                      Optional: checks MobileNetV2 embedding vs. registered on-chain asset
                    </p>
                  </div>
                </div>
              </label>
            ) : (
              <div className="flex items-center gap-3 p-2.5 rounded-xl bg-bg-elevated border border-stark-border shadow-sm">
                <img
                  src={imagePreview}
                  alt="Product preview"
                  className="w-14 h-14 object-cover rounded-lg border border-stark-border"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-mono text-text-primary truncate font-semibold">
                    {imageFile?.name}
                  </p>
                  <p className="text-[10px] text-stark-emerald font-mono mt-0.5">
                    Ready for cosine similarity comparison
                  </p>
                </div>
              </div>
            )}
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-stark-red/10 border border-stark-red/30 text-stark-red text-xs">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-stark-cyan to-stark-blue text-white font-bold text-xs tracking-wider uppercase shadow-stark-glow hover:opacity-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Executing Deterministic Fusion...</span>
              </>
            ) : (
              <span>🔍 Run Verification Pipeline</span>
            )}
          </button>
        </form>
      </Card>

      {/* ── Verification Result Card ── */}
      {result && (
        <Card
          title="Multi-Layer Fusion Result"
          subtitle={`Product ID: ${result.product_id}`}
          glow={result.verdict === "Verified"}
          icon={
            <svg className="w-5 h-5 text-stark-cyan" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          }
        >
          {/* Main Verdict Display */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-xl bg-bg-main border border-stark-border mb-5 shadow-sm">
            <div>
              <p className="text-[10px] font-mono text-text-secondary mb-1">DECISION CLASSIFICATION</p>
              <VerdictBadge verdict={result.verdict} size="lg" />
            </div>
            <div className="text-left sm:text-right">
              <p className="text-[10px] font-mono text-text-secondary">REASON</p>
              <p className="text-xs font-medium text-text-primary mt-0.5">{result.reason}</p>
            </div>
          </div>

          {/* Telemetry Breakdown Table */}
          <div className="overflow-x-auto mb-5">
            <table className="w-full text-xs">
              <tbody>
                <SignalRow
                  label="Layer 1: Smart Contract Record"
                  value={result.chain_result}
                  ok={result.on_chain}
                />
                <SignalRow
                  label="Physical Asset Registered"
                  value={result.on_chain ? "Yes (On-Chain)" : "No"}
                  ok={result.on_chain}
                />
                <SignalRow
                  label="Product Lifecycle Status"
                  value={result.sold ? "Sold" : "Available / Unsold"}
                  ok={!result.sold}
                />
                <SignalRow
                  label="Layer 1: Cryptographic Token"
                  value={result.identity_result}
                  ok={result.identity_result === "valid"}
                />
                {result.image_result && (
                  <>
                    <SignalRow
                      label="Layer 2: Visual Physical Match"
                      value={
                        result.image_result === "genuine"
                          ? "Genuine Packaging"
                          : result.image_result === "counterfeit"
                          ? "Counterfeit / Brand Spoofing"
                          : result.image_result === "uncertain"
                          ? "Suspicious Lookalike / Ambiguous"
                          : "No Image Provided"
                      }
                      ok={result.image_result === "genuine"}
                    />
                    {result.image_reason && (
                      <SignalRow
                        label="Packaging & Label Audit Detail"
                        value={result.image_reason}
                        ok={result.image_result === "genuine"}
                      />
                    )}
                    {result.image_similarity !== undefined && result.image_similarity !== null && (
                      <SignalRow
                        label="Visual Cosine Similarity"
                        value={`${(result.image_similarity * 100).toFixed(1)}% (Genuine Threshold: 72%)`}
                        ok={result.image_similarity >= 0.72}
                        mono={true}
                      />
                    )}
                  </>
                )}
                <SignalRow
                  label="Layer 3: ML Anomaly Score"
                  value={result.risk_score !== null ? result.risk_score.toFixed(3) : "—"}
                  ok={result.risk_score === null || result.risk_score < 0.23}
                />
                <SignalRow
                  label="On-Chain Audit Tx (logScan)"
                  value={result.chain_tx ? `${result.chain_tx.slice(0, 20)}...` : "—"}
                  mono={true}
                />
              </tbody>
            </table>
          </div>

          {/* Consumer Action: Mark Sold */}
          <div className="pt-4 border-t border-stark-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-bg-main p-4 rounded-xl border border-stark-border shadow-sm">
            <div>
              <h4 className="text-xs font-semibold text-text-heading uppercase tracking-wide flex items-center gap-1.5">
                <span>🛒</span> Consumer Point-of-Sale Action
              </h4>
              <p className="text-xs text-text-secondary mt-0.5">
                {result.sold
                  ? "This physical asset is already marked as SOLD on-chain."
                  : "Simulate purchase: execute the on-chain markSold() transition."}
              </p>
            </div>

            {!result.sold && result.verdict === "Verified" ? (
              <button
                type="button"
                onClick={async () => {
                  const pid = result.product_id || productId;
                  if (!pid) return;
                  setMarkingSold(true);
                  setSoldMsg(null);
                  try {
                    const res = await sellProduct(pid);
                    setResult({ ...result, sold: true });
                    setSoldMsg(`Marked SOLD! Tx: ${res.tx_hash.slice(0, 16)}...`);
                  } catch (err: any) {
                    setSoldMsg(`Error: ${err?.message || err}`);
                  } finally {
                    setMarkingSold(false);
                  }
                }}
                disabled={markingSold}
                className="px-4 py-2 bg-gradient-to-r from-stark-emerald to-emerald-600 hover:opacity-95 text-white font-semibold text-xs rounded-xl shadow-md whitespace-nowrap transition disabled:opacity-50"
              >
                {markingSold ? "Submitting On-Chain..." : "🏷️ Mark as Sold"}
              </button>
            ) : !result.sold ? (
              <span className="text-xs font-mono font-bold text-stark-amber bg-stark-amber/10 px-3 py-1.5 rounded-lg border border-stark-amber/30">
                Sale Blocked (Item Not Verified)
              </span>
            ) : (
              <span className="text-xs font-mono font-bold text-stark-amber bg-stark-amber/10 px-3 py-1.5 rounded-lg border border-stark-amber/30">
                Already Sold
              </span>
            )}
          </div>

          {soldMsg && (
            <p className="text-xs font-mono font-medium text-stark-emerald mt-3">{soldMsg}</p>
          )}
        </Card>
      )}

      {/* ── Standalone Mark Sold by ID Card ── */}
      <Card
        title="Direct Retailer / Point-of-Sale Action"
        subtitle="Mark any registered product ID as sold on the Ethereum blockchain"
        icon={
          <svg className="w-5 h-5 text-stark-cyan" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
          </svg>
        }
      >
        <p className="text-xs text-text-secondary mb-3">
          Executes the on-chain <code className="text-stark-cyan font-semibold">markSold()</code> transaction via the backend operator. Subsequent scans in new locations will be audited as potential duplicate or stolen units.
        </p>
        <div className="flex flex-col sm:flex-row gap-2.5">
          <input
            type="text"
            className="flex-1 rounded-lg bg-bg-input border border-stark-border px-3.5 py-2 text-xs font-mono text-text-primary placeholder-text-muted focus:outline-none focus:border-stark-cyan focus:ring-1 focus:ring-stark-cyan shadow-sm transition-colors"
            placeholder="0x... or PRD-... Product ID"
            value={manualSoldId}
            onChange={(e) => setManualSoldId(e.target.value.trim())}
          />
          <button
            type="button"
            onClick={async () => {
              if (!manualSoldId) return;
              setMarkingSold(true);
              setSoldMsg(null);
              try {
                const res = await sellProduct(manualSoldId);
                setSoldMsg(`Success! Product marked as SOLD on-chain (Tx: ${res.tx_hash.slice(0, 16)}...)`);
              } catch (err: any) {
                setSoldMsg(`Error: ${err?.message || err}`);
              } finally {
                setMarkingSold(false);
              }
            }}
            disabled={markingSold || !manualSoldId}
            className="px-4 py-2 bg-gradient-to-r from-stark-emerald to-emerald-600 hover:opacity-95 text-white font-semibold text-xs rounded-xl shadow-md whitespace-nowrap transition disabled:opacity-50"
          >
            {markingSold ? "Broadcasting Tx..." : "🏷️ Mark as Sold"}
          </button>
        </div>
      </Card>
    </div>
  );
}
