import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import {
  Dumbbell,
  Lock,
  Mail,
  User,
  ArrowRight,
  KeyRound,
  Building,
  MapPin,
  Phone,
  Copy,
  Check,
  Sparkles,
  Smartphone,
} from "lucide-react";

export const LoginPage = () => {
  const { signIn, signUp } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  // Mode: "SIGN_IN" or "REGISTER_GYM"
  const [mode, setMode] = useState("SIGN_IN");

  // Sign In / Common Fields
  const [email, setEmail] = useState("admin@syncfit.com");
  const [password, setPassword] = useState("AdminPassword123!");

  // Gym Owner Registration Fields
  const [name, setName] = useState("");
  const [gymName, setGymName] = useState("");
  const [gymCity, setGymCity] = useState("");
  const [phone, setPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Success Modal for newly provisioned Alphanumeric Gym ID
  const [createdGymModal, setCreatedGymModal] = useState(null);
  const [copiedGymId, setCopiedGymId] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      if (mode === "REGISTER_GYM") {
        if (!gymName.trim()) {
          toast.error("Please enter your Gym Name");
          setSubmitting(false);
          return;
        }

        const res = await signUp({
          email: email.trim(),
          password,
          name: name.trim() || undefined,
          phone: phone.trim() || undefined,
          gymName: gymName.trim(),
          gymCity: gymCity.trim() || undefined,
          role: "ADMIN",
        });

        const gymData = res?.data?.gym || res?.gym || null;
        if (gymData && gymData.code) {
          setCreatedGymModal(gymData);
          toast.success(`Gym ${gymData.name} registered! Assigned Gym ID: ${gymData.code}`);
        } else {
          toast.success("Gym and Owner account registered successfully!");
          navigate("/");
        }
      } else {
        await signIn(email.trim(), password);
        toast.success("Welcome back! Signed in with Firebase Auth.");
        navigate("/");
      }
    } catch (err) {
      toast.error(err?.data?.message || err.message || "Authentication failed");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCopyGymId = () => {
    if (!createdGymModal?.code) return;
    navigator.clipboard.writeText(createdGymModal.code);
    setCopiedGymId(true);
    toast.success("Gym ID copied to clipboard!");
    setTimeout(() => setCopiedGymId(false), 2500);
  };

  const handleAutofillAdmin = () => {
    setEmail("admin@syncfit.com");
    setPassword("AdminPassword123!");
    setMode("SIGN_IN");
    toast.info("Admin credentials populated");
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
        background: "radial-gradient(ellipse at 50% 20%, rgba(6, 182, 212, 0.12), transparent 70%)",
      }}
    >
      <div
        className="glass-card animate-slide-bottom"
        style={{
          width: "100%",
          maxWidth: mode === "REGISTER_GYM" ? "520px" : "440px",
          padding: "36px",
          position: "relative",
          zIndex: 1,
          transition: "max-width 0.3s ease",
        }}
      >
        {/* Logo Banner */}
        <div style={{ textAlign: "center", marginBottom: "24px" }}>
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
            Sync<span style={{ color: "var(--accent-cyan)" }}>Fit</span> Enterprise
          </h2>
          <p style={{ color: "var(--text-secondary)", fontSize: "14px", marginTop: "4px" }}>
            {mode === "REGISTER_GYM"
              ? "Register New Gym Facility & Owner"
              : "Gym Administration & Facility Portal"}
          </p>
        </div>

        {/* Mode Selector Tabs */}
        <div
          style={{
            display: "flex",
            background: "rgba(255, 255, 255, 0.05)",
            padding: "4px",
            borderRadius: "12px",
            marginBottom: "20px",
            border: "1px solid var(--border-subtle)",
          }}
        >
          <button
            type="button"
            className="btn"
            onClick={() => setMode("SIGN_IN")}
            style={{
              flex: 1,
              padding: "8px 12px",
              fontSize: "13px",
              fontWeight: 600,
              borderRadius: "8px",
              border: "none",
              cursor: "pointer",
              background: mode === "SIGN_IN" ? "rgba(6, 182, 212, 0.2)" : "transparent",
              color: mode === "SIGN_IN" ? "var(--accent-cyan)" : "var(--text-secondary)",
              transition: "all 0.2s ease",
            }}
          >
            Owner Sign In
          </button>
          <button
            type="button"
            className="btn"
            onClick={() => setMode("REGISTER_GYM")}
            style={{
              flex: 1,
              padding: "8px 12px",
              fontSize: "13px",
              fontWeight: 600,
              borderRadius: "8px",
              border: "none",
              cursor: "pointer",
              background: mode === "REGISTER_GYM" ? "rgba(6, 182, 212, 0.2)" : "transparent",
              color: mode === "REGISTER_GYM" ? "var(--accent-cyan)" : "var(--text-secondary)",
              transition: "all 0.2s ease",
            }}
          >
            Register Gym Facility
          </button>
        </div>

        {/* Auth Form */}
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          {mode === "REGISTER_GYM" && (
            <>
              {/* Gym Name Input */}
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Gym Facility Name *</label>
                <div className="search-bar-wrapper">
                  <Building size={16} className="search-bar-icon" style={{ color: "var(--accent-cyan)" }} />
                  <input
                    type="text"
                    required
                    className="input search-bar-input"
                    placeholder="e.g. Iron Forge Fitness"
                    value={gymName}
                    onChange={(e) => setGymName(e.target.value)}
                  />
                </div>
              </div>

              {/* Gym Location & Phone Grid */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">City / Location</label>
                  <div className="search-bar-wrapper">
                    <MapPin size={15} className="search-bar-icon" />
                    <input
                      type="text"
                      className="input search-bar-input"
                      placeholder="e.g. Downtown"
                      value={gymCity}
                      onChange={(e) => setGymCity(e.target.value)}
                    />
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Facility Phone</label>
                  <div className="search-bar-wrapper">
                    <Phone size={15} className="search-bar-icon" />
                    <input
                      type="tel"
                      className="input search-bar-input"
                      placeholder="+1 (555) 012-3456"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Owner Full Name */}
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Gym Owner Full Name *</label>
                <div className="search-bar-wrapper">
                  <User size={16} className="search-bar-icon" />
                  <input
                    type="text"
                    required
                    className="input search-bar-input"
                    placeholder="e.g. Marcus Vance"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
              </div>
            </>
          )}

          {/* Email Address */}
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">
              {mode === "REGISTER_GYM" ? "Owner Work Email *" : "Email Address *"}
            </label>
            <div className="search-bar-wrapper">
              <Mail size={16} className="search-bar-icon" />
              <input
                type="email"
                required
                className="input search-bar-input"
                placeholder={mode === "REGISTER_GYM" ? "owner@ironforge.com" : "admin@syncfit.com"}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          {/* Password */}
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Password *</label>
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
            style={{ marginTop: "10px", width: "100%" }}
            disabled={submitting}
          >
            <span>
              {submitting
                ? "Processing..."
                : mode === "REGISTER_GYM"
                ? "Register Gym & Get Alphanumeric ID"
                : "Sign In to Gym Portal"}
            </span>
            <ArrowRight size={16} />
          </button>
        </form>

        {/* Footer actions */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginTop: "18px",
          }}
        >
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => setMode(mode === "REGISTER_GYM" ? "SIGN_IN" : "REGISTER_GYM")}
          >
            {mode === "REGISTER_GYM"
              ? "Already registered? Sign In"
              : "Register new Gym Facility"}
          </button>

          {mode === "SIGN_IN" && (
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={handleAutofillAdmin}
              style={{ color: "var(--accent-cyan)", fontSize: "12px" }}
            >
              <KeyRound size={13} />
              <span>Autofill Demo Admin</span>
            </button>
          )}
        </div>
      </div>

      {/* Alphanumeric Gym ID Provisioned Success Modal */}
      {createdGymModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.8)",
            backdropFilter: "blur(8px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: "20px",
          }}
        >
          <div
            className="glass-card animate-scale-in"
            style={{
              width: "100%",
              maxWidth: "520px",
              padding: "36px",
              textAlign: "center",
              border: "1px solid rgba(6, 182, 212, 0.4)",
              boxShadow: "0 0 50px rgba(6, 182, 212, 0.25)",
            }}
          >
            <div
              style={{
                width: "64px",
                height: "64px",
                borderRadius: "50%",
                background: "linear-gradient(135deg, rgba(6, 182, 212, 0.2) 0%, rgba(16, 185, 129, 0.2) 100%)",
                border: "2px solid #00f2fe",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 16px",
                color: "#00f2fe",
              }}
            >
              <Sparkles size={32} />
            </div>

            <h3 style={{ fontSize: "22px", fontWeight: 800, color: "#fff" }}>
              Gym Registered Successfully!
            </h3>
            <p style={{ color: "var(--text-secondary)", fontSize: "14px", marginTop: "6px" }}>
              Facility: <strong>{createdGymModal.name}</strong>
            </p>

            {/* Alphanumeric Gym ID Highlight Box */}
            <div
              style={{
                margin: "24px 0",
                padding: "20px",
                background: "rgba(6, 182, 212, 0.08)",
                borderRadius: "16px",
                border: "1.5px dashed rgba(6, 182, 212, 0.4)",
              }}
            >
              <div style={{ fontSize: "12px", textTransform: "uppercase", letterSpacing: "1px", color: "var(--text-secondary)" }}>
                Your Unique Alphanumeric Gym ID
              </div>
              <div
                style={{
                  fontSize: "32px",
                  fontWeight: 900,
                  letterSpacing: "3px",
                  color: "var(--accent-cyan)",
                  margin: "8px 0",
                  fontFamily: "monospace",
                }}
              >
                {createdGymModal.code}
              </div>

              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={handleCopyGymId}
                style={{
                  margin: "6px auto 0",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  background: copiedGymId ? "rgba(16, 185, 129, 0.2)" : "rgba(255, 255, 255, 0.1)",
                  color: copiedGymId ? "#10b981" : "var(--text-primary)",
                  border: copiedGymId ? "1px solid #10b981" : "1px solid var(--border-subtle)",
                }}
              >
                {copiedGymId ? <Check size={14} /> : <Copy size={14} />}
                <span>{copiedGymId ? "Gym ID Copied!" : "Copy Gym ID"}</span>
              </button>
            </div>

            {/* Mobile App Member Instructions */}
            <div
              style={{
                textAlign: "left",
                background: "rgba(255, 255, 255, 0.03)",
                padding: "16px",
                borderRadius: "12px",
                marginBottom: "24px",
                border: "1px solid var(--border-subtle)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#38bdf8", fontWeight: 700, fontSize: "13px", marginBottom: "6px" }}>
                <Smartphone size={16} />
                <span>Mobile App Member Login Instructions</span>
              </div>
              <p style={{ fontSize: "12px", color: "var(--text-secondary)", lineHeight: 1.6, margin: 0 }}>
                Give this <strong>Gym ID ({createdGymModal.code})</strong> to your members.
                When members open the SyncFit Mobile App, they enter:
                <br />
                1. <strong>Gym ID:</strong> <span style={{ color: "var(--accent-cyan)" }}>{createdGymModal.code}</span>
                <br />
                2. <strong>Their Email & Password</strong>
                <br />
                Members can join multiple gyms with the same email and contact number without conflict.
              </p>
            </div>

            <button
              type="button"
              className="btn btn-primary btn-lg"
              style={{ width: "100%" }}
              onClick={() => {
                setCreatedGymModal(null);
                navigate("/");
              }}
            >
              <span>Enter Gym Dashboard</span>
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
