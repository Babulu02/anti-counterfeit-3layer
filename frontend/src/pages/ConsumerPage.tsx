import { useState, useRef, useEffect } from "react";
import { Html5Qrcode } from "html5-qrcode";
import {
  postScan,
  getProduct,
  sellProduct,
  type ScanResponse,
  type ProductOut,
} from "../lib/api";
import VerdictBadge from "../components/VerdictBadge";
import Card from "../components/Card";

export default function ConsumerPage() {
  const [activeTab, setActiveTab] = useState<"camera" | "manual">("camera");
  const [productId, setProductId] = useState("");
  const [qrPayload, setQrPayload] = useState("");
  const [scanning, setScanning] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const [scanResult, setScanResult] = useState<ScanResponse | null>(null);
  const [productDetails, setProductDetails] = useState<ProductOut | null>(null);

  // Sold action state
  const [selling, setSelling] = useState(false);
  const [soldMessage, setSoldMessage] = useState<string | null>(null);

  const qrScannerRef = useRef<Html5Qrcode | null>(null);
  const divId = "consumer-qr-viewport";

  // Clean up scanner on unmount
  useEffect(() => {
    return () => {
      stopCameraScan();
    };
  }, []);

  async function startCameraScan() {
    setError(null);
    setCameraError(null);
    setScanning(true);

    try {
      if (!qrScannerRef.current) {
        qrScannerRef.current = new Html5Qrcode(divId);
      }

      await qrScannerRef.current.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 240, height: 240 },
          aspectRatio: 1.0,
        },
        async (decodedText) => {
          await stopCameraScan();
          handleQrScanned(decodedText);
        },
        () => {}
      );
    } catch (err: any) {
      setScanning(false);
      setCameraError(
        err?.message?.includes("Permission") || err?.name === "NotAllowedError"
          ? "Camera permission denied. Please allow camera access in your browser settings or enter the code manually."
          : `Camera initialization error: ${err?.message || err}. You can switch to manual entry below.`
      );
    }
  }

  async function stopCameraScan() {
    if (qrScannerRef.current && qrScannerRef.current.isScanning) {
      try {
        await qrScannerRef.current.stop();
      } catch {}
    }
    setScanning(false);
  }

  async function handleQrScanned(scannedString: string) {
    setQrPayload(scannedString);

    let parsedPid = scannedString.trim();
    try {
      if (scannedString.includes("pid=")) {
        const url = new URL(scannedString);
        parsedPid = url.searchParams.get("pid") || parsedPid;
      }
    } catch {}

    setProductId(parsedPid);
    await executeVerification(parsedPid, scannedString);
  }

  async function handleManualSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!productId.trim()) {
      setError("Please enter a valid Product ID or scan URL.");
      return;
    }
    await executeVerification(productId.trim(), qrPayload.trim() || undefined);
  }

  async function executeVerification(pid: string, rawQr?: string) {
    setError(null);
    setScanResult(null);
    setProductDetails(null);
    setSoldMessage(null);
    setLoading(true);

    try {
      const res = await postScan({
        product_id: pid,
        channel: "qr",
        qr_payload: rawQr || `https://verify.example.com/v?pid=${pid}`,
      });
      setScanResult(res);

      try {
        const prod = await getProduct(pid);
        setProductDetails(prod);
      } catch {}
    } catch (err: any) {
      setError(err?.message || "Verification request failed. Please check network connectivity.");
    } finally {
      setLoading(false);
    }
  }

  async function handleMarkSold() {
    if (!scanResult?.product_id) return;
    setSelling(true);
    setSoldMessage(null);
    try {
      const res = await sellProduct(scanResult.product_id);
      setScanResult((prev) => (prev ? { ...prev, sold: true } : null));
      setSoldMessage(`Purchase confirmed! On-chain Tx: ${res.tx_hash.slice(0, 16)}...`);
    } catch (err: any) {
      setSoldMessage(`Transaction error: ${err?.message || err}`);
    } finally {
      setSelling(false);
    }
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      {/* ── Consumer Hero Banner ── */}
      <div className="relative rounded-2xl bg-gradient-to-r from-bg-secondary via-bg-card to-bg-secondary border border-stark-border p-6 sm:p-8 overflow-hidden shadow-card-glow transition-all">
        <div className="absolute top-0 right-0 w-96 h-96 bg-stark-cyan/5 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-stark-cyan/10 border border-stark-cyan/30 text-stark-cyan text-xs font-mono mb-3">
              <span className="h-1.5 w-1.5 rounded-full bg-stark-cyan animate-pulse" />
              CONSUMER PORTAL // ETHEREUM LEDGER
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-text-heading tracking-tight">
              Shop with Confidence.
            </h1>
            <p className="text-sm text-text-secondary mt-2 max-w-xl leading-relaxed">
              Verify genuine origin in seconds. Our multi-layer protocol audits the physical
              cryptographic token against an immutable Ethereum smart contract and spatio-temporal AI.
            </p>
          </div>

          <div className="flex items-center gap-4 shrink-0 sm:flex-col">
            <div className="p-3 rounded-xl bg-bg-elevated border border-stark-border flex items-center gap-3 shadow-sm">
              <div className="w-10 h-10 rounded-lg bg-stark-emerald/10 border border-stark-emerald/30 flex items-center justify-center text-stark-emerald font-bold text-lg">
                ✓
              </div>
              <div>
                <p className="text-xs text-text-secondary font-mono">CHAIN ID</p>
                <p className="text-sm font-semibold text-text-primary">1337 Verified</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Verification Scanner Interface ── */}
      <Card
        title="Instant Product Verification"
        subtitle="Point your device camera at the anti-counterfeit QR code or enter code manually"
        icon={
          <svg className="w-5 h-5 text-stark-cyan" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
          </svg>
        }
      >
        {/* Mode Selector Tabs */}
        <div className="flex border-b border-stark-border mb-5">
          <button
            onClick={() => {
              setActiveTab("camera");
              stopCameraScan();
            }}
            className={`flex items-center gap-2 pb-3 px-4 text-xs font-semibold tracking-wide transition-all border-b-2 ${
              activeTab === "camera"
                ? "border-stark-cyan text-stark-cyan"
                : "border-transparent text-text-secondary hover:text-text-primary"
            }`}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Camera Scanner
          </button>
          <button
            onClick={() => {
              setActiveTab("manual");
              stopCameraScan();
            }}
            className={`flex items-center gap-2 pb-3 px-4 text-xs font-semibold tracking-wide transition-all border-b-2 ${
              activeTab === "manual"
                ? "border-stark-cyan text-stark-cyan"
                : "border-transparent text-text-secondary hover:text-text-primary"
            }`}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            Manual Entry
          </button>
        </div>

        {/* Camera Viewport */}
        {activeTab === "camera" && (
          <div className="space-y-4">
            <div className="relative rounded-xl border border-stark-border bg-bg-main overflow-hidden min-h-[280px] flex flex-col items-center justify-center p-4 shadow-sm">
              <div id={divId} className="w-full max-w-sm rounded-lg overflow-hidden" />

              {!scanning && (
                <div className="text-center py-8 px-4 space-y-4">
                  <div className="w-16 h-16 rounded-2xl bg-stark-cyan/10 border border-stark-cyan/30 flex items-center justify-center text-stark-cyan mx-auto shadow-stark-sm">
                    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-text-heading">Ready to scan packaging</h4>
                    <p className="text-xs text-text-secondary mt-1 max-w-xs mx-auto">
                      Center the packaging QR code within your phone camera viewport.
                    </p>
                  </div>
                  <button
                    onClick={startCameraScan}
                    className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-stark-cyan to-stark-blue text-white text-xs font-bold tracking-wide shadow-stark-glow hover:opacity-95 transition-all"
                  >
                    🚀 Activate Camera Scanner
                  </button>
                </div>
              )}

              {scanning && (
                <div className="w-full flex justify-between items-center mt-3 pt-2 border-t border-stark-border">
                  <span className="text-xs font-mono text-stark-cyan flex items-center gap-1.5 font-semibold">
                    <span className="w-2 h-2 rounded-full bg-stark-cyan animate-ping" />
                    SCANNER ACTIVE
                  </span>
                  <button
                    onClick={stopCameraScan}
                    className="text-xs text-stark-red hover:underline font-medium"
                  >
                    Stop Camera
                  </button>
                </div>
              )}
            </div>

            {cameraError && (
              <div className="p-3.5 rounded-lg bg-stark-red/10 border border-stark-red/30 text-stark-red text-xs leading-relaxed flex items-start gap-2.5">
                <span className="text-sm">⚠</span>
                <div>
                  <p className="font-semibold">Camera Access Warning</p>
                  <p className="text-text-secondary mt-0.5">{cameraError}</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Manual Input Form */}
        {activeTab === "manual" && (
          <form onSubmit={handleManualSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1.5">
                Product ID or Scan QR Payload (bytes32 hex or Short Code)
              </label>
              <input
                type="text"
                value={productId}
                onChange={(e) => setProductId(e.target.value.trim())}
                placeholder="PRD-... or 0x... or https://verify.example.com/v?pid=..."
                className="w-full rounded-lg bg-bg-input border border-stark-border px-3.5 py-2.5 text-xs text-text-primary placeholder-text-muted font-mono focus:outline-none focus:border-stark-cyan focus:ring-1 focus:ring-stark-cyan shadow-sm transition-colors"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-stark-cyan to-stark-blue text-white text-xs font-bold tracking-wide shadow-stark-glow hover:opacity-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? "Auditing Blockchain & Cryptography..." : "Verify Product Authenticity"}
            </button>
          </form>
        )}

        {error && (
          <div className="mt-4 p-3.5 rounded-lg bg-stark-red/10 border border-stark-red/30 text-stark-red text-xs">
            {error}
          </div>
        )}
      </Card>

      {/* ── Verification Result Panel ── */}
      {scanResult && (
        <Card
          title="Authenticity Audit Report"
          subtitle={`Product ID: ${scanResult.product_id}`}
          glow={scanResult.verdict === "Verified"}
          icon={
            <svg className="w-5 h-5 text-stark-cyan" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          }
        >
          {/* Header Status & Explanation */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-xl bg-bg-main border border-stark-border mb-5 shadow-sm">
            <div>
              <p className="text-xs text-text-secondary font-mono mb-1">DETERMINISTIC VERDICT</p>
              <VerdictBadge verdict={scanResult.verdict} size="lg" />
            </div>
            <div className="text-left sm:text-right">
              <p className="text-xs text-text-secondary font-mono">ON-CHAIN STATUS</p>
              <span
                className={`inline-block font-mono text-xs font-bold mt-1 ${
                  scanResult.on_chain ? "text-stark-emerald" : "text-stark-red"
                }`}
              >
                {scanResult.on_chain ? "● REGISTERED ON-CHAIN" : "✕ NOT FOUND ON LEDGER"}
              </span>
            </div>
          </div>

          {/* Explanation based on verdict */}
          <div
            className={`p-4 rounded-xl border text-xs leading-relaxed mb-5 ${
              scanResult.verdict === "Verified"
                ? "bg-stark-emerald/10 border-stark-emerald/30 text-stark-emerald"
                : scanResult.verdict === "Manual review"
                ? "bg-stark-amber/10 border-stark-amber/30 text-stark-amber"
                : scanResult.verdict === "Suspicious activity"
                ? "bg-stark-red/10 border-stark-red/30 text-stark-red"
                : "bg-bg-elevated border-stark-border text-text-secondary"
            }`}
          >
            <div className="flex items-start gap-2.5">
              <span className="text-base font-bold">
                {scanResult.verdict === "Verified"
                  ? "✓"
                  : scanResult.verdict === "Manual review"
                  ? "⚠"
                  : scanResult.verdict === "Suspicious activity"
                  ? "✕"
                  : "?"}
              </span>
              <div>
                <p className="font-semibold text-sm">
                  {scanResult.verdict === "Verified" && "Authentic Product Confirmed"}
                  {scanResult.verdict === "Manual review" && "Attention: Disputed or Resale State"}
                  {scanResult.verdict === "Suspicious activity" && "High Counterfeit Risk Detected"}
                  {scanResult.verdict === "Unregistered product" && "Unregistered Packaging Identifier"}
                </p>
                <p className="mt-1 text-text-primary/90">
                  {scanResult.reason || "Audited against smart contract state and cryptographic signature."}
                </p>
                {scanResult.verdict !== "Verified" && (
                  <p className="mt-2 font-medium text-xs opacity-90 border-t border-current/20 pt-2">
                    ⚠ Recommendation: Do not accept or purchase this item without physical verification from an authorized retailer.
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Product Details (If available in DB) */}
          {productDetails && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 rounded-xl bg-bg-elevated border border-stark-border mb-5 text-xs shadow-sm">
              <div>
                <span className="text-text-secondary block">Product Name</span>
                <span className="font-semibold text-text-heading text-sm mt-0.5 block">
                  {productDetails.name}
                </span>
              </div>
              <div>
                <span className="text-text-secondary block">Brand</span>
                <span className="font-semibold text-text-heading text-sm mt-0.5 block">
                  {productDetails.brand}
                </span>
              </div>
              <div>
                <span className="text-text-secondary block">Serial Number</span>
                <span className="font-mono text-stark-cyan mt-0.5 block font-semibold">
                  {productDetails.serial}
                </span>
              </div>
            </div>
          )}

          {/* Telemetry Details */}
          <div className="overflow-x-auto mb-5">
            <table className="w-full text-xs">
              <tbody>
                <tr className="border-b border-stark-border/50">
                  <td className="py-2 text-text-secondary">Cryptographic Identity</td>
                  <td className="py-2 text-right font-mono text-text-primary font-semibold">
                    {scanResult.identity_result}
                  </td>
                </tr>
                <tr className="border-b border-stark-border/50">
                  <td className="py-2 text-text-secondary">Blockchain Proof (logScan)</td>
                  <td className="py-2 text-right font-mono text-stark-cyan truncate max-w-xs font-semibold">
                    {scanResult.chain_tx || "Audited"}
                  </td>
                </tr>
                <tr className="border-b border-stark-border/50">
                  <td className="py-2 text-text-secondary">Sale Lifecycle Status</td>
                  <td className="py-2 text-right font-semibold">
                    {scanResult.sold ? (
                      <span className="text-stark-amber">Marked as SOLD</span>
                    ) : (
                      <span className="text-stark-emerald">Unsold / Available</span>
                    )}
                  </td>
                </tr>
                {scanResult.risk_score !== null && (
                  <tr>
                    <td className="py-2 text-text-secondary">Behavioral Risk Index</td>
                    <td className="py-2 text-right font-mono text-text-primary font-semibold">
                      {scanResult.risk_score.toFixed(3)}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Retail Purchase Protection Action */}
          <div className="p-4 rounded-xl bg-bg-main border border-stark-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
            <div>
              <h4 className="text-xs font-semibold text-text-heading flex items-center gap-1.5">
                <span>🛒</span> Customer Purchase Protection
              </h4>
              <p className="text-xs text-text-secondary mt-0.5">
                Buying this item right now? Mark it as sold to anchor your ownership on the blockchain.
              </p>
            </div>

            {!scanResult.sold ? (
              <button
                onClick={handleMarkSold}
                disabled={selling}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-stark-emerald to-emerald-600 hover:opacity-95 text-white font-semibold text-xs tracking-wide shadow-md transition disabled:opacity-50 whitespace-nowrap"
              >
                {selling ? "Confirming On-Chain..." : "🏷️ Confirm Purchase (Mark Sold)"}
              </button>
            ) : (
              <span className="text-xs font-mono font-bold text-stark-amber bg-stark-amber/10 px-3 py-1.5 rounded-lg border border-stark-amber/30">
                Item Already Marked Sold
              </span>
            )}
          </div>

          {soldMessage && (
            <p className="text-xs font-mono font-medium text-stark-emerald mt-3">{soldMessage}</p>
          )}
        </Card>
      )}
    </div>
  );
}
