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
} from "lucide-react";

export const LoginPage = () => {
  const { signIn, signUp } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("admin@syncfit.com");
  const [password, setPassword] = useState("AdminPassword123!");
  const [name, setName] = useState("");
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
        toast.success("Account registered and authenticated via Firebase!");
      } else {
        await signIn(email.trim(), password);
        toast.success("Welcome back! Signed in with Firebase Auth.");
      }
      navigate("/");
    } catch (err) {
      toast.error(err?.data?.message || err.message || "Authentication failed");
    } finally {
      setSubmitting(false);
    }
  };

  const handleAutofillAdmin = () => {
    setEmail("admin@syncfit.com");
    setPassword("AdminPassword123!");
    setIsSignUp(false);
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
      }}
    >
      <div
        className="glass-card animate-slide-bottom"
        style={{
          width: "100%",
          maxWidth: "440px",
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
            {isSignUp ? "Register new account" : "Firebase Authentication Portal"}
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
                  placeholder="e.g. Alex Henderson"
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
                placeholder="user@syncfit.com"
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
            <span>{submitting ? "Signing In..." : isSignUp ? "Create Account" : "Sign In with Firebase"}</span>
            <ArrowRight size={16} />
          </button>
        </form>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "16px" }}>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => setIsSignUp(!isSignUp)}
          >
            {isSignUp ? "Already registered? Sign In" : "New member? Sign Up"}
          </button>

          {!isSignUp && (
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={handleAutofillAdmin}
              style={{ color: "var(--accent-cyan)", fontSize: "12px" }}
            >
              <KeyRound size={13} />
              <span>Autofill Admin</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
