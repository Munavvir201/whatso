import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  "projectId": "whatso-7wxaj",
  "appId": "1:567542358936:web:48b098092b517a6ed241ed",
  "storageBucket": "whatso-7wxaj.firebasestorage.app",
  "apiKey": "AIzaSyAPyfM87tyo5ohpXhBWBwomL7yjCq7mI1A",
  "authDomain": "whatso-7wxaj.firebaseapp.com",
  "measurementId": "",
  "messagingSenderId": "567542358936"
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app);

export { app, auth, db };
