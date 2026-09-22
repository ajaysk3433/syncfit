// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
    apiKey: "AIzaSyA-L-UhMfYABgOb9F_JPoc1wekn3pzBgi0",
    authDomain: "syncfit-e535b.firebaseapp.com",
    projectId: "syncfit-e535b",
    storageBucket: "syncfit-e535b.firebasestorage.app",
    messagingSenderId: "102842487610",
    appId: "1:102842487610:web:c951562bce170438cd7603",
    measurementId: "G-XTD4EQDHR6"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);