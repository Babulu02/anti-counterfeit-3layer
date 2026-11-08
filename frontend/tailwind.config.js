/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      screens: {
        xs: "480px",
      },
      colors: {
        bg: {
          main: "var(--bg-main)",
          secondary: "var(--bg-secondary)",
          card: "var(--bg-card)",
          elevated: "var(--bg-elevated)",
          input: "var(--bg-input)",
        },
        stark: {
          cyan: "var(--primary)",
          primary: "var(--primary)",
          hover: "var(--primary-hover)",
          blue: "#168BFF",
          border: "var(--border)",
          borderStrong: "var(--border-strong)",
          emerald: "var(--success)",
          amber: "var(--warning)",
          red: "var(--danger)",
        },
        text: {
          primary: "var(--text-primary)",
          heading: "var(--heading)",
          secondary: "var(--text-secondary)",
          muted: "var(--text-muted)",
        },
      },
      fontFamily: {
        sans: ["Inter", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "sans-serif"],
        mono: ["JetBrains Mono", "SFMono-Regular", "Menlo", "Monaco", "Consolas", "monospace"],
      },
      boxShadow: {
        "stark-glow": "var(--stark-glow)",
        "stark-sm": "var(--stark-sm)",
        "card-glow": "var(--card-shadow)",
      },
      animation: {
        "pulse-subtle": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "scanner-line": "scanLine 2s linear infinite",
      },
      keyframes: {
        scanLine: {
          "0%": { transform: "translateY(0%)" },
          "50%": { transform: "translateY(100%)" },
          "100%": { transform: "translateY(0%)" },
        },
      },
    },
  },
  plugins: [],
};
