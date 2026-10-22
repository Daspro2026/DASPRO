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
  serverTimestamp, collection, doc, where, orderBy, query, getDocs, getDoc, addDoc, deleteDoc,
  ref, uploadBytes, getDownloadURL
} = M;

// ---- Foto profil -> Firebase Storage (avatars/UID.jpg).
// Bila Storage belum aktif / paket belum Blaze / gagal, foto tetap disimpan di database seperti sebelumnya.
// Paket gratis (Spark): biarkan false. Foto disimpan di database seperti biasa, tanpa mencoba Storage.
// Ubah ke true HANYA jika project sudah di paket Blaze, Storage sudah aktif, dan storage.rules sudah di-publish.
export const PAKAI_STORAGE = false;
export async function unggahFoto(uid, dataUrl) {
  if (DEMO || !PAKAI_STORAGE || !uid || typeof dataUrl !== "string" || !dataUrl.startsWith("data:image/")) return "";
  try {
    const blob = await (await fetch(dataUrl)).blob();
    const r = ref(storage, "avatars/" + uid + ".jpg");
    await uploadBytes(r, blob, { contentType: "image/jpeg", cacheControl: "public,max-age=86400" });
    return await getDownloadURL(r);
  } catch (e) { console.warn("[DASPRO] Foto disimpan di database (Storage belum siap):", e?.code || e?.message); return ""; }
}
const milikSendiri = (r) => !!auth.currentUser?.uid && r?.path === "users/" + auth.currentUser.uid;
async function olahFoto(r, d) {
  if (!milikSendiri(r) || !d || typeof d.foto !== "string" || d.foto === "") return d;
  const u = await unggahFoto(auth.currentUser.uid, d.foto);
  return u ? { ...d, foto: u } : d;
}
const tulis = (fn) => async (r, d, ...a) => {
  const x = await olahFoto(r, d), res = await fn(r, x, ...a);
  if (x?.foto === "" && milikSendiri(r) && M.deleteObject) M.deleteObject(ref(storage, "avatars/" + auth.currentUser.uid + ".jpg")).catch(() => {});
  return res;
};
export const updateDoc = tulis((...a) => M.updateDoc(...a));
export const setDoc = tulis((...a) => M.setDoc(...a));
