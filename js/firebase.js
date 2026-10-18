// ============================================================
// ISI konfigurasi Firebase Anda di bawah ini.
// Selama masih berisi "ISI_...", website berjalan di MODE DEMO
// (data contoh, tanpa Firebase) agar Anda bisa melihat tampilannya.
// ============================================================
const firebaseConfig = {
 // For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyD1hXiHeI33T5C059vttnJaaWqQeV-AzTs",
  authDomain: "daspro-8f6ca.firebaseapp.com",
  projectId: "daspro-8f6ca",
  storageBucket: "daspro-8f6ca.firebasestorage.app",
  messagingSenderId: "971620742175",
  appId: "1:971620742175:web:199ef8e1740b0f8efa512a",
  measurementId: "G-F47J6ESVTL"
};
};

export const DEMO = firebaseConfig.apiKey.startsWith("ISI");
const V = "https://www.gstatic.com/firebasejs/10.14.1/";
let M;
if (DEMO) M = await import("./mock.js");
else {
  const [a, au, fs, st] = await Promise.all(["firebase-app", "firebase-auth", "firebase-firestore", "firebase-storage"].map((n) => import(V + n + ".js")));
  const app = a.initializeApp(firebaseConfig);
  M = { ...au, ...fs, ...st, auth: au.getAuth(app), db: fs.getFirestore(app), storage: st.getStorage(app) };
}
export const {
  auth, db, storage, onAuthStateChanged, signOut, signInWithEmailAndPassword, createUserWithEmailAndPassword,
  serverTimestamp, collection, doc, where, orderBy, query, getDocs, getDoc, setDoc, addDoc, updateDoc, deleteDoc,
  ref, uploadBytes, getDownloadURL
} = M;
