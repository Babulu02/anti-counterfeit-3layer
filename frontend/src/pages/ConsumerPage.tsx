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
          // Successfully scanned QR code
          await stopCameraScan();
          handleQrScanned(decodedText);
        },
        () => {
          // Frame error (normal during scanning)
        }
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
      } catch {
        // Ignored
      }
    }
    setScanning(false);
  }

  async function handleQrScanned(scannedString: string) {
    setQrPayload(scannedString);

    // Parse product ID from QR URL or plain string
    let parsedPid = scannedString.trim();
    try {
      if (scannedString.includes("pid=")) {
        const url = new URL(scannedString);
        parsedPid = url.searchParams.get("pid") || parsedPid;
      }
    } catch {
      // Keep parsedPid as is
    }

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
      // 1. Fire scan verification
      const res = await postScan({
        product_id: pid,
        channel: "qr",
        qr_payload: rawQr || `https://verify.example.com/v?pid=${pid}`,
      });
      setScanResult(res);

      // 2. Fetch supplementary product metadata (name, brand, image)
      try {
        const prod = await getProduct(pid);
        setProductDetails(prod);
      } catch {
        // Product might be unregistered or DB unreachable
      }
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
      <div className="relative rounded-2xl bg-gradient-to-r from-[#0D1520] via-[#111C29] to-[#0D1520] border border-[#26384B] p-6 sm:p-8 overflow-hidden shadow-card-glow">
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#00BFFF]/5 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#00BFFF]/10 border border-[#00BFFF]/30 text-[#00BFFF] text-xs font-mono mb-3">
              <span className="h-1.5 w-1.5 rounded-full bg-[#00BFFF] animate-pulse" />
              CONSUMER PORTAL // ETHEREUM LEDGER
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#F1F6FC] tracking-tight">
              Shop with Confidence.
            </h1>
            <p className="text-sm text-[#9BAFC5] mt-2 max-w-xl leading-relaxed">
              Verify genuine origin in seconds. Our multi-layer protocol audits the physical
              cryptographic token against an immutable Ethereum smart contract and spatio-temporal AI.
            </p>
          </div>

          <div className="flex items-center gap-4 shrink-0 sm:flex-col">
            <div className="p-3 rounded-xl bg-[#172536] border border-[#26384B] flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#10B981]/10 border border-[#10B981]/30 flex items-center justify-center text-[#10B981] font-bold text-lg">
                ✓
              </div>
              <div>
                <p className="text-xs text-[#9BAFC5] font-mono">CHAIN ID</p>
                <p className="text-sm font-semibold text-[#F1F6FC]">1337 Verified</p>
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
          <svg className="w-5 h-5 text-[#00BFFF]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
          </svg>
        }
      >
        {/* Mode Selector Tabs */}
        <div className="flex border-b border-[#26384B] mb-5">
          <button
            onClick={() => {
              setActiveTab("camera");
              stopCameraScan();
            }}
            className={`flex items-center gap-2 pb-3 px-4 text-xs font-semibold tracking-wide transition-all border-b-2 ${
              activeTab === "camera"
                ? "border-[#00BFFF] text-[#00BFFF]"
                : "border-transparent text-[#9BAFC5] hover:text-[#F1F6FC]"
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
                ? "border-[#00BFFF] text-[#00BFFF]"
                : "border-transparent text-[#9BAFC5] hover:text-[#F1F6FC]"
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
            <div className="relative rounded-xl border border-[#26384B] bg-[#080D14] overflow-hidden min-h-[280px] flex flex-col items-center justify-center p-4">
              <div id={divId} className="w-full max-w-sm rounded-lg overflow-hidden" />

              {!scanning && (
                <div className="text-center py-8 px-4 space-y-4">
                  <div className="w-16 h-16 rounded-2xl bg-[#00BFFF]/10 border border-[#00BFFF]/30 flex items-center justify-center text-[#00BFFF] mx-auto shadow-stark-sm">
                    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-[#F1F6FC]">Ready to scan packaging</h4>
                    <p className="text-xs text-[#9BAFC5] mt-1 max-w-xs mx-auto">
                      Center the packaging QR code within your phone camera viewport.
                    </p>
                  </div>
                  <button
                    onClick={startCameraScan}
                    className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#00BFFF] to-[#168BFF] text-white text-xs font-bold tracking-wide shadow-stark-glow hover:opacity-95 transition-all"
                  >
                    🚀 Activate Camera Scanner
                  </button>
                </div>
              )}

              {scanning && (
                <div className="w-full flex justify-between items-center mt-3 pt-2 border-t border-[#26384B]">
                  <span className="text-xs font-mono text-[#00BFFF] flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#00BFFF] animate-ping" />
                    SCANNER ACTIVE
                  </span>
                  <button
                    onClick={stopCameraScan}
                    className="text-xs text-[#EF4444] hover:underline font-medium"
                  >
                    Stop Camera
                  </button>
                </div>
              )}
            </div>

            {cameraError && (
              <div className="p-3.5 rounded-lg bg-[#EF4444]/10 border border-[#EF4444]/30 text-[#EF4444] text-xs leading-relaxed flex items-start gap-2.5">
                <span className="text-sm">⚠</span>
                <div>
                  <p className="font-semibold">Camera Access Warning</p>
                  <p className="text-[#9BAFC5] mt-0.5">{cameraError}</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Manual Input Form */}
        {activeTab === "manual" && (
          <form onSubmit={handleManualSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-[#9BAFC5] mb-1.5">
                Product ID or Scan QR Payload (bytes32 hex)
              </label>
              <input
                type="text"
                value={productId}
                onChange={(e) => setProductId(e.target.value.trim())}
                placeholder="0x... or https://verify.example.com/v?pid=0x..."
                className="w-full rounded-lg bg-[#080D14] border border-[#26384B] px-3.5 py-2.5 text-xs text-[#F1F6FC] font-mono focus:outline-none focus:border-[#00BFFF] focus:ring-1 focus:ring-[#00BFFF]"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[#00BFFF] to-[#168BFF] text-white text-xs font-bold tracking-wide shadow-stark-glow hover:opacity-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? "Auditing Blockchain & Cryptography..." : "Verify Product Authenticity"}
            </button>
          </form>
        )}

        {error && (
          <div className="mt-4 p-3.5 rounded-lg bg-[#EF4444]/10 border border-[#EF4444]/30 text-[#EF4444] text-xs">
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
            <svg className="w-5 h-5 text-[#00BFFF]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          }
        >
          {/* Header Status & Explanation */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-xl bg-[#080D14] border border-[#26384B] mb-5">
            <div>
              <p className="text-xs text-[#9BAFC5] font-mono mb-1">DETERMINISTIC VERDICT</p>
              <VerdictBadge verdict={scanResult.verdict} size="lg" />
            </div>
            <div className="text-left sm:text-right">
              <p className="text-xs text-[#9BAFC5] font-mono">ON-CHAIN STATUS</p>
              <span
                className={`inline-block font-mono text-xs font-bold mt-1 ${
                  scanResult.on_chain ? "text-[#10B981]" : "text-[#EF4444]"
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
                ? "bg-[#10B981]/10 border-[#10B981]/30 text-[#10B981]"
                : scanResult.verdict === "Manual review"
                ? "bg-[#F59E0B]/10 border-[#F59E0B]/30 text-[#F59E0B]"
                : scanResult.verdict === "Suspicious activity"
                ? "bg-[#EF4444]/10 border-[#EF4444]/30 text-[#EF4444]"
                : "bg-[#26384B]/30 border-[#26384B] text-[#9BAFC5]"
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
                <p className="mt-1 text-[#F1F6FC]/90">
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
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 rounded-xl bg-[#0D1520] border border-[#26384B] mb-5 text-xs">
              <div>
                <span className="text-[#9BAFC5] block">Product Name</span>
                <span className="font-semibold text-[#F1F6FC] text-sm mt-0.5 block">
                  {productDetails.name}
                </span>
              </div>
              <div>
                <span className="text-[#9BAFC5] block">Brand</span>
                <span className="font-semibold text-[#F1F6FC] text-sm mt-0.5 block">
                  {productDetails.brand}
                </span>
              </div>
              <div>
                <span className="text-[#9BAFC5] block">Serial Number</span>
                <span className="font-mono text-[#00BFFF] mt-0.5 block">
                  {productDetails.serial}
                </span>
              </div>
            </div>
          )}

          {/* Telemetry Details */}
          <div className="overflow-x-auto mb-5">
            <table className="w-full text-xs">
              <tbody>
                <tr className="border-b border-[#26384B]/40">
                  <td className="py-2 text-[#9BAFC5]">Cryptographic Identity</td>
                  <td className="py-2 text-right font-mono text-[#F1F6FC]">
                    {scanResult.identity_result}
                  </td>
                </tr>
                <tr className="border-b border-[#26384B]/40">
                  <td className="py-2 text-[#9BAFC5]">Blockchain Proof (logScan)</td>
                  <td className="py-2 text-right font-mono text-[#00BFFF] truncate max-w-xs">
                    {scanResult.chain_tx || "Audited"}
                  </td>
                </tr>
                <tr className="border-b border-[#26384B]/40">
                  <td className="py-2 text-[#9BAFC5]">Sale Lifecycle Status</td>
                  <td className="py-2 text-right font-semibold">
                    {scanResult.sold ? (
                      <span className="text-[#F59E0B]">Marked as SOLD</span>
                    ) : (
                      <span className="text-[#10B981]">Unsold / Available</span>
                    )}
                  </td>
                </tr>
                {scanResult.risk_score !== null && (
                  <tr>
                    <td className="py-2 text-[#9BAFC5]">Behavioral Risk Index</td>
                    <td className="py-2 text-right font-mono text-[#F1F6FC]">
                      {scanResult.risk_score.toFixed(3)}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Consumer Action: Purchase Confirmation (Mark Sold) */}
          <div className="pt-4 border-t border-[#26384B] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-[#080D14] p-4 rounded-xl border">
            <div>
              <h4 className="text-xs font-semibold text-[#F1F6FC] uppercase tracking-wide flex items-center gap-1.5">
                <span>🏷️</span> Point-of-Sale / Purchase Action
              </h4>
              <p className="text-xs text-[#9BAFC5] mt-0.5">
                {scanResult.sold
                  ? "This physical item has already been marked SOLD on the Ethereum blockchain."
                  : "Purchasing this item? Record the change of custody permanently on-chain."}
              </p>
            </div>

            {!scanResult.sold ? (
              <button
                type="button"
                onClick={handleMarkSold}
                disabled={selling}
                className="px-4 py-2 bg-gradient-to-r from-[#10B981] to-[#059669] hover:opacity-95 text-white font-semibold text-xs rounded-xl shadow-md whitespace-nowrap transition disabled:opacity-50"
              >
                {selling ? "Submitting On-Chain..." : "🛒 Confirm Purchase (Mark Sold)"}
              </button>
            ) : (
              <span className="text-xs font-mono font-bold text-[#F59E0B] bg-[#F59E0B]/10 px-3 py-1.5 rounded-lg border border-[#F59E0B]/30">
                Already Sold
              </span>
            )}
          </div>

          {soldMessage && (
            <p className="text-xs font-medium text-[#10B981] mt-3 font-mono">
              {soldMessage}
            </p>
          )}
        </Card>
      )}

      {/* ── Consumer Guidance & Trust Reference ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="p-4 rounded-xl bg-[#111C29] border border-[#26384B]">
          <h4 className="text-xs font-semibold text-[#00BFFF] uppercase tracking-wider mb-1 flex items-center gap-1.5">
            <span>🛡️</span> Layer 1: Cryptographic Identity
          </h4>
          <p className="text-xs text-[#9BAFC5] leading-relaxed">
            Every product is minted with an HMAC-SHA256 authenticated QR code or an NXP NTAG 424 DNA
            dynamic CMAC rolling counter, guaranteeing physical unclonability.
          </p>
        </div>
        <div className="p-4 rounded-xl bg-[#111C29] border border-[#26384B]">
          <h4 className="text-xs font-semibold text-[#00BFFF] uppercase tracking-wider mb-1 flex items-center gap-1.5">
            <span>⛓️</span> Layer 2 & 3: Smart Ledger & AI Fusion
          </h4>
          <p className="text-xs text-[#9BAFC5] leading-relaxed">
            Verdicts are fused with spatio-temporal telemetry (impossible travel, burst frequency)
            and anchored on-chain with zero plaintext personal data leakage.
          </p>
        </div>
      </div>
    </div>
  );
}
