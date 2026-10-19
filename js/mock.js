// Data contoh untuk MODE DEMO (aktif otomatis selama js/firebase.js belum diisi)
const K = "daspro_demo", now = () => Math.floor(Date.now() / 1000), day = 86400;
const ymd = (n) => new Date(Date.now() + n * day * 1000).toISOString().slice(0, 10);
const t = (n) => ({ seconds: now() - n * day });
const seed = () => ({
  users: { u1: { nama: "Pak Daus", role: "admin", email: "guru@daspro.id" }, u2: { nama: "Aisyah Putri", role: "siswa" }, u3: { nama: "Budi Santoso", role: "siswa" }, u4: { nama: "Citra Lestari", role: "siswa" } },
  materi: {
    m1: { judul: "Modul 1: Pengantar Algoritma", tipe: "modul", deskripsi: "Konsep dasar algoritma, flowchart, dan pseudocode.", fileUrl: "#", createdAt: t(6) },
    m2: { judul: "Slide Struktur Kontrol", tipe: "materi", deskripsi: "Percabangan dan perulangan beserta contoh kasus.", fileUrl: "#", createdAt: t(3) },
    m3: { judul: "Modul 2: Variabel & Tipe Data", tipe: "modul", deskripsi: "Mengenal variabel, tipe data, dan operator.", fileUrl: "#", createdAt: t(1) }
  },
  tugas: {
    t1: { judul: "Latihan Flowchart", instruksi: "Buatlah flowchart untuk menghitung luas dan keliling persegi panjang.\nJelaskan setiap langkahnya.", deadline: ymd(-2), createdAt: t(5) },
    t2: { judul: "Pseudocode Percabangan", instruksi: "Tulis pseudocode untuk menentukan bilangan ganjil atau genap.", deadline: ymd(3), createdAt: t(2) },
    t3: { judul: "Proyek Mini: Kalkulator", instruksi: "Rancang algoritma kalkulator sederhana dengan 4 operasi dasar.", deadline: ymd(9), createdAt: t(0) }
  },
  submissions: {
    t1_u2: { tugasId: "t1", tugasJudul: "Latihan Flowchart", siswaId: "u2", siswaNama: "Aisyah Putri", jawaban: "Mulai, input panjang dan lebar, hitung luas = p x l, keliling = 2(p+l), tampilkan hasil, selesai.", link: "", status: "selesai", nilai: 88, feedback: "Bagus sekali. Tambahkan validasi input.", createdAt: t(4) },
    t1_u3: { tugasId: "t1", tugasJudul: "Latihan Flowchart", siswaId: "u3", siswaNama: "Budi Santoso", jawaban: "Input p, l. Luas = p*l. Keliling = 2*(p+l). Output.", link: "https://drive.google.com", files: [{ nama: "Flowchart-Budi.pdf", url: "#", ukuran: 245000 }, { nama: "Catatan.docx", url: "#", ukuran: 58000 }], status: "belum_diperiksa", nilai: null, feedback: "", createdAt: t(2) },
    t2_u4: { tugasId: "t2", tugasJudul: "Pseudocode Percabangan", siswaId: "u4", siswaNama: "Citra Lestari", jawaban: "JIKA n MOD 2 = 0 MAKA tampilkan 'Genap' SELAIN ITU tampilkan 'Ganjil'.", link: "", status: "belum_diperiksa", nilai: null, feedback: "", createdAt: t(0) }
  }
});
let S = JSON.parse(sessionStorage.getItem(K) || "null") || seed();
const save = () => sessionStorage.setItem(K, JSON.stringify(S));
const snap = (id, d) => ({ id, data: () => d, exists: () => !!d });

export const auth = {}, db = {}, storage = {};
export const onAuthStateChanged = (a, cb) => { const u = sessionStorage.demoUid; setTimeout(() => cb(u ? { uid: u, email: S.users[u]?.email || "" } : null)); };
export const signOut = async () => { sessionStorage.removeItem("demoUid"); };
export const signInWithEmailAndPassword = async (a, e) => { const u = /guru|admin/i.test(e) ? "u1" : "u2"; sessionStorage.demoUid = u; return { user: { uid: u } }; };
export const createUserWithEmailAndPassword = async () => { const u = "u" + Date.now(); sessionStorage.demoUid = u; return { user: { uid: u } }; };
export const serverTimestamp = () => ({ seconds: now() });
export const collection = (d, c) => ({ c });
export const doc = (d, c, id) => ({ c, id });
export const where = (f, o, v) => ({ f, v });
export const orderBy = (o, dir) => ({ o, dir });
export const query = (c, ...q) => ({ c: c.c, q });
export const getDocs = async (q) => {
  let r = Object.entries(S[q.c] || {});
  for (const x of q.q || []) {
    if (x.f) r = r.filter(([, d]) => d[x.f] === x.v);
    if (x.o) r.sort((a, b) => ((b[1][x.o]?.seconds || 0) - (a[1][x.o]?.seconds || 0)) * (x.dir === "asc" ? -1 : 1));
  }
  return { docs: r.map(([i, d]) => snap(i, d)), size: r.length };
};
export const getDoc = async (r) => snap(r.id, (S[r.c] || {})[r.id]);
export const setDoc = async (r, d) => { (S[r.c] ??= {})[r.id] = d; save(); };
export const addDoc = async (c, d) => { (S[c.c] ??= {})["x" + Date.now()] = d; save(); };
export const updateDoc = async (r, d) => { Object.assign(S[r.c][r.id], d); save(); };
export const deleteDoc = async (r) => { delete S[r.c][r.id]; save(); };
export const ref = (s, p) => ({ p });
export const uploadBytes = async () => {};
export const getDownloadURL = async () => "#";
