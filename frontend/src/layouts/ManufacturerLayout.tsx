import React, { useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { useTheme } from "../lib/theme";
import { PortalSwitcher } from "../components/PortalSwitcher";

export const ManufacturerLayout: React.FC = () => {
  const { pathname } = useLocation();
  const { theme, toggleTheme } = useTheme();
  const { walletAddress, isWhitelistedManufacturer, currentManufacturerApp } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const mfrNav = [
    { to: "/manufacturer/overview", label: "Overview", icon: "📈", desc: "Production metrics & tasks" },
    { to: "/manufacturer/profile", label: "Company Profile", icon: "🏢", desc: "Business registration & KYC" },
    { to: "/manufacturer/brands", label: "Brand Management", icon: "✨", desc: "Registered trade names" },
    { to: "/manufacturer/products", label: "Product Management", icon: "📦", desc: "Catalog & descriptions" },
    { to: "/manufacturer/batches", label: "Batch Management", icon: "📑", desc: "Lot numbers & schedules" },
    { to: "/manufacturer/generate-tags", label: "Tag Generation", icon: "⚡", desc: "Mint QR & NFC tokens" },
    { to: "/manufacturer/nfc-encoding", label: "NFC Encoding", icon: "📡", desc: "NTAG 424 SUN cryptograms" },
    { to: "/manufacturer/tags", label: "Tag Management", icon: "🏷️", desc: "Activation & status tracking" },
    { to: "/manufacturer/encoding-history", label: "Encoding History", icon: "📜", desc: "Batch encoding logbook" },
    { to: "/manufacturer/analytics", label: "Product Analytics", icon: "📊", desc: "Scan rates & market reach" },
  ];

  const isApproved = currentManufacturerApp?.status === "approved" || isWhitelistedManufacturer;

  return (
    <div className="min-h-screen flex bg-bg-main text-text-primary transition-colors duration-150">
      {/* ── Mobile Sidebar Backdrop ── */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── Manufacturer Sidebar ── */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-[85vw] max-w-xs sm:w-72 bg-bg-card border-r border-stark-border flex flex-col transition-transform duration-200 lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Brand Header */}
        <div className="p-4 sm:p-5 border-b border-stark-border flex items-center justify-between">
          <Link to="/manufacturer/overview" className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-stark-cyan/10 border border-stark-cyan/30 flex items-center justify-center text-stark-cyan font-mono font-bold text-lg shadow-sm">
              🏭
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold tracking-tight text-text-heading text-base">AETHER</span>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-stark-cyan/20 text-stark-cyan font-bold">
                  PRODUCER
                </span>
              </div>
              <span className="text-[10px] font-mono text-text-muted block truncate max-w-[170px]">
                {currentManufacturerApp?.name || "MANUFACTURER WORKSPACE"}
              </span>
            </div>
          </Link>
          <button
            type="button"
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden w-9 h-9 flex items-center justify-center rounded-lg text-text-secondary hover:bg-bg-elevated"
            aria-label="Close Sidebar"
          >
            ✕
          </button>
        </div>

        {/* Authorization Status Box */}
        <div className="px-4 py-3 bg-bg-main/60 border-b border-stark-border/60">
          <div className="flex items-center justify-between text-[11px] font-mono">
            <span className="text-text-muted">APPROVAL STATUS</span>
            <span
              className={`inline-flex items-center gap-1 font-semibold ${
                isApproved ? "text-stark-emerald" : "text-stark-amber"
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  isApproved ? "bg-stark-emerald" : "bg-stark-amber animate-pulse"
                }`}
              />
              {isApproved ? "APPROVED" : "PENDING REVIEW"}
            </span>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {mfrNav.map((item) => {
            const isActive =
              pathname === item.to || (item.to === "/manufacturer/overview" && pathname === "/manufacturer");
            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-mono transition-all ${
                  isActive
                    ? "bg-stark-cyan text-white font-bold shadow-md shadow-stark-cyan/20"
                    : "text-text-secondary hover:text-text-heading hover:bg-bg-elevated"
                }`}
              >
                <span className="text-base shrink-0">{item.icon}</span>
                <div className="min-w-0 flex-1">
                  <div className="truncate">{item.label}</div>
                  <div
                    className={`text-[10px] truncate ${
                      isActive ? "text-white/80" : "text-text-muted"
                    }`}
                  >
                    {item.desc}
                  </div>
                </div>
              </NavLink>
            );
          })}
        </nav>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-stark-border bg-bg-main/40 text-[11px] font-mono text-text-muted">
          <div className="flex items-center justify-between mb-1">
            <span>HACP5 ENCODER</span>
            <span className="text-text-heading font-semibold">AUTHENTICODING</span>
          </div>
          <div className="flex items-center justify-between">
            <span>DYNAMIC ID</span>
            <span className="text-stark-cyan font-semibold">SUPPORTED</span>
          </div>
        </div>
      </aside>

      {/* ── Main Manufacturer Content Wrapper ── */}
      <div className="flex-1 lg:pl-72 flex flex-col min-w-0">
        {/* Top Header */}
        <header className="sticky top-0 z-30 h-16 bg-bg-card/90 backdrop-blur-md border-b border-stark-border px-3 sm:px-6 flex items-center justify-between gap-2 sm:gap-4">
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden w-10 h-10 min-w-[40px] min-h-[40px] flex items-center justify-center rounded-xl border border-stark-border text-text-secondary hover:bg-bg-elevated text-lg"
              aria-label="Open Manufacturer Menu"
            >
              ☰
            </button>
            <div className="hidden sm:block">
              <span className="text-[11px] font-mono text-text-muted">MANUFACTURER //</span>
              <span className="text-xs font-mono font-bold text-text-heading ml-1.5 uppercase">
                {pathname
                  .replace("/manufacturer/", "")
                  .replace("/manufacturer", "Overview")
                  .replace("-", " ")}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* Theme Toggle Button */}
            <button
              type="button"
              onClick={toggleTheme}
              className="w-10 h-10 min-w-[40px] min-h-[40px] flex items-center justify-center rounded-xl bg-bg-elevated hover:bg-bg-secondary border border-stark-border text-text-secondary hover:text-text-heading transition-colors"
              title={`Switch to ${theme === "dark" ? "Light" : "Dark"} Mode`}
              aria-label="Toggle Theme"
            >
              {theme === "dark" ? "☀️" : "🌙"}
            </button>

            {/* Role / Portal Switcher */}
            <PortalSwitcher />

            {/* Quick Tag Generator Link */}
            <Link
              to="/manufacturer/generate-tags"
              className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-stark-cyan text-white text-xs font-bold font-mono hover:bg-stark-cyan/90 transition-all shadow-sm"
            >
              <span>✨</span>
              <span>Enroll Asset</span>
            </Link>
          </div>
        </header>

        {/* Content Body */}
        <main className="flex-1 p-3 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
          <Outlet />
        </main>

        {/* Footer */}
        <footer className="border-t border-stark-border bg-bg-secondary/40 py-4 px-6 text-center text-xs font-mono text-text-muted">
          AETHER PROTOCOL v3.0 &bull; MANUFACTURER PRODUCTION & ENCODING PORTAL &bull; HACP5 WORKFLOW
        </footer>
      </div>
    </div>
  );
};

