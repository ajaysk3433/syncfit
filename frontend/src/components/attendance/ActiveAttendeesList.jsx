import React, { useState } from "react";
import { Clock, LogOut, UserCheck, ShieldAlert } from "lucide-react";
import { TierBadge } from "../common/Badge";
import { Modal } from "../common/Modal";

export const ActiveAttendeesList = ({
  attendees = [],
  onCheckOut,
  onAutoCheckout,
  loading,
}) => {
  const [autoCheckoutHours, setAutoCheckoutHours] = useState(4);
  const [isAutoModalOpen, setIsAutoModalOpen] = useState(false);
  const [processingId, setProcessingId] = useState(null);

  const formatElapsed = (checkInTime) => {
    if (!checkInTime) return "Just now";
    const diffMs = Date.now() - new Date(checkInTime).getTime();
    const diffMins = Math.max(0, Math.floor(diffMs / (1000 * 60)));
    if (diffMins < 60) return `${diffMins}m ago`;
    const hours = Math.floor(diffMins / 60);
    const remainingMins = diffMins % 60;
    return `${hours}h ${remainingMins}m ago`;
  };

  const handleSingleCheckOut = async (item) => {
    setProcessingId(item.id);
    await onCheckOut({
      attendanceId: item.id,
      memberId: item.userId || item.user?.id,
    });
    setProcessingId(null);
  };

  return (
    <div className="glass-card">
      <div className="card-header">
        <div>
          <div className="card-title">
            <UserCheck size={18} style={{ color: "var(--accent-emerald)" }} />
            <span>Currently Checked-In Members</span>
            <span
              style={{
                fontSize: "12px",
                background: "rgba(16, 185, 129, 0.15)",
                color: "var(--accent-emerald)",
                padding: "2px 8px",
                borderRadius: "var(--radius-full)",
                fontWeight: 700,
              }}
            >
              {attendees.length} Active
            </span>
          </div>
          <p style={{ fontSize: "13px", color: "var(--text-secondary)", marginTop: "2px" }}>
            Live roster of members currently in the facility
          </p>
        </div>

        <button
          className="btn btn-secondary btn-sm"
          onClick={() => setIsAutoModalOpen(true)}
          title="Auto check-out members past duration limit"
        >
          <Clock size={14} />
          <span>Auto Check-Out Stale</span>
        </button>
      </div>

      {attendees.length === 0 ? (
        <div
          style={{
            textAlign: "center",
            padding: "48px 20px",
            color: "var(--text-muted)",
          }}
        >
          <UserCheck size={36} style={{ marginBottom: "10px", opacity: 0.4 }} />
          <p style={{ fontSize: "15px", fontWeight: 600, color: "var(--text-secondary)" }}>
            Gym Floor is Currently Empty
          </p>
          <p style={{ fontSize: "13px" }}>
            Members will appear here automatically when checked-in.
          </p>
        </div>
      ) : (
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Member</th>
                <th>Tier</th>
                <th>Check-In Time</th>
                <th>Elapsed Duration</th>
                <th>Method</th>
                <th>Location</th>
                <th style={{ textAlign: "right" }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {attendees.map((item) => {
                const user = item.user || {};
                const isOverdue =
                  Date.now() - new Date(item.checkInTime).getTime() >
                  4 * 60 * 60 * 1000;

                return (
                  <tr key={item.id}>
                    <td>
                      <div style={{ display: "flex", flexDirection: "column" }}>
                        <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>
                          {user.name || "Member"}
                        </span>
                        <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                          {user.email}
                        </span>
                      </div>
                    </td>
                    <td>
                      <TierBadge tier={user.memberTier || "STANDARD"} />
                    </td>
                    <td style={{ fontSize: "13px", color: "var(--text-secondary)" }}>
                      {new Date(item.checkInTime).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <span
                          style={{
                            fontSize: "13px",
                            fontWeight: 600,
                            color: isOverdue ? "var(--accent-rose)" : "var(--accent-cyan)",
                          }}
                        >
                          {formatElapsed(item.checkInTime)}
                        </span>
                        {isOverdue && (
                          <span title="Over 4 hours in gym">
                            <ShieldAlert size={14} style={{ color: "var(--accent-rose)" }} />
                          </span>
                        )}
                      </div>
                    </td>
                    <td>
                      <span
                        style={{
                          fontSize: "11px",
                          background: "rgba(255, 255, 255, 0.06)",
                          padding: "3px 7px",
                          borderRadius: "4px",
                          color: "var(--text-secondary)",
                          fontFamily: "var(--font-mono)",
                        }}
                      >
                        {item.method || "MANUAL"}
                      </span>
                    </td>
                    <td style={{ fontSize: "13px", color: "var(--text-secondary)" }}>
                      {item.location || "Main Gym"}
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => handleSingleCheckOut(item)}
                        disabled={processingId === item.id || loading}
                      >
                        <LogOut size={13} style={{ color: "#f87171" }} />
                        <span>Check Out</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Auto Check-Out Stale Sessions Modal */}
      <Modal
        isOpen={isAutoModalOpen}
        onClose={() => setIsAutoModalOpen(false)}
        title="Auto Check-Out Stale Sessions"
        icon={<Clock size={20} />}
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setIsAutoModalOpen(false)}>
              Cancel
            </button>
            <button
              className="btn btn-primary"
              onClick={async () => {
                await onAutoCheckout(autoCheckoutHours);
                setIsAutoModalOpen(false);
              }}
            >
              Run Auto Check-Out
            </button>
          </>
        }
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <p style={{ fontSize: "14px", color: "var(--text-secondary)" }}>
            Automatically close and mark as <code>AUTO_CHECKED_OUT</code> all open sessions
            that have exceeded the maximum continuous hours threshold.
          </p>

          <div className="form-group">
            <label className="form-label">Max Duration Threshold (Hours)</label>
            <input
              type="number"
              className="input"
              min="1"
              max="24"
              value={autoCheckoutHours}
              onChange={(e) => setAutoCheckoutHours(Number(e.target.value))}
            />
          </div>
        </div>
      </Modal>
    </div>
  );
};
