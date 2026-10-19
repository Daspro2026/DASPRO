// Fungsi server (Vercel): menghitung nilai kuis. Kunci jawaban dibaca di sini
// dan TIDAK PERNAH dikirim ke browser siswa.
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

module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(405).json({ error: "Gunakan metode POST" });
  try {
    const token = (req.headers.authorization || "").replace("Bearer ", "");
    const user = await admin.auth().verifyIdToken(token);
    let body = req.body;
    if (typeof body === "string") body = JSON.parse(body);
    const { kuisId, jawaban } = body || {};
    if (!kuisId || typeof jawaban !== "object" || jawaban === null) return res.status(400).json({ error: "Data tidak lengkap" });

    const [kuisSnap, kunciSnap, userSnap] = await Promise.all([
      db.doc(`kuis/${kuisId}`).get(), db.doc(`kunci/${kuisId}`).get(), db.doc(`users/${user.uid}`).get()
    ]);
    if (!kuisSnap.exists || !kunciSnap.exists) return res.status(404).json({ error: "Kuis tidak ditemukan" });

    const kuis = kuisSnap.data(), kunci = kunciSnap.data().kunci || {};
    let total = 0, didapat = 0, benar = 0;
    for (const s of kuis.soal || []) {
      const bobot = Number(s.bobot) || 1, j = jawaban[s.id];
      total += bobot;
      if (j !== undefined && j !== null && Number(j) === kunci[s.id]) { didapat += bobot; benar++; }
    }
    const jumlah = (kuis.soal || []).length;
    const nilai = total ? Math.round((didapat / total) * 100) : 0;
    const feedback = `Benar ${benar} dari ${jumlah} soal`;

    try {
      await db.doc(`submissions/${kuisId}_${user.uid}`).create({
        jenis: "kuis", mapelId: kuis.mapelId || "", tugasId: kuisId, tugasJudul: "Kuis: " + kuis.judul,
        siswaId: user.uid, siswaNama: userSnap.data()?.nama || user.email || "Siswa",
        jawaban: jawaban, benar, total: jumlah, nilai, feedback, status: "selesai", link: "",
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });
    } catch (e) {
      if (e.code === 6) return res.status(409).json({ error: "Kuis ini sudah pernah dikerjakan." });
      throw e;
    }
    return res.status(200).json({ nilai, benar, total: jumlah, feedback });
  } catch (e) {
    console.error(e);
    const auth = /token|auth/i.test(e.code || e.message || "");
    return res.status(auth ? 401 : 500).json({ error: auth ? "Sesi login tidak valid. Silakan masuk ulang." : "Terjadi kesalahan di server." });
  }
};
