import React, { useState, useEffect, useCallback } from "react";
import { Modal } from "../common/Modal";
import { membersApi } from "../../api/membersApi";
import { plansApi } from "../../api/plansApi";
import { attendanceApi } from "../../api/attendanceApi";
import { useToast } from "../../context/ToastContext";
import { QRCodeSVG } from "qrcode.react";
import {
  User,
  QrCode,
  CreditCard,
  History,
  RefreshCw,
  Copy,
  Check,
  PauseCircle,
  PlayCircle,
  AlertTriangle,
  ArrowUpRight,
  Edit,
} from "lucide-react";
import { StatusBadge, TierBadge, RoleBadge } from "../common/Badge";

export const MemberDetailModal = ({
  isOpen,
  memberId,
  onClose,
  onMemberUpdated,
  onOpenSubscriptionAction,
  onOpenEditProfile,
}) => {
  const toast = useToast();
  const [member, setMember] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("profile"); // profile, access, subscriptions, attendance
  const [subscriptions, setSubscriptions] = useState([]);
  const [attendances, setAttendances] = useState([]);
  const [qrData, setQrData] = useState(null);
  const [regeneratingQr, setRegeneratingQr] = useState(false);
  const [copied, setCopied] = useState(false);

  // Status Change State
  const [newStatus, setNewStatus] = useState("");
  const [statusNotes, setStatusNotes] = useState("");
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const fetchFullMemberData = useCallback(async () => {
    if (!memberId) return;
    setLoading(true);
    try {
      const res = await membersApi.getMemberById(memberId);
      const memberObj = res?.data || res;
      setMember(memberObj);
      setNewStatus(memberObj?.status || "");

      // Load subscriptions & QR pass concurrently
      const [subsRes, qrRes, attRes] = await Promise.allSettled([
        plansApi.getMemberMemberships(memberId),
        membersApi.getMemberAccessQr(memberId),
        attendanceApi.getMemberAttendanceHistory(memberId, { limit: 15 }),
      ]);

      if (subsRes.status === "fulfilled") {
        const subs = subsRes.value?.data || subsRes.value?.memberships || subsRes.value || [];
        setSubscriptions(Array.isArray(subs) ? subs : []);
      }
      if (qrRes.status === "fulfilled") {
        setQrData(qrRes.value?.data || qrRes.value);
      }
      if (attRes.status === "fulfilled") {
        const atts = attRes.value?.data || attRes.value?.attendances || attRes.value?.history || [];
        setAttendances(Array.isArray(atts) ? atts : []);
      }
    } catch (err) {
      toast.error(err.message || "Failed to load member profile");
    } finally {
      setLoading(false);
    }
  }, [memberId, toast]);

  useEffect(() => {
    if (isOpen && memberId) {
      fetchFullMemberData();
    }
  }, [isOpen, memberId, fetchFullMemberData]);

  const handleRegenerateQr = async () => {
    setRegeneratingQr(true);
    try {
      const res = await membersApi.regenerateMemberAccessQr(memberId);
      setQrData((prev) => ({ ...prev, qrCodeKey: res.qrCodeKey }));
      toast.success("New digital access QR token generated!");
      if (onMemberUpdated) onMemberUpdated();
    } catch (err) {
      toast.error(err.message || "Failed to regenerate QR code");
    } finally {
      setRegeneratingQr(false);
    }
  };

  const handleCopyQr = () => {
    if (qrData?.qrCodeKey) {
      navigator.clipboard.writeText(qrData.qrCodeKey);
      setCopied(true);
      toast.info("Access QR key copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleUpdateStatus = async () => {
    if (!newStatus || newStatus === member?.status) return;
    setUpdatingStatus(true);
    try {
      await membersApi.updateMemberStatus(memberId, {
        status: newStatus,
        notes: statusNotes || undefined,
      });
      toast.success(`Member status updated to ${newStatus}`);
      await fetchFullMemberData();
      if (onMemberUpdated) onMemberUpdated();
    } catch (err) {
      toast.error(err.message || "Failed to update member status");
    } finally {
      setUpdatingStatus(false);
    }
  };

  if (!isOpen) return null;

  const profile = member?.profile || {};

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={member ? `${member.name} (${member.memberTier})` : "Member Details"}
      icon={<User size={20} />}
      size="xl"
      footer={
        <div style={{ display: "flex", justifyContent: "space-between", width: "100%", alignItems: "center" }}>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => {
              onClose();
              onOpenEditProfile(member);
            }}
          >
            <Edit size={14} />
            <span>Edit Profile</span>
          </button>

          <button className="btn btn-primary btn-sm" onClick={onClose}>
            Done
          </button>
        </div>
      }
    >
      {loading || !member ? (
        <div style={{ padding: "40px", textAlign: "center", color: "var(--text-muted)" }}>
          <RefreshCw className="spinner" size={24} style={{ margin: "0 auto 10px" }} />
          <span>Loading Member Records...</span>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          {/* Header Banner */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "16px 20px",
              background: "rgba(255, 255, 255, 0.03)",
              border: "1px solid var(--border-subtle)",
              borderRadius: "var(--radius-lg)",
              flexWrap: "wrap",
              gap: "14px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
              <div
                style={{
                  width: "52px",
                  height: "52px",
                  borderRadius: "50%",
                  background: "linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#fff",
                  fontWeight: 800,
                  fontSize: "20px",
                }}
              >
                {member.name ? member.name.charAt(0).toUpperCase() : "M"}
              </div>
              <div>
                <h3 style={{ fontSize: "18px", fontWeight: 800 }}>{member.name}</h3>
                <div style={{ display: "flex", gap: "10px", alignItems: "center", marginTop: "4px" }}>
                  <span style={{ fontSize: "13px", color: "var(--text-secondary)" }}>{member.email}</span>
                  {member.phone && (
                    <span style={{ fontSize: "13px", color: "var(--text-muted)" }}>• {member.phone}</span>
                  )}
                </div>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
              <TierBadge tier={member.memberTier} />
              <StatusBadge status={member.status} />
              <RoleBadge role={member.role} />
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => {
                  onOpenEditProfile(member);
                }}
                title="Edit member information"
              >
                <Edit size={13} />
                <span>Edit Profile</span>
              </button>
              <button
                className="btn btn-primary btn-sm"
                onClick={() => {
                  onOpenSubscriptionAction("ASSIGN", member);
                }}
                title="Assign new plan"
              >
                <CreditCard size={13} />
                <span>Assign Plan</span>
              </button>
            </div>
          </div>

          {/* Tab Navigation */}
          <div
            style={{
              display: "flex",
              gap: "8px",
              borderBottom: "1px solid var(--border-subtle)",
              paddingBottom: "10px",
              overflowX: "auto",
              flexWrap: "wrap",
            }}
          >
            <button
              className={`btn btn-sm ${activeTab === "profile" ? "btn-primary" : "btn-ghost"}`}
              onClick={() => setActiveTab("profile")}
            >
              <User size={14} />
              <span>Profile & Status</span>
            </button>
            <button
              className={`btn btn-sm ${activeTab === "access" ? "btn-primary" : "btn-ghost"}`}
              onClick={() => setActiveTab("access")}
            >
              <QrCode size={14} />
              <span>Digital Pass & QR</span>
            </button>
            <button
              className={`btn btn-sm ${activeTab === "subscriptions" ? "btn-primary" : "btn-ghost"}`}
              onClick={() => setActiveTab("subscriptions")}
            >
              <CreditCard size={14} />
              <span>Subscriptions ({subscriptions.length})</span>
            </button>
            <button
              className={`btn btn-sm ${activeTab === "attendance" ? "btn-primary" : "btn-ghost"}`}
              onClick={() => setActiveTab("attendance")}
            >
              <History size={14} />
              <span>Attendance ({attendances.length})</span>
            </button>
          </div>

          {/* TAB 1: Profile & Status Updater */}
          {activeTab === "profile" && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "20px" }}>
              {/* Personal & Emergency Info */}
              <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                <div className="glass-card" style={{ padding: "16px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                    <h4 style={{ fontSize: "13px", color: "var(--accent-cyan)", textTransform: "uppercase", fontWeight: 700, margin: 0 }}>
                      Personal Details
                    </h4>
                    <button
                      className="btn btn-ghost btn-sm"
                      style={{ padding: "2px 8px", fontSize: "11px", height: "auto" }}
                      onClick={() => onOpenEditProfile(member)}
                    >
                      <Edit size={11} />
                      <span>Edit</span>
                    </button>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", fontSize: "13px" }}>
                    <div>
                      <span style={{ color: "var(--text-muted)" }}>Date of Birth:</span>
                      <p style={{ fontWeight: 600 }}>
                        {profile.dateOfBirth ? new Date(profile.dateOfBirth).toLocaleDateString() : "Not specified"}
                      </p>
                    </div>
                    <div>
                      <span style={{ color: "var(--text-muted)" }}>Gender:</span>
                      <p style={{ fontWeight: 600 }}>{profile.gender || "Not specified"}</p>
                    </div>
                    <div>
                      <span style={{ color: "var(--text-muted)" }}>City / Address:</span>
                      <p style={{ fontWeight: 600 }}>{profile.city || profile.address || "None"}</p>
                    </div>
                    <div>
                      <span style={{ color: "var(--text-muted)" }}>Referral Code:</span>
                      <p style={{ fontWeight: 600, fontFamily: "var(--font-mono)", color: "var(--accent-gold)" }}>
                        {profile.referralCode || "N/A"}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="glass-card" style={{ padding: "16px" }}>
                  <h4 style={{ fontSize: "13px", color: "var(--accent-emerald)", textTransform: "uppercase", marginBottom: "12px", fontWeight: 700 }}>
                    Emergency & Health
                  </h4>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", fontSize: "13px" }}>
                    <div>
                      <span style={{ color: "var(--text-muted)" }}>Contact Name:</span>
                      <p style={{ fontWeight: 600 }}>{profile.emergencyContactName || "None"}</p>
                    </div>
                    <div>
                      <span style={{ color: "var(--text-muted)" }}>Contact Phone:</span>
                      <p style={{ fontWeight: 600 }}>{profile.emergencyContactPhone || "None"}</p>
                    </div>
                    <div>
                      <span style={{ color: "var(--text-muted)" }}>Relation:</span>
                      <p style={{ fontWeight: 600 }}>{profile.emergencyContactRelation || "None"}</p>
                    </div>
                    <div>
                      <span style={{ color: "var(--text-muted)" }}>Health Notes:</span>
                      <p style={{ fontWeight: 600 }}>{profile.healthNotes || "None documented"}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Status Update Control */}
              <div className="glass-card" style={{ padding: "16px" }}>
                <h4 style={{ fontSize: "13px", color: "var(--accent-purple)", textTransform: "uppercase", marginBottom: "12px", fontWeight: 700 }}>
                  Account Status Management
                </h4>
                <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Change Member Status</label>
                    <select
                      className="select"
                      value={newStatus}
                      onChange={(e) => setNewStatus(e.target.value)}
                    >
                      <option value="ACTIVE">ACTIVE (Full access)</option>
                      <option value="SUSPENDED">SUSPENDED (Turnstile blocked)</option>
                      <option value="INACTIVE">INACTIVE</option>
                      <option value="PENDING">PENDING</option>
                    </select>
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Status Change Reason / Notes</label>
                    <textarea
                      className="textarea"
                      placeholder="e.g. Suspended due to overdue payment or disciplinary reason..."
                      value={statusNotes}
                      onChange={(e) => setStatusNotes(e.target.value)}
                    />
                  </div>

                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={handleUpdateStatus}
                    disabled={updatingStatus || newStatus === member.status}
                  >
                    {updatingStatus ? "Saving..." : "Apply Status Change"}
                  </button>

                  {profile.notes && (
                    <div style={{ marginTop: "10px", padding: "10px", background: "rgba(0,0,0,0.2)", borderRadius: "var(--radius-md)" }}>
                      <span style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 700 }}>
                        Audit Log Notes:
                      </span>
                      <p style={{ fontSize: "12px", color: "var(--text-secondary)", whiteSpace: "pre-wrap", marginTop: "4px" }}>
                        {profile.notes}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Digital Access Pass & QR */}
          {activeTab === "access" && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "16px", padding: "10px 0" }}>
              <div
                style={{
                  background: "#ffffff",
                  padding: "20px",
                  borderRadius: "var(--radius-lg)",
                  boxShadow: "0 0 30px rgba(6, 182, 212, 0.25)",
                }}
              >
                {qrData?.qrCodeKey ? (
                  <QRCodeSVG value={qrData.qrCodeKey} size={180} level="H" />
                ) : (
                  <div style={{ width: 180, height: 180, display: "flex", alignItems: "center", justifyContent: "center", color: "#000" }}>
                    No QR Token
                  </div>
                )}
              </div>

              <div style={{ textAlign: "center" }}>
                <h4 style={{ fontSize: "16px", fontWeight: 700 }}>{member.name}'s Access Pass</h4>
                <p style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "2px" }}>
                  Scan at facility turnstiles or mobile reader
                </p>
              </div>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  background: "rgba(255, 255, 255, 0.05)",
                  padding: "8px 16px",
                  borderRadius: "var(--radius-md)",
                  border: "1px solid var(--border-subtle)",
                }}
              >
                <span style={{ fontSize: "13px", fontFamily: "var(--font-mono)", color: "var(--accent-cyan)" }}>
                  Token: {qrData?.qrCodeKey || "None"}
                </span>
                <button className="btn-icon" onClick={handleCopyQr} title="Copy Token">
                  {copied ? <Check size={14} style={{ color: "var(--accent-emerald)" }} /> : <Copy size={14} />}
                </button>
              </div>

              <div style={{ display: "flex", gap: "12px", marginTop: "6px" }}>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={handleRegenerateQr}
                  disabled={regeneratingQr}
                >
                  <RefreshCw size={13} className={regeneratingQr ? "spinner" : ""} />
                  <span>Regenerate QR Key (Revokes Old)</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: Subscriptions */}
          {activeTab === "subscriptions" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h4 style={{ fontSize: "15px", fontWeight: 700 }}>Membership Plans & Subscriptions</h4>
                <button
                  className="btn btn-primary btn-sm"
                  onClick={() => onOpenSubscriptionAction("ASSIGN", member)}
                >
                  <CreditCard size={14} />
                  <span>Assign New Plan</span>
                </button>
              </div>

              {subscriptions.length === 0 ? (
                <div style={{ padding: "30px", textAlign: "center", color: "var(--text-muted)" }}>
                  No active or past subscriptions found for this member.
                </div>
              ) : (
                subscriptions.map((sub) => {
                  const isActive = sub.status === "ACTIVE";
                  const isPaused = sub.status === "PAUSED";

                  return (
                    <div
                      key={sub.id}
                      style={{
                        background: "rgba(255, 255, 255, 0.03)",
                        border: `1px solid ${isActive ? "rgba(16, 185, 129, 0.3)" : "var(--border-subtle)"}`,
                        borderRadius: "var(--radius-lg)",
                        padding: "16px 20px",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        flexWrap: "wrap",
                        gap: "14px",
                      }}
                    >
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <span style={{ fontSize: "16px", fontWeight: 700, color: "var(--text-primary)" }}>
                            {sub.plan?.name || "Membership Plan"}
                          </span>
                          <StatusBadge status={sub.status} />
                          {sub.plan?.tier && <TierBadge tier={sub.plan.tier} />}
                        </div>
                        <div style={{ display: "flex", gap: "14px", fontSize: "12px", color: "var(--text-secondary)", marginTop: "6px" }}>
                          <span>Start: {new Date(sub.startDate).toLocaleDateString()}</span>
                          <span>End: {new Date(sub.endDate).toLocaleDateString()}</span>
                          {sub.plan?.price && <span>Price: ${sub.plan.price}</span>}
                          {sub.autoRenew && (
                            <span style={{ color: "var(--accent-cyan)", fontWeight: 600 }}>• Auto-Renew On</span>
                          )}
                        </div>
                      </div>

                      {/* Subscription Action Buttons */}
                      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                        {isActive && (
                          <button
                            className="btn btn-secondary btn-sm"
                            onClick={() => onOpenSubscriptionAction("PAUSE", member, sub)}
                          >
                            <PauseCircle size={13} style={{ color: "var(--accent-gold)" }} />
                            <span>Pause / Freeze</span>
                          </button>
                        )}

                        {isPaused && (
                          <button
                            className="btn btn-secondary btn-sm"
                            onClick={() => onOpenSubscriptionAction("RESUME", member, sub)}
                          >
                            <PlayCircle size={13} style={{ color: "var(--accent-emerald)" }} />
                            <span>Resume</span>
                          </button>
                        )}

                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => onOpenSubscriptionAction("RENEW", member, sub)}
                        >
                          <RefreshCw size={13} />
                          <span>Renew</span>
                        </button>

                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => onOpenSubscriptionAction("UPGRADE", member, sub)}
                        >
                          <ArrowUpRight size={13} style={{ color: "var(--accent-cyan)" }} />
                          <span>Upgrade Tier</span>
                        </button>

                        {(isActive || isPaused) && (
                          <button
                            className="btn btn-danger btn-sm"
                            onClick={() => onOpenSubscriptionAction("CANCEL", member, sub)}
                          >
                            <AlertTriangle size={13} />
                            <span>Cancel</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* TAB 4: Attendance History */}
          {activeTab === "attendance" && (
            <div>
              <h4 style={{ fontSize: "15px", fontWeight: 700, marginBottom: "12px" }}>
                Recent Check-Ins & Facility Access
              </h4>
              {attendances.length === 0 ? (
                <div style={{ padding: "30px", textAlign: "center", color: "var(--text-muted)" }}>
                  No visit history recorded for this member yet.
                </div>
              ) : (
                <div className="table-container">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Check-In</th>
                        <th>Check-Out</th>
                        <th>Duration</th>
                        <th>Status</th>
                        <th>Method</th>
                        <th>Location</th>
                      </tr>
                    </thead>
                    <tbody>
                      {attendances.map((att) => (
                        <tr key={att.id}>
                          <td>{new Date(att.checkInTime).toLocaleString()}</td>
                          <td>
                            {att.checkOutTime ? new Date(att.checkOutTime).toLocaleTimeString() : "Open Session"}
                          </td>
                          <td>
                            {att.durationMinutes ? `${att.durationMinutes} mins` : "In Progress"}
                          </td>
                          <td>
                            <StatusBadge status={att.status} />
                          </td>
                          <td>
                            <span style={{ fontFamily: "var(--font-mono)", fontSize: "11px" }}>
                              {att.method}
                            </span>
                          </td>
                          <td>{att.location || "Main Gym"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </Modal>
  );
};
