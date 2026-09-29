import React from "react";
import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  CreditCard,
  ClipboardList,
  BarChart3,
  FileCode2,
  Dumbbell,
  Sparkles,
  QrCode,
} from "lucide-react";

export const Sidebar = () => {
  const navItems = [
    { to: "/", label: "Live Floor & Desk", icon: <LayoutDashboard size={19} /> },
    { to: "/gym-qr", label: "Facility QR Pass", icon: <QrCode size={19} /> },
    { to: "/members", label: "Members Directory", icon: <Users size={19} /> },
    { to: "/plans", label: "Plans & Packages", icon: <CreditCard size={19} /> },
    { to: "/attendance", label: "Attendance Logs", icon: <ClipboardList size={19} /> },
    { to: "/analytics", label: "Analytics & Churn", icon: <BarChart3 size={19} /> },
    { to: "/docs", label: "Swagger & API Docs", icon: <FileCode2 size={19} /> },
  ];

  return (
    <aside className="sidebar">
      <div className="sidebar-logo-area">
        <div className="logo-symbol">
          <Dumbbell size={22} />
        </div>
        <div>
          <div className="brand-text">
            Sync<span>Fit</span>
          </div>
          <div
            style={{
              fontSize: "10px",
              color: "var(--accent-cyan)",
              fontWeight: 700,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
            }}
          >
            Club Operations
          </div>
        </div>
      </div>

      <nav className="sidebar-nav">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}
            end={item.to === "/"}
          >
            {item.icon}
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div
          style={{
            background: "linear-gradient(135deg, rgba(6, 182, 212, 0.08) 0%, rgba(16, 185, 129, 0.05) 100%)",
            border: "1px solid rgba(6, 182, 212, 0.2)",
            borderRadius: "var(--radius-md)",
            padding: "14px",
            fontSize: "12px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "var(--accent-cyan)", fontWeight: 700, marginBottom: "4px" }}>
            <Sparkles size={14} />
            <span>SyncFit Engine</span>
          </div>
          <p style={{ color: "var(--text-muted)", lineHeight: 1.4 }}>
            Connected to PostgreSQL & Firebase Auth backend API.
          </p>
        </div>
      </div>
    </aside>
  );
};
