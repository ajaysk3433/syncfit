import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { getApiBaseUrl, setApiBaseUrl } from "../../api/client";
import {
  Server,
  LogOut,
  Settings,
  QrCode,
  RefreshCw,
  User,
} from "lucide-react";
import { Modal } from "./Modal";
import { RoleBadge } from "./Badge";

export const Navbar = ({ onOpenCheckIn }) => {
  const {
    activeRole,
    activeUserEmail,
    activeUserName,
    backendHealth,
    checkBackendHealth,
    signOut,
  } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [apiUrlInput, setApiUrlInput] = useState(getApiBaseUrl());
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
      toast.info("Signed out of Firebase");
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
            title="Click to view Backend API status"
            style={{ border: "none", cursor: "pointer", background: "rgba(255,255,255,0.06)" }}
          >
            <span
              className={`dot-indicator ${backendHealth.status === "HEALTHY" ? "healthy" : "offline"
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
          {/* <button
            className="btn btn-emerald btn-sm"
            onClick={onOpenCheckIn}
            id="quick-check-in-btn"
          >
            <QrCode size={15} />
            <span>Fast Check-In</span>
          </button> */}

          {/* Settings / API Config Modal Toggle */}
          {/* <button
            className="btn-icon"
            onClick={() => setIsConfigOpen(true)}
            title="Backend Configuration"
          >
            <Settings size={17} />
          </button> */}

          {/* User Profile & Role Info */}
          <div style={{ display: "flex", alignItems: "center", gap: "12px", paddingLeft: "12px", borderLeft: "1px solid var(--border-subtle)" }}>
            <div
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "50%",
                background: "linear-gradient(135deg, rgba(6, 182, 212, 0.2) 0%, rgba(59, 130, 246, 0.2) 100%)",
                border: "1px solid rgba(6, 182, 212, 0.35)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--accent-cyan)",
                fontWeight: 700,
                fontSize: "14px",
              }}
            >
              {activeUserName ? activeUserName.charAt(0).toUpperCase() : <User size={16} />}
            </div>

            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
              <span style={{ fontSize: "13px", fontWeight: 700, color: "var(--text-primary)", lineHeight: 1.2 }}>
                {activeUserName || "Staff User"}
              </span>
              <span style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "2px" }}>
                {activeUserEmail}
              </span>
            </div>

            <RoleBadge role={activeRole} />

            <button
              className="btn btn-secondary btn-sm"
              onClick={handleLogout}
              title="Sign Out"
              style={{ marginLeft: "4px" }}
            >
              <LogOut size={14} style={{ color: "#f87171" }} />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </header>

      {/* Backend Configuration Modal */}
      {/* <Modal
        isOpen={isConfigOpen}
        onClose={() => setIsConfigOpen(false)}
        title="Backend & Connection Status"
        icon={<Server size={20} />}
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setIsConfigOpen(false)}>
              Cancel
            </button>
            <button className="btn btn-primary" onClick={handleSaveConfig}>
              Save
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
              Requests are securely signed with your Firebase ID token in the <code>Authorization: Bearer</code> header.
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
                className={`badge ${backendHealth.status === "HEALTHY" ? "badge-active" : "badge-suspended"
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
        </div>
      </Modal> */}
    </>
  );
};
