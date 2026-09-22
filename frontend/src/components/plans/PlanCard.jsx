import React from "react";
import { Check, Clock, Edit2 } from "lucide-react";
import { TierBadge } from "../common/Badge";

export const PlanCard = ({ plan, onEdit }) => {
  const isVip = plan.tier === "VIP";
  const isPremium = plan.tier === "PREMIUM";

  let borderStyle = "var(--border-card)";
  if (isVip) borderStyle = "rgba(245, 158, 11, 0.4)";
  if (isPremium) borderStyle = "rgba(6, 182, 212, 0.4)";

  return (
    <div
      className="glass-card"
      style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        border: `1px solid ${borderStyle}`,
        position: "relative",
        background: isVip
          ? "linear-gradient(135deg, rgba(30, 27, 75, 0.7) 0%, rgba(17, 24, 39, 0.8) 100%)"
          : isPremium
          ? "linear-gradient(135deg, rgba(14, 39, 58, 0.7) 0%, rgba(17, 24, 39, 0.8) 100%)"
          : "var(--bg-card)",
      }}
    >
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" }}>
          <div>
            <TierBadge tier={plan.tier} />
            <h3 style={{ fontSize: "20px", fontWeight: 800, marginTop: "8px", color: "var(--text-primary)" }}>
              {plan.name}
            </h3>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span
              className={`badge ${plan.isActive ? "badge-active" : "badge-inactive"}`}
            >
              {plan.isActive ? "Active Plan" : "Archived"}
            </span>
            {onEdit && (
              <button
                className="btn-icon"
                onClick={() => onEdit(plan)}
                title="Edit Plan"
                style={{ width: "30px", height: "30px" }}
              >
                <Edit2 size={13} />
              </button>
            )}
          </div>
        </div>

        <p style={{ fontSize: "13px", color: "var(--text-secondary)", marginBottom: "18px", minHeight: "38px" }}>
          {plan.description || "Comprehensive facility access package."}
        </p>

        {/* Pricing & Duration */}
        <div style={{ display: "flex", alignItems: "baseline", gap: "6px", marginBottom: "20px" }}>
          <span style={{ fontSize: "32px", fontWeight: 800, color: "#ffffff", letterSpacing: "-0.03em" }}>
            ${plan.price}
          </span>
          <span style={{ fontSize: "13px", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "4px" }}>
            <Clock size={13} />
            / {plan.durationDays} Days
          </span>
        </div>

        {/* Features Checklist */}
        <div style={{ display: "flex", flexDirection: "column", gap: "10px", borderTop: "1px solid var(--border-subtle)", paddingTop: "16px" }}>
          <span style={{ fontSize: "12px", textTransform: "uppercase", color: "var(--text-muted)", fontWeight: 700, letterSpacing: "0.05em" }}>
            Included Features:
          </span>
          {Array.isArray(plan.features) && plan.features.length > 0 ? (
            plan.features.map((feature, idx) => (
              <div key={idx} style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px" }}>
                <span
                  style={{
                    width: "18px",
                    height: "18px",
                    borderRadius: "50%",
                    background: isVip ? "rgba(245, 158, 11, 0.2)" : "rgba(16, 185, 129, 0.2)",
                    color: isVip ? "var(--accent-gold)" : "var(--accent-emerald)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <Check size={11} />
                </span>
                <span style={{ color: "var(--text-secondary)" }}>{feature}</span>
              </div>
            ))
          ) : (
            <span style={{ fontSize: "13px", color: "var(--text-muted)" }}>Full gym floor access</span>
          )}
        </div>
      </div>
    </div>
  );
};
