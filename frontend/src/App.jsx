import React, { useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ToastProvider } from "./context/ToastContext";
import { AuthProvider } from "./context/AuthContext";
import { Navbar } from "./components/common/Navbar";
import { Sidebar } from "./components/common/Sidebar";
import { QuickCheckInModal } from "./components/attendance/QuickCheckInModal";
import { attendanceApi } from "./api/attendanceApi";
import { useToast } from "./context/ToastContext";

// Pages
import { DashboardPage } from "./pages/DashboardPage";
import { MembersPage } from "./pages/MembersPage";
import { PlansPage } from "./pages/PlansPage";
import { AttendancePage } from "./pages/AttendancePage";
import { AnalyticsPage } from "./pages/AnalyticsPage";
import { SwaggerPage } from "./pages/SwaggerPage";
import { LoginPage } from "./pages/LoginPage";

import "./styles/index.css";
import "./styles/components.css";
import "./styles/animations.css";

function AppLayout() {
  const toast = useToast();
  const [isQuickCheckInOpen, setIsQuickCheckInOpen] = useState(false);

  const handleGlobalCheckInSuccess = async (payload) => {
    const res = await attendanceApi.checkIn(payload);
    toast.success("Check-in recorded successfully!");
    return res;
  };

  return (
    <div className="app-container">
      <Sidebar />
      <div className="main-content">
        <Navbar onOpenCheckIn={() => setIsQuickCheckInOpen(true)} />
        <main className="page-body">
          <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/members" element={<MembersPage />} />
            <Route path="/plans" element={<PlansPage />} />
            <Route path="/attendance" element={<AttendancePage />} />
            <Route path="/analytics" element={<AnalyticsPage />} />
            <Route path="/docs" element={<SwaggerPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>

      <QuickCheckInModal
        isOpen={isQuickCheckInOpen}
        onClose={() => setIsQuickCheckInOpen(false)}
        onCheckInSuccess={handleGlobalCheckInSuccess}
      />
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/*" element={<AppLayout />} />
          </Routes>
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}
