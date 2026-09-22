import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth, PRESET_DEV_ROLES } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import {
  Dumbbell,
  Lock,
  Mail,
  User,
  Shield,
  ArrowRight,
  Zap,
} from "lucide-react";

export const LoginPage = () => {
  const { signIn, signUp, switchDevRole } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("admin@syncfit.com");
  const [password, setPassword] = useState("AdminPassword123!");
  const [name, setName] = useState("Admin User");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      if (isSignUp) {
        await signUp({
          email: email.trim(),
          password,
          name: name.trim(),
          role: "MEMBER",
        });
        toast.success("Account created and signed in!");
      } else {
        await signIn(email.trim(), password);
        toast.success("Signed in successfully!");
      }
      navigate("/");
    } catch (err) {
      toast.error(err?.data?.message || err.message || "Authentication failed");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDevBypass = (preset) => {
    switchDevRole(preset);
    toast.success(`Entered Dev Mode as ${preset.label}`);
    navigate("/");
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
      }}
    >
      <div
        className="glass-card animate-slide-bottom"
        style={{
          width: "100%",
          maxWidth: "460px",
          padding: "36px",
          position: "relative",
          zIndex: 1,
        }}
      >
        {/* Logo Banner */}
        <div style={{ textAlign: "center", marginBottom: "28px" }}>
          <div
            style={{
              width: "56px",
              height: "56px",
              borderRadius: "var(--radius-lg)",
              background: "linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%)",
              color: "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 14px",
              boxShadow: "0 0 25px rgba(6, 182, 212, 0.4)",
            }}
          >
            <Dumbbell size={30} />
          </div>
          <h2 style={{ fontSize: "24px", fontWeight: 800 }}>
            Sync<span style={{ color: "var(--accent-cyan)" }}>Fit</span> Pro
          </h2>
          <p style={{ color: "var(--text-secondary)", fontSize: "14px", marginTop: "4px" }}>
            {isSignUp ? "Create staff or member account" : "Gym Management & Operations Portal"}
          </p>
        </div>

        {/* Auth Form */}
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {isSignUp && (
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Full Name</label>
              <div className="search-bar-wrapper">
                <User size={16} className="search-bar-icon" />
                <input
                  type="text"
                  required
                  className="input search-bar-input"
                  placeholder="Alex Trainer"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
            </div>
          )}

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Email Address</label>
            <div className="search-bar-wrapper">
              <Mail size={16} className="search-bar-icon" />
              <input
                type="email"
                required
                className="input search-bar-input"
                placeholder="admin@syncfit.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Password</label>
            <div className="search-bar-wrapper">
              <Lock size={16} className="search-bar-icon" />
              <input
                type="password"
                required
                minLength={6}
                className="input search-bar-input"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-lg"
            style={{ marginTop: "8px", width: "100%" }}
            disabled={submitting}
          >
            <span>{submitting ? "Authenticating..." : isSignUp ? "Create Account" : "Sign In"}</span>
            <ArrowRight size={16} />
          </button>
        </form>

        <div style={{ textAlign: "center", marginTop: "16px" }}>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => setIsSignUp(!isSignUp)}
          >
            {isSignUp ? "Already have an account? Sign In" : "Need an account? Register"}
          </button>
        </div>

        {/* Quick Dev Role Bypass Box */}
        <div
          style={{
            marginTop: "24px",
            paddingTop: "20px",
            borderTop: "1px solid var(--border-subtle)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "var(--accent-gold)", fontSize: "12px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "10px" }}>
            <Zap size={14} />
            <span>Instant Role Explorer (Dev Bypass)</span>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
            {PRESET_DEV_ROLES.slice(0, 4).map((preset) => (
              <button
                key={preset.userId}
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => handleDevBypass(preset)}
                style={{ fontSize: "11px", justifyContent: "flex-start" }}
              >
                <Shield size={12} style={{ color: "var(--accent-cyan)" }} />
                <span>{preset.role}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
