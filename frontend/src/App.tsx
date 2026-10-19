import { Routes, Route, Link, useLocation } from "react-router-dom";
import ManufacturerPage from "./pages/ManufacturerPage";
import VerifyPage       from "./pages/VerifyPage";
import DashboardPage    from "./pages/DashboardPage";
import DemoPage         from "./pages/DemoPage";
import AdminPage        from "./pages/AdminPage";

/** Top-level nav link — bold/blue when active. */
function NavLink({ to, label }: { to: string; label: string }) {
  const { pathname } = useLocation();
  const active = pathname === to || (to !== "/" && pathname.startsWith(to));
  return (
    <Link
      to={to}
      className={`px-3 py-2 rounded text-sm font-medium transition-colors
        ${active
          ? "bg-sky-600 text-white"
          : "text-gray-600 hover:bg-sky-100 hover:text-sky-700"}`}
    >
      {label}
    </Link>
  );
}

export default function App() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* ── Navigation bar ── */}
      <header className="bg-white shadow-sm sticky top-0 z-20">
        <nav className="max-w-6xl mx-auto px-4 h-14 flex items-center gap-2">
          <img src="/shield.svg" className="h-7 w-7 mr-2" alt="shield" />
          <span className="font-bold text-sky-700 mr-4 text-lg tracking-tight">
            AntiCounterfeit
          </span>
          <NavLink to="/manufacturer" label="Manufacturer" />
          <NavLink to="/verify"       label="Verify" />
          <NavLink to="/dashboard"    label="Dashboard" />
          <NavLink to="/demo"         label="Demo" />
          <NavLink to="/admin"        label="Admin" />
        </nav>
      </header>

      {/* ── Page content ── */}
      <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-6">
        <Routes>
          <Route path="/"             element={<VerifyPage />} />
          <Route path="/manufacturer" element={<ManufacturerPage />} />
          <Route path="/verify"       element={<VerifyPage />} />
          <Route path="/dashboard"    element={<DashboardPage />} />
          <Route path="/demo"         element={<DemoPage />} />
          <Route path="/admin"        element={<AdminPage />} />
        </Routes>
      </main>

      <footer className="text-center text-xs text-gray-400 py-3 border-t">
        Anti-Counterfeit 3-Layer Prototype &mdash; all NFC is emulated, all ML data is simulated
      </footer>
    </div>
  );
}
