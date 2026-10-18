/**
 * ManufacturerPage.tsx
 * =====================
 * Manufacturer portal:
 *  1. Optional MetaMask connect (shows address if connected, otherwise skips).
 *  2. Form: product name, brand, serial, manufacturer Ethereum address,
 *     manufacturer private key (for on-chain signing — not stored), photo.
 *  3. Register button → POST /products → show QR PNG + NFC payload.
 *  4. Download buttons for QR image and NFC payload JSON.
 *
 * Private key is sent to the backend for one transaction and never cached.
 * In production the manufacturer would sign client-side; for this prototype
 * the key goes to the server, which is documented in LIMITATIONS.md §L-005.
 */

import { useState, useRef } from "react";
import QRCode from "qrcode";
import { connectMetaMask, ensureCorrectChain, isMetaMaskAvailable } from "../lib/metamask";
import { registerProduct, type ProductRegisterResponse } from "../lib/api";
import VerdictBadge from "../components/VerdictBadge";
import Card from "../components/Card";

export default function ManufacturerPage() {
  // MetaMask state
  const [account, setAccount] = useState<string | null>(null);
  const [chainOk, setChainOk]  = useState(false);

  // Form fields
  const [name,    setName]    = useState("");
  const [brand,   setBrand]   = useState("");
  const [serial,  setSerial]  = useState("");
  const [mfrAddr, setMfrAddr] = useState("");
  const [mfrKey,  setMfrKey]  = useState("");
  const [photo,   setPhoto]   = useState<File | null>(null);

  // UI state
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState<string | null>(null);
  const [result,   setResult]   = useState<ProductRegisterResponse | null>(null);
  const [qrData,   setQrData]   = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  async function handleConnect() {
    const addr = await connectMetaMask();
    if (!addr) { setError("MetaMask not available or access denied."); return; }
    const ok = await ensureCorrectChain();
    setAccount(addr);
    setChainOk(ok);
    setMfrAddr(addr);
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setResult(null);
    setQrData(null);
    if (!name || !brand || !serial || !mfrAddr || !mfrKey) {
      setError("All fields except photo are required.");
      return;
    }
    setLoading(true);
    try {
      const form = new FormData();
      form.append("name",                 name);
      form.append("brand",                brand);
      form.append("serial",               serial);
      form.append("manufacturer_address", mfrAddr);
      form.append("manufacturer_key",     mfrKey);
      if (photo) form.append("image", photo);

      const res = await registerProduct(form);
      setResult(res);

      // Render QR code to canvas
      if (canvasRef.current) {
        await QRCode.toCanvas(canvasRef.current, res.qr_payload, { width: 200 });
        setQrData(canvasRef.current.toDataURL("image/png"));
      }
    } catch (err) {
      setError(String(err));
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
    const blob = new Blob([JSON.stringify(result.nfc_payload, null, 2)], { type: "application/json" });
    const a    = document.createElement("a");
    a.href     = URL.createObjectURL(blob);
    a.download = `nfc-${result.product.serial}.json`;
    a.click();
  }

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold text-sky-800">Manufacturer Portal</h1>

      {/* MetaMask connect */}
      <Card title="Wallet (optional)">
        {isMetaMaskAvailable() ? (
          account ? (
            <p className="text-sm">
              Connected: <code className="text-xs bg-gray-100 px-1 rounded">{account}</code>
              {chainOk
                ? <span className="ml-2 text-green-600 text-xs">correct chain</span>
                : <span className="ml-2 text-red-500 text-xs">wrong chain</span>}
            </p>
          ) : (
            <button
              onClick={handleConnect}
              className="px-4 py-2 bg-sky-600 text-white rounded hover:bg-sky-700 text-sm"
            >
              Connect MetaMask
            </button>
          )
        ) : (
          <p className="text-sm text-gray-500">
            MetaMask not detected — enter address and key manually below.
          </p>
        )}
      </Card>

      {/* Registration form */}
      <Card title="Register New Product">
        <form onSubmit={handleSubmit} className="space-y-3">
          {[
            { label: "Product name",            value: name,    set: setName    },
            { label: "Brand",                   value: brand,   set: setBrand   },
            { label: "Serial number",           value: serial,  set: setSerial  },
            { label: "Manufacturer address",    value: mfrAddr, set: setMfrAddr },
          ].map(({ label, value, set }) => (
            <div key={label}>
              <label className="block text-xs text-gray-500 mb-0.5">{label}</label>
              <input
                className="w-full border rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-sky-400"
                value={value}
                onChange={e => set(e.target.value)}
                placeholder={label}
              />
            </div>
          ))}

          {/* Private key — password field */}
          <div>
            <label className="block text-xs text-gray-500 mb-0.5">
              Manufacturer private key
              <span className="ml-1 text-red-500 text-xs">(sent once for signing, not stored)</span>
            </label>
            <input
              type="password"
              className="w-full border rounded px-3 py-1.5 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-sky-400"
              value={mfrKey}
              onChange={e => setMfrKey(e.target.value)}
              placeholder="0x..."
              autoComplete="off"
            />
          </div>

          {/* Photo upload */}
          <div>
            <label className="block text-xs text-gray-500 mb-0.5">Product photo (optional, SHA-256 goes on-chain)</label>
            <input
              type="file"
              accept="image/*"
              className="text-sm"
              onChange={e => setPhoto(e.target.files?.[0] ?? null)}
            />
          </div>

          {error && <p className="text-red-600 text-sm">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 bg-sky-600 text-white rounded hover:bg-sky-700 disabled:opacity-50 text-sm font-medium"
          >
            {loading ? "Registering on-chain…" : "Register Product"}
          </button>
        </form>
      </Card>

      {/* Hidden canvas for QR rendering */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Result */}
      {result && (
        <Card title="Registration Result">
          <p className="text-sm text-green-700 font-medium mb-2">Product registered successfully!</p>
          <table className="text-sm w-full mb-3">
            <tbody>
              <tr><td className="text-gray-500 pr-4">Product ID</td><td className="font-mono text-xs break-all">{result.product.product_id}</td></tr>
              <tr><td className="text-gray-500 pr-4">Name</td><td>{result.product.name}</td></tr>
              <tr><td className="text-gray-500 pr-4">Brand</td><td>{result.product.brand}</td></tr>
              <tr><td className="text-gray-500 pr-4">Serial</td><td>{result.product.serial}</td></tr>
              <tr><td className="text-gray-500 pr-4">Tx hash</td><td className="font-mono text-xs break-all">{result.tx_hash}</td></tr>
            </tbody>
          </table>

          <div className="flex gap-4 flex-wrap items-start">
            {/* QR code */}
            <div>
              <p className="text-xs text-gray-500 mb-1">QR code</p>
              {qrData && <img src={qrData} alt="QR code" className="border rounded" width={160} height={160} />}
              <button onClick={downloadQR} className="mt-1 text-xs text-sky-600 hover:underline block">
                Download QR PNG
              </button>
            </div>

            {/* NFC payload */}
            <div>
              <p className="text-xs text-gray-500 mb-1">NFC payload (emulated NTAG 424)</p>
              <pre className="text-xs bg-gray-50 border rounded p-2 max-w-xs overflow-auto">
                {JSON.stringify(result.nfc_payload, null, 2)}
              </pre>
              <button onClick={downloadNFC} className="mt-1 text-xs text-sky-600 hover:underline block">
                Download NFC payload JSON
              </button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
