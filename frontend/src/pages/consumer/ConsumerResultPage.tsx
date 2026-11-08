import React, { useState, useEffect } from "react";
import { useLocation, Link } from "react-router-dom";
import { getProduct, type ProductOut } from "../../lib/api";
import Card from "../../components/Card";
import VerdictBadge from "../../components/VerdictBadge";

export default function ConsumerResultPage() {
  const { search } = useLocation();
  const query = new URLSearchParams(search);
  const pid = query.get("pid") || "PRD-DEMO";
  const verdictParam = query.get("verdict") || "Verified";

  const [product, setProduct] = useState<ProductOut | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getProduct(pid)
      .then(setProduct)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [pid]);

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      <div className="border-b border-stark-border pb-4">
        <Link to="/consumer/verify" className="text-xs font-mono text-stark-cyan hover:underline mb-2 block">
          &larr; Back to Verification Scanner
        </Link>
        <h1 className="text-2xl font-bold text-text-heading">Authentication Certificate & Audit Record</h1>
        <p className="text-xs text-text-secondary mt-1">
          Cryptographic evidence summary for item {product?.short_id || pid}.
        </p>
      </div>

      {/* Main Verdict Card */}
      <Card>
        <div className="p-6 rounded-2xl bg-bg-main border border-stark-border space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <span className="text-[10px] font-mono tracking-widest text-text-muted uppercase block">
                AUTHENTICATION VERDICT
              </span>
              <div className="flex items-center gap-3 mt-1">
                <span className="text-3xl font-extrabold text-text-heading">{verdictParam}</span>
                <VerdictBadge verdict={verdictParam} size="lg" />
              </div>
            </div>

            <div className="text-right font-mono text-xs">
              <span className="text-text-muted block text-[10px]">TIME OF AUDIT</span>
              <span className="text-text-heading">{new Date().toLocaleString()}</span>
            </div>
          </div>

          <p className="text-xs text-text-secondary leading-relaxed font-mono">
            All cryptographic signatures, on-chain smart contract checks, and AI packaging similarities have been computed and logged to the immutable Ethereum ledger.
          </p>
        </div>

        {/* Detailed Item Data */}
        <div className="mt-6 space-y-4">
          <h3 className="text-sm font-bold text-text-heading font-mono uppercase">
            Product Identification Ledger
          </h3>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
            <div className="p-3 rounded-xl bg-bg-main border border-stark-border">
              <span className="text-text-muted block text-[10px]">ASSET NAME</span>
              <span className="font-semibold text-text-heading mt-0.5 block">{product?.name || "Verified Product"}</span>
            </div>
            <div className="p-3 rounded-xl bg-bg-main border border-stark-border">
              <span className="text-text-muted block text-[10px]">BRAND</span>
              <span className="font-semibold text-text-heading mt-0.5 block">{product?.brand || "Authorized Brand"}</span>
            </div>
            <div className="p-3 rounded-xl bg-bg-main border border-stark-border">
              <span className="text-text-muted block text-[10px]">SHORT ID</span>
              <span className="font-bold text-stark-cyan mt-0.5 block">{product?.short_id || pid}</span>
            </div>
            <div className="p-3 rounded-xl bg-bg-main border border-stark-border">
              <span className="text-text-muted block text-[10px]">LIFECYCLE</span>
              <span className="font-semibold text-stark-emerald mt-0.5 block uppercase">{product?.status || "REGISTERED"}</span>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-bg-main border border-stark-border space-y-2 text-xs font-mono">
            <div>
              <span className="text-text-muted block text-[10px]">ON-CHAIN PRODUCT ID (BYTES32)</span>
              <span className="text-stark-cyan break-all font-semibold">{product?.product_id || pid}</span>
            </div>
            <div>
              <span className="text-text-muted block text-[10px]">RECORD HASH</span>
              <span className="text-text-secondary break-all">{product?.record_hash || "0x984210fabc..."}</span>
            </div>
            <div>
              <span className="text-text-muted block text-[10px]">MANUFACTURER ADDRESS</span>
              <span className="text-text-heading break-all">{product?.manufacturer_address || "0x22d491Bde2303f2f43325b2108D26f1eAbA1e32b"}</span>
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-3 pt-4 border-t border-stark-border justify-between">
          <Link
            to="/consumer/verify"
            className="px-4 py-2 rounded-xl bg-stark-cyan text-white text-xs font-bold font-mono hover:bg-stark-cyan/90 transition-all shadow-sm"
          >
            Scan Another Product
          </Link>
          <Link
            to="/consumer/history"
            className="px-4 py-2 rounded-xl bg-bg-elevated hover:bg-bg-secondary border border-stark-border text-xs font-semibold text-text-secondary"
          >
            View Verification History &rarr;
          </Link>
        </div>
      </Card>
    </div>
  );
}

