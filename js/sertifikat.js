// Sertifikat PDF otomatis: template PDF dari guru + nama siswa (dibuat di browser, tanpa server).
// Template disimpan di Firestore: sertifikat/{id} (pengaturan) + sertifikatData/{id}_{n} (isi PDF, dipecah per ~900 KB).
import { db, doc, getDoc, setDoc, deleteDoc, serverTimestamp } from "./firebase.js";

const CDN = "https://cdnjs.cloudflare.com/ajax/libs/";
const CH = 900000;
export const MAKS = Math.floor(1.9 * 1024 * 1024); // batas ukuran PDF template (byte)

export const FONTS = {
  sans: { std: "HelveticaBold", css: "Arial, Helvetica, sans-serif", st: "normal", label: "Sans-serif tebal" },
  serif: { std: "TimesRomanBold", css: '"Times New Roman", Times, serif', st: "normal", label: "Serif tebal" },
  italic: { std: "TimesRomanBoldItalic", css: '"Times New Roman", Times, serif', st: "italic", label: "Serif miring tebal" },
};

const memuat = {};
const muat = (k, src) => (memuat[k] ??= new Promise((ok, no) => {
  const s = Object.assign(document.createElement("script"), { src, onload: ok, onerror: () => { delete memuat[k]; no(new Error("Gagal memuat pustaka PDF. Periksa koneksi internet.")); } });
  document.head.append(s);
}));
const pdfLib = async () => { await muat("pl", CDN + "pdf-lib/1.17.1/pdf-lib.min.js"); return window.PDFLib; };
const pdfJs = async () => {
  await muat("pj", CDN + "pdf.js/3.11.174/pdf.min.js");
  window.pdfjsLib.GlobalWorkerOptions.workerSrc = CDN + "pdf.js/3.11.174/pdf.worker.min.js";
  return window.pdfjsLib;
};

export const bufToB64 = (buf) => { const u = new Uint8Array(buf); let s = ""; for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000)); return btoa(s); };
const b64ToBytes = (b) => Uint8Array.from(atob(b), (c) => c.charCodeAt(0));
const hex = (h) => { const n = parseInt((h || "#000000").slice(1), 16); return [(n >> 16) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]; };

/* ---------- penyimpanan template ---------- */
const memo = {};
export async function ambilTemplate(id, segar) {
  if (!segar && memo[id]) return memo[id];
  const m = await getDoc(doc(db, "sertifikat", id));
  if (!m.exists()) throw new Error("Template sertifikat tidak ditemukan.");
  const meta = m.data(); let b64 = "";
  for (let i = 0; i < meta.n; i++) b64 += (await getDoc(doc(db, "sertifikatData", id + "_" + i))).data().d;
  return (memo[id] = { id, ...meta, b64 });
}
export async function simpanTemplate(id, meta, b64, nLama = 0) {
  let n = meta.n || 0;
  if (b64) {
    n = Math.ceil(b64.length / CH);
    for (let i = 0; i < n; i++) await setDoc(doc(db, "sertifikatData", id + "_" + i), { d: b64.slice(i * CH, (i + 1) * CH) });
    for (let i = n; i < nLama; i++) await deleteDoc(doc(db, "sertifikatData", id + "_" + i));
  }
  await setDoc(doc(db, "sertifikat", id), { ...meta, n, createdAt: meta.createdAt || serverTimestamp(), updatedAt: serverTimestamp() });
  delete memo[id];
}
export async function hapusTemplate(id, n) {
  for (let i = 0; i < n; i++) await deleteDoc(doc(db, "sertifikatData", id + "_" + i));
  await deleteDoc(doc(db, "sertifikat", id)); delete memo[id];
}

/* ---------- pratinjau (admin) ---------- */
export async function gambarHalaman(b64, canvas) {
  const J = await pdfJs();
  const pdf = await J.getDocument({ data: b64ToBytes(b64) }).promise;
  const p = await pdf.getPage(1), v1 = p.getViewport({ scale: 1 });
  const lebar = canvas.parentElement.clientWidth || 640;
  const v = p.getViewport({ scale: (lebar / v1.width) * Math.min(window.devicePixelRatio || 1, 2) });
  canvas.width = v.width; canvas.height = v.height;
  await p.render({ canvasContext: canvas.getContext("2d"), viewport: v }).promise;
  return { W: v1.width, H: v1.height, halaman: pdf.numPages };
}

