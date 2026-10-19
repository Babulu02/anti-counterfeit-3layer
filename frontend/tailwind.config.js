/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: {
          main: "#080D14",
          secondary: "#0D1520",
          card: "#111C29",
          elevated: "#172536",
        },
        stark: {
          cyan: "#00BFFF",
          blue: "#168BFF",
          border: "#26384B",
          emerald: "#10B981",
          amber: "#F59E0B",
          red: "#EF4444",
        },
        text: {
          primary: "#F1F6FC",
          secondary: "#9BAFC5",
          muted: "#5B708B",
        },
      },
      fontFamily: {
        sans: ["Inter", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "sans-serif"],
        mono: ["JetBrains Mono", "SFMono-Regular", "Menlo", "Monaco", "Consolas", "monospace"],
      },
      boxShadow: {
        "stark-glow": "0 0 20px rgba(0, 191, 255, 0.18)",
        "stark-sm": "0 0 10px rgba(0, 191, 255, 0.12)",
        "card-glow": "0 4px 20px rgba(0, 0, 0, 0.4), 0 0 1px rgba(38, 56, 75, 0.8)",
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
