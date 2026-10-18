import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// API base URL is read from .env at build time via VITE_API_BASE_URL.
// No secrets are in this file.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // Proxy /api calls to the FastAPI backend during development
    proxy: {
      "/api": {
        target: process.env.VITE_API_BASE_URL ?? "http://127.0.0.1:8000",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ""),
      },
    },
  },
});
