import React from "react";

interface CardProps {
  title?: string;
  subtitle?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  glow?: boolean;
}

/**
 * Stark-Tech inspired Card container.
 * Features deep obsidian background (#111C29), cybernetic border (#26384B),
 * and subtle corner accents.
 */
export default function Card({
  title,
  subtitle,
  icon,
  action,
  children,
  className = "",
  glow = false,
}: CardProps) {
  return (
    <div
      className={`relative bg-[#111C29]/95 backdrop-blur-md rounded-xl border border-[#26384B] transition-all duration-200 ${
        glow ? "glow-cyan border-[#00BFFF]/50" : "hover:border-[#26384B]/90"
      } ${className}`}
    >
      {/* Decorative top corner accent */}
      <div className="absolute top-0 right-0 w-8 h-[1px] bg-gradient-to-l from-[#00BFFF]/40 to-transparent pointer-events-none" />
      <div className="absolute top-0 right-0 w-[1px] h-8 bg-gradient-to-b from-[#00BFFF]/40 to-transparent pointer-events-none" />

      {(title || action) && (
        <div className="px-5 py-4 border-b border-[#26384B]/70 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            {icon && <span className="text-[#00BFFF] shrink-0">{icon}</span>}
            <div className="min-w-0">
              {title && (
                <h3 className="font-semibold text-[#F1F6FC] text-sm tracking-wide flex items-center gap-2 truncate">
                  {title}
                </h3>
              )}
              {subtitle && (
                <p className="text-xs text-[#9BAFC5] mt-0.5 truncate">{subtitle}</p>
              )}
            </div>
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </div>
      )}

      <div className="p-5">{children}</div>
    </div>
  );
}
