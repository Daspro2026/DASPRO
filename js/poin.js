// Gamifikasi: aturan poin, level, dan lencana. Dipakai bersama oleh dashboard guru (menerbitkan peringkat) dan siswa (poin pribadi).
// Poin dihitung hanya dari data yang tidak bisa dipalsukan siswa: nilai yang diberikan guru/server dan kehadiran yang dicatat guru.

export const CFG_DEFAULT = { tugas: 10, bonus90: 10, bonus75: 5, hadir: 5, papan: true };

export function cfgDari(d = {}) {
  const c = { ...CFG_DEFAULT };
  for (const k in CFG_DEFAULT) if (typeof d[k] === typeof CFG_DEFAULT[k] && (typeof d[k] !== "number" || Number.isFinite(d[k]))) c[k] = d[k];
  return c;
}

export const LEVEL = [
  { min: 0, nama: "Pemula" }, { min: 100, nama: "Rajin" }, { min: 250, nama: "Mahir" }, { min: 500, nama: "Ahli" }, { min: 1000, nama: "Master" },
];
export function levelDari(poin) {
  let i = 0; LEVEL.forEach((l, k) => { if (poin >= l.min) i = k; });
  const cur = LEVEL[i], nx = LEVEL[i + 1];
  return { i, nama: cur.nama, next: nx ? nx.nama : "", butuh: nx ? nx.min - poin : 0, persen: nx ? Math.round(((poin - cur.min) / (nx.min - cur.min)) * 100) : 100 };
}

// selesai: daftar submission berstatus "selesai"; hadirDocs: daftar dokumen kehadiran milik siswa
export function hitung(selesai, hadirDocs, cfg) {
  const n = selesai.map((s) => Number(s.nilai)).filter(Number.isFinite);
  const hitungStatus = (s) => hadirDocs.filter((k) => k.status === s).length;
  const hadir = hitungStatus("H"), pertemuan = hadirDocs.length;
  const poin = n.reduce((p, v) => p + cfg.tugas + (v >= 90 ? cfg.bonus90 : v >= 75 ? cfg.bonus75 : 0), 0) + hadir * cfg.hadir;
  return {
    poin: Math.max(0, Math.round(poin)), selesai: n.length,
    bintang: n.filter((v) => v >= 90).length, sempurna: n.filter((v) => v >= 100).length,
    rata: n.length ? Math.round(n.reduce((p, v) => p + v, 0) / n.length) : 0,
    hadir, izin: hitungStatus("I"), sakit: hitungStatus("S"), alpa: hitungStatus("A"), pertemuan,
    persenHadir: pertemuan ? Math.round((hadir / pertemuan) * 100) : 0,
  };
}

export const LENCANA = [
  { id: "pertama", ikon: "🚀", nama: "Langkah Pertama", ket: "Menyelesaikan 1 tugas atau kuis", ok: (s) => s.selesai >= 1 },
  { id: "rajin", ikon: "📚", nama: "Rajin Belajar", ket: "Menyelesaikan 5 tugas atau kuis", ok: (s) => s.selesai >= 5 },
  { id: "tekun", ikon: "🔥", nama: "Tekun", ket: "Menyelesaikan 15 tugas atau kuis", ok: (s) => s.selesai >= 15 },
  { id: "bintang", ikon: "⭐", nama: "Bintang Kelas", ket: "Meraih nilai 90 atau lebih", ok: (s) => s.bintang >= 1 },
  { id: "sempurna", ikon: "💯", nama: "Nilai Sempurna", ket: "Meraih nilai 100", ok: (s) => s.sempurna >= 1 },
  { id: "emas", ikon: "🥇", nama: "Rata-rata Emas", ket: "Rata-rata nilai 85+ dari minimal 3 tugas", ok: (s) => s.selesai >= 3 && s.rata >= 85 },
  { id: "hadir5", ikon: "🎯", nama: "Rajin Hadir", ket: "Hadir di 5 pertemuan", ok: (s) => s.hadir >= 5 },
  { id: "prima", ikon: "🏆", nama: "Kehadiran Prima", ket: "Kehadiran 90%+ dari minimal 5 pertemuan", ok: (s) => s.pertemuan >= 5 && s.persenHadir >= 90 },
];
export const lencanaDari = (st) => LENCANA.map((l) => ({ id: l.id, ikon: l.ikon, nama: l.nama, ket: l.ket, dapat: !!l.ok(st) }));
