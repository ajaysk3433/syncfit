import React from "react";
import { Check, Pause, AlertCircle, Shield, Crown, Star, Sparkles } from "lucide-react";

export const StatusBadge = ({ status }) => {
  const normalized = (status || "").toUpperCase();
  let className = "badge-inactive";
  let icon = null;

  switch (normalized) {
    case "ACTIVE":
    case "CHECKED_IN":
    case "SIGNED":
    case "VERIFIED":
      className = "badge-active";
      icon = <Check size={11} />;
      break;
    case "PAUSED":
    case "EXPIRED":
      className = "badge-paused";
      icon = <Pause size={11} />;
      break;
    case "SUSPENDED":
    case "DENIED":
    case "CANCELLED":
    case "REJECTED":
      className = "badge-suspended";
      icon = <AlertCircle size={11} />;
      break;
    case "CHECKED_OUT":
    case "AUTO_CHECKED_OUT":
      className = "badge-inactive";
      break;
    default:
      className = "badge-inactive";
  }

  return (
    <span className={`badge ${className}`}>
      {icon}
      {status || "UNKNOWN"}
    </span>
  );
};

export const TierBadge = ({ tier }) => {
  const normalized = (tier || "STANDARD").toUpperCase();
  let className = "badge-standard";
  let icon = <Star size={11} />;

  if (normalized === "VIP") {
    className = "badge-vip";
    icon = <Crown size={11} />;
  } else if (normalized === "PREMIUM") {
    className = "badge-premium";
    icon = <Sparkles size={11} />;
  }

  return (
    <span className={`badge ${className}`}>
      {icon}
      {tier || "STANDARD"}
    </span>
  );
};

export const RoleBadge = ({ role }) => {
  const normalized = (role || "MEMBER").toUpperCase();
  let colorStyle = { background: "rgba(100, 116, 139, 0.15)", color: "#cbd5e1" };

  if (normalized === "ADMIN") {
    colorStyle = { background: "rgba(239, 68, 68, 0.18)", color: "#f87171", border: "1px solid rgba(239, 68, 68, 0.3)" };
  } else if (normalized === "MANAGER") {
    colorStyle = { background: "rgba(168, 85, 247, 0.18)", color: "#c084fc", border: "1px solid rgba(168, 85, 247, 0.3)" };
  } else if (normalized === "FRONT_DESK") {
    colorStyle = { background: "rgba(6, 182, 212, 0.18)", color: "#22d3ee", border: "1px solid rgba(6, 182, 212, 0.3)" };
  } else if (normalized === "TRAINER") {
    colorStyle = { background: "rgba(16, 185, 129, 0.18)", color: "#34d399", border: "1px solid rgba(16, 185, 129, 0.3)" };
  }

  return (
    <span className="badge" style={colorStyle}>
      <Shield size={11} />
      {role || "MEMBER"}
    </span>
  );
};
