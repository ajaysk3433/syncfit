import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from 'react';
import {
  signInWithEmailAndPassword,
  signOut as fbSignOut,
  onAuthStateChanged,
  type User as FirebaseUser,
} from 'firebase/auth';
import { auth } from '../config/firebase';
import api, {
  type UserProfile,
  type AttendanceRecord,
  type ActiveMembership,
} from '../services/api';

interface AuthContextType {
  firebaseUser: FirebaseUser | null;
  userProfile: UserProfile | null;
  activeAttendance: AttendanceRecord | null;
  activeMembership: ActiveMembership | null;
  isLoading: boolean;
  isBackendConnected: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  setActiveAttendance: (att: AttendanceRecord | null) => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [activeAttendance, setActiveAttendance] =
    useState<AttendanceRecord | null>(null);
  const [activeMembership, setActiveMembership] =
    useState<ActiveMembership | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isBackendConnected, setIsBackendConnected] = useState<boolean>(false);

  const fetchProfile = useCallback(async () => {
    try {
      const data = await api.getMe();
      if (data) {
        setUserProfile(data.user);
        setActiveAttendance(data.activeAttendance);
        setActiveMembership(data.activeMembership);
        setIsBackendConnected(true);
      }
    } catch (err: any) {
      console.warn('Failed to load profile from backend:', err?.message || err);
      // Fallback local representation if backend is booting or temporary network glitch
      if (auth.currentUser) {
        setUserProfile((prev) =>
          prev || {
            id: auth.currentUser?.uid || '',
            firebaseUid: auth.currentUser?.uid || '',
            email: auth.currentUser?.email || '',
            name: auth.currentUser?.displayName || auth.currentUser?.email?.split('@')[0] || 'Member',
            role: 'MEMBER',
            status: 'ACTIVE',
            memberTier: 'STANDARD',
          }
        );
      }
    }
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      if (user) {
        await fetchProfile();
      } else {
        setUserProfile(null);
        setActiveAttendance(null);
        setActiveMembership(null);
      }
      setIsLoading(false);
    });

    return unsubscribe;
  }, [fetchProfile]);

  const signIn = useCallback(
    async (email: string, password: string) => {
      setIsLoading(true);
      try {
        const credential = await signInWithEmailAndPassword(
          auth,
          email.trim(),
          password
        );
        setFirebaseUser(credential.user);
        await fetchProfile();
      } finally {
        setIsLoading(false);
      }
    },
    [fetchProfile]
  );

  const signOut = useCallback(async () => {
    setIsLoading(true);
    try {
      await fbSignOut(auth);
      setFirebaseUser(null);
      setUserProfile(null);
      setActiveAttendance(null);
      setActiveMembership(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const value = useMemo(
    () => ({
      firebaseUser,
      userProfile,
      activeAttendance,
      activeMembership,
      isLoading,
      isBackendConnected,
      signIn,
      signOut,
      refreshProfile: fetchProfile,
      setActiveAttendance,
    }),
    [
      firebaseUser,
      userProfile,
      activeAttendance,
      activeMembership,
      isLoading,
      isBackendConnected,
      signIn,
      signOut,
      fetchProfile,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
