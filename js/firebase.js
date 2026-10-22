// ============================================================
// ISI konfigurasi Firebase Anda di bawah ini.
// Selama masih berisi "ISI_...", website berjalan di MODE DEMO
// (data contoh, tanpa Firebase) agar Anda bisa melihat tampilannya.
// ============================================================
const firebaseConfig = {
  apiKey: "ISI_API_KEY",
  authDomain: "ISI_PROJECT.firebaseapp.com",
  projectId: "ISI_PROJECT_ID",
  storageBucket: "ISI_PROJECT.firebasestorage.app",
  appId: "ISI_APP_ID"
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
