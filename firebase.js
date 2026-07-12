import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, doc, updateDoc, onSnapshot, query, orderBy, serverTimestamp } from "firebase/firestore";
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "firebase/auth";

// ✅ AAPKI FIREBASE CONFIG
const firebaseConfig = {
  apiKey:            "AIzaSyBxhPpB-O8TKSKYWRhJZT581p-9rIUvih0",
  authDomain:        "police-cms-chakarnagar.firebaseapp.com",
  projectId:         "police-cms-chakarnagar",
  storageBucket:     "police-cms-chakarnagar.firebasestorage.app",
  messagingSenderId: "10434870185555",
  appId:             "1:10434870185555:web:e0d3f08f8a9714b58c161e"
};

const app = initializeApp(firebaseConfig);
export const db   = getFirestore(app);
export const auth = getAuth(app);

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

export async function adminLogin(email, password) {
  return await signInWithEmailAndPassword(auth, email, password);
}

export async function adminLogout() {
  return await signOut(auth);
}

export function onAuthChange(callback) {
  return onAuthStateChanged(auth, callback);
}