/* ---------- nomor sertifikat: KODE/INSTANSI/BULAN(romawi)/TAHUN/KODE-UNIK ---------- */
const ROM = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"];
const ABJAD = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const bersih = (s) => String(s || "").toUpperCase().replace(/[^A-Z0-9.\-]/g, "");
export function formatNomor(kode, inst, tgl, uniq) {
  const p = new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Jakarta", year: "numeric", month: "numeric" }).formatToParts(tgl);
  const th = p.find((x) => x.type === "year").value, bl = Number(p.find((x) => x.type === "month").value);
  return [bersih(kode) || "SERT", bersih(inst), ROM[bl - 1], th, uniq].filter(Boolean).join("/");
}
// Kode unik tetap: dihitung dari akun siswa + kuis/tugas, jadi sama setiap kali diunduh ulang.
export async function kodeUnik(uid, id) {
  const s = "daspro|" + uid + ":" + id; let b;
  if (globalThis.crypto?.subtle) b = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s)));
  else { const h = (seed) => { let x = seed >>> 0; for (const c of s) { x ^= c.charCodeAt(0); x = Math.imul(x, 16777619) >>> 0; } return x; }; const a = h(2166136261), z = h(97531); b = [a >>> 24, (a >>> 16) & 255, (a >>> 8) & 255, a & 255, z >>> 24]; }
  let acc = 0, n = 0, out = "";
  for (const v of b) { acc = (acc << 8) | v; n += 8; while (n >= 5 && out.length < 8) { out += ABJAD[(acc >> (n - 5)) & 31]; n -= 5; } acc &= (1 << n) - 1; if (out.length >= 8) break; }
  return out.slice(0, 4) + "-" + out.slice(4);
}
export async function nomor(t, ctx = {}) {
  if (!t.no?.on) return "";
  return formatNomor(t.no.kode, t.no.inst, ctx.tgl instanceof Date ? ctx.tgl : new Date(), await kodeUnik(ctx.uid || "anon", ctx.id || "x"));
}

/* ---------- membuat PDF per siswa ---------- */
export async function buatPdf(t, nama, noTeks = "") {
  const L = await pdfLib();
  const pdf = await L.PDFDocument.load(b64ToBytes(t.b64));
  for (let i = pdf.getPageCount() - 1; i > 0; i--) pdf.removePage(i);
  const page = pdf.getPage(0), { width: W, height: H } = page.getSize();
  const font = await pdf.embedFont(L.StandardFonts[(FONTS[t.font] || FONTS.sans).std]);
  const txt = Array.from(nama || "").map((c) => { try { font.encodeText(c); return c; } catch { return ""; } }).join("").trim() || "Siswa";
  let size = Number(t.ukuran) || 40;
  while (size > 12 && font.widthOfTextAtSize(txt, size) > W * 0.86) size -= 1; // nama panjang: perkecil otomatis
  page.drawText(txt, { x: t.x * W - font.widthOfTextAtSize(txt, size) / 2, y: H * (1 - t.y) - size * 0.35, size, font, color: L.rgb(...hex(t.warna)) });
  if (noTeks && t.no) {
    const f2 = await pdf.embedFont(L.StandardFonts.Helvetica); let s2 = Number(t.no.ukuran) || 12;
    while (s2 > 6 && f2.widthOfTextAtSize(noTeks, s2) > W * 0.9) s2 -= 0.5;
    page.drawText(noTeks, { x: t.no.x * W - f2.widthOfTextAtSize(noTeks, s2) / 2, y: H * (1 - t.no.y) - s2 * 0.35, size: s2, font: f2, color: L.rgb(...hex(t.no.warna || "#374151")) });
  }
  return new Blob([await pdf.save()], { type: "application/pdf" });
}
export async function unduh(t, nama, judul, ctx) {
  const blob = await buatPdf(t, nama, await nomor(t, ctx));
  const a = Object.assign(document.createElement("a"), { href: URL.createObjectURL(blob), download: `Sertifikat - ${judul || "DASPRO"}.pdf`.replace(/[\\/:*?"<>|]/g, "") });
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 60000);
}
