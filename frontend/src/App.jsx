import React, { useState } from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { ToastProvider, useToast } from "./context/ToastContext";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { Navbar } from "./components/common/Navbar";
import { Sidebar } from "./components/common/Sidebar";
import { QuickCheckInModal } from "./components/attendance/QuickCheckInModal";
import { attendanceApi } from "./api/attendanceApi";
import { LoadingSpinner } from "./components/common/LoadingSpinner";

// Pages
import { DashboardPage } from "./pages/DashboardPage";
import { MembersPage } from "./pages/MembersPage";
import { PlansPage } from "./pages/PlansPage";
import { AttendancePage } from "./pages/AttendancePage";
import { AnalyticsPage } from "./pages/AnalyticsPage";
import { SwaggerPage } from "./pages/SwaggerPage";
import { LoginPage } from "./pages/LoginPage";
import { GymQrPage } from "./pages/GymQrPage";

import "./styles/index.css";
import "./styles/components.css";
import "./styles/animations.css";
import "./styles/qr-print.css";

// Protected Route Guard - Strictly requires authenticated Firebase user
function ProtectedRoute({ children }) {
  const { currentUser, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <LoadingSpinner text="Verifying authentication credentials..." />
      </div>
    );
  }

  if (!currentUser) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
}

// Public Route Guard - Redirects logged-in users away from /login
function PublicRoute({ children }) {
  const { currentUser, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <LoadingSpinner text="Loading..." />
      </div>
    );
  }

  if (currentUser) {
    return <Navigate to="/" replace />;
  }

  return children;
}

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
            <Route path="/gym-qr" element={<GymQrPage />} />
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
            {/* Login is public only */}
            <Route
              path="/login"
              element={
                <PublicRoute>
                  <LoginPage />
                </PublicRoute>
              }
            />

            {/* All other routes strictly protected by Firebase Auth */}
            <Route
              path="/*"
              element={
                <ProtectedRoute>
                  <AppLayout />
                </ProtectedRoute>
              }
            />
          </Routes>
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}
