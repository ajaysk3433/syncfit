import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  initializeAuth,
  // @ts-expect-error getReactNativePersistence is exported in React Native environment
  getReactNativePersistence,
  getAuth,
  type Auth,
} from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const firebaseConfig = {
  apiKey: "AIzaSyA-L-UhMfYABgOb9F_JPoc1wekn3pzBgi0",
  authDomain: "syncfit-e535b.firebaseapp.com",
  projectId: "syncfit-e535b",
  storageBucket: "syncfit-e535b.firebasestorage.app",
  messagingSenderId: "102842487610",
  appId: "1:102842487610:web:c951562bce170438cd7603",
  measurementId: "G-XTD4EQDHR6",
};

// Initialize Firebase App
export const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Initialize Firebase Auth with AsyncStorage persistence for React Native / Native platforms
let authInstance: Auth;
try {
  if (Platform.OS === 'web') {
    authInstance = getAuth(app);
  } else {
    // React Native persistent authentication
    authInstance = initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage),
    });
  }
} catch {
  // If already initialized in hot reload
  authInstance = getAuth(app);
}

export const auth = authInstance;
export default app;
