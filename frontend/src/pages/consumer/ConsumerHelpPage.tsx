import React, { useState } from "react";
import Card from "../../components/Card";

export default function ConsumerHelpPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const faqs = [
    {
      q: "How does AETHER verify that a product is genuinely authentic?",
      a: "AETHER does not rely solely on a database lookup. It runs a multi-signal pipeline: (1) Validates the cryptographic HMAC signature or NTAG 424 SUN CMAC code on the tag, (2) Checks that the product is enrolled on the Ethereum blockchain, (3) Computes spatial anomaly scores to detect impossible travel or replay attacks, and (4) Uses MobileNetV2 AI and OCR to match physical packaging against genuine references.",
    },
    {
      q: "Can counterfeiters copy the QR code?",
      a: "No. Unlike legacy static QR codes, AETHER QR tokens contain cryptographic HMAC signatures tied to the unique product ID and serial counter. If a counterfeiter copies the QR code and scans it repeatedly across different cities, the spatial AI engine detects a burst scanning anomaly and impossible travel, automatically downgrading the verdict to 'Suspicious activity'.",
    },
    {
      q: "How do I scan an NFC tag?",
      a: "Hold the top edge of your smartphone against the physical product seal. Ensure NFC is enabled in your device settings. An encrypted NTAG 424 SUN chip will transmit a rolling counter and CMAC directly to the browser for instant validation.",
    },
    {
      q: "What does 'Manual Review' mean?",
      a: "A 'Manual Review' verdict occurs when a product is on-chain and authentic, but a policy condition was triggered — such as scanning an item that was already marked sold, or tapping an NFC tag where the rolling counter was slightly disputed. It advises the consumer to check with the retailer or contact customer support.",
    },
    {
      q: "Do I need MetaMask or cryptocurrency to verify a product?",
      a: "No! Consumers can verify products freely using any smartphone camera or browser without installing MetaMask or creating an account.",
    },
  ];

  return (
    <div className="space-y-8 max-w-4xl mx-auto pb-12">
      <div className="border-b border-stark-border pb-5">
        <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded bg-stark-cyan/10 border border-stark-cyan/30 text-stark-cyan text-[11px] font-mono mb-2">
          USER SUPPORT // KNOWLEDGE BASE
        </div>
        <h1 className="text-2xl font-bold text-text-heading tracking-tight">
          Help, Guides & Frequently Asked Questions
        </h1>
        <p className="text-xs text-text-secondary mt-1">
          Everything you need to know about scanning QR codes, tapping NFC tags, and interpreting authentication signals.
        </p>
      </div>

      {/* Step by Step Guides */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card title="How to Scan a Dynamic QR Tag" icon={<span className="text-xl">📷</span>}>
          <ol className="list-decimal list-inside space-y-2 text-xs text-text-secondary leading-relaxed">
            <li>Navigate to the <strong className="text-text-heading">Verify Product</strong> page.</li>
            <li>Click <strong className="text-text-heading">Start Camera</strong> and allow camera permissions.</li>
            <li>Align your camera viewfinder with the QR code printed on the physical package.</li>
            <li>Optionally take a packaging photograph to activate the <strong className="text-stark-cyan">MobileNetV2 AI visual inspector</strong>.</li>
            <li>Review your instant multi-signal authentication certificate.</li>
          </ol>
        </Card>

        <Card title="How to Tap an NTAG 424 SUN Chip" icon={<span className="text-xl">📡</span>}>
          <ol className="list-decimal list-inside space-y-2 text-xs text-text-secondary leading-relaxed">
            <li>Ensure NFC is turned ON in your mobile phone settings.</li>
            <li>Tap the NFC chip embedded in the tamper-evident bottle cap or luxury tag.</li>
            <li>The tag generates an internal AES-128 CMAC and rolling counter.</li>
            <li>AETHER confirms that the cryptogram matches the master manufacturer secret.</li>
            <li>If a duplicate or clone tag was replayed, the system warns of replay fraud.</li>
          </ol>
        </Card>
      </div>

      {/* FAQs */}
      <Card title="Frequently Asked Questions">
        <div className="space-y-3">
          {faqs.map((f, i) => (
            <div
              key={i}
              className="p-3.5 rounded-xl bg-bg-main border border-stark-border cursor-pointer transition-colors"
              onClick={() => setOpenFaq(openFaq === i ? null : i)}
            >
              <div className="flex items-center justify-between font-bold text-xs text-text-heading">
                <span>{f.q}</span>
                <span className="text-stark-cyan font-mono text-sm">{openFaq === i ? "−" : "+"}</span>
              </div>
              {openFaq === i && (
                <p className="mt-2 text-xs text-text-secondary leading-relaxed border-t border-stark-border/60 pt-2 font-sans">
                  {f.a}
                </p>
              )}
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

