import React, { useState, useEffect, useRef, useCallback } from "react";
import { QRCodeCanvas, QRCodeSVG } from "qrcode.react";
import {
  Printer,
  Download,
  RefreshCw,
  Copy,
  Check,
  Dumbbell,
  ShieldCheck,
  Sliders,
  Sparkles,
  Info,
  Maximize2,
  AlertTriangle,
} from "lucide-react";
import { gymApi } from "../api/gymApi";
import { useToast } from "../context/ToastContext";
import { LoadingSpinner } from "../components/common/LoadingSpinner";
import "../styles/qr-print.css";

export const GymQrPage = () => {
  const toast = useToast();
  const [gymData, setGymData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [regenerating, setRegenerating] = useState(false);
  const [showRegenModal, setShowRegenModal] = useState(false);
  const [copied, setCopied] = useState(false);

  // Customization controls
  const [format, setFormat] = useState("poster"); // 'poster' | 'counter' | 'badge'
  const [theme, setTheme] = useState("dark"); // 'dark' | 'light' | 'emerald'
  const [customNote, setCustomNote] = useState(
    "Hold your mobile device 6–8 inches away from the scanner. Turnstiles unlock immediately upon check-in verification."
  );
  const [qrSize, setQrSize] = useState(240);

  const canvasRef = useRef(null);

  const loadGymQr = useCallback(async () => {
    try {
      setLoading(true);
      const res = await gymApi.getGymQr();
      if (res?.data) {
        setGymData(res.data);
      } else if (res) {
        setGymData(res);
      }
    } catch (err) {
      console.error("Failed to load gym QR:", err);
      toast.error("Could not load facility QR data. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadGymQr();
  }, [loadGymQr]);

  // Handle QR Regeneration
  const handleRegenerate = async () => {
    try {
      setRegenerating(true);
      const res = await gymApi.regenerateGymQr(gymData?.gymId);
      if (res) {
        setGymData((prev) => ({
          ...prev,
          ...(res.data || res),
        }));
        toast.success("Facility QR code regenerated successfully!");
        setShowRegenModal(false);
      }
    } catch (err) {
      console.error("Regenerate failed:", err);
      toast.error(err.message || "Failed to regenerate facility QR code.");
    } finally {
      setRegenerating(false);
    }
  };

  // Download High-Resolution PNG
  const handleDownloadPng = () => {
    try {
      // Find the canvas element inside the ref or document
      const canvas = document.querySelector("#hidden-highres-canvas canvas") || canvasRef.current;
      if (!canvas) {
        toast.error("Canvas element not ready for download.");
        return;
      }

      // Create a high-res composite canvas with brand, gym name, and QR
      const exportCanvas = document.createElement("canvas");
      const exportWidth = 1000;
      const exportHeight = 1300;
      exportCanvas.width = exportWidth;
      exportCanvas.height = exportHeight;
      const ctx = exportCanvas.getContext("2d");

      // Background
      ctx.fillStyle = theme === "light" ? "#ffffff" : "#0d1322";
      ctx.fillRect(0, 0, exportWidth, exportHeight);

      // Border frame
      ctx.strokeStyle = theme === "light" ? "#000000" : "#06b6d4";
      ctx.lineWidth = 12;
      ctx.strokeRect(24, 24, exportWidth - 48, exportHeight - 48);

      // Title & Header
      ctx.fillStyle = theme === "light" ? "#000000" : "#ffffff";
      ctx.font = "bold 52px system-ui, -apple-system, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("SYNCFIT TURNSTILE ACCESS", exportWidth / 2, 120);

      // Facility Name
      ctx.fillStyle = theme === "light" ? "#1e293b" : "#06b6d4";
      ctx.font = "bold 44px system-ui, -apple-system, sans-serif";
      ctx.fillText(gymData?.name || "SyncFit Flagship Gym", exportWidth / 2, 190);

      // Address / Subtitle
      ctx.fillStyle = theme === "light" ? "#475569" : "#94a3b8";
      ctx.font = "24px system-ui, -apple-system, sans-serif";
      ctx.fillText(
        gymData?.displayLocation || gymData?.address || "Facility Entrance & Check-In",
        exportWidth / 2,
        240
      );

      // Draw QR Code in Center
      const qrDrawSize = 560;
      const qrX = (exportWidth - qrDrawSize) / 2;
      const qrY = 300;

      // QR white backing card
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(qrX - 20, qrY - 20, qrDrawSize + 40, qrDrawSize + 40);
      ctx.drawImage(canvas, qrX, qrY, qrDrawSize, qrDrawSize);

      // Instructions Box
      ctx.fillStyle = theme === "light" ? "#0f172a" : "#ffffff";
      ctx.font = "bold 26px system-ui, -apple-system, sans-serif";
      ctx.fillText("1. Open SyncFit App   •   2. Scan Code   •   3. Pass Turnstile", exportWidth / 2, 940);

      // Custom Note
      ctx.fillStyle = theme === "light" ? "#64748b" : "#94a3b8";
      ctx.font = "20px system-ui, -apple-system, sans-serif";
      ctx.fillText(customNote, exportWidth / 2, 1020);

      // Footer
      ctx.fillStyle = theme === "light" ? "#94a3b8" : "#64748b";
      ctx.font = "18px system-ui, -apple-system, sans-serif";
      ctx.fillText(
        `Facility Code: ${gymData?.code || "SYNCLINK"} • Generated: ${new Date().toLocaleDateString()}`,
        exportWidth / 2,
        1220
      );

      // Trigger file download
      const dataUrl = exportCanvas.toDataURL("image/png");
      const downloadLink = document.createElement("a");
      const fileName = `syncfit-qr-${(gymData?.code || "gym").toLowerCase()}.png`;
      downloadLink.download = fileName;
      downloadLink.href = dataUrl;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);

      toast.success("High-resolution PNG poster downloaded!");
    } catch (err) {
      console.error("Export PNG error:", err);
      toast.error("Failed to generate PNG image. You can use Print Poster instead.");
    }
  };

  // Browser Native Print
  const handlePrint = () => {
    // Advise high-contrast if on dark theme
    if (theme !== "light") {
      toast.info("Switching to Print Optimization for crisp paper output...");
    }
    setTimeout(() => {
      window.print();
    }, 200);
  };

  // Copy raw QR key
  const handleCopyKey = () => {
    if (!gymData?.qrCodeKey) return;
    navigator.clipboard.writeText(gymData.qrCodeKey);
    setCopied(true);
    toast.success("QR Token key copied to clipboard!");
    setTimeout(() => setCopied(false), 2500);
  };

  if (loading) {
    return (
      <div style={{ minHeight: "60vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <LoadingSpinner text="Loading gym facility QR access token..." />
      </div>
    );
  }

  const qrPayloadString = gymData?.qrPayload || gymData?.qrCodeKey || "gym_qr_syncfit";

  return (
    <div className="qr-management-container">
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">
            <Maximize2 size={28} style={{ color: "var(--accent-cyan)" }} />
            Facility QR Code Station
          </h1>
          <p className="page-subtitle">
            Generate, customize, and print high-resolution entry & turnstile QR signs for members to scan with their mobile app.
          </p>
        </div>

        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setShowRegenModal(true)}
            disabled={regenerating}
            style={{ display: "flex", alignItems: "center", gap: "8px" }}
          >
            <RefreshCw size={16} className={regenerating ? "animate-spin" : ""} />
            <span>Regenerate QR Token</span>
          </button>

          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleDownloadPng}
            style={{ display: "flex", alignItems: "center", gap: "8px" }}
          >
            <Download size={16} />
            <span>Download PNG</span>
          </button>

          <button
            type="button"
            className="btn btn-primary"
            onClick={handlePrint}
            style={{ display: "flex", alignItems: "center", gap: "8px" }}
          >
            <Printer size={16} />
            <span>Print Poster / Stand</span>
          </button>
        </div>
      </div>

      {/* Main Two-Column Layout: Controls on Left, Preview on Right */}
      <div className="qr-management-layout">
        {/* Left Column: Customization Controls */}
        <div className="qr-control-panel glass-card">
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
            <Sliders size={18} style={{ color: "var(--accent-cyan)" }} />
            <h3 style={{ fontSize: "16px", fontWeight: 700, margin: 0 }}>Sign Format & Style</h3>
          </div>

          {/* Format Selector */}
          <div className="control-group">
            <label className="control-label">Sign Format</label>
            <div className="format-btn-group">
              <button
                type="button"
                className={`choice-chip ${format === "poster" ? "active" : ""}`}
                onClick={() => {
                  setFormat("poster");
                  setQrSize(240);
                }}
              >
                Wall Poster (A4)
              </button>
              <button
                type="button"
                className={`choice-chip ${format === "counter" ? "active" : ""}`}
                onClick={() => {
                  setFormat("counter");
                  setQrSize(200);
                }}
              >
                Counter Stand
              </button>
              <button
                type="button"
                className={`choice-chip ${format === "badge" ? "active" : ""}`}
                onClick={() => {
                  setFormat("badge");
                  setQrSize(170);
                }}
              >
                Turnstile Decal
              </button>
            </div>
          </div>

          {/* Color Theme Selector */}
          <div className="control-group">
            <label className="control-label">Color Theme</label>
            <div className="theme-btn-group">
              <button
                type="button"
                className={`choice-chip ${theme === "light" ? "active" : ""}`}
                onClick={() => setTheme("light")}
              >
                Print High-Contrast (B&W)
              </button>
              <button
                type="button"
                className={`choice-chip ${theme === "dark" ? "active" : ""}`}
                onClick={() => setTheme("dark")}
              >
                Dark Luxe Cyan
              </button>
              <button
                type="button"
                className={`choice-chip ${theme === "emerald" ? "active" : ""}`}
                onClick={() => setTheme("emerald")}
              >
                Emerald Athletic
              </button>
            </div>
          </div>

          {/* Custom Instruction Note */}
          <div className="control-group">
            <label className="control-label">Sign Footer Note</label>
            <textarea
              className="form-control"
              rows={3}
              value={customNote}
              onChange={(e) => setCustomNote(e.target.value)}
              placeholder="Custom instructions for members..."
              style={{
                background: "var(--bg-input)",
                border: "1px solid var(--border-subtle)",
                borderRadius: "var(--radius-md)",
                padding: "10px",
                color: "var(--text-primary)",
                fontSize: "13px",
                resize: "vertical",
              }}
            />
          </div>

          {/* Active Facility Details Card */}
          <div
            style={{
              background: "rgba(6, 182, 212, 0.05)",
              border: "1px solid rgba(6, 182, 212, 0.2)",
              borderRadius: "var(--radius-md)",
              padding: "16px",
              marginTop: "10px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "var(--accent-cyan)", fontWeight: 700, marginBottom: "8px" }}>
              <ShieldCheck size={16} />
              <span>Security & Token Details</span>
            </div>
            <div style={{ fontSize: "12px", color: "var(--text-secondary)", display: "flex", flexDirection: "column", gap: "6px" }}>
              <div>
                <strong>Gym Code:</strong> {gymData?.code || "SYNCLINK-MAIN"}
              </div>
              <div style={{ wordBreak: "break-all" }}>
                <strong>Token Key:</strong> {gymData?.qrCodeKey || "gym_qr_..."}
              </div>
              <div>
                <strong>Max Facility Capacity:</strong> {gymData?.maxCapacity || 150} members
              </div>
            </div>

            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleCopyKey}
              style={{
                marginTop: "12px",
                width: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "6px",
                fontSize: "12px",
                padding: "8px",
              }}
            >
              {copied ? <Check size={14} color="var(--accent-emerald)" /> : <Copy size={14} />}
              <span>{copied ? "Token Copied!" : "Copy Raw QR Token"}</span>
            </button>
          </div>
        </div>

        {/* Right Column: Live Poster Preview & Printable Workspace */}
        <div className="qr-preview-workspace">
          <div className="preview-actions-bar">
            <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "var(--text-secondary)", fontSize: "13px" }}>
              <Info size={16} style={{ color: "var(--accent-cyan)" }} />
              <span>Live Print Preview ({format === "poster" ? "Full Poster" : format === "counter" ? "Desk Stand" : "Decal"})</span>
            </div>

            <div style={{ display: "flex", gap: "8px" }}>
              <button
                type="button"
                className="btn btn-sm btn-secondary"
                onClick={handleDownloadPng}
                style={{ fontSize: "12px", padding: "6px 12px" }}
              >
                <Download size={13} style={{ marginRight: "4px" }} />
                PNG Export
              </button>
              <button
                type="button"
                className="btn btn-sm btn-primary"
                onClick={handlePrint}
                style={{ fontSize: "12px", padding: "6px 12px" }}
              >
                <Printer size={13} style={{ marginRight: "4px" }} />
                Print Sign
              </button>
            </div>
          </div>

          {/* Printable Poster Sheet (Targeted by @media print) */}
          <div
            id="printable-gym-qr-sign"
            className={`printable-poster-card theme-${theme} format-${format}`}
          >
            {/* Brand Header */}
            <div className="poster-brand-header">
              <Dumbbell size={28} style={{ color: theme === "light" ? "#000000" : "var(--accent-cyan)" }} />
              <div className="poster-brand-text">
                SYNCFIT
              </div>
            </div>

            <div className="poster-badge">FACILITY ACCESS & TURNSTILE ENTRY</div>

            <div className="poster-gym-name">{gymData?.name || "SyncFit Flagship Gym"}</div>
            <div className="poster-gym-location">
              {gymData?.displayLocation || gymData?.address || "100 Fitness Boulevard, Metropolis"}
            </div>

            {/* High-Resolution QR Code */}
            <div className="poster-qr-wrapper">
              <QRCodeSVG
                value={qrPayloadString}
                size={qrSize}
                level="H"
                includeMargin={false}
              />
            </div>

            {/* Step-by-Step Instructions */}
            <div className="poster-instructions-box">
              <div className="poster-instructions-title">HOW TO CHECK IN & CHECK OUT</div>
              <div className="poster-steps-grid">
                <div className="poster-instruction-step">
                  <div className="step-number">1</div>
                  <div className="step-text">Open SyncFit Mobile App</div>
                </div>
                <div className="poster-instruction-step">
                  <div className="step-number">2</div>
                  <div className="step-text">Tap &apos;Scan Gym QR&apos;</div>
                </div>
                <div className="poster-instruction-step">
                  <div className="step-number">3</div>
                  <div className="step-text">Turnstile Unlocks Automatically</div>
                </div>
              </div>
            </div>

            {/* Custom Notes / Instructions Footer */}
            {customNote ? <div className="poster-footer-note">{customNote}</div> : null}
          </div>
        </div>
      </div>

      {/* Hidden High-Res Canvas for PNG Export */}
      <div id="hidden-highres-canvas" style={{ position: "absolute", left: "-9999px", top: "-9999px" }}>
        <QRCodeCanvas
          ref={canvasRef}
          value={qrPayloadString}
          size={560}
          level="H"
          includeMargin={false}
        />
      </div>

      {/* Confirmation Modal for QR Regeneration */}
      {showRegenModal && (
        <div className="modal-backdrop">
          <div className="modal-card glass-card" style={{ maxWidth: "460px", padding: "28px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "14px" }}>
              <div
                style={{
                  width: "44px",
                  height: "44px",
                  borderRadius: "50%",
                  backgroundColor: "rgba(245, 158, 11, 0.15)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <AlertTriangle size={24} style={{ color: "var(--accent-gold)" }} />
              </div>
              <h3 style={{ fontSize: "18px", fontWeight: 700, margin: 0 }}>Regenerate Facility QR Code?</h3>
            </div>

            <p style={{ color: "var(--text-secondary)", fontSize: "14px", lineHeight: 1.5, marginBottom: "20px" }}>
              Generating a new QR code token will <strong>immediately invalidate all previously printed signs</strong>. Members will need to scan the newly printed QR code to check in or out.
            </p>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setShowRegenModal(false)}
                disabled={regenerating}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleRegenerate}
                disabled={regenerating}
                style={{
                  backgroundColor: "var(--accent-gold)",
                  color: "#000",
                  borderColor: "var(--accent-gold)",
                }}
              >
                {regenerating ? "Regenerating..." : "Confirm & Regenerate"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
