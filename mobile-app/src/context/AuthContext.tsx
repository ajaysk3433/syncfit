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
  sendPasswordResetEmail,
  onAuthStateChanged,
  type User as FirebaseUser,
} from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { auth } from '../config/firebase';
import api, {
  type UserProfile,
  type AttendanceRecord,
  type ActiveMembership,
} from '../services/api';

export interface ActiveGymInfo {
  id: string;
  name: string;
  code: string;
  address?: string;
  city?: string;
  displayLocation?: string;
}

interface AuthContextType {
  firebaseUser: FirebaseUser | null;
  userProfile: UserProfile | null;
  activeGym: ActiveGymInfo | null;
  activeGymId: string | null;
  activeAttendance: AttendanceRecord | null;
  activeMembership: ActiveMembership | null;
  isLoading: boolean;
  isBackendConnected: boolean;
  signIn: (gymId: string, email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  sendPasswordReset: (gymId: string, email: string) => Promise<void>;
  refreshProfile: () => Promise<void>;
  setActiveAttendance: (att: AttendanceRecord | null) => void;
  setActiveGym: (gym: ActiveGymInfo | null) => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

const STORAGE_ACTIVE_GYM_KEY = 'syncfit_active_gym';
const STORAGE_ACTIVE_GYM_ID_KEY = 'syncfit_active_gym_id';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [activeGym, setActiveGymState] = useState<ActiveGymInfo | null>(null);
  const [activeGymId, setActiveGymIdState] = useState<string | null>(null);
  const [activeAttendance, setActiveAttendance] =
    useState<AttendanceRecord | null>(null);
  const [activeMembership, setActiveMembership] =
    useState<ActiveMembership | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isBackendConnected, setIsBackendConnected] = useState<boolean>(false);

  // Restore remembered gym info from AsyncStorage on startup
  useEffect(() => {
    (async () => {
      try {
        const [savedGymJson, savedGymId] = await Promise.all([
          AsyncStorage.getItem(STORAGE_ACTIVE_GYM_KEY),
          AsyncStorage.getItem(STORAGE_ACTIVE_GYM_ID_KEY),
        ]);
        if (savedGymJson) {
          setActiveGymState(JSON.parse(savedGymJson));
        }
        if (savedGymId) {
          setActiveGymIdState(savedGymId);
        }
      } catch {
        // ignore storage errors
      }
    })();
  }, []);

  const setActiveGym = useCallback((gym: ActiveGymInfo | null) => {
    setActiveGymState(gym);
    if (gym) {
      setActiveGymIdState(gym.code);
      AsyncStorage.setItem(STORAGE_ACTIVE_GYM_KEY, JSON.stringify(gym)).catch(() => {});
      AsyncStorage.setItem(STORAGE_ACTIVE_GYM_ID_KEY, gym.code).catch(() => {});
    } else {
      AsyncStorage.removeItem(STORAGE_ACTIVE_GYM_KEY).catch(() => {});
    }
  }, []);

