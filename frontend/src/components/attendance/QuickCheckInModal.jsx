import React, { useState, useEffect } from "react";
import { Modal } from "../common/Modal";
import { membersApi } from "../../api/membersApi";
import { QrCode, Barcode, User, Search, ShieldAlert, CheckCircle2 } from "lucide-react";
import { TierBadge, StatusBadge } from "../common/Badge";

export const QuickCheckInModal = ({ isOpen, onClose, onCheckInSuccess }) => {
  const [activeTab, setActiveTab] = useState("member"); // "member" | "qr" | "barcode" | "direct"
  const [members, setMembers] = useState([]);
  const [memberSearch, setMemberSearch] = useState("");
  const [selectedMember, setSelectedMember] = useState(null);
  const [qrCodeKey, setQrCodeKey] = useState("");
  const [barcode, setBarcode] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [method, setMethod] = useState("MANUAL");
  const [location, setLocation] = useState("Main Gym");
  const [overrideRestrictions, setOverrideRestrictions] = useState(false);
  const [notes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [successInfo, setSuccessInfo] = useState(null);

  // Search members
  useEffect(() => {
    if (!isOpen) {
      setErrorMsg(null);
      setSuccessInfo(null);
      setSelectedMember(null);
      setMemberSearch("");
      setQrCodeKey("");
      setBarcode("");
      return;
    }

    const loadMembers = async () => {
      try {
        const res = await membersApi.listMembers({
          search: memberSearch,
          limit: 10,
        });
        const memberList = Array.isArray(res?.data) ? res.data : Array.isArray(res?.members) ? res.members : [];
        setMembers(memberList);
      } catch (err) {
        console.error("Failed to load members for check-in:", err);
      }
    };

    const timer = setTimeout(loadMembers, 200);
    return () => clearTimeout(timer);
  }, [isOpen, memberSearch]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessInfo(null);
    setSubmitting(true);

    const payload = {
      method:
        activeTab === "qr"
          ? "QR_CODE"
          : activeTab === "barcode"
          ? "BARCODE"
          : method,
      location: location || "Main Gym",
      overrideRestrictions,
      notes: notes || undefined,
    };

    if (activeTab === "member" && selectedMember) {
      payload.memberId = selectedMember.id;
    } else if (activeTab === "qr") {
      payload.qrCodeKey = qrCodeKey.trim();
    } else if (activeTab === "barcode") {
      payload.barcode = barcode.trim();
    } else if (activeTab === "direct") {
      if (email) payload.email = email.trim();
      if (phone) payload.phone = phone.trim();
    }

    try {
      const res = await onCheckInSuccess(payload);
      setSuccessInfo(res || { message: "Check-in successful!" });
      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err) {
      setErrorMsg(
        err?.data?.message ||
        err?.message ||
        "Check-in denied. Check member status or enable Staff Override."
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Front Desk Member Check-In Station"
      icon={<QrCode size={20} />}
      size="lg"
      footer={
        <>
          <button className="btn btn-secondary" onClick={onClose} disabled={submitting}>
            Cancel
          </button>
          <button
            className="btn btn-emerald"
            onClick={handleSubmit}
            disabled={
              submitting ||
              (activeTab === "member" && !selectedMember) ||
              (activeTab === "qr" && !qrCodeKey) ||
              (activeTab === "barcode" && !barcode) ||
              (activeTab === "direct" && !email && !phone)
            }
          >
            <CheckCircle2 size={16} />
            <span>{submitting ? "Validating & Logging..." : "Complete Check-In"}</span>
          </button>
        </>
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
        {/* Method Mode Tabs */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: "8px",
            background: "rgba(255, 255, 255, 0.04)",
            padding: "4px",
            borderRadius: "var(--radius-md)",
          }}
        >
          <button
            type="button"
            className={`btn btn-sm ${activeTab === "member" ? "btn-primary" : "btn-ghost"}`}
            onClick={() => {
              setActiveTab("member");
              setMethod("MANUAL");
            }}
          >
            <User size={14} />
            <span>Member Search</span>
          </button>
          <button
            type="button"
            className={`btn btn-sm ${activeTab === "qr" ? "btn-primary" : "btn-ghost"}`}
            onClick={() => {
              setActiveTab("qr");
              setMethod("QR_CODE");
            }}
          >
            <QrCode size={14} />
            <span>QR Pass Token</span>
          </button>
          <button
            type="button"
            className={`btn btn-sm ${activeTab === "barcode" ? "btn-primary" : "btn-ghost"}`}
            onClick={() => {
              setActiveTab("barcode");
              setMethod("BARCODE");
            }}
          >
            <Barcode size={14} />
            <span>Barcode</span>
          </button>
          <button
            type="button"
            className={`btn btn-sm ${activeTab === "direct" ? "btn-primary" : "btn-ghost"}`}
            onClick={() => {
              setActiveTab("direct");
              setMethod("MANUAL");
            }}
          >
            <Search size={14} />
            <span>Email / Phone</span>
          </button>
        </div>

        {/* Tab 1: Member Selector */}
        {activeTab === "member" && (
          <div>
            <div className="form-group">
              <label className="form-label">Search & Select Member</label>
              <div className="search-bar-wrapper">
                <Search size={16} className="search-bar-icon" />
                <input
                  type="text"
                  className="input search-bar-input"
                  placeholder="Search by name, email, or referral code..."
                  value={memberSearch}
                  onChange={(e) => setMemberSearch(e.target.value)}
                />
              </div>
            </div>

            {/* Quick list */}
            <div
              style={{
                maxHeight: "180px",
                overflowY: "auto",
                border: "1px solid var(--border-subtle)",
                borderRadius: "var(--radius-md)",
                background: "rgba(0, 0, 0, 0.2)",
              }}
            >
              {members.length === 0 ? (
                <div style={{ padding: "14px", textAlign: "center", color: "var(--text-muted)", fontSize: "13px" }}>
                  No members found
                </div>
              ) : (
                members.map((m) => {
                  const isSelected = selectedMember?.id === m.id;
                  return (
                    <div
                      key={m.id}
                      onClick={() => setSelectedMember(m)}
                      style={{
                        padding: "10px 14px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        cursor: "pointer",
                        background: isSelected ? "rgba(6, 182, 212, 0.15)" : "transparent",
                        borderBottom: "1px solid var(--border-subtle)",
                      }}
                    >
                      <div>
                        <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>{m.name}</span>
                        <span style={{ fontSize: "12px", color: "var(--text-muted)", marginLeft: "8px" }}>
                          ({m.email})
                        </span>
                      </div>
                      <div style={{ display: "flex", gap: "6px" }}>
                        <TierBadge tier={m.memberTier} />
                        <StatusBadge status={m.status} />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
            {selectedMember && (
              <div
                style={{
                  marginTop: "10px",
                  padding: "10px 14px",
                  background: "rgba(16, 185, 129, 0.1)",
                  border: "1px solid rgba(16, 185, 129, 0.3)",
                  borderRadius: "var(--radius-md)",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <span style={{ fontSize: "13px", color: "var(--accent-emerald)", fontWeight: 600 }}>
                  Selected: {selectedMember.name} ({selectedMember.email})
                </span>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => setSelectedMember(null)}
                >
                  Clear
                </button>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: QR Code Key */}
        {activeTab === "qr" && (
          <div className="form-group">
            <label className="form-label">Scanned QR Code Access Token</label>
            <input
              type="text"
              className="input"
              style={{ fontFamily: "var(--font-mono)" }}
              placeholder="Paste or scan QR UUID token (e.g. 8f9b...)"
              value={qrCodeKey}
              onChange={(e) => setQrCodeKey(e.target.value)}
              autoFocus
            />
            <span style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "4px", display: "block" }}>
              The QR token is validated against the member's security profile.
            </span>
          </div>
        )}

        {/* Tab 3: Barcode */}
        {activeTab === "barcode" && (
          <div className="form-group">
            <label className="form-label">Scanned Barcode Number</label>
            <input
              type="text"
              className="input"
              style={{ fontFamily: "var(--font-mono)" }}
              placeholder="e.g. BC-100492"
              value={barcode}
              onChange={(e) => setBarcode(e.target.value)}
              autoFocus
            />
          </div>
        )}

        {/* Tab 4: Direct Email or Phone */}
        {activeTab === "direct" && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div className="form-group">
              <label className="form-label">Member Email</label>
              <input
                type="email"
                className="input"
                placeholder="member@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Member Phone</label>
              <input
                type="text"
                className="input"
                placeholder="+15551234567"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
          </div>
        )}

        {/* Shared Options */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
          <div className="form-group">
            <label className="form-label">Check-In Method</label>
            <select
              className="select"
              value={method}
              onChange={(e) => setMethod(e.target.value)}
            >
              <option value="MANUAL">MANUAL (Staff Check-In)</option>
              <option value="QR_CODE">QR_CODE (Turnstile Scanner)</option>
              <option value="BARCODE">BARCODE (Card Scan)</option>
              <option value="CARD">CARD (RFID/NFC Badge)</option>
              <option value="PIN">PIN (Kiosk Entry)</option>
              <option value="BIOMETRIC">BIOMETRIC (Fingerprint)</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Location / Zone</label>
            <input
              type="text"
              className="input"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Main Gym"
            />
          </div>
        </div>

        {/* Staff Override Switch */}
        <div
          style={{
            padding: "12px 16px",
            background: overrideRestrictions ? "rgba(245, 158, 11, 0.1)" : "rgba(255, 255, 255, 0.02)",
            border: `1px solid ${overrideRestrictions ? "rgba(245, 158, 11, 0.3)" : "var(--border-subtle)"}`,
            borderRadius: "var(--radius-md)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div>
            <label className="checkbox-label" style={{ fontWeight: 600 }}>
              <input
                type="checkbox"
                checked={overrideRestrictions}
                onChange={(e) => setOverrideRestrictions(e.target.checked)}
              />
              <span>Staff Override Access Restrictions</span>
            </label>
            <p style={{ fontSize: "12px", color: "var(--text-muted)", marginLeft: "24px" }}>
              Allows entry even if subscription is expired or account has billing alerts.
            </p>
          </div>
          {overrideRestrictions && (
            <ShieldAlert size={18} style={{ color: "var(--accent-gold)" }} />
          )}
        </div>

        {/* Error / Feedback Alert */}
        {errorMsg && (
          <div
            style={{
              padding: "12px",
              background: "rgba(239, 68, 68, 0.15)",
              border: "1px solid rgba(239, 68, 68, 0.3)",
              borderRadius: "var(--radius-md)",
              color: "#f87171",
              fontSize: "13px",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <ShieldAlert size={16} style={{ flexShrink: 0 }} />
            <span>{errorMsg}</span>
          </div>
        )}

        {successInfo && (
          <div
            style={{
              padding: "12px",
              background: "rgba(16, 185, 129, 0.15)",
              border: "1px solid rgba(16, 185, 129, 0.3)",
              borderRadius: "var(--radius-md)",
              color: "#34d399",
              fontSize: "13px",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <CheckCircle2 size={16} />
            <span>Check-in granted! Welcome member.</span>
          </div>
        )}
      </div>
    </Modal>
  );
};
