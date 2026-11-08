import React, { useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { useTheme } from "../lib/theme";
import { PortalSwitcher } from "../components/PortalSwitcher";

export const ConsumerLayout: React.FC = () => {
  const { pathname } = useLocation();
  const { theme, toggleTheme } = useTheme();
  const [mobileOpen, setMobileOpen] = useState(false);

  const consumerNav = [
    { to: "/consumer", label: "Home", icon: "🏠" },
    { to: "/consumer/verify", label: "Verify Product", icon: "🛡️" },
    { to: "/consumer/history", label: "Verification History", icon: "🕒" },
    { to: "/consumer/report", label: "Report Counterfeit", icon: "⚠️" },
    { to: "/consumer/products", label: "Product Information", icon: "📋" },
    { to: "/consumer/help", label: "Help & Support", icon: "❓" },
    { to: "/consumer/about", label: "About AETHER", icon: "ℹ️" },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-bg-main text-text-primary transition-colors duration-150">
      {/* ── Consumer Top Navigation Bar ── */}
      <header className="sticky top-0 z-40 bg-bg-card/95 backdrop-blur-md border-b border-stark-border shadow-sm">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 h-16 flex items-center justify-between gap-2 sm:gap-4">
          {/* Logo & Brand */}
          <Link to="/consumer" className="flex items-center gap-2 sm:gap-3 shrink-0">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-stark-cyan/10 border border-stark-cyan/30 flex items-center justify-center text-stark-cyan font-mono font-bold text-base sm:text-lg shadow-sm shrink-0">
              Æ
            </div>
            <div>
              <div className="flex items-center gap-1.5 sm:gap-2">
                <span className="font-extrabold tracking-tight text-text-heading text-sm sm:text-base">AETHER</span>
                <span className="text-[9px] sm:text-[10px] font-mono px-1.5 sm:px-2 py-0.5 rounded-full bg-stark-emerald/10 text-stark-emerald border border-stark-emerald/20 font-bold hidden xs:inline-flex">
                  AUTHENTICATOR
                </span>
              </div>
              <span className="text-[9px] sm:text-[10px] font-mono text-text-muted hidden sm:block">
                CONSUMER PROTECTION NETWORK
              </span>
            </div>
          </Link>

          {/* Desktop Nav Links */}
          <nav className="hidden lg:flex items-center gap-1">
            {consumerNav.map((item) => {
              const isActive =
                item.to === "/consumer"
                  ? pathname === "/" || pathname === "/consumer"
                  : pathname.startsWith(item.to);
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    isActive
                      ? "bg-stark-cyan/10 text-stark-cyan font-semibold border border-stark-cyan/25"
                      : "text-text-secondary hover:text-text-heading hover:bg-bg-elevated"
                  }`}
                >
                  <span>{item.icon}</span>
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </nav>

          {/* Controls */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
            {/* Direct Verify CTA (tablet/desktop) */}
            <Link
              to="/consumer/verify"
              className="hidden md:flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-stark-cyan text-white text-xs font-bold hover:bg-stark-cyan/90 transition-all shadow-sm min-h-[40px]"
            >
              <span>⚡</span>
              <span>Verify Now</span>
            </Link>

            {/* Theme Toggle Button */}
            <button
              type="button"
              onClick={toggleTheme}
              className="w-10 h-10 rounded-xl bg-bg-elevated hover:bg-bg-secondary border border-stark-border text-text-secondary hover:text-text-heading transition-colors flex items-center justify-center shrink-0 min-h-[40px] min-w-[40px]"
              title={`Switch to ${theme === "dark" ? "Light" : "Dark"} Mode`}
              aria-label="Toggle Theme"
            >
              {theme === "dark" ? "☀️" : "🌙"}
            </button>

            {/* Portal Switcher */}
            <PortalSwitcher />

            {/* Mobile Hamburger Toggle */}
            <button
              type="button"
              onClick={() => setMobileOpen(!mobileOpen)}
              className="lg:hidden w-10 h-10 rounded-xl border border-stark-border text-text-secondary hover:bg-bg-elevated flex items-center justify-center text-lg shrink-0 min-h-[40px] min-w-[40px]"
              aria-label="Toggle Navigation Menu"
            >
              {mobileOpen ? "✕" : "☰"}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileOpen && (
          <div className="lg:hidden border-t border-stark-border bg-bg-card/98 backdrop-blur-lg px-3.5 py-3 space-y-1.5 shadow-xl animate-in slide-in-from-top-2 duration-150">
            {/* Direct Mobile Verify Button */}
            <Link
              to="/consumer/verify"
              onClick={() => setMobileOpen(false)}
              className="flex items-center justify-center gap-2 w-full py-2.5 px-3 rounded-xl bg-stark-cyan text-white font-bold text-xs font-mono shadow-md min-h-[44px] mb-2"
            >
              <span>⚡</span>
              <span>Launch Instant Product Verification</span>
            </Link>

            {consumerNav.map((item) => {
              const isActive =
                item.to === "/consumer"
                  ? pathname === "/" || pathname === "/consumer"
                  : pathname.startsWith(item.to);
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-mono transition-all min-h-[44px] ${
                    isActive
                      ? "bg-stark-cyan text-white font-bold shadow-sm"
                      : "text-text-secondary hover:text-text-heading hover:bg-bg-elevated"
                  }`}
                >
                  <span className="text-base">{item.icon}</span>
                  <span className="font-semibold">{item.label}</span>
                </NavLink>
              );
            })}
          </div>
        )}
      </header>

      {/* ── Main Consumer Workspace ── */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-3 sm:px-6 py-4 sm:py-8">
        <Outlet />
      </main>

      {/* ── Consumer Footer ── */}
      <footer className="border-t border-stark-border bg-bg-card/70 py-8 text-xs text-text-secondary">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-text-heading text-sm">AETHER PROTOCOL</span>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-stark-cyan/10 text-stark-cyan">
                v3.0
              </span>
            </div>
            <p className="text-[11px] leading-relaxed text-text-muted">
              Three-layer anti-counterfeiting platform powered by Ethereum blockchain, NTAG 424 SUN cryptograms, and MobileNetV2 visual AI.
            </p>
          </div>

          <div>
            <h4 className="font-semibold text-text-heading mb-2 text-xs">Consumer Tools</h4>
            <ul className="space-y-1.5 text-[11px] font-mono text-text-muted">
              <li><Link to="/consumer/verify" className="hover:text-stark-cyan">QR Camera Scanner</Link></li>
              <li><Link to="/consumer/history" className="hover:text-stark-cyan">Verification Ledger</Link></li>
              <li><Link to="/consumer/report" className="hover:text-stark-cyan">Report Counterfeit Item</Link></li>
              <li><Link to="/consumer/products" className="hover:text-stark-cyan">Approved Catalog</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-text-heading mb-2 text-xs">Research & Tech</h4>
            <ul className="space-y-1.5 text-[11px] font-mono text-text-muted">
              <li><Link to="/consumer/about" className="hover:text-stark-cyan">HACP5 Architecture</Link></li>
              <li><Link to="/consumer/help" className="hover:text-stark-cyan">NFC DynamicID</Link></li>
              <li><span className="hover:text-stark-cyan cursor-pointer">MobileNetV2 Visual Similarity</span></li>
              <li><span className="hover:text-stark-cyan cursor-pointer">OCR Deceptive Label Detection</span></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-text-heading mb-2 text-xs">Platform Roles</h4>
            <div className="space-y-2">
              <Link
                to="/manufacturer"
                className="block p-2 rounded-lg bg-bg-elevated hover:bg-bg-secondary border border-stark-border text-[11px] font-mono text-text-heading"
              >
                🏭 Manufacturer Portal &rarr;
              </Link>
              <Link
                to="/admin"
                className="block p-2 rounded-lg bg-bg-elevated hover:bg-bg-secondary border border-stark-border text-[11px] font-mono text-text-heading"
              >
                🛡️ Admin & Security Console &rarr;
              </Link>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-6 mt-6 border-t border-stark-border/60 flex flex-col sm:flex-row items-center justify-between gap-2 font-mono text-[11px] text-text-muted">
          <div>&copy; 2026 AETHER Anti-Counterfeiting Platform. Open research implementation.</div>
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-stark-emerald" />
            <span>GANACHE CHAIN 1337 CONNECTED</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