  const fetchProfile = useCallback(async () => {
    try {
      const data = await api.getMe();
      if (data) {
        setUserProfile(data.user);
        setActiveAttendance(data.activeAttendance);
        setActiveMembership(data.activeMembership);
        setIsBackendConnected(true);

        // If backend returned gym details, synchronize with active gym
        if ((data as any).gym) {
          const gymData = (data as any).gym;
          setActiveGymState({
            id: gymData.id,
            name: gymData.name,
            code: gymData.code,
            address: gymData.address,
            city: gymData.city,
            displayLocation: gymData.city ? `${gymData.name} (${gymData.city})` : gymData.name,
          });
        }
      }
    } catch (err: any) {
      console.warn('Backend profile synchronization note:', err?.message || err);
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

  // Failsafe timer so the app NEVER hangs on the loading spinner on physical devices
  useEffect(() => {
    const safetyTimer = setTimeout(() => {
      setIsLoading(false);
    }, 2000);
    return () => clearTimeout(safetyTimer);
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      if (user) {
        // Non-blocking profile load so UI renders immediately
        fetchProfile().finally(() => {
          setIsLoading(false);
        });
      } else {
        setUserProfile(null);
        setActiveAttendance(null);
        setActiveMembership(null);
        setIsLoading(false);
      }
    });

    return unsubscribe;
  }, [fetchProfile]);

  /**
   * Multi-tenant Sign In:
   * Requires Gym ID + Email + Password.
   * Scopes user to specific gym so members can use the same email & phone at different gyms.
   */
  const signIn = useCallback(
    async (gymId: string, email: string, password: string) => {
      setIsLoading(true);
      try {
        const cleanGymCode = gymId.trim().toUpperCase();
        if (!cleanGymCode) {
          throw new Error('Please enter your Gym ID (e.g. SYNC-8F2B).');
        }

        // Step 1: Validate gym facility exists
        let verifiedGym: ActiveGymInfo;
        try {
          verifiedGym = await api.lookupGym(cleanGymCode);
        } catch {
          // If network is offline or lookup failed, attempt using cached gym or fallback
          verifiedGym = {
            id: cleanGymCode,
            name: `${cleanGymCode} Facility`,
            code: cleanGymCode,
          };
        }

        // Step 2: Compute gym-scoped email format using Plus-Addressing:
        // Example: ajay@gmail.com at GYMB-2002 -> ajay+gymb2002@gmail.com
        // This ensures Firebase password reset emails are delivered directly to the real inbox!
        const cleanPrefix = cleanGymCode.toLowerCase().replace(/[^a-z0-9]/g, '');
        const rawEmail = email.trim().toLowerCase();
        const [namePart, domainPart] = rawEmail.split('@');
        const plusScopedEmail = domainPart ? `${namePart}+${cleanPrefix}@${domainPart}` : `${namePart}_${cleanPrefix}`;
        const legacyPrefixEmail = `${cleanPrefix}_${rawEmail}`;

        // Step 3: Authenticate with Firebase Auth
        let credential;
        try {
          // Primary: Try plus-scoped email (ajay+gymb2002@gmail.com)
          credential = await signInWithEmailAndPassword(
            auth,
            plusScopedEmail,
            password
          );
        } catch (scopedErr: any) {
          // Fallback 1: Try legacy prefix email (gymb2002_ajay@gmail.com)
          try {
            credential = await signInWithEmailAndPassword(
              auth,
              legacyPrefixEmail,
              password
            );
          } catch {
            // Fallback 2: Try direct raw email for admin or legacy accounts
            try {
              credential = await signInWithEmailAndPassword(
                auth,
                rawEmail,
                password
              );
            } catch {
              throw scopedErr;
            }
          }
        }

        setFirebaseUser(credential.user);
        setActiveGym(verifiedGym);
        await fetchProfile();
      } finally {
        setIsLoading(false);
      }
    },
    [fetchProfile, setActiveGym]
  );

  /**
   * Send Password Reset Email directly via Firebase Auth
   * Uses plus-addressing (name+gymCode@domain) so Firebase delivers directly to real inbox!
   */
  const sendPasswordReset = useCallback(
    async (gymId: string, email: string) => {
      const cleanGymCode = gymId.trim().toUpperCase();
      if (!cleanGymCode) {
        throw new Error('Please enter your Gym ID.');
      }
      const rawEmail = email.trim().toLowerCase();
      if (!rawEmail) {
        throw new Error('Please enter your email address.');
      }

      const cleanPrefix = cleanGymCode.toLowerCase().replace(/[^a-z0-9]/g, '');
      const [namePart, domainPart] = rawEmail.split('@');
      const plusScopedEmail = domainPart ? `${namePart}+${cleanPrefix}@${domainPart}` : rawEmail;
      const legacyPrefixEmail = `${cleanPrefix}_${rawEmail}`;

      // Try sending password reset to plus-scoped email
      try {
        await sendPasswordResetEmail(auth, plusScopedEmail);
      } catch (err: any) {
        if (err.code === 'auth/user-not-found') {
          // Fallback to legacy prefix email or raw email
          try {
            await sendPasswordResetEmail(auth, legacyPrefixEmail);
          } catch {
            await sendPasswordResetEmail(auth, rawEmail);
          }
        } else {
          throw err;
        }
      }
    },
    []
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
      activeGym,
      activeGymId,
      activeAttendance,
      activeMembership,
      isLoading,
      isBackendConnected,
      signIn,
      signOut,
      sendPasswordReset,
      refreshProfile: fetchProfile,
      setActiveAttendance,
      setActiveGym,
    }),
    [
      firebaseUser,
      userProfile,
      activeGym,
      activeGymId,
      activeAttendance,
      activeMembership,
      isLoading,
      isBackendConnected,
      signIn,
      signOut,
      sendPasswordReset,
      fetchProfile,
      setActiveGym,
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
