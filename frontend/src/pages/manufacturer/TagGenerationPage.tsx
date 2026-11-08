import React, { useState, useEffect, useRef } from "react";
import QRCode from "qrcode";
import { Link } from "react-router-dom";
import {
  registerProduct,
  listProducts,
  type ProductOut,
  type ProductRegisterResponse,
} from "../../lib/api";
import { useAuth } from "../../lib/auth";
import Card from "../../components/Card";

export default function TagGenerationPage() {
  const { currentManufacturerApp, walletAddress } = useAuth();
  const [name, setName] = useState("");
  const [brand, setBrand] = useState(currentManufacturerApp?.brands?.[0] || "AetherCare");
  const [serial, setSerial] = useState(`SN-${Date.now().toString().slice(-6)}`);
  const [mfrAddress, setMfrAddress] = useState(
    walletAddress || currentManufacturerApp?.walletAddress || "0x22d491Bde2303f2f43325b2108D26f1eAbA1e32b"
  );
  // Default Ganache deterministic account #2 private key
  const [mfrKey, setMfrKey] = useState("0x6370fd033278c143179d81c5526140625662b8daa446c22ee2d73db3707e620c");

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [receipt, setReceipt] = useState<ProductRegisterResponse | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [recentProducts, setRecentProducts] = useState<ProductOut[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    listProducts()
      .then(setRecentProducts)
      .catch(() => {});
  }, []);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const url = URL.createObjectURL(file);
      setImagePreview(url);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setReceipt(null);
    setQrDataUrl(null);

    try {
      const form = new FormData();
      form.append("name", name.trim());
      form.append("brand", brand.trim());
      form.append("serial", serial.trim());
      form.append("manufacturer_address", mfrAddress.trim());
      form.append("manufacturer_key", mfrKey.trim());
      if (imageFile) {
        form.append("image", imageFile);
      }

      const res = await registerProduct(form);
      setReceipt(res);

      if (res.qr_payload) {
        const dataUrl = await QRCode.toDataURL(res.qr_payload, {
          width: 320,
          margin: 2,
          color: { dark: "#0A111C", light: "#FFFFFF" },
        });
        setQrDataUrl(dataUrl);
      }

      listProducts().then(setRecentProducts).catch(() => {});
      setSerial(`SN-${Date.now().toString().slice(-6)}`);
    } catch (err: any) {
      setError(err?.message || String(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-stark-border pb-5">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded bg-stark-cyan/10 border border-stark-cyan/30 text-stark-cyan text-[11px] font-mono mb-2">
            HACP5 // PHYSICAL TAG GENERATION
          </div>
          <h1 className="text-2xl font-bold text-text-heading tracking-tight">
            Tag Generation & On-Chain Asset Minting
          </h1>
          <p className="text-xs text-text-secondary mt-1">
            Enrolls the product on the Ethereum blockchain, extracts MobileNetV2 visual vectors, and generates cryptographic QR & NFC payloads.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Registration Form */}
        <div className="lg:col-span-7">
          <Card title="Product Metadata & Cryptographic Enrollment">
            <form onSubmit={handleSubmit} className="space-y-4 text-xs font-mono">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-text-secondary mb-1">Product Commercial Name *</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. AetherCare Biologic 50mg"
                    className="w-full rounded-xl bg-bg-input border border-stark-border px-3.5 py-2.5 text-text-primary focus:outline-none focus:border-stark-cyan"
                  />
                </div>

                <div>
                  <label className="block text-text-secondary mb-1">Brand Name *</label>
                  <input
                    type="text"
                    required
                    value={brand}
                    onChange={(e) => setBrand(e.target.value)}
                    placeholder="e.g. AetherCare"
                    className="w-full rounded-xl bg-bg-input border border-stark-border px-3.5 py-2.5 text-text-primary focus:outline-none focus:border-stark-cyan"
                  />
                </div>
              </div>

              <div>
                <label className="block text-text-secondary mb-1">Factory Serial Number *</label>
                <input
                  type="text"
                  required
                  value={serial}
                  onChange={(e) => setSerial(e.target.value)}
                  placeholder="SN-102938"
                  className="w-full rounded-xl bg-bg-input border border-stark-border px-3.5 py-2.5 text-text-primary focus:outline-none focus:border-stark-cyan"
                />
              </div>

              {/* Reference Image Upload (MobileNetV2 Embedding) */}
              <div>
                <label className="block text-text-secondary mb-1">
                  Packaging Photograph (for AI MobileNetV2 + OCR Brand Verification)
                </label>
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="cursor-pointer border-2 border-dashed border-stark-border hover:border-stark-cyan/60 rounded-xl p-4 text-center bg-bg-main/50 transition-colors"
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="hidden"
                  />
                  {imagePreview ? (
                    <div className="flex items-center justify-center gap-4">
                      <img
                        src={imagePreview}
                        alt="Preview"
                        className="w-20 h-20 object-contain rounded-lg border border-stark-border bg-black/10"
                      />
                      <div className="text-left">
                        <p className="font-semibold text-text-heading">{imageFile?.name}</p>
                        <p className="text-[10px] text-stark-emerald mt-0.5">
                          ✓ Image captured. MobileNetV2 will extract 1280-d L2 vector.
                        </p>
                        <span className="text-[10px] text-stark-cyan underline mt-1 block">Click to change</span>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <span className="text-2xl block">📸</span>
                      <p className="font-semibold text-text-heading">Click or drag genuine packaging photo</p>
                      <p className="text-[10px] text-text-muted">
                        Extracts SHA-256 hash for blockchain record and neural features for lookalike detection
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Manufacturer Keys */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="block text-text-secondary mb-1">Manufacturer Address (EVM Checksum)</label>
                  <input
                    type="text"
                    required
                    value={mfrAddress}
                    onChange={(e) => setMfrAddress(e.target.value)}
                    className="w-full rounded-xl bg-bg-input border border-stark-border px-3 py-2 text-[11px] text-text-primary focus:outline-none focus:border-stark-cyan"
                  />
                </div>

                <div>
                  <label className="block text-text-secondary mb-1">Signing Private Key (Ganache Acc #2)</label>
                  <input
                    type="password"
                    required
                    value={mfrKey}
                    onChange={(e) => setMfrKey(e.target.value)}
                    className="w-full rounded-xl bg-bg-input border border-stark-border px-3 py-2 text-[11px] text-text-primary focus:outline-none focus:border-stark-cyan"
                  />
                </div>
              </div>

              {error && (
                <div className="p-3 rounded-xl bg-stark-red/10 border border-stark-red/30 text-stark-red text-xs">
                  {error}
                </div>
              )}

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 rounded-xl bg-stark-cyan text-white text-xs font-bold font-mono tracking-wide hover:bg-stark-cyan/90 transition-all shadow-md disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <span className="animate-spin">🔄</span>
                      <span>Broadcasting EVM Transaction & Generating Cryptograms...</span>
                    </>
                  ) : (
                    <>
                      <span>✨</span>
                      <span>Execute On-Chain Minting & Generate Dynamic QR</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </Card>
        </div>

        {/* Live Cryptographic Output Receipt */}
        <div className="lg:col-span-5">
          {receipt ? (
            <Card title="Cryptographic Enrollment Receipt" subtitle="Generated tokens ready for factory packaging">
              <div className="space-y-4 text-xs font-mono">
                {/* Short ID Highlight */}
                <div className="p-3.5 rounded-xl bg-stark-cyan/10 border border-stark-cyan/30 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-text-secondary uppercase block">
                      Short Human Product ID (Option B)
                    </span>
                    <span className="text-xl font-bold text-stark-cyan">{receipt.short_id || "PRD-LEGACY"}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(receipt.short_id || receipt.product.product_id, "short")}
                    className="px-2.5 py-1 rounded bg-bg-elevated hover:bg-bg-secondary border border-stark-border text-[11px] text-stark-cyan"
                  >
                    {copied === "short" ? "✓ Copied" : "Copy ID"}
                  </button>
                </div>

                {/* QR Code Preview */}
                {qrDataUrl && (
                  <div className="p-4 rounded-xl bg-white text-center border border-stark-border space-y-2">
                    <img src={qrDataUrl} alt="Product QR" className="w-48 h-48 mx-auto" />
                    <span className="text-[10px] font-mono text-gray-700 block">
                      Signed HMAC Dynamic Token: {receipt.short_id}
                    </span>
                    <a
                      href={qrDataUrl}
                      download={`${receipt.short_id || "product"}-qr.png`}
                      className="inline-block px-3 py-1 rounded-lg bg-gray-900 text-white text-[11px] font-semibold hover:bg-black"
                    >
                      Download Printable QR Tag
                    </a>
                  </div>
                )}

                {/* NFC Cryptograms */}
                <div className="p-3 rounded-xl bg-bg-main border border-stark-border space-y-1.5">
                  <span className="text-text-muted text-[10px] uppercase font-bold block">
                    NTAG 424 SUN Emulated Cryptogram (HACP5)
                  </span>
                  <div className="flex justify-between text-[11px]">
                    <span className="text-text-secondary">NFC UID:</span>
                    <span className="text-text-heading font-bold">{receipt.nfc_payload.uid}</span>
                  </div>
                  <div className="flex justify-between text-[11px]">
                    <span className="text-text-secondary">Counter:</span>
                    <span className="text-text-heading font-bold">#{receipt.nfc_payload.counter}</span>
                  </div>
                  <div className="flex justify-between text-[11px]">
                    <span className="text-text-secondary">CMAC:</span>
                    <span className="text-stark-cyan break-all">{receipt.nfc_payload.cmac}</span>
                  </div>
                </div>

                {/* Blockchain Proof */}
                <div className="p-3 rounded-xl bg-bg-main border border-stark-border space-y-1">
                  <span className="text-text-muted text-[10px] uppercase block">Blockchain Proof</span>
                  <p className="text-[11px] text-text-secondary break-all">
                    Tx Hash: <strong className="text-text-heading">{receipt.tx_hash}</strong>
                  </p>
                  <p className="text-[11px] text-text-secondary break-all">
                    Native Hash: <span className="text-text-muted">{receipt.product.product_id}</span>
                  </p>
                </div>

                <Link
                  to={`/consumer/verify?pid=${receipt.short_id || receipt.product.product_id}`}
                  className="w-full py-2.5 rounded-xl bg-stark-emerald text-white text-xs font-bold text-center block hover:opacity-95 shadow-sm"
                >
                  ⚡ Test Product in Consumer Verification &rarr;
                </Link>
              </div>
            </Card>
          ) : (
            <Card title="Awaiting Enrollment Execution">
              <div className="py-12 text-center space-y-3 text-xs text-text-secondary font-mono">
                <span className="text-4xl block">🏷️</span>
                <p>Complete the metadata form to register the asset on the blockchain.</p>
                <p className="text-[11px] text-text-muted">
                  Upon submission, you will receive an encrypted QR printable tag and NTAG 424 SUN AuthentiCoding parameters.
                </p>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

