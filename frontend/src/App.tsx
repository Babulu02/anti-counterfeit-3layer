import { Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar";
import ManufacturerPage from "./pages/ManufacturerPage";
import VerifyPage from "./pages/VerifyPage";
import ConsumerPage from "./pages/ConsumerPage";
import DashboardPage from "./pages/DashboardPage";
import AdminPage from "./pages/AdminPage";

export default function App() {
  return (
    <div className="min-h-screen flex flex-col bg-[#080D14] text-[#F1F6FC] selection:bg-[#00BFFF]/20 selection:text-[#00BFFF]">
      {/* ── Fixed Stark-Tech Navigation Bar ── */}
      <Navbar />

      {/* ── Main Application Workspace ── */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-6 sm:py-8">
        <Routes>
          <Route path="/" element={<VerifyPage />} />
          <Route path="/manufacturer" element={<ManufacturerPage />} />
          <Route path="/verify" element={<VerifyPage />} />
          <Route path="/consumer" element={<ConsumerPage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/admin" element={<AdminPage />} />
          {/* Catch-all redirect to verify */}
          <Route path="*" element={<VerifyPage />} />
        </Routes>
      </main>

      {/* ── Futuristic Telemetry Footer ── */}
      <footer className="border-t border-[#26384B] bg-[#0D1520]/80 backdrop-blur-md py-4 text-center">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs font-mono text-[#5B708B]">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[#00BFFF] animate-pulse" />
            <span>AETHER PROTOCOL // THREE-LAYER CRYPTOGRAPHIC ARCHITECTURE</span>
          </div>
          <div>
            <span>ETHEREUM EVM 1337 &bull; NTAG 424 SUN &bull; FUSION AI ENGINE</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
