
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// NOTE: This file is for the CLIENT-SIDE Firebase setup.
// It has been updated with the configuration values you provided.
const firebaseConfig = {
  apiKey: "AIzaSyAPyfM87tyo5ohpXhBWBwomL7yjCq7mI1A",
  authDomain: "whatso-7wxaj.firebaseapp.com",
  projectId: "whatso-7wxaj",
  storageBucket: "whatso-7wxaj.firebasestorage.app",
  messagingSenderId: "567542358936",
  appId: "1:567542358936:web:31ed992aa77f8405d241ed"
};

// This pattern ensures that Firebase is initialized only once.
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app);

export { app, auth, db };
