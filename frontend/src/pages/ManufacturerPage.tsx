import { useState, useRef } from "react";
import QRCode from "qrcode";
import {
  connectMetaMask,
  ensureCorrectChain,
  isMetaMaskAvailable,
} from "../lib/metamask";
import { registerProduct, type ProductRegisterResponse } from "../lib/api";
import Card from "../components/Card";

export default function ManufacturerPage() {
  // MetaMask state
  const [account, setAccount] = useState<string | null>(null);
  const [chainOk, setChainOk] = useState(false);

  // Form fields
  const [name, setName] = useState("");
  const [brand, setBrand] = useState("");
  const [serial, setSerial] = useState("");
  const [mfrAddr, setMfrAddr] = useState("");
  const [mfrKey, setMfrKey] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ProductRegisterResponse | null>(null);
  const [qrData, setQrData] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleConnect() {
    setError(null);
    const addr = await connectMetaMask();
    if (!addr) {
      setError("MetaMask not detected or connection rejected.");
      return;
    }
    const ok = await ensureCorrectChain();
    setAccount(addr);
    setChainOk(ok);
    setMfrAddr(addr);
  }

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Please select a valid image file (PNG, JPG, WebP).");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("Image size exceeds 5MB limit.");
      return;
    }

    setPhoto(file);
    const reader = new FileReader();
    reader.onload = () => {
      setPhotoPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
    setError(null);
  }

  function removePhoto() {
    setPhoto(null);
    setPhotoPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setResult(null);
    setQrData(null);

    if (!name.trim() || !brand.trim() || !serial.trim() || !mfrAddr.trim() || !mfrKey.trim()) {
      setError("All fields (except product image) are mandatory for on-chain identity minting.");
      return;
    }

    setLoading(true);
    try {
      const form = new FormData();
      form.append("name", name.trim());
      form.append("brand", brand.trim());
      form.append("serial", serial.trim());
      form.append("manufacturer_address", mfrAddr.trim());
      form.append("manufacturer_key", mfrKey.trim());
      if (photo) form.append("image", photo);

      const res = await registerProduct(form);
      setResult(res);

      // Render QR code to canvas
      if (canvasRef.current) {
        await QRCode.toCanvas(canvasRef.current, res.qr_payload, {
          width: 200,
          margin: 1,
          color: {
            dark: "#080D14",
            light: "#FFFFFF",
          },
        });
        setQrData(canvasRef.current.toDataURL("image/png"));
      }
    } catch (err: any) {
      setError(String(err?.message || err));
    } finally {
      setLoading(false);
    }
  }

  function downloadQR() {
    if (!qrData) return;
    const a = document.createElement("a");
    a.href = qrData;
    a.download = `qr-${result?.product.serial ?? "product"}.png`;
    a.click();
  }

  function downloadNFC() {
    if (!result) return;
    const blob = new Blob([JSON.stringify(result.nfc_payload, null, 2)], {
      type: "application/json",
    });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `nfc-${result.product.serial}.json`;
    a.click();
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-stark-border pb-5">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded bg-stark-cyan/10 border border-stark-cyan/30 text-stark-cyan text-[11px] font-mono mb-2">
            STARK // MANUFACTURER SUITE
          </div>
          <h1 className="text-2xl font-bold text-text-heading tracking-tight">
            Manufacturer Portal
          </h1>
          <p className="text-xs text-text-secondary mt-1">
            Register new authentic physical assets on the Ethereum blockchain and issue dual-channel cryptographic credentials.
          </p>
        </div>

        {/* MetaMask Connection Quick Pill */}
        <div className="shrink-0">
          {isMetaMaskAvailable() ? (
            account ? (
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-bg-card border border-stark-border shadow-sm">
                <span
                  className={`w-2 h-2 rounded-full ${chainOk ? "bg-stark-emerald shadow-[0_0_8px_var(--success-border)]" : "bg-stark-red"
                    }`}
                />
                <div className="text-right">
                  <p className="text-[10px] font-mono text-text-secondary">CONNECTED WALLET</p>
                  <p className="font-mono text-xs text-text-primary">
                    {account.slice(0, 6)}...{account.slice(-4)}
                  </p>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleConnect}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-stark-cyan/10 to-stark-blue/20 hover:from-stark-cyan/20 hover:to-stark-blue/30 border border-stark-cyan/40 text-stark-cyan text-xs font-semibold tracking-wide transition-all shadow-sm flex items-center gap-2"
              >
                <span>🦊</span>
                <span>Connect MetaMask</span>
              </button>
            )
          ) : (
            <span className="text-xs font-mono text-text-muted px-3 py-1.5 rounded-lg bg-bg-card border border-stark-border">
              MetaMask Not Detected
            </span>
          )}
        </div>
      </div>

      {/* ── Registration Form Card ── */}
      <Card
        title="Register New Physical Asset"
        subtitle="Generates an on-chain recordHash and mints cryptographic QR + NFC credentials"
        icon={
          <svg className="w-5 h-5 text-stark-cyan" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        }
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1.5">
                Product Name <span className="text-stark-cyan">*</span>
              </label>
              <input
                className="w-full rounded-lg bg-bg-input border border-stark-border px-3.5 py-2 text-xs text-text-primary placeholder-text-muted focus:outline-none focus:border-stark-cyan focus:ring-1 focus:ring-stark-cyan shadow-sm transition-colors"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Enter Product Name"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1.5">
                Brand / Manufacturer <span className="text-stark-cyan">*</span>
              </label>
              <input
                className="w-full rounded-lg bg-bg-input border border-stark-border px-3.5 py-2 text-xs text-text-primary placeholder-text-muted focus:outline-none focus:border-stark-cyan focus:ring-1 focus:ring-stark-cyan shadow-sm transition-colors"
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                placeholder="e.g. Enter Brand/Manufacturer"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1.5">
                Serial Number <span className="text-stark-cyan">*</span>
              </label>
              <input
                className="w-full rounded-lg bg-bg-input border border-stark-border px-3.5 py-2 text-xs font-mono text-text-primary placeholder-text-muted focus:outline-none focus:border-stark-cyan focus:ring-1 focus:ring-stark-cyan shadow-sm transition-colors"
                value={serial}
                onChange={(e) => setSerial(e.target.value)}
                placeholder="e.g. Enter Serial Number"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1.5">
                Manufacturer Ethereum Address <span className="text-stark-cyan">*</span>
              </label>
              <input
                className="w-full rounded-lg bg-bg-input border border-stark-border px-3.5 py-2 text-xs font-mono text-text-primary placeholder-text-muted focus:outline-none focus:border-stark-cyan focus:ring-1 focus:ring-stark-cyan shadow-sm transition-colors"
                value={mfrAddr}
                onChange={(e) => setMfrAddr(e.target.value)}
                placeholder="e.g. Enter Manufacturer Ethereum Address"
              />
            </div>
          </div>

          {/* Private Key Input (Masked, with security disclosure) */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-medium text-text-secondary">
                Manufacturer Private Key (Signing Token) <span className="text-stark-red">*</span>
              </label>
              <span className="text-[10px] font-mono text-text-muted">
                TRANSIENT // NEVER STORED
              </span>
            </div>
            <input
              type="password"
              className="w-full rounded-lg bg-bg-input border border-stark-border px-3.5 py-2 text-xs font-mono text-stark-cyan focus:outline-none focus:border-stark-cyan focus:ring-1 focus:ring-stark-cyan shadow-sm transition-colors"
              value={mfrKey}
              onChange={(e) => setMfrKey(e.target.value)}
              placeholder="Enter Manufacturer Private Key"
              autoComplete="off"
            />
            <p className="text-[11px] text-text-muted mt-1">
              Used solely to sign the EVM <code className="text-text-secondary">registerProduct()</code> transaction on Ganache. Never stored, persisted, or logged.
            </p>
          </div>

          {/* Product Image Upload with Preview & Replace */}
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1.5">
              Product Reference Image (Optional — MobileNetV2 1280-d Feature Extraction)
            </label>
            {!photoPreview ? (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-stark-border hover:border-stark-cyan/60 rounded-xl p-6 text-center cursor-pointer bg-bg-main/60 hover:bg-bg-elevated/40 transition-all"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handlePhotoChange}
                />
                <div className="w-10 h-10 rounded-lg bg-bg-elevated border border-stark-border flex items-center justify-center text-stark-cyan mx-auto mb-2 shadow-sm">
                  📷
                </div>
                <p className="text-xs font-medium text-text-primary">
                  Click to select or drop product reference image
                </p>
                <p className="text-[10px] text-text-muted mt-1">
                  Supports PNG, JPG, WebP up to 5MB. SHA-256 fingerprint anchors on-chain.
                </p>
              </div>
            ) : (
              <div className="flex items-center gap-4 p-3 rounded-xl bg-bg-elevated border border-stark-border shadow-sm">
                <img
                  src={photoPreview}
                  alt="Product preview"
                  className="w-16 h-16 object-cover rounded-lg border border-stark-border"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-text-primary truncate">
                    {photo?.name}
                  </p>
                  <p className="text-[10px] font-mono text-text-secondary">
                    {((photo?.size || 0) / 1024).toFixed(1)} KB
                  </p>
                </div>
                <button
                  type="button"
                  onClick={removePhoto}
                  className="text-xs text-stark-red hover:text-stark-red/80 px-3 py-1.5 rounded-lg border border-stark-red/30 hover:bg-stark-red/10 transition-colors"
                >
                  Remove
                </button>
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
                <span>Broadcasting On-Chain Transaction...</span>
              </>
            ) : (
              <span>✨ Mint Cryptographic Identity On-Chain</span>
            )}
          </button>
        </form>
      </Card>

      {/* Hidden canvas for QR rendering */}
      <canvas ref={canvasRef} className="hidden" />

      {/* ── Registration Result Terminal ── */}
      {result && (
        <Card
          title="On-Chain Registration Receipt"
          subtitle="Physical item identity anchored to smart contract"
          glow={true}
          icon={
            <svg className="w-5 h-5 text-stark-emerald" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          }
        >
          <div className="p-3 rounded-lg bg-stark-emerald/10 border border-stark-emerald/30 text-stark-emerald text-xs font-semibold mb-4 flex items-center gap-2">
            <span>✓</span> Product successfully registered in ProductRegistry.sol contract!
          </div>

          <div className="overflow-x-auto mb-5">
            <table className="w-full text-xs">
              <tbody>
                <tr className="border-b border-stark-border/50 bg-stark-cyan/10">
                  <td className="py-2.5 px-2 text-stark-cyan font-semibold flex items-center gap-1.5">
                    <span>🏷️</span> Short Product ID (Alias)
                  </td>
                  <td className="py-2.5 px-2 text-right font-mono font-bold text-sm text-stark-cyan">
                    <span className="px-2.5 py-1 rounded-md bg-stark-cyan/15 border border-stark-cyan/40">
                      {result.product.short_id || result.short_id || "PRD-..."}
                    </span>
                  </td>
                </tr>
                <tr className="border-b border-stark-border/50">
                  <td className="py-2 px-2 text-text-secondary">Blockchain Hash (bytes32)</td>
                  <td className="py-2 px-2 text-right font-mono text-text-secondary break-all">
                    {result.product.product_id}
                  </td>
                </tr>
                <tr className="border-b border-stark-border/50">
                  <td className="py-2 px-2 text-text-secondary">Record Hash</td>
                  <td className="py-2 px-2 text-right font-mono text-text-secondary break-all">
                    {result.product.record_hash}
                  </td>
                </tr>
                <tr className="border-b border-stark-border/50">
                  <td className="py-2 px-2 text-text-secondary">EVM Transaction Hash</td>
                  <td className="py-2 px-2 text-right font-mono text-stark-emerald break-all font-semibold">
                    {result.tx_hash}
                  </td>
                </tr>
                <tr className="border-b border-stark-border/50">
                  <td className="py-2 px-2 text-text-secondary">Asset Name / Serial</td>
                  <td className="py-2 px-2 text-right font-semibold text-text-primary">
                    {result.product.name} ({result.product.serial})
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Downloadable Credentials */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            {/* QR Card */}
            <div className="p-4 rounded-xl bg-bg-main border border-stark-border flex flex-col items-center text-center shadow-sm">
              <p className="text-xs font-mono text-text-secondary mb-2 uppercase">Layer 1a: Signed QR Token</p>
              {qrData && (
                <div className="p-2 bg-white rounded-lg shadow-md mb-2">
                  <img src={qrData} alt="QR Code" width={140} height={140} />
                </div>
              )}
              {(result.product.short_id || result.short_id) && (
                <p className="text-xs font-mono text-stark-cyan font-bold mb-3 px-2 py-0.5 rounded bg-bg-elevated border border-stark-border">
                  Short ID: {result.product.short_id || result.short_id}
                </p>
              )}
              <button
                type="button"
                onClick={downloadQR}
                className="w-full py-1.5 rounded-lg bg-bg-elevated hover:bg-stark-cyan/15 border border-stark-border text-xs font-semibold text-stark-cyan transition-colors shadow-sm"
              >
                📥 Download QR Code (PNG)
              </button>
            </div>

            {/* NFC Card */}
            <div className="p-4 rounded-xl bg-bg-main border border-stark-border flex flex-col justify-between shadow-sm">
              <div>
                <p className="text-xs font-mono text-text-secondary mb-2 uppercase">Layer 1b: NTAG 424 SUN Payload</p>
                <pre className="text-[11px] font-mono text-text-secondary bg-bg-secondary p-2.5 rounded-lg border border-stark-border overflow-auto max-h-36 mb-3">
                  {JSON.stringify(result.nfc_payload, null, 2)}
                </pre>
              </div>
              <button
                type="button"
                onClick={downloadNFC}
                className="w-full py-1.5 rounded-lg bg-bg-elevated hover:bg-stark-cyan/15 border border-stark-border text-xs font-semibold text-stark-cyan transition-colors shadow-sm"
              >
                📥 Download NFC Payload (JSON)
              </button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
