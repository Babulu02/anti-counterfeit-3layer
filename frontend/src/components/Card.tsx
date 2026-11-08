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
 * Premium enterprise Card container.
 * Features theme-aware card background, subtle border, corner accents,
 * and high-contrast typography in both Light and Dark themes.
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
      className={`relative bg-bg-card backdrop-blur-md rounded-xl border border-stark-border shadow-card-glow transition-all duration-200 ${
        glow ? "glow-cyan border-stark-cyan/50" : "hover:border-stark-borderStrong"
      } ${className}`}
    >
      {/* Decorative top corner accent */}
      <div className="absolute top-0 right-0 w-8 h-[1px] bg-gradient-to-l from-stark-cyan/40 to-transparent pointer-events-none" />
      <div className="absolute top-0 right-0 w-[1px] h-8 bg-gradient-to-b from-stark-cyan/40 to-transparent pointer-events-none" />

      {(title || action) && (
        <div className="px-3.5 sm:px-5 py-3 sm:py-4 border-b border-stark-border/70 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="flex items-center gap-2.5 min-w-0">
            {icon && <span className="text-stark-cyan shrink-0">{icon}</span>}
            <div className="min-w-0">
              {title && (
                <h3 className="font-semibold text-text-heading text-sm tracking-wide flex items-center gap-2 break-words">
                  {title}
                </h3>
              )}
              {subtitle && (
                <p className="text-xs text-text-secondary mt-0.5 break-words">{subtitle}</p>
              )}
            </div>
          </div>
          {action && <div className="shrink-0 self-start sm:self-auto">{action}</div>}
        </div>
      )}

      <div className="p-3.5 sm:p-5">{children}</div>
    </div>
  );
}
