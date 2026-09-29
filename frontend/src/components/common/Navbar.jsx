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
  Building,
  Copy,
  Check,
} from "lucide-react";
import { Modal } from "./Modal";
import { RoleBadge } from "./Badge";

export const Navbar = ({ onOpenCheckIn }) => {
  const {
    activeRole,
    activeUserEmail,
    activeUserName,
    activeGym,
    gymCode,
    backendHealth,
    checkBackendHealth,
    signOut,
  } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const [copiedGymId, setCopiedGymId] = useState(false);
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [apiUrlInput, setApiUrlInput] = useState(getApiBaseUrl());
  const [testingHealth, setTestingHealth] = useState(false);

  const handleCopyGymId = () => {
    const code = gymCode || activeGym?.code;
    if (!code) return;
    navigator.clipboard.writeText(code);
    setCopiedGymId(true);
    toast.success(`Gym ID ${code} copied! Share with your members for mobile login.`);
    setTimeout(() => setCopiedGymId(false), 2200);
  };

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
          {/* Alphanumeric Gym ID Pill with Quick Copy */}
          {(gymCode || activeGym?.code) && (
            <button
              className="btn btn-secondary btn-sm"
              onClick={handleCopyGymId}
              title={`Unique Gym ID: ${gymCode || activeGym?.code}. Click to copy for members.`}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                borderColor: copiedGymId ? "#10b981" : "rgba(6, 182, 212, 0.4)",
                background: copiedGymId ? "rgba(16, 185, 129, 0.15)" : "rgba(6, 182, 212, 0.08)",
                color: copiedGymId ? "#10b981" : "var(--text-primary)",
              }}
            >
              <Building size={14} style={{ color: copiedGymId ? "#10b981" : "var(--accent-cyan)" }} />
              <span>Gym ID: <strong style={{ color: "var(--accent-cyan)", fontFamily: "monospace" }}>{gymCode || activeGym?.code}</strong></span>
              {copiedGymId ? <Check size={13} style={{ color: "#10b981" }} /> : <Copy size={13} />}
            </button>
          )}

          <button
            className="btn btn-secondary btn-sm"
            onClick={() => navigate("/gym-qr")}
            title="Generate & Print Facility QR Code"
            style={{ display: "flex", alignItems: "center", gap: "6px" }}
          >
            <QrCode size={15} style={{ color: "var(--accent-cyan)" }} />
            <span>Facility QR Pass</span>
          </button>

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
