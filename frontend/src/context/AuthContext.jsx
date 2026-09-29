import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import {
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  sendPasswordResetEmail,
  onAuthStateChanged,
} from "firebase/auth";
import { auth } from "../config/firebase";
import { authApi } from "../api/authApi";
import { membersApi } from "../api/membersApi";
import appConfig from "../config/appConfig";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [activeGym, setActiveGym] = useState(null);
  const [loading, setLoading] = useState(true);
  const [backendHealth, setBackendHealth] = useState({
    status: "UNKNOWN",
    timestamp: null,
    checkedAt: null,
  });

  // Fetch PostgreSQL user profile and active gym from backend once authenticated via Firebase
  const fetchDbProfile = useCallback(async (firebaseUser) => {
    if (!firebaseUser?.email) {
      setUserProfile(null);
      setActiveGym(null);
      return;
    }
    try {
      const meRes = await authApi.getMe();
      if (meRes?.data?.user) {
        setUserProfile(meRes.data.user);
        if (meRes.data.gym) {
          setActiveGym(meRes.data.gym);
        }
        return;
      }
    } catch {
      // Fallback to members search or local default
    }

    try {
      const res = await membersApi.listMembers({ search: firebaseUser.email, limit: 1 });
      const found = res?.members?.find(
        (m) =>
          m.email?.toLowerCase() === firebaseUser.email.toLowerCase() ||
          m.rawEmail?.toLowerCase() === firebaseUser.email.toLowerCase()
      );
      if (found) {
        setUserProfile(found);
      } else {
        // Fallback default profile if not in members list (e.g. default bootstrap admin)
        setUserProfile({
          email: firebaseUser.email,
          name: firebaseUser.displayName || firebaseUser.email.split("@")[0],
          role: firebaseUser.email.includes("admin") ? "ADMIN" : "MEMBER",
          memberTier: "VIP",
        });
      }
    } catch (err) {
      console.warn("Could not load database profile:", err);
      setUserProfile({
        email: firebaseUser.email,
        name: firebaseUser.displayName || firebaseUser.email.split("@")[0],
        role: firebaseUser.email.includes("admin") ? "ADMIN" : "MEMBER",
      });
    }
  }, []);

  // Track Firebase Auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        await fetchDbProfile(user);
      } else {
        setUserProfile(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, [fetchDbProfile]);

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

  // Periodic health check (polls every 30s when healthy, retries in 2s when server is offline/not responding)
  useEffect(() => {
    let timerId;
    let isCancelled = false;

    const runHealthCheck = async () => {
      const isHealthy = await checkBackendHealth();
      if (isCancelled) return;

      // When server is not responding/offline, wait according to appConfig retry delay; once healthy, poll at healthy interval
      const nextDelay = isHealthy
        ? (appConfig.healthCheck?.pollIntervalHealthy || 30000)
        : (appConfig.healthCheck?.retryIntervalOffline || 2000);
      timerId = setTimeout(runHealthCheck, nextDelay);
    };

    runHealthCheck();

    return () => {
      isCancelled = true;
      if (timerId) clearTimeout(timerId);
    };
  }, [checkBackendHealth]);

  // Sign in with email and password via Firebase
  const signIn = async (email, password) => {
    const credential = await signInWithEmailAndPassword(auth, email, password);
    await fetchDbProfile(credential.user);
    return credential.user;
  };

  // Sign up via backend (creates Firebase + Postgres record), then sign in
  const signUp = async (userData) => {
    const res = await authApi.signUp(userData);
    if (userData.password) {
      const credential = await signInWithEmailAndPassword(auth, userData.email, userData.password);
      await fetchDbProfile(credential.user);
    }
    return res;
  };

  // Sign out of Firebase
  const signOut = async () => {
    await firebaseSignOut(auth);
    setCurrentUser(null);
    setUserProfile(null);
  };

  // Send password reset email directly via Firebase Auth
  const sendPasswordReset = async (email) => {
    return await sendPasswordResetEmail(auth, email.trim());
  };

  const activeRole = userProfile?.role || (currentUser ? "AUTHENTICATED" : "GUEST");
  const activeUserEmail = currentUser?.email || null;
  const activeUserName = userProfile?.name || currentUser?.displayName || currentUser?.email?.split("@")[0];

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        userProfile,
        activeGym,
        gymCode: activeGym?.code || userProfile?.gymCode || null,
        loading,
        activeRole,
        activeUserEmail,
        activeUserName,
        backendHealth,
        checkBackendHealth,
        signIn,
        signUp,
        signOut,
        sendPasswordReset,
        refreshProfile: () => currentUser && fetchDbProfile(currentUser),
        isAuthenticated: !!currentUser,
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
