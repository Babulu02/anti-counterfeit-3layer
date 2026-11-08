import React from "react";
import { Link, Navigate } from "react-router-dom";
import { useAuth, UserRole } from "../lib/auth";

interface ProtectedRouteProps {
  children: React.ReactElement;
  allowedRoles: UserRole[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
  const { role, setRole, isOwner, isWhitelistedManufacturer } = useAuth();

  const isAllowed = allowedRoles.includes(role);

  if (!isAllowed) {
    const requiredRole = allowedRoles[0];
    return (
      <div className="max-w-xl mx-auto my-12 p-8 rounded-2xl bg-bg-card border border-stark-border shadow-xl text-center space-y-6">
        <div className="w-16 h-16 mx-auto rounded-full bg-stark-amber/10 border border-stark-amber/30 flex items-center justify-center text-3xl">
          🔒
        </div>
        <div>
          <span className="text-[11px] font-mono tracking-widest text-stark-amber uppercase bg-stark-amber/10 px-2.5 py-1 rounded border border-stark-amber/30">
            ACCESS RESTRICTED // {requiredRole} PORTAL
          </span>
          <h2 className="text-xl font-bold text-text-heading mt-3">
            Role Permission Required
          </h2>
          <p className="text-xs text-text-secondary mt-2 leading-relaxed">
            This workspace is reserved for authorized <strong className="text-text-heading">{allowedRoles.join(" or ")}</strong> personnel.
            Your current active session is in <strong className="text-stark-cyan">{role}</strong> mode.
          </p>
        </div>

        <div className="p-4 rounded-xl bg-bg-main border border-stark-border text-left text-xs space-y-2">
          <p className="font-semibold text-text-heading flex items-center gap-2">
            <span>🛡️</span> Role-Based Access Control:
          </p>
          <ul className="list-disc list-inside space-y-1 text-text-secondary text-[11px]">
            <li>Consumers cannot access administrative or manufacturer governance workflows.</li>
            <li>Manufacturers are restricted to batch and product enrollment operations.</li>
            <li>Administrators hold platform-wide security and contract whitelist privileges.</li>
          </ul>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <button
            type="button"
            onClick={() => setRole(requiredRole)}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-stark-cyan text-white text-xs font-bold tracking-wide hover:bg-stark-cyan/90 transition-all shadow-md flex items-center justify-center gap-2"
          >
            <span>⚡</span>
            <span>Switch to {requiredRole} Portal</span>
          </button>
          <Link
            to="/consumer"
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-bg-elevated hover:bg-bg-secondary border border-stark-border text-xs font-semibold text-text-secondary transition-all"
          >
            Return to Consumer Portal
          </Link>
        </div>
      </div>
    );
  }

  return children;
};

