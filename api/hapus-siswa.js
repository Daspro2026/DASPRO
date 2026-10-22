// Fungsi server (Vercel): guru (admin) menghapus akun siswa dari dashboard.
// Yang dihapus: akun login (Firebase Authentication), profil, nilai, jawaban, berkas, dan data percobaan kuis siswa itu.
// Memakai variabel lingkungan yang sama dengan submit-kuis (FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY).
const admin = require("firebase-admin");

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: (process.env.FIREBASE_PRIVATE_KEY || "").replace(/\\n/g, "\n")
    })
  });
}
const db = admin.firestore();
const gagal = (http, msg) => Object.assign(new Error(msg), { http });

// Hapus semua dokumen hasil query, per 300 dokumen (hanya referensi yang dibaca, jadi berkas besar tidak ikut diunduh).
async function hapusQuery(q) {
  let n = 0;
  for (;;) {
    const snap = await q.select().limit(300).get();
    if (snap.empty) break;
    const b = db.batch(); snap.docs.forEach((d) => b.delete(d.ref)); await b.commit(); n += snap.size;
    if (snap.size < 300) break;
  }
  return n;
}

module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(405).json({ error: "Gunakan metode POST" });
  try {
    const token = (req.headers.authorization || "").replace("Bearer ", "");
    const caller = await admin.auth().verifyIdToken(token);
    const me = await db.doc(`users/${caller.uid}`).get();
    if (!me.exists || me.data().role !== "admin") throw gagal(403, "Hanya guru (admin) yang boleh menghapus akun siswa.");

    let body = req.body; if (typeof body === "string") body = JSON.parse(body);
    const uid = body && body.uid;
    if (!uid || typeof uid !== "string" || /[\/\s]/.test(uid)) throw gagal(400, "Data tidak lengkap");
    if (uid === caller.uid) throw gagal(400, "Akun Anda sendiri tidak bisa dihapus.");
    const target = await db.doc(`users/${uid}`).get();
    if (target.exists && target.data().role !== "siswa") throw gagal(400, "Hanya akun siswa yang bisa dihapus lewat fitur ini.");

    // Urutan: data dulu, akun login, profil terakhir. Kalau ada langkah yang gagal, aman diulang (tidak ada yang rusak).
    const nilai = await hapusQuery(db.collection("submissions").where("siswaId", "==", uid));
    const berkas = await hapusQuery(db.collection("berkas").where("siswaId", "==", uid));
    await hapusQuery(db.collection("kehadiran").where("siswaId", "==", uid));
    const kuis = await db.collection("kuis").select().get();
    for (let i = 0; i < kuis.docs.length; i += 400) {
      const b = db.batch(); kuis.docs.slice(i, i + 400).forEach((k) => b.delete(db.doc(`percobaan/${k.id}_${uid}`))); await b.commit();
    }
    try { await admin.auth().deleteUser(uid); } catch (e) { if (e.code !== "auth/user-not-found") throw e; }
    await db.doc(`users/${uid}`).delete();
    return res.status(200).json({ ok: true, nilai, berkas });
  } catch (e) {
    console.error(e);
    const auth = !e.http && /id-token|auth\/|token/i.test(e.code || e.message || "");
    return res.status(e.http || (auth ? 401 : 500)).json({ error: e.http ? e.message : auth ? "Sesi login tidak valid. Silakan masuk ulang." : "Terjadi kesalahan di server." });
  }
