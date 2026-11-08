import React, { useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { useTheme } from "../lib/theme";
import { PortalSwitcher } from "../components/PortalSwitcher";

export const AdminLayout: React.FC = () => {
  const { pathname } = useLocation();
  const { theme, toggleTheme } = useTheme();
  const { walletAddress, isOwner } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const adminNav = [
    { to: "/admin/overview", label: "Overview", icon: "📊", desc: "KPIs & node analytics" },
    { to: "/admin/manufacturers", label: "Manufacturer Management", icon: "🏭", desc: "Approval & authorization" },
    { to: "/admin/products", label: "Product Management", icon: "📦", desc: "Catalog & on-chain hashes" },
    { to: "/admin/blockchain", label: "Blockchain Management", icon: "⛓️", desc: "ProductRegistry.sol & whitelist" },
    { to: "/admin/security", label: "Security & Fraud Monitoring", icon: "🚨", desc: "Attack detection & alerts" },
    { to: "/admin/tags", label: "NFC / QR Management", icon: "🏷️", desc: "Tokens & tag deactivation" },
    { to: "/admin/audit", label: "Audit & Transaction Logs", icon: "📜", desc: "Ledger traces & history" },
    { to: "/admin/users", label: "User & Role Management", icon: "👥", desc: "Privileges & accounts" },
    { to: "/admin/settings", label: "System Settings", icon: "⚙️", desc: "Backend, MySQL, ML health" },
  ];

  return (
    <div className="min-h-screen flex bg-bg-main text-text-primary transition-colors duration-150">
      {/* ── Mobile Sidebar Backdrop ── */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── Admin Sidebar ── */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-[85vw] max-w-xs sm:w-72 bg-bg-card border-r border-stark-border flex flex-col transition-transform duration-200 lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Brand Header */}
        <div className="p-4 sm:p-5 border-b border-stark-border flex items-center justify-between">
          <Link to="/admin/overview" className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-stark-cyan/10 border border-stark-cyan/30 flex items-center justify-center text-stark-cyan font-mono font-bold text-lg shadow-sm">
              Æ
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold tracking-tight text-text-heading text-base">AETHER</span>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-stark-cyan/20 text-stark-cyan font-bold">
                  ADMIN
                </span>
              </div>
              <span className="text-[10px] font-mono text-text-muted block">
                CYBERSECURITY & GOVERNANCE
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

        {/* Admin Status Pill */}
        <div className="px-4 py-3 bg-bg-main/60 border-b border-stark-border/60">
          <div className="flex items-center justify-between text-[11px] font-mono">
            <span className="text-text-muted">OPERATIONAL MODE</span>
            <span className="inline-flex items-center gap-1 text-stark-emerald font-semibold">
              <span className="w-2 h-2 rounded-full bg-stark-emerald animate-pulse" />
              L1 ACTIVE
            </span>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {adminNav.map((item) => {
            const isActive =
              pathname === item.to || (item.to === "/admin/overview" && pathname === "/admin");
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
            <span>CHAIN ID</span>
            <span className="text-text-heading font-semibold">1337 (Ganache)</span>
          </div>
          <div className="flex items-center justify-between">
            <span>ROLE PRIVILEGE</span>
            <span className={isOwner ? "text-stark-emerald font-semibold" : "text-stark-amber"}>
              {isOwner ? "👑 Contract Owner" : "Admin Operator"}
            </span>
          </div>
        </div>
      </aside>

      {/* ── Main Admin Content Wrapper ── */}
      <div className="flex-1 lg:pl-72 flex flex-col min-w-0">
        {/* Top Header */}
        <header className="sticky top-0 z-30 h-16 bg-bg-card/90 backdrop-blur-md border-b border-stark-border px-3 sm:px-6 flex items-center justify-between gap-2 sm:gap-4">
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden w-10 h-10 min-w-[40px] min-h-[40px] flex items-center justify-center rounded-xl border border-stark-border text-text-secondary hover:bg-bg-elevated text-lg"
              aria-label="Open Admin Menu"
            >
              ☰
            </button>
            <div className="hidden sm:block">
              <span className="text-[11px] font-mono text-text-muted">PORTAL //</span>
              <span className="text-xs font-mono font-bold text-text-heading ml-1.5 uppercase">
                {pathname.replace("/admin/", "").replace("/admin", "Overview").replace("-", " ")}
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

            {/* Wallet pill */}
            {walletAddress ? (
              <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-bg-main border border-stark-border text-xs font-mono">
                <span className="w-2 h-2 rounded-full bg-stark-emerald" />
                <span className="text-text-heading">
                  {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
                </span>
              </div>
            ) : null}
          </div>
        </header>

        {/* Content Body */}
        <main className="flex-1 p-3 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
          <Outlet />
        </main>

        {/* Footer */}
        <footer className="border-t border-stark-border bg-bg-secondary/40 py-4 px-6 text-center text-xs font-mono text-text-muted">
          AETHER PROTOCOL v3.0 &bull; ADMIN SECURITY CONSOLE &bull; RESEARCH PAPER HACP5 ARCHITECTURE
        </footer>
      </div>
    </div>
  );
};

