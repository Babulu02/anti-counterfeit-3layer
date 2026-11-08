import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  isMetaMaskAvailable,
  connectMetaMask,
  ensureCorrectChain,
} from "../lib/metamask";
import { useTheme } from "../lib/theme";

export default function Navbar() {
  const { pathname } = useLocation();
  const { theme, toggleTheme } = useTheme();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [account, setAccount] = useState<string | null>(null);
  const [chainOk, setChainOk] = useState(false);
  const [connecting, setConnecting] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined" && (window as any).ethereum) {
      const eth = (window as any).ethereum;
      eth
        .request({ method: "eth_accounts" })
        .then((accounts: string[]) => {
          if (accounts && accounts.length > 0) {
            setAccount(accounts[0]);
            ensureCorrectChain().then(setChainOk).catch(() => {});
          }
        })
        .catch(() => {});

      const handleAccountsChanged = (accs: string[]) => {
        setAccount(accs[0] || null);
      };
      const handleChainChanged = () => {
        ensureCorrectChain().then(setChainOk).catch(() => {});
      };

      eth.on("accountsChanged", handleAccountsChanged);
      eth.on("chainChanged", handleChainChanged);

      return () => {
        if (eth.removeListener) {
          eth.removeListener("accountsChanged", handleAccountsChanged);
          eth.removeListener("chainChanged", handleChainChanged);
        }
      };
    }
  }, []);

  async function handleConnect() {
    setConnecting(true);
    try {
      const addr = await connectMetaMask();
      if (addr) {
        setAccount(addr);
        const ok = await ensureCorrectChain();
        setChainOk(ok);
      }
    } catch (err) {
      console.warn("Wallet connect failed:", err);
    } finally {
      setConnecting(false);
    }
  }

  const navItems = [
    {
      to: "/manufacturer",
      label: "Manufacturer",
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      ),
    },
    {
      to: "/verify",
      label: "Verify",
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
      ),
    },
    {
      to: "/consumer",
      label: "Consumer",
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
        </svg>
      ),
    },
    {
      to: "/dashboard",
      label: "Dashboard",
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
    },
    {
      to: "/admin",
      label: "Admin",
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
    },
  ];

  return (
    <header className="sticky top-0 z-50 bg-bg-main/90 backdrop-blur-xl border-b border-stark-border transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        {/* Brand logo & Stark-Tech badge */}
        <Link to="/verify" className="flex items-center gap-3 group shrink-0">
          <div className="relative w-9 h-9 rounded-lg bg-bg-card border border-stark-border flex items-center justify-center overflow-hidden group-hover:border-stark-cyan group-hover:shadow-stark-sm transition-all shadow-sm">
            {/* Glowing inner core */}
            <div className="absolute inset-0 bg-gradient-to-br from-stark-cyan/20 to-transparent" />
            <svg
              className="w-5 h-5 text-stark-cyan relative z-10"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M12 2L4 6v6.09c0 5.05 3.41 9.76 8 10.91 4.59-1.15 8-5.86 8-10.91V6l-8-4zm0 2.18l6 3v4.91c0 4.14-2.73 8.01-6 9.07-3.27-1.06-6-4.93-6-9.07V7.18l6-3z" />
              <circle cx="12" cy="11.5" r="3" fill="currentColor" opacity="0.8" />
            </svg>
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold tracking-wider text-base text-text-heading group-hover:text-stark-cyan transition-colors">
                AETHER
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-bg-elevated text-stark-cyan border border-stark-border">
                v3.0
              </span>
            </div>
            <p className="text-[10px] font-mono text-text-secondary tracking-tight -mt-0.5">
              STARK // SECURITY PROTOCOL
            </p>
          </div>
        </Link>

        {/* Desktop Navigation Links */}
        <nav className="hidden md:flex items-center gap-1 bg-bg-secondary p-1 rounded-xl border border-stark-border">
          {navItems.map((item) => {
            const active =
              pathname === item.to ||
              (item.to !== "/" && pathname.startsWith(item.to));
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`relative px-3.5 py-1.5 rounded-lg text-xs font-semibold tracking-wide transition-all duration-150 flex items-center gap-2 ${
                  active
                    ? "bg-bg-card text-stark-cyan shadow-sm border border-stark-cyan/40"
                    : "text-text-secondary hover:text-text-primary hover:bg-bg-card/70"
                }`}
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
                {active && (
                  <span className="absolute -bottom-[5px] left-1/2 transform -translate-x-1/2 w-4 h-[2px] bg-stark-cyan rounded-full glow-cyan" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Desktop Actions: Theme Toggle + Web3 Wallet Pill */}
        <div className="hidden sm:flex items-center gap-2.5">
          {/* Light / Dark Mode Toggle Button */}
          <button
            type="button"
            onClick={toggleTheme}
            className="p-2 rounded-xl bg-bg-card border border-stark-border hover:border-stark-cyan text-text-secondary hover:text-text-primary transition-all duration-150 flex items-center justify-center shadow-sm"
            title={theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
            aria-label="Toggle Theme"
          >
            {theme === "dark" ? (
              <svg
                className="w-4 h-4 text-amber-400 transition-transform duration-200 hover:rotate-45"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
                />
              </svg>
            ) : (
              <svg
                className="w-4 h-4 text-slate-700 transition-transform duration-200 hover:-rotate-12"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
                />
              </svg>
            )}
          </button>

          {/* Web3 Wallet Pill */}
          {account ? (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-bg-card border border-stark-border text-xs shadow-sm">
              <span className="relative flex h-2 w-2">
                <span
                  className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                    chainOk ? "bg-stark-emerald" : "bg-stark-red"
                  }`}
                />
                <span
                  className={`relative inline-flex rounded-full h-2 w-2 ${
                    chainOk ? "bg-stark-emerald" : "bg-stark-red"
                  }`}
                />
              </span>
              <span className="font-mono text-text-primary">
                {account.slice(0, 6)}...{account.slice(-4)}
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-bg-elevated text-text-secondary border border-stark-border/60">
                {chainOk ? "1337" : "Wrong Net"}
              </span>
            </div>
          ) : isMetaMaskAvailable() ? (
            <button
              onClick={handleConnect}
              disabled={connecting}
              className="px-3.5 py-1.5 rounded-xl bg-stark-cyan/10 hover:bg-stark-cyan/20 border border-stark-cyan/40 text-stark-cyan hover:text-stark-cyan text-xs font-semibold tracking-wide shadow-sm transition-all flex items-center gap-2"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M21 18v1c0 1.1-.9 2-2 2H5c-1.11 0-2-.9-2-2V5c0-1.1.89-2 2-2h14c1.1 0 2 .9 2 2v1h-9c-1.11 0-2 .9-2 2v8c0 1.1.89 2 2 2h9zm-9-2h10V8H12v8zm4-2.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z" />
              </svg>
              <span>{connecting ? "Connecting..." : "Connect MetaMask"}</span>
            </button>
          ) : (
            <span className="text-[11px] font-mono text-text-muted px-2.5 py-1 rounded bg-bg-secondary border border-stark-border">
              No Web3 Provider
            </span>
          )}
        </div>

        {/* Mobile menu and mobile theme toggle */}
        <div className="flex md:hidden items-center gap-2">
          <button
            type="button"
            onClick={toggleTheme}
            className="p-2 min-h-[40px] min-w-[40px] rounded-lg bg-bg-card border border-stark-border text-text-secondary hover:text-text-primary flex items-center justify-center"
            aria-label="Toggle Theme"
          >
            {theme === "dark" ? (
              <svg className="w-4 h-4 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            ) : (
              <svg className="w-4 h-4 text-slate-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
            )}
          </button>

          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="p-2 min-h-[40px] min-w-[40px] rounded-lg bg-bg-card border border-stark-border text-text-secondary hover:text-text-primary flex items-center justify-center"
            aria-label="Toggle Navigation"
          >
            {mobileOpen ? (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="md:hidden bg-bg-secondary border-b border-stark-border px-4 py-3 space-y-1">
          {navItems.map((item) => {
            const active =
              pathname === item.to ||
              (item.to !== "/" && pathname.startsWith(item.to));
            return (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 min-h-[44px] rounded-lg text-sm font-medium ${
                  active
                    ? "bg-bg-card text-stark-cyan border border-stark-cyan/40 shadow-sm"
                    : "text-text-secondary hover:bg-bg-card hover:text-text-primary"
                }`}
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            );
          })}

          <div className="pt-2 border-t border-stark-border mt-2 space-y-2">
            {account ? (
              <div className="text-xs text-text-secondary font-mono px-3 py-2 bg-bg-card rounded-lg border border-stark-border break-all">
                Wallet: {account.slice(0, 10)}...{account.slice(-6)}
              </div>
            ) : isMetaMaskAvailable() ? (
              <button
                onClick={handleConnect}
                className="w-full py-2.5 min-h-[44px] bg-stark-cyan/15 border border-stark-cyan/50 text-stark-cyan rounded-xl text-xs font-semibold flex items-center justify-center"
              >
                Connect MetaMask
              </button>
            ) : null}
          </div>
        </div>
      )}
    </header>
  );
}
