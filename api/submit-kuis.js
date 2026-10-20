// Fungsi server (Vercel) untuk kuis: aksi "mulai" | "kirim" | "pembahasan".
// Kunci jawaban, urutan acak, batas waktu, dan jumlah percobaan dijaga di sini, bukan di browser siswa.
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
const TS = () => admin.firestore.FieldValue.serverTimestamp();
const GRACE = 15000; // toleransi 15 detik setelah waktu habis
const norm = (s) => String(s ?? "").trim().toLowerCase().replace(/\s+/g, " ");
const acak = (a) => { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const gagal = (http, msg) => Object.assign(new Error(msg), { http });

function susunReview(kuis, kn, detail) {
  return (kuis.soal || []).map((q) => {
    const tipe = q.tipe || "pg", k = (kn.kunci || {})[q.id], d = (detail || {})[q.id] || {};
    return {
      teks: q.teks, tipe, j: d.j || "", ok: d.ok ?? null,
      kunci: tipe === "pg" ? (q.opsi?.[k] ?? "") : tipe === "isian" ? (Array.isArray(k) ? k.join(" / ") : "") : "",
      pembahasan: (kn.pembahasan || {})[q.id] || ""
    };
  });
}

async function selesaikan(ctx, a, jawaban, telat) {
  const { kuisId, kuis, kn, st, sub, user } = ctx, kunci = kn.kunci || {};
  let total = 0, dapat = 0, benar = 0, otomatis = 0, adaEsai = false;
  const detail = {};
  for (const q of kuis.soal || []) {
    const tipe = q.tipe || "pg", bobot = Number(q.bobot) || 1, j = jawaban[q.id];
    let ok = null, teksJ = "";
    if (tipe === "pg") {
      const d = Number(j), urut = a.urut && a.urut[q.id];
      const asli = j === undefined || j === null || j === "" || !Number.isInteger(d) ? -1 : (urut ? urut[d] : d);
      teksJ = asli >= 0 && q.opsi && q.opsi[asli] !== undefined ? q.opsi[asli] : "";
      ok = asli === kunci[q.id];
    } else if (tipe === "isian") {
      teksJ = String(j ?? "").slice(0, 300);
      ok = norm(teksJ) !== "" && (Array.isArray(kunci[q.id]) ? kunci[q.id] : []).some((x) => norm(x) === norm(teksJ));
    } else { adaEsai = true; teksJ = String(j ?? "").slice(0, 5000); }
    if (tipe !== "esai") { total += bobot; otomatis++; if (ok) { dapat += bobot; benar++; } }
    detail[q.id] = tipe === "esai" ? { tipe, t: q.teks, j: teksJ, ok: null } : { tipe, j: teksJ, ok: !!ok };
  }
  const nilaiOto = total ? Math.round((dapat / total) * 100) : 0;
  const n = a.n || ((sub?.percobaan || 0) + 1), maks = Number(kuis.maks) || 1;
  const jawabanMap = Object.fromEntries(Object.entries(detail).map(([k, v]) => [k, v.j]));
  const dasar = {
    jenis: "kuis", mapelId: kuis.mapelId || "", kelasId: st.kelasId || "", tugasId: kuisId, tugasJudul: "Kuis: " + kuis.judul,
    siswaId: user.uid, siswaNama: st.nama || user.email || "Siswa", link: "", percobaan: n, total: (kuis.soal || []).length, updatedAt: TS()
  };
  const feedback = `Benar ${benar} dari ${otomatis} soal${telat ? " (waktu habis)" : ""}`;
  let hasil;
  if (adaEsai) {
    hasil = { ...dasar, jawaban: jawabanMap, detail, benar, nilaiOtomatis: nilaiOto, nilai: null, feedback: "", status: "belum_diperiksa", createdAt: sub?.createdAt || TS() };
  } else if (!sub || sub.status !== "selesai" || nilaiOto > (Number(sub.nilai) || 0)) {
    hasil = { ...dasar, jawaban: jawabanMap, detail, benar, nilai: nilaiOto, feedback, status: "selesai", createdAt: sub?.createdAt || TS() };
  } else hasil = { ...sub, percobaan: n, updatedAt: TS() }; // percobaan ini lebih rendah: nilai terbaik tetap
  await db.doc(`submissions/${kuisId}_${user.uid}`).set(hasil);
  await db.doc(`percobaan/${kuisId}_${user.uid}`).delete().catch(() => {});
  const out = { status: hasil.status, nilai: adaEsai ? null : nilaiOto, terbaik: hasil.nilai, benar, total: otomatis, feedback, percobaan: n, maks, telat: !!telat, adaEsai };
  if (kuis.pembahasan === "selesai") out.review = susunReview(kuis, kn, detail);
  return { sub: hasil, out };
}

async function mulai(ctx) {
  const { kuisId, kuis, user } = ctx, now = Date.now(), maks = Number(kuis.maks) || 1;
  if (kuis.buka && now < kuis.buka) throw gagal(403, "Kuis belum dibuka.");
  if (kuis.tutup && now > kuis.tutup) throw gagal(403, "Kuis sudah ditutup.");
  const ref = db.doc(`percobaan/${kuisId}_${user.uid}`), snap = await ref.get();
  let a = snap.exists ? snap.data() : null;
  if (a && a.batas && now > a.batas + GRACE) { ctx.sub = (await selesaikan(ctx, a, {}, true)).sub; a = null; } // waktu lama habis: dihitung kosong
  const pakai = ctx.sub?.percobaan || 0;
  if (!a && pakai >= maks) throw gagal(403, "Kesempatan mengerjakan sudah habis.");
  if (!a) {
    const ids = (kuis.soal || []).map((q) => q.id), urut = {};
    for (const q of kuis.soal || []) if ((q.tipe || "pg") === "pg") { const r = (q.opsi || []).map((_, i) => i); urut[q.id] = kuis.acakOpsi ? acak(r) : r; }
    let batas = Math.min(kuis.durasi ? now + kuis.durasi * 60000 : Infinity, kuis.tutup || Infinity);
    a = { n: pakai + 1, mulai: now, batas: isFinite(batas) ? batas : 0, soalUrut: kuis.acak ? acak(ids) : ids, urut };
    await ref.set(a);
  }
  const peta = Object.fromEntries((kuis.soal || []).map((q) => [q.id, q]));
  const soal = a.soalUrut.map((id) => peta[id]).filter(Boolean).map((q) => {
    const tipe = q.tipe || "pg", o = { id: q.id, tipe, teks: q.teks };
    if (tipe === "pg") o.opsi = a.urut[q.id].map((i) => q.opsi[i]);
    return o;
  });
  return { soal, sisaMs: a.batas ? Math.max(0, a.batas - now) : 0, n: a.n, maks, durasi: kuis.durasi || 0 };
}

async function kirim(ctx, jawaban) {
  const snap = await db.doc(`percobaan/${ctx.kuisId}_${ctx.user.uid}`).get();
  if (!snap.exists) throw gagal(409, "Tidak ada kuis yang sedang dikerjakan. Mulai kuis lebih dulu.");
  const a = snap.data(), telat = !!(a.batas && Date.now() > a.batas + GRACE);
  return (await selesaikan(ctx, a, telat ? {} : (jawaban && typeof jawaban === "object" ? jawaban : {}), telat)).out;
}

async function pembahasan(ctx) {
  const { kuis, kn, sub } = ctx, mode = kuis.pembahasan || "tidak";
  if (!sub) throw gagal(403, "Kerjakan kuis lebih dulu.");
  const boleh = mode === "selesai" || (mode === "tutup" && kuis.tutup && Date.now() > kuis.tutup);
  if (!boleh) throw gagal(403, mode === "tutup" ? "Pembahasan baru tersedia setelah kuis ditutup." : "Pembahasan tidak ditampilkan untuk kuis ini.");
  return { review: susunReview(kuis, kn, sub.detail) };
}

module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(405).json({ error: "Gunakan metode POST" });
  try {
    const token = (req.headers.authorization || "").replace("Bearer ", "");
    const user = await admin.auth().verifyIdToken(token);
    let body = req.body; if (typeof body === "string") body = JSON.parse(body);
    const { aksi, kuisId } = body || {};
    if (!kuisId) throw gagal(400, "Data tidak lengkap");
    const [kuisSnap, kunciSnap, userSnap, subSnap] = await Promise.all([
      db.doc(`kuis/${kuisId}`).get(), db.doc(`kunci/${kuisId}`).get(), db.doc(`users/${user.uid}`).get(), db.doc(`submissions/${kuisId}_${user.uid}`).get()
    ]);
    if (!kuisSnap.exists || !kunciSnap.exists) throw gagal(404, "Kuis tidak ditemukan");
    const st = userSnap.data() || {};
    if ((st.status || "aktif") !== "aktif") throw gagal(403, "Akun Anda belum aktif.");
    const ctx = { kuisId, kuis: kuisSnap.data(), kn: kunciSnap.data(), st, sub: subSnap.exists ? subSnap.data() : null, user };
    if (aksi === "mulai") return res.status(200).json(await mulai(ctx));
    if (aksi === "kirim") return res.status(200).json(await kirim(ctx, body.jawaban));
    if (aksi === "pembahasan") return res.status(200).json(await pembahasan(ctx));
    throw gagal(400, "Aksi tidak dikenal");
  } catch (e) {
    console.error(e);
    const auth = !e.http && /id-token|auth\/|token/i.test(e.code || e.message || "");
    return res.status(e.http || (auth ? 401 : 500)).json({ error: e.http ? e.message : auth ? "Sesi login tidak valid. Silakan masuk ulang." : "Terjadi kesalahan di server." });
  }
};
