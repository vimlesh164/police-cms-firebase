// ══════════════════════════════════════════════════
//  FIREBASE CONFIG
//  Yahan apni Firebase config paste karein
//  firebase.google.com → Project Settings → Web App
// ══════════════════════════════════════════════════
import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, getDocs, doc, updateDoc, onSnapshot, query, orderBy, serverTimestamp } from "firebase/firestore";
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "firebase/auth";

// 👇 APNI CONFIG YAHAN PASTE KAREIN
const firebaseConfig = {
  apiKey: "AIzaSy...",
  authDomain: "police-cms-xxx.firebaseapp.com",
  projectId: "police-cms-xxx",
  storageBucket: "police-cms-xxx.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456:web:abcdef"
};



};

const app = initializeApp(firebaseConfig);
export const db   = getFirestore(app);
export const auth = getAuth(app);

// ── Complaints ──────────────────────────────────
export const complaintsRef = () => collection(db, "complaints");

export async function addComplaint(data) {
  return await addDoc(collection(db, "complaints"), {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function updateComplaint(id, data) {
  const ref = doc(db, "complaints", id);
  return await updateDoc(ref, { ...data, updatedAt: serverTimestamp() });
}

export function listenComplaints(callback) {
  const q = query(collection(db, "complaints"), orderBy("createdAt", "desc"));
  return onSnapshot(q, snap => {
    const list = snap.docs.map(d => ({
      id: d.id,
      firestoreId: d.id,
      ...d.data(),
      createdAt: d.data().createdAt?.toMillis?.() || Date.now(),
      updatedAt: d.data().updatedAt?.toMillis?.() || Date.now(),
    }));
    callback(list);
  });
}

// ── Auth ─────────────────────────────────────────
export async function adminLogin(email, password) {
  return await signInWithEmailAndPassword(auth, email, password);
}

export async function adminLogout() {
  return await signOut(auth);
}

export function onAuthChange(callback) {
  return onAuthStateChanged(auth, callback);
}
