import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { ProtectedRoute } from "./components/ProtectedRoute";

// Layouts
import { AdminLayout } from "./layouts/AdminLayout";
import { ManufacturerLayout } from "./layouts/ManufacturerLayout";
import { ConsumerLayout } from "./layouts/ConsumerLayout";

// Admin Portal Pages
import AdminOverviewPage from "./pages/admin/AdminOverviewPage";
import ManufacturerManagementPage from "./pages/admin/ManufacturerManagementPage";
import ProductManagementPage from "./pages/admin/ProductManagementPage";
import BlockchainManagementPage from "./pages/admin/BlockchainManagementPage";
import SecurityMonitoringPage from "./pages/admin/SecurityMonitoringPage";
import TagManagementPage from "./pages/admin/TagManagementPage";
import AuditLogsPage from "./pages/admin/AuditLogsPage";
import UserManagementPage from "./pages/admin/UserManagementPage";
import SystemSettingsPage from "./pages/admin/SystemSettingsPage";

// Manufacturer Portal Pages
import ManufacturerOverviewPage from "./pages/manufacturer/ManufacturerOverviewPage";
import CompanyProfilePage from "./pages/manufacturer/CompanyProfilePage";
import BrandManagementPage from "./pages/manufacturer/BrandManagementPage";
import ManufacturerProductsPage from "./pages/manufacturer/ManufacturerProductsPage";
import BatchManagementPage from "./pages/manufacturer/BatchManagementPage";
import TagGenerationPage from "./pages/manufacturer/TagGenerationPage";
import NfcEncodingPage from "./pages/manufacturer/NfcEncodingPage";
import ManufacturerTagsPage from "./pages/manufacturer/ManufacturerTagsPage";
import EncodingHistoryPage from "./pages/manufacturer/EncodingHistoryPage";
import ManufacturerAnalyticsPage from "./pages/manufacturer/ManufacturerAnalyticsPage";

// Consumer Portal Pages
import ConsumerHomePage from "./pages/consumer/ConsumerHomePage";
import ConsumerVerifyPage from "./pages/consumer/ConsumerVerifyPage";
import ConsumerResultPage from "./pages/consumer/ConsumerResultPage";
import ConsumerHistoryPage from "./pages/consumer/ConsumerHistoryPage";
import ConsumerReportPage from "./pages/consumer/ConsumerReportPage";
import ConsumerProductsPage from "./pages/consumer/ConsumerProductsPage";
import ConsumerHelpPage from "./pages/consumer/ConsumerHelpPage";
import ConsumerAboutPage from "./pages/consumer/ConsumerAboutPage";

export default function App() {
  return (
    <Routes>
      {/* ── 1. CONSUMER PORTAL (Public Access) ── */}
      <Route element={<ConsumerLayout />}>
        <Route path="/" element={<ConsumerHomePage />} />
        <Route path="/consumer" element={<ConsumerHomePage />} />
        <Route path="/consumer/verify" element={<ConsumerVerifyPage />} />
        <Route path="/consumer/result" element={<ConsumerResultPage />} />
        <Route path="/consumer/history" element={<ConsumerHistoryPage />} />
        <Route path="/consumer/report" element={<ConsumerReportPage />} />
        <Route path="/consumer/products" element={<ConsumerProductsPage />} />
        <Route path="/consumer/help" element={<ConsumerHelpPage />} />
        <Route path="/consumer/about" element={<ConsumerAboutPage />} />

        {/* Backward-compatibility aliases */}
        <Route path="/verify" element={<ConsumerVerifyPage />} />
      </Route>

      {/* ── 2. MANUFACTURER PORTAL (Role Protected) ── */}
      <Route
        path="/manufacturer"
        element={
          <ProtectedRoute allowedRoles={["MANUFACTURER", "ADMIN"]}>
            <ManufacturerLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<ManufacturerOverviewPage />} />
        <Route path="overview" element={<ManufacturerOverviewPage />} />
        <Route path="profile" element={<CompanyProfilePage />} />
        <Route path="brands" element={<BrandManagementPage />} />
        <Route path="products" element={<ManufacturerProductsPage />} />
        <Route path="batches" element={<BatchManagementPage />} />
        <Route path="generate-tags" element={<TagGenerationPage />} />
        <Route path="nfc-encoding" element={<NfcEncodingPage />} />
        <Route path="tags" element={<ManufacturerTagsPage />} />
        <Route path="encoding-history" element={<EncodingHistoryPage />} />
        <Route path="analytics" element={<ManufacturerAnalyticsPage />} />
      </Route>

      {/* ── 3. ADMIN PORTAL (Role Protected) ── */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute allowedRoles={["ADMIN"]}>
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<AdminOverviewPage />} />
        <Route path="overview" element={<AdminOverviewPage />} />
        <Route path="manufacturers" element={<ManufacturerManagementPage />} />
        <Route path="products" element={<ProductManagementPage />} />
        <Route path="blockchain" element={<BlockchainManagementPage />} />
        <Route path="security" element={<SecurityMonitoringPage />} />
        <Route path="tags" element={<TagManagementPage />} />
        <Route path="audit" element={<AuditLogsPage />} />
        <Route path="users" element={<UserManagementPage />} />
        <Route path="settings" element={<SystemSettingsPage />} />
      </Route>

      {/* Backward compatibility for /dashboard */}
      <Route path="/dashboard" element={<Navigate to="/admin/overview" replace />} />

      {/* Catch-all redirect to consumer home */}
      <Route path="*" element={<Navigate to="/consumer" replace />} />
    </Routes>
  );
}
