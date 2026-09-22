import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth, PRESET_DEV_ROLES } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { getApiBaseUrl, setApiBaseUrl } from "../../api/client";
import {
  Server,
  LogOut,
  Settings,
  QrCode,
  Shield,
  RefreshCw,
} from "lucide-react";
import { Modal } from "./Modal";

export const Navbar = ({ onOpenCheckIn }) => {
  const {
    currentUser,
    devUser,
    activeRole,
    activeUserEmail,
    backendHealth,
    checkBackendHealth,
    signOut,
    switchDevRole,
  } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [apiUrlInput, setApiUrlInput] = useState(getApiBaseUrl());
  const [customUserId, setCustomUserId] = useState("");
  const [testingHealth, setTestingHealth] = useState(false);

  const handleSaveConfig = () => {
    setApiBaseUrl(apiUrlInput);
    toast.success("API configuration updated");
    checkBackendHealth();
    setIsConfigOpen(false);
  };

  const handleTestBackend = async () => {
    setTestingHealth(true);
    const ok = await checkBackendHealth();
    setTestingHealth(false);
    if (ok) {
      toast.success("Connected to SyncFit Backend API!");
    } else {
      toast.error("Could not reach backend at " + apiUrlInput);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut();
      toast.info("Signed out");
      navigate("/login");
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <>
      <header className="navbar">
        <div className="nav-brand-group">
          {/* Backend Health Status Pill */}
          <button
            className={`health-pill ${backendHealth.status === "HEALTHY" ? "healthy" : "offline"}`}
            onClick={() => setIsConfigOpen(true)}
            title="Click to configure Backend URL or test connection"
            style={{ border: "none", cursor: "pointer", background: "rgba(255,255,255,0.06)" }}
          >
            <span
              className={`dot-indicator ${
                backendHealth.status === "HEALTHY" ? "healthy" : "offline"
              }`}
            />
            <span>
              {backendHealth.status === "HEALTHY"
                ? "API Live"
                : backendHealth.status === "OFFLINE"
                ? "API Offline"
                : "Checking API"}
            </span>
          </button>
        </div>

        <div className="nav-actions-group">
          {/* Quick Check-In Station Button */}
          <button
            className="btn btn-emerald btn-sm"
            onClick={onOpenCheckIn}
            id="quick-check-in-btn"
          >
            <QrCode size={15} />
            <span>Fast Check-In</span>
          </button>

          {/* Dev Role Quick Switcher */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontSize: "12px", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "4px" }}>
              <Shield size={13} />
              Role:
            </span>
            <select
              className="select"
              value={devUser?.userId || (currentUser ? "FIREBASE" : "")}
              onChange={(e) => {
                const val = e.target.value;
                if (val === "FIREBASE") return;
                switchDevRole(val);
                toast.info(`Switched active context to ${val}`);
              }}
              style={{
                fontSize: "12px",
                padding: "6px 10px",
                width: "auto",
                height: "32px",
                background: "rgba(15, 23, 42, 0.9)",
                borderColor: "rgba(255, 255, 255, 0.15)",
              }}
            >
              {currentUser && (
                <option value="FIREBASE">
                  Firebase: {currentUser.email?.split("@")[0]}
                </option>
              )}
              {PRESET_DEV_ROLES.map((role) => (
                <option key={role.userId} value={role.userId}>
                  {role.label}
                </option>
              ))}
            </select>
          </div>

          {/* Settings / API Config Modal Toggle */}
          <button
            className="btn-icon"
            onClick={() => setIsConfigOpen(true)}
            title="Backend Configuration"
          >
            <Settings size={17} />
          </button>

          {/* User Profile / Logout */}
          <div style={{ display: "flex", alignItems: "center", gap: "10px", paddingLeft: "8px", borderLeft: "1px solid var(--border-subtle)" }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
              <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-primary)" }}>
                {activeUserEmail || "Staff User"}
              </span>
              <span style={{ fontSize: "11px", color: "var(--accent-cyan)", textTransform: "uppercase", fontWeight: 700 }}>
                {activeRole}
              </span>
            </div>

            {currentUser ? (
              <button
                className="btn-icon"
                onClick={handleLogout}
                title="Sign Out"
                style={{ color: "#f87171" }}
              >
                <LogOut size={16} />
              </button>
            ) : (
              <Link to="/login" className="btn btn-ghost btn-sm">
                Login
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Backend & Dev Mode Configuration Modal */}
      <Modal
        isOpen={isConfigOpen}
        onClose={() => setIsConfigOpen(false)}
        title="Backend & Connection Settings"
        icon={<Server size={20} />}
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setIsConfigOpen(false)}>
              Cancel
            </button>
            <button className="btn btn-primary" onClick={handleSaveConfig}>
              Save Settings
            </button>
          </>
        }
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
          <div className="form-group">
            <label className="form-label">Backend API Base URL</label>
            <div style={{ display: "flex", gap: "10px" }}>
              <input
                type="text"
                className="input"
                value={apiUrlInput}
                onChange={(e) => setApiUrlInput(e.target.value)}
                placeholder="http://localhost:8080"
              />
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleTestBackend}
                disabled={testingHealth}
              >
                <RefreshCw size={14} className={testingHealth ? "spinner" : ""} />
                Test
              </button>
            </div>
            <span style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "6px", display: "block" }}>
              Default: <code>http://localhost:8080</code>. Swagger UI is hosted at <code>/docs</code>.
            </span>
          </div>

          <div
            style={{
              padding: "14px",
              borderRadius: "var(--radius-md)",
              background: "rgba(255, 255, 255, 0.03)",
              border: "1px solid var(--border-subtle)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
              <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-secondary)" }}>
                Server Status
              </span>
              <span
                className={`badge ${
                  backendHealth.status === "HEALTHY" ? "badge-active" : "badge-suspended"
                }`}
              >
                {backendHealth.status}
              </span>
            </div>
            {backendHealth.timestamp && (
              <p style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                Server Timestamp: {new Date(backendHealth.timestamp).toLocaleString()}
              </p>
            )}
            {backendHealth.error && (
              <p style={{ fontSize: "12px", color: "var(--accent-rose)", marginTop: "4px" }}>
                Error: {backendHealth.error}
              </p>
            )}
          </div>

          <div className="form-group">
            <label className="form-label">Custom Dev User ID Bypass Header (x-user-id)</label>
            <div style={{ display: "flex", gap: "10px" }}>
              <input
                type="text"
                className="input"
                value={customUserId}
                onChange={(e) => setCustomUserId(e.target.value)}
                placeholder="Enter User UUID from database..."
              />
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  if (customUserId) {
                    switchDevRole(customUserId);
                    toast.success("Custom Dev User ID activated");
                  }
                }}
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      </Modal>
    </>
  );
};
