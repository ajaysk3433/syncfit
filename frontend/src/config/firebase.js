import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";

const getEnv = (key) => {
  if (typeof import.meta !== "undefined" && import.meta.env && import.meta.env[key] !== undefined) {
    return import.meta.env[key];
  }
  if (typeof process !== "undefined" && process.env && process.env[key] !== undefined) {
    return process.env[key];
  }
  return undefined;
};

const firebaseConfig = {
  apiKey: getEnv("VITE_FIREBASE_API_KEY") || getEnv("REACT_APP_FIREBASE_API_KEY") || "AIzaSyA-L-UhMfYABgOb9F_JPoc1wekn3pzBgi0",
  authDomain: getEnv("VITE_FIREBASE_AUTH_DOMAIN") || getEnv("REACT_APP_FIREBASE_AUTH_DOMAIN") || "syncfit-e535b.firebaseapp.com",
  projectId: getEnv("VITE_FIREBASE_PROJECT_ID") || getEnv("REACT_APP_FIREBASE_PROJECT_ID") || "syncfit-e535b",
  storageBucket: getEnv("VITE_FIREBASE_STORAGE_BUCKET") || getEnv("REACT_APP_FIREBASE_STORAGE_BUCKET") || "syncfit-e535b.firebasestorage.app",
  messagingSenderId: getEnv("VITE_FIREBASE_MESSAGING_SENDER_ID") || getEnv("REACT_APP_FIREBASE_MESSAGING_SENDER_ID") || "102842487610",
  appId: getEnv("VITE_FIREBASE_APP_ID") || getEnv("REACT_APP_FIREBASE_APP_ID") || "1:102842487610:web:c951562bce170438cd7603",
  measurementId: getEnv("VITE_FIREBASE_MEASUREMENT_ID") || getEnv("REACT_APP_FIREBASE_MEASUREMENT_ID") || "G-XTD4EQDHR6"
};

// Initialize Firebase App singleton
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
export const auth = getAuth(app);
export default app;
