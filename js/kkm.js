// KKM (Kriteria Ketuntasan Minimal): dipakai bersama oleh dashboard guru dan siswa.
// KKM disimpan sebagai field `kkm` pada dokumen mata pelajaran (koleksi `mapel`), jadi bisa berbeda tiap mapel.
// Mapel lama yang belum punya KKM, dan konten "Umum" (tanpa mapel), memakai KKM_BAWAAN.

export const KKM_BAWAAN = 75;

// Mengembalikan bilangan bulat 0-100, atau null bila isian tidak valid.
export function kkmValid(v) {
  if (v === "" || v === null || v === undefined) return null;
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 && n <= 100 ? Math.round(n) : null;
}

export const kkmAda = (m) => kkmValid(m && m.kkm) !== null;
export const kkmMapel = (m) => { const k = kkmValid(m && m.kkm); return k === null ? KKM_BAWAAN : k; };
export const tuntas = (nilai, kkm) => Number.isFinite(Number(nilai)) && nilai !== "" && nilai !== null && Number(nilai) >= kkm;
export const labelTuntas = (nilai, kkm) => (tuntas(nilai, kkm) ? "Tuntas" : "Belum tuntas");
