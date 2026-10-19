import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  isMetaMaskAvailable,
  connectMetaMask,
  ensureCorrectChain,
} from "../lib/metamask";

export default function Navbar() {
  const { pathname } = useLocation();
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

  // Exact navigation order specified by user:
  // 1. Manufacturer
  // 2. Verify
  // 3. Consumer
  // 4. Dashboard
  // 5. Admin
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
    <header className="sticky top-0 z-50 bg-[#080D14]/90 backdrop-blur-xl border-b border-[#26384B]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        {/* Brand logo & Stark-Tech badge */}
        <Link to="/verify" className="flex items-center gap-3 group shrink-0">
          <div className="relative w-9 h-9 rounded-lg bg-[#111C29] border border-[#26384B] flex items-center justify-center overflow-hidden group-hover:border-[#00BFFF] group-hover:shadow-[0_0_15px_rgba(0,191,255,0.3)] transition-all">
            {/* Glowing inner core */}
            <div className="absolute inset-0 bg-gradient-to-br from-[#00BFFF]/20 to-transparent" />
            <svg
              className="w-5 h-5 text-[#00BFFF] relative z-10"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M12 2L4 6v6.09c0 5.05 3.41 9.76 8 10.91 4.59-1.15 8-5.86 8-10.91V6l-8-4zm0 2.18l6 3v4.91c0 4.14-2.73 8.01-6 9.07-3.27-1.06-6-4.93-6-9.07V7.18l6-3z" />
              <circle cx="12" cy="11.5" r="3" fill="#00BFFF" opacity="0.8" />
            </svg>
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold tracking-wider text-base text-[#F1F6FC] group-hover:text-[#00BFFF] transition-colors">
                AETHER
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#172536] text-[#00BFFF] border border-[#26384B]">
                v3.0
              </span>
            </div>
            <p className="text-[10px] font-mono text-[#9BAFC5] tracking-tight -mt-0.5">
              STARK // SECURITY PROTOCOL
            </p>
          </div>
        </Link>

        {/* Desktop Navigation Links */}
        <nav className="hidden md:flex items-center gap-1 bg-[#0D1520] p-1 rounded-xl border border-[#26384B]/80">
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
                    ? "bg-[#172536] text-[#00BFFF] shadow-[0_0_12px_rgba(0,191,255,0.2)] border border-[#00BFFF]/40"
                    : "text-[#9BAFC5] hover:text-[#F1F6FC] hover:bg-[#111C29]"
                }`}
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
                {active && (
                  <span className="absolute -bottom-[5px] left-1/2 transform -translate-x-1/2 w-4 h-[2px] bg-[#00BFFF] rounded-full glow-cyan" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Web3 Wallet Pill */}
        <div className="hidden sm:flex items-center gap-3">
          {account ? (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#111C29] border border-[#26384B] text-xs">
              <span className="relative flex h-2 w-2">
                <span
                  className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                    chainOk ? "bg-[#10B981]" : "bg-[#EF4444]"
                  }`}
                />
                <span
                  className={`relative inline-flex rounded-full h-2 w-2 ${
                    chainOk ? "bg-[#10B981]" : "bg-[#EF4444]"
                  }`}
                />
              </span>
              <span className="font-mono text-[#F1F6FC]">
                {account.slice(0, 6)}...{account.slice(-4)}
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#172536] text-[#9BAFC5]">
                {chainOk ? "1337" : "Wrong Net"}
              </span>
            </div>
          ) : isMetaMaskAvailable() ? (
            <button
              onClick={handleConnect}
              disabled={connecting}
              className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-[#00BFFF]/10 to-[#168BFF]/20 hover:from-[#00BFFF]/20 hover:to-[#168BFF]/30 border border-[#00BFFF]/40 text-[#00BFFF] hover:text-[#F1F6FC] text-xs font-semibold tracking-wide shadow-sm transition-all flex items-center gap-2"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M21 18v1c0 1.1-.9 2-2 2H5c-1.11 0-2-.9-2-2V5c0-1.1.89-2 2-2h14c1.1 0 2 .9 2 2v1h-9c-1.11 0-2 .9-2 2v8c0 1.1.89 2 2 2h9zm-9-2h10V8H12v8zm4-2.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z" />
              </svg>
              <span>{connecting ? "Connecting..." : "Connect MetaMask"}</span>
            </button>
          ) : (
            <span className="text-[11px] font-mono text-[#5B708B] px-2.5 py-1 rounded bg-[#0D1520] border border-[#26384B]">
              No Web3 Provider
            </span>
          )}
        </div>

        {/* Mobile menu button */}
        <div className="flex md:hidden items-center">
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="p-2 rounded-lg bg-[#111C29] border border-[#26384B] text-[#9BAFC5] hover:text-[#F1F6FC]"
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
        <div className="md:hidden bg-[#0D1520] border-b border-[#26384B] px-4 py-3 space-y-1">
          {navItems.map((item) => {
            const active =
              pathname === item.to ||
              (item.to !== "/" && pathname.startsWith(item.to));
            return (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium ${
                  active
                    ? "bg-[#172536] text-[#00BFFF] border border-[#00BFFF]/30"
                    : "text-[#9BAFC5] hover:bg-[#111C29] hover:text-[#F1F6FC]"
                }`}
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            );
          })}

          <div className="pt-2 border-t border-[#26384B] mt-2">
            {account ? (
              <div className="text-xs text-[#9BAFC5] font-mono px-3 py-1.5 bg-[#111C29] rounded border border-[#26384B]">
                Wallet: {account.slice(0, 10)}...{account.slice(-6)}
              </div>
            ) : isMetaMaskAvailable() ? (
              <button
                onClick={handleConnect}
                className="w-full py-2 bg-[#00BFFF]/20 border border-[#00BFFF]/50 text-[#00BFFF] rounded-lg text-xs font-semibold"
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
