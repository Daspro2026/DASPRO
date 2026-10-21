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

/* ---------- membuat PDF per siswa ---------- */
export async function buatPdf(t, nama) {
  const L = await pdfLib();
  const pdf = await L.PDFDocument.load(b64ToBytes(t.b64));
  for (let i = pdf.getPageCount() - 1; i > 0; i--) pdf.removePage(i);
  const page = pdf.getPage(0), { width: W, height: H } = page.getSize();
  const font = await pdf.embedFont(L.StandardFonts[(FONTS[t.font] || FONTS.sans).std]);
  const txt = Array.from(nama || "").map((c) => { try { font.encodeText(c); return c; } catch { return ""; } }).join("").trim() || "Siswa";
  let size = Number(t.ukuran) || 40;
  while (size > 12 && font.widthOfTextAtSize(txt, size) > W * 0.86) size -= 1; // nama panjang: perkecil otomatis
  page.drawText(txt, { x: t.x * W - font.widthOfTextAtSize(txt, size) / 2, y: H * (1 - t.y) - size * 0.35, size, font, color: L.rgb(...hex(t.warna)) });
  return new Blob([await pdf.save()], { type: "application/pdf" });
}
export async function unduh(t, nama, judul) {
  const blob = await buatPdf(t, nama);
  const a = Object.assign(document.createElement("a"), { href: URL.createObjectURL(blob), download: `Sertifikat - ${judul || "DASPRO"}.pdf`.replace(/[\\/:*?"<>|]/g, "") });
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 60000);
}
