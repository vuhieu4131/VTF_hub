import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc } from "firebase/firestore";
import { getAuth, createUserWithEmailAndPassword } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyClk9Ydsg8BWHvO0LMH3b_H_fjSBskHdQg",
  authDomain: "vtf-hub.firebaseapp.com",
  projectId: "vtf-hub",
  storageBucket: "vtf-hub.firebasestorage.app",
  messagingSenderId: "909758100719",
  appId: "1:909758100719:web:38e0af60a1a51647a3171a",
  measurementId: "G-KM955G1VLB"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

async function createAdmin() {
  try {
    const cred = await createUserWithEmailAndPassword(auth, 'admin@vtf.com', '123456');
    await setDoc(doc(db, 'users', cred.user.uid), {
      id: cred.user.uid,
      name: 'Admin',
      email: 'admin@vtf.com',
      role: 'admin',
      departmentId: 'ban_giam_doc',
      jobTitle: 'Admin'
    });
    console.log('Admin user created successfully! UID:', cred.user.uid);
  } catch (e: any) {
    if (e.code === 'auth/email-already-in-use') {
        console.log('Admin already exists!');
    } else {
        console.error('Error creating admin:', e);
    }
  }
  process.exit(0);
}

createAdmin();
