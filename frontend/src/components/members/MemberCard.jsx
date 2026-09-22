import React from "react";
import { Phone, Mail, QrCode, CreditCard, ChevronRight } from "lucide-react";
import { StatusBadge, TierBadge } from "../common/Badge";

export const MemberCard = ({ member, onSelect, onOpenQr }) => {
  const activeMembership = member.memberships?.find(
    (m) => m.status === "ACTIVE" && new Date(m.endDate) >= new Date()
  );

  return (
    <div
      className="glass-card"
      style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        cursor: "pointer",
        padding: "20px",
      }}
      onClick={() => onSelect(member)}
    >
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div
              style={{
                width: "44px",
                height: "44px",
                borderRadius: "50%",
                background: "linear-gradient(135deg, rgba(6, 182, 212, 0.2) 0%, rgba(168, 85, 247, 0.2) 100%)",
                border: "1px solid rgba(6, 182, 212, 0.3)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--accent-cyan)",
                fontWeight: 700,
                fontSize: "16px",
              }}
            >
              {member.name ? member.name.charAt(0).toUpperCase() : "M"}
            </div>
            <div>
              <h4 style={{ fontSize: "16px", fontWeight: 700, color: "var(--text-primary)" }}>
                {member.name || "Unnamed Member"}
              </h4>
              <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                ID: {member.id?.slice(0, 8)}...
              </span>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "4px" }}>
            <TierBadge tier={member.memberTier} />
            <StatusBadge status={member.status} />
          </div>
        </div>

        {/* Contact Info */}
        <div style={{ display: "flex", flexDirection: "column", gap: "6px", margin: "14px 0" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", color: "var(--text-secondary)" }}>
            <Mail size={14} style={{ color: "var(--text-muted)" }} />
            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {member.email}
            </span>
          </div>
          {member.phone && (
            <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", color: "var(--text-secondary)" }}>
              <Phone size={14} style={{ color: "var(--text-muted)" }} />
              <span>{member.phone}</span>
            </div>
          )}
        </div>

        {/* Plan Info Pill */}
        <div
          style={{
            padding: "8px 12px",
            background: "rgba(255, 255, 255, 0.03)",
            borderRadius: "var(--radius-md)",
            border: "1px solid var(--border-subtle)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            fontSize: "12px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <CreditCard size={13} style={{ color: "var(--accent-cyan)" }} />
            <span style={{ color: "var(--text-secondary)" }}>
              {activeMembership?.plan?.name || "No Active Plan"}
            </span>
          </div>
          {activeMembership && (
            <span style={{ color: "var(--accent-emerald)", fontWeight: 600 }}>
              Exp: {new Date(activeMembership.endDate).toLocaleDateString()}
            </span>
          )}
        </div>
      </div>

      {/* Card Actions */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginTop: "16px",
          paddingTop: "12px",
          borderTop: "1px solid var(--border-subtle)",
        }}
      >
        <button
          className="btn btn-secondary btn-sm"
          onClick={(e) => {
            e.stopPropagation();
            onOpenQr(member);
          }}
        >
          <QrCode size={13} />
          <span>Access QR</span>
        </button>

        <span style={{ display: "flex", alignItems: "center", color: "var(--accent-cyan)", fontSize: "12px", fontWeight: 600 }}>
          View Details
          <ChevronRight size={14} />
        </span>
      </div>
    </div>
  );
};
