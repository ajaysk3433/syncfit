import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY || "AIzaSyA-L-UhMfYABgOb9F_JPoc1wekn3pzBgi0",
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN || "syncfit-e535b.firebaseapp.com",
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID || "syncfit-e535b",
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET || "syncfit-e535b.firebasestorage.app",
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID || "102842487610",
  appId: process.env.REACT_APP_FIREBASE_APP_ID || "1:102842487610:web:c951562bce170438cd7603",
  measurementId: process.env.REACT_APP_FIREBASE_MEASUREMENT_ID || "G-XTD4EQDHR6"
};

// Initialize Firebase App singleton
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
export const auth = getAuth(app);
export default app;
