import React, { useState, useRef, useEffect } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { Link, useNavigate } from "react-router-dom";
import { postScan, sellProduct, getProduct, type ScanResponse, type ProductOut } from "../../lib/api";
import VerdictBadge from "../../components/VerdictBadge";
import SignalRow from "../../components/SignalRow";
import Card from "../../components/Card";

export default function ConsumerVerifyPage() {
  const navigate = useNavigate();
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

  // Image signal (MobileNetV2 + OCR)
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  // Verification state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [result, setResult] = useState<ScanResponse | null>(null);
  const [productMeta, setProductMeta] = useState<ProductOut | null>(null);
  const [scanning, setScanning] = useState(false);

  // Sold state
  const [markingSold, setMarkingSold] = useState(false);
  const [soldMsg, setSoldMsg] = useState<string | null>(null);

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
        () => {
          setUseLocation(false);
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
    setImageFile(file);
    const url = URL.createObjectURL(file);
    setImagePreview(url);

    const reader = new FileReader();
    reader.onload = () => {
      const b64 = (reader.result as string).split(",")[1];
      setImageBase64(b64);
    };
    reader.readAsDataURL(file);
  }

  function removeImage() {
    setImageFile(null);
    setImagePreview(null);
    setImageBase64(null);
    if (imageInputRef.current) imageInputRef.current.value = "";
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    if (!productId.trim()) {
      setError("Please enter a Product ID or scan a dynamic QR code.");
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);
    setProductMeta(null);
    setSoldMsg(null);

    try {
      const payload: any = {
        product_id: productId.trim(),
        channel,
        lat: useLocation ? lat : undefined,
        lon: useLocation ? lon : undefined,
        timestamp: new Date().toISOString(),
      };

      if (channel === "qr") {
        payload.qr_payload =
          qrPayload.trim() ||
          `https://verify.aether.network/v?pid=${productId.trim()}&ser=001&sig=demo`;
      } else {
        payload.nfc_uid = nfcUid.trim() || "04A2F8B9C10280";
        payload.nfc_counter = nfcCounter;
        payload.nfc_cmac = nfcCmac.trim() || "A9F84B210DE35C18";
      }

      if (imageBase64) {
        payload.image_bytes = imageBase64;
      }

      const res = await postScan(payload);
      setResult(res);

      // Attempt to load human metadata
      try {
        const meta = await getProduct(res.product_id);
        setProductMeta(meta);
      } catch {}

      // Save to consumer history in localStorage
      try {
        const existing = JSON.parse(localStorage.getItem("aether_consumer_history") || "[]");
        const entry = {
          id: `hist-${Date.now()}`,
          productId: res.product_id,
          channel,
          verdict: res.verdict,
          reason: res.reason,
          riskScore: res.risk_score,
          timestamp: new Date().toISOString(),
          imageResult: res.image_result,
        };
        localStorage.setItem("aether_consumer_history", JSON.stringify([entry, ...existing.slice(0, 49)]));
      } catch {}
    } catch (err: any) {
      setError(err?.message || String(err));
    } finally {
      setLoading(false);
    }
  }

  async function handleMarkSold() {
    if (!result) return;
    setMarkingSold(true);
    setSoldMsg(null);
    try {
      const res = await sellProduct(result.product_id);
      setSoldMsg(`Asset successfully marked sold on Ethereum blockchain! Tx: ${res.tx_hash.slice(0, 10)}...`);
      setResult({ ...result, sold: true });
    } catch (e: any) {
      setSoldMsg(`Error: ${e?.message || e}`);
    } finally {
      setMarkingSold(false);
    }
  }

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-12">
      {/* ── Page Header ── */}
      <div className="text-center max-w-2xl mx-auto space-y-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-stark-cyan/10 border border-stark-cyan/30 text-stark-cyan text-xs font-mono font-bold">
          MULTI-SIGNAL CRYPTOGRAPHIC VERIFIER
        </div>
        <h1 className="text-3xl font-extrabold text-text-heading tracking-tight">
          Verify Physical Product Authenticity
        </h1>
        <p className="text-xs text-text-secondary leading-relaxed">
          Scan the product packaging QR code or tap the NFC tag to trigger three-layer verification across blockchain, dynamic tokens, and visual AI.
        </p>
      </div>

      {/* ── Channel Selector Tabs ── */}
      <div className="flex justify-center">
        <div className="inline-flex p-1.5 rounded-2xl bg-bg-card border border-stark-border shadow-sm">
          <button
            type="button"
            onClick={() => setChannel("qr")}
            className={`flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-mono font-bold transition-all ${
              channel === "qr"
                ? "bg-stark-cyan text-white shadow-md"
                : "text-text-secondary hover:text-text-heading"
            }`}
          >
            <span>📷</span>
            <span>QR Code Scanner</span>
          </button>
          <button
            type="button"
            onClick={() => setChannel("nfc")}
            className={`flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-mono font-bold transition-all ${
              channel === "nfc"
                ? "bg-stark-cyan text-white shadow-md"
                : "text-text-secondary hover:text-text-heading"
            }`}
          >
            <span>📡</span>
            <span>NFC Tap Authentication</span>
          </button>
        </div>
      </div>

      {/* ── Verification Input Form ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 space-y-4">
          <Card title="Product Identification Data">
            <form onSubmit={handleVerify} className="space-y-4 text-xs font-mono">
              {/* QR Camera Stream */}
              {channel === "qr" && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-text-secondary">CAMERA STREAM SCANNER</span>
                    {!scanning ? (
                      <button
                        type="button"
                        onClick={startCamera}
                        className="px-3 py-1 rounded-lg bg-stark-cyan text-white text-xs font-bold hover:bg-stark-cyan/90 transition-all flex items-center gap-1.5 shadow-sm"
                      >
                        <span>📷</span>
                        <span>Start Camera</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={stopCamera}
                        className="px-3 py-1 rounded-lg bg-stark-red text-white text-xs font-bold hover:bg-stark-red/90 transition-all"
                      >
                        Stop Camera
                      </button>
                    )}
                  </div>

                  <div
                    id={divId}
                    className={`rounded-2xl border border-stark-border overflow-hidden bg-black/40 min-h-[160px] flex items-center justify-center text-text-muted ${
                      scanning ? "block" : "hidden"
                    }`}
                  />

                  {cameraError && (
                    <div className="p-3 rounded-xl bg-stark-red/10 border border-stark-red/30 text-stark-red text-xs">
                      {cameraError}
                    </div>
                  )}
                </div>
              )}

              {/* Product ID Input */}
              <div>
                <label className="block text-text-secondary mb-1">
                  Product ID (Short Alias or 32-Byte Hash) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. PRD-A49F2E or 0x4d3b..."
                  value={productId}
                  onChange={(e) => setProductId(e.target.value)}
                  className="w-full rounded-xl bg-bg-input border border-stark-border px-3.5 py-2.5 font-mono text-text-primary focus:outline-none focus:border-stark-cyan"
                />
              </div>

              {channel === "qr" && (
                <div>
                  <label className="block text-text-secondary mb-1">
                    Raw QR Payload Token (Signed HMAC URL)
                  </label>
                  <input
                    type="text"
                    placeholder="https://verify.aether.network/v?pid=...&sig=..."
                    value={qrPayload}
                    onChange={(e) => setQrPayload(e.target.value)}
                    className="w-full rounded-xl bg-bg-input border border-stark-border px-3.5 py-2 font-mono text-[11px] text-text-primary focus:outline-none focus:border-stark-cyan"
                  />
                </div>
              )}

              {/* NFC Inputs */}
              {channel === "nfc" && (
                <div className="space-y-3 p-3.5 rounded-xl bg-bg-main border border-stark-border">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-text-heading text-[11px]">NTAG 424 SUN Chip Tap Parameters</span>
                    <button
                      type="button"
                      onClick={() => {
                        setNfcUid("04A2F8B9C10280");
                        setNfcCounter((c) => c + 1);
                        setNfcCmac("A9F84B210DE35C18");
                      }}
                      className="text-[10px] text-stark-cyan hover:underline font-bold"
                    >
                      Fill Valid Tap Demo
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-text-secondary text-[10px] mb-1">7-Byte Tag UID</label>
                      <input
                        type="text"
                        value={nfcUid}
                        onChange={(e) => setNfcUid(e.target.value)}
                        placeholder="04A2F8B9C10280"
                        className="w-full rounded-lg bg-bg-input border border-stark-border px-3 py-1.5 text-xs font-mono text-text-primary"
                      />
                    </div>
                    <div>
                      <label className="block text-text-secondary text-[10px] mb-1">Rolling Counter</label>
                      <input
                        type="number"
                        value={nfcCounter}
                        onChange={(e) => setNfcCounter(Number(e.target.value))}
                        className="w-full rounded-lg bg-bg-input border border-stark-border px-3 py-1.5 text-xs font-mono text-text-primary"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-text-secondary text-[10px] mb-1">AES-128 CMAC Cryptogram</label>
                    <input
                      type="text"
                      value={nfcCmac}
                      onChange={(e) => setNfcCmac(e.target.value)}
                      placeholder="A9F84B210DE35C18"
                      className="w-full rounded-lg bg-bg-input border border-stark-border px-3 py-1.5 text-xs font-mono text-text-primary"
                    />
                  </div>
                </div>
              )}

              {/* Optional GPS Location */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-bg-main border border-stark-border">
                <div className="flex items-center gap-2">
                  <span>📍</span>
                  <div>
                    <span className="font-semibold text-text-heading text-xs block">Include Spatial Verification</span>
                    <span className="text-[10px] text-text-muted">Protects against impossible travel and clone-first anomalies</span>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={useLocation}
                  onChange={(e) => handleLocationToggle(e.target.checked)}
                  className="w-4 h-4 text-stark-cyan rounded border-stark-border focus:ring-stark-cyan"
                />
              </div>

              {/* Error Box */}
              {error && (
                <div className="p-3 rounded-xl bg-stark-red/10 border border-stark-red/30 text-stark-red text-xs">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 rounded-xl bg-stark-cyan text-white text-xs font-bold font-mono tracking-wide hover:bg-stark-cyan/90 transition-all shadow-md disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <span className="animate-spin">🔄</span>
                    <span>Executing Cryptographic Fusion Pipeline...</span>
                  </>
                ) : (
                  <>
                    <span>⚡</span>
                    <span>Run Verification Pipeline</span>
                  </>
                )}
              </button>
            </form>
          </Card>
        </div>

        {/* Packaging Image Upload */}
        <div className="lg:col-span-5 space-y-4">
          <Card title="Layer 3: Packaging Photograph">
            <div className="space-y-3 text-xs font-mono">
              <p className="text-text-secondary leading-relaxed text-[11px]">
                Upload a clear photo of the physical product packaging. MobileNetV2 extracts a 1280-d neural embedding while EasyOCR inspects typography for deceptive counterfeit lookalikes.
              </p>

              <div
                onClick={() => imageInputRef.current?.click()}
                className="cursor-pointer border-2 border-dashed border-stark-border hover:border-stark-cyan/60 rounded-2xl p-6 text-center bg-bg-main/50 transition-colors"
              >
                <input
                  ref={imageInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />

                {imagePreview ? (
                  <div className="space-y-2">
                    <img
                      src={imagePreview}
                      alt="Uploaded Query"
                      className="max-h-44 mx-auto rounded-lg object-contain border border-stark-border bg-black/10"
                    />
                    <p className="text-text-heading font-semibold text-xs">{imageFile?.name}</p>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeImage();
                      }}
                      className="text-[11px] text-stark-red hover:underline"
                    >
                      Remove Photo
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2 py-4">
                    <span className="text-3xl block">📸</span>
                    <p className="font-semibold text-text-heading">Click or drag packaging photo</p>
                    <p className="text-[10px] text-text-muted">
                      JPEG, PNG, WEBP (Analyzed locally & verified by MobileNetV2)
                    </p>
                  </div>
                )}
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* ── Real-Time Verification Result Display ── */}
      {result && (
        <Card title="Authenticity Verification Assessment">
          <div className="space-y-5">
            {/* Hero Verdict Banner */}
            <div
              className={`p-5 rounded-2xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
                result.verdict === "Verified"
                  ? "bg-stark-emerald/10 border-stark-emerald/30 text-stark-emerald"
                  : result.verdict === "Suspicious activity"
                  ? "bg-stark-red/10 border-stark-red/30 text-stark-red"
                  : result.verdict === "Manual review"
                  ? "bg-stark-amber/10 border-stark-amber/30 text-stark-amber"
                  : "bg-bg-elevated border-stark-border text-text-secondary"
              }`}
            >
              <div className="space-y-1">
                <span className="text-[10px] font-mono tracking-widest uppercase block opacity-80">
                  FINAL VERDICT // MULTI-SIGNAL FUSION
                </span>
                <div className="flex items-center gap-3">
                  <span className="text-3xl font-extrabold tracking-tight">{result.verdict}</span>
                  <VerdictBadge verdict={result.verdict} size="lg" />
                </div>
                <p className="text-xs text-text-primary mt-1 font-mono">{result.reason}</p>
              </div>

              {result.chain_tx && (
                <div className="shrink-0 text-left sm:text-right font-mono text-[11px]">
                  <span className="text-text-muted block text-[10px]">ON-CHAIN AUDIT LOGGED</span>
                  <span className="text-stark-cyan font-bold break-all">Tx: {result.chain_tx.slice(0, 12)}...</span>
                </div>
              )}
            </div>

            {/* Signal Row Breakdown */}
            <div className="space-y-2">
              <h4 className="text-xs font-mono font-bold text-text-secondary uppercase">
                Cryptographic Signal Diagnostics
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs font-mono">
                <div className="p-3 rounded-xl bg-bg-main border border-stark-border flex justify-between items-center">
                  <span className="text-text-secondary">EVM Blockchain Status:</span>
                  <span className={`font-bold ${result.on_chain ? "text-stark-emerald" : "text-stark-red"}`}>
                    {result.on_chain ? "✓ Enrolled on L1 Ledger" : "✗ Not Found On-Chain"}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-bg-main border border-stark-border flex justify-between items-center">
                  <span className="text-text-secondary">Token Identity Check:</span>
                  <span className={`font-bold ${result.identity_result === "valid" ? "text-stark-emerald" : "text-stark-red"}`}>
                    {result.identity_result === "valid" ? "✓ Valid Cryptogram" : `✗ ${result.identity_result}`}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-bg-main border border-stark-border flex flex-col justify-center">
                  <div className="flex justify-between items-center">
                    <span className="text-text-secondary">AI Visual Match (MobileNetV2):</span>
                    <span
                      className={`font-bold ${
                        result.image_result === "genuine"
                          ? "text-stark-emerald"
                          : result.image_result === "counterfeit"
                          ? "text-stark-red"
                          : result.image_result === "uncertain"
                          ? "text-stark-amber"
                          : "text-text-secondary"
                      }`}
                    >
                      {result.image_result
                        ? `${result.image_result.toUpperCase()} (${
                            result.image_similarity
                              ? (result.image_similarity * 100).toFixed(1) + "%"
                              : "Analyzed"
                          })`
                        : "No Image Provided"}
                    </span>
                  </div>
                  {result.image_reason && (
                    <p className="text-[10px] text-text-muted mt-1 truncate">
                      {result.image_reason}
                    </p>
                  )}
                </div>

                <div className="p-3 rounded-xl bg-bg-main border border-stark-border flex justify-between items-center">
                  <span className="text-text-secondary">Spatial / Attack Risk Score:</span>
                  <span className={`font-bold ${(result.risk_score || 0) > 0.4 ? "text-stark-red" : "text-stark-emerald"}`}>
                    {result.risk_score !== null ? result.risk_score.toFixed(3) : "0.000 (Low Risk)"}
                  </span>
                </div>
              </div>
            </div>

            {/* Post-Purchase Action */}
            <div className="pt-2 flex flex-wrap items-center justify-between gap-3 border-t border-stark-border">
              <div className="text-xs text-text-secondary font-mono">
                Lifecycle State: <strong className={result.sold ? "text-stark-amber" : "text-stark-emerald"}>{result.sold ? "SOLD (Purchased)" : "UNSOLD (Available for Sale)"}</strong>
              </div>

              <div className="flex gap-2 items-center">
                {result.verdict === "Verified" && !result.sold && (
                  <button
                    type="button"
                    disabled={markingSold}
                    onClick={handleMarkSold}
                    className="px-4 py-2 rounded-xl bg-stark-emerald text-white text-xs font-bold font-mono hover:opacity-95 transition-all shadow-sm disabled:opacity-50"
                  >
                    {markingSold ? "Broadcasting..." : "🛍️ Mark as Purchased (Sold on Chain)"}
                  </button>
                )}
                {result.verdict !== "Verified" && !result.sold && (
                  <span className="text-xs font-mono font-semibold text-stark-amber bg-stark-amber/10 border border-stark-amber/30 px-3 py-1.5 rounded-lg flex items-center gap-1.5">
                    <span>⚠️</span> Purchase Blocked (Unverified Asset)
                  </span>
                )}
                {result.verdict !== "Verified" && (
                  <Link
                    to={`/consumer/report?pid=${result.product_id}`}
                    className="px-4 py-2 rounded-xl bg-stark-red text-white text-xs font-bold font-mono hover:opacity-95 transition-all shadow-sm"
                  >
                    ⚠️ Report Counterfeit Item
                  </Link>
                )}
              </div>
            </div>

            {soldMsg && (
              <div className="p-3 rounded-xl bg-stark-emerald/10 border border-stark-emerald/30 text-stark-emerald text-xs font-mono font-semibold">
                {soldMsg}
              </div>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}

