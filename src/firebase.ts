import { initializeApp } from "firebase/app";
import { getFirestore, initializeFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyClk9Ydsg8BWHvO0LMH3b_H_fjSBskHdQg",
  authDomain: "vtf-hub.firebaseapp.com",
  projectId: "vtf-hub",
  storageBucket: "vtf-hub.firebasestorage.app",
  messagingSenderId: "909758100719",
  appId: "1:909758100719:web:38e0af60a1a51647a3171a",
  measurementId: "G-KM955G1VLB"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = initializeFirestore(app, { ignoreUndefinedProperties: true });
const auth = getAuth(app);

export { db, auth };
