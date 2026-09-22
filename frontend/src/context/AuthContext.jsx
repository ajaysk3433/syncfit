import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import {
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
} from "firebase/auth";
import { auth } from "../config/firebase";
import { authApi } from "../api/authApi";
import { getDevUserId, setDevUserId as saveDevUserId } from "../api/client";

const AuthContext = createContext(null);

export const PRESET_DEV_ROLES = [
  { label: "Admin (Full Access)", role: "ADMIN", userId: "dev-admin-id", email: "admin@syncfit.com" },
  { label: "Manager", role: "MANAGER", userId: "dev-manager-id", email: "manager@syncfit.com" },
  { label: "Front Desk Staff", role: "FRONT_DESK", userId: "dev-frontdesk-id", email: "frontdesk@syncfit.com" },
  { label: "Fitness Trainer", role: "TRAINER", userId: "dev-trainer-id", email: "trainer@syncfit.com" },
  { label: "Standard Member", role: "MEMBER", userId: "dev-member-id", email: "member@syncfit.com" },
];

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [devUser, setDevUser] = useState(() => {
    const saved = getDevUserId();
    const preset = PRESET_DEV_ROLES.find((r) => r.userId === saved || r.role === saved);
    if (preset) return preset;
    if (saved) return { label: `Custom (${saved.slice(0, 8)}...)`, role: "ADMIN", userId: saved, email: "custom@syncfit.local" };
    // Default to Admin in Dev mode for seamless out-of-the-box exploration
    return PRESET_DEV_ROLES[0];
  });
  const [backendHealth, setBackendHealth] = useState({
    status: "UNKNOWN",
    timestamp: null,
    checkedAt: null,
  });

  // Track Firebase Auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  // Health check helper
  const checkBackendHealth = useCallback(async () => {
    try {
      const res = await authApi.checkHealth();
      setBackendHealth({
        status: res?.status === "OK" ? "HEALTHY" : "DEGRADED",
        timestamp: res?.timestamp || new Date().toISOString(),
        checkedAt: Date.now(),
      });
      return true;
    } catch (err) {
      setBackendHealth({
        status: "OFFLINE",
        error: err.message,
        checkedAt: Date.now(),
      });
      return false;
    }
  }, []);

  // Initial & periodic health check
  useEffect(() => {
    checkBackendHealth();
    const interval = setInterval(checkBackendHealth, 25000);
    return () => clearInterval(interval);
  }, [checkBackendHealth]);

  // Sign in with email and password (Firebase)
  const signIn = async (email, password) => {
    const credential = await signInWithEmailAndPassword(auth, email, password);
    // When logging in with Firebase, clear dev bypass
    saveDevUserId("");
    setDevUser(null);
    return credential.user;
  };

  // Sign up via backend then sign in with Firebase
  const signUp = async (userData) => {
    const res = await authApi.signUp(userData);
    if (userData.password) {
      await signInWithEmailAndPassword(auth, userData.email, userData.password);
    }
    return res;
  };

  // Sign out
  const signOut = async () => {
    await firebaseSignOut(auth);
    saveDevUserId("");
    setDevUser(null);
  };

  // Select Dev Role Bypass
  const switchDevRole = (presetOrId) => {
    if (!presetOrId) {
      saveDevUserId("");
      setDevUser(null);
      return;
    }

    if (typeof presetOrId === "object") {
      saveDevUserId(presetOrId.userId);
      setDevUser(presetOrId);
    } else {
      const preset = PRESET_DEV_ROLES.find((r) => r.userId === presetOrId || r.role === presetOrId);
      if (preset) {
        saveDevUserId(preset.userId);
        setDevUser(preset);
      } else {
        const customObj = {
          label: `Custom ID (${presetOrId.slice(0, 8)}...)`,
          role: "ADMIN",
          userId: presetOrId,
          email: "custom@syncfit.local",
        };
        saveDevUserId(presetOrId);
        setDevUser(customObj);
      }
    }
  };

  const activeRole = currentUser
    ? "AUTHENTICATED_USER"
    : devUser
    ? devUser.role
    : "GUEST";

  const activeUserEmail = currentUser
    ? currentUser.email
    : devUser
    ? devUser.email
    : null;

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        loading,
        devUser,
        activeRole,
        activeUserEmail,
        backendHealth,
        checkBackendHealth,
        signIn,
        signUp,
        signOut,
        switchDevRole,
        isDevMode: !currentUser && !!devUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
