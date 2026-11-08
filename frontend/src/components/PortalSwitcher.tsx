import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth, UserRole } from "../lib/auth";

export const PortalSwitcher: React.FC = () => {
  const { role, setRole } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const portals: { role: UserRole; label: string; path: string; icon: string; badge: string; desc: string }[] = [
    {
      role: "ADMIN",
      label: "Admin Portal",
      path: "/admin",
      icon: "🛡️",
      badge: "Governance & Fraud",
      desc: "Smart contracts, manufacturer approvals, telemetry & audit logs",
    },
    {
      role: "MANUFACTURER",
      label: "Manufacturer Portal",
      path: "/manufacturer",
      icon: "🏭",
      badge: "Production & NFC",
      desc: "Batch enrollment, dynamic QR generation, AuthentiCoding NFC",
    },
    {
      role: "CONSUMER",
      label: "Consumer Portal",
      path: "/consumer",
      icon: "👤",
      badge: "Product Verification",
      desc: "Public authentication, multi-signal camera verification & reporting",
    },
  ];

  const currentPortal = portals.find((p) => p.role === role) || portals[2];

  const handleSelect = (p: typeof portals[0]) => {
    setRole(p.role);
    setDropdownOpen(false);
    navigate(p.path);
  };

  return (
    <div className="relative inline-block text-left">
      <button
        type="button"
        onClick={() => setDropdownOpen(!dropdownOpen)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-bg-card hover:bg-bg-elevated border border-stark-border text-xs font-mono transition-all shadow-sm group"
        title="Switch Portal Role"
      >
        <span className="text-sm">{currentPortal.icon}</span>
        <span className="font-semibold text-text-heading group-hover:text-stark-cyan transition-colors">
          {currentPortal.label}
        </span>
        <span className="text-[10px] px-1.5 py-0.5 rounded bg-stark-cyan/10 text-stark-cyan border border-stark-cyan/20">
          {role}
        </span>
        <svg
          className={`w-3.5 h-3.5 text-text-muted transition-transform duration-200 ${
            dropdownOpen ? "rotate-180" : ""
          }`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {dropdownOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setDropdownOpen(false)}
          />
          <div className="absolute right-0 mt-2 w-72 rounded-2xl bg-bg-card border border-stark-border shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95 duration-100">
            <div className="px-3 py-2 border-b border-stark-border/60">
              <span className="text-[10px] font-mono tracking-wider text-text-muted uppercase block">
                AETHER // ROLE PORTAL SELECTOR
              </span>
              <p className="text-xs text-text-secondary mt-0.5">
                Switch workspaces according to your operational permission.
              </p>
            </div>
            <div className="py-1 space-y-1">
              {portals.map((p) => {
                const isActive = p.role === role;
                return (
                  <button
                    key={p.role}
                    type="button"
                    onClick={() => handleSelect(p)}
                    className={`w-full text-left p-2.5 rounded-xl transition-all flex items-start gap-3 ${
                      isActive
                        ? "bg-stark-cyan/10 border border-stark-cyan/30 text-stark-cyan"
                        : "hover:bg-bg-elevated text-text-heading border border-transparent"
                    }`}
                  >
                    <span className="text-xl mt-0.5">{p.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold">{p.label}</span>
                        {isActive && (
                          <span className="text-[10px] font-mono text-stark-cyan">Active</span>
                        )}
                      </div>
                      <p className="text-[11px] text-text-secondary leading-tight mt-0.5">
                        {p.desc}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

