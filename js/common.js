import { DEMO, auth, db, onAuthStateChanged, signOut, doc, getDoc } from "./firebase.js";

export const $ = (s) => document.querySelector(s);
export const esc = (s = "") => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
export const safeUrl = (u = "") => (/^https?:\/\//i.test(u) ? esc(u) : "#");
export const fdate = (s) => (s ? new Date(s).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }) : "");
export const ago = (t) => { const d = Math.floor((Date.now() / 1000 - (t?.seconds || 0)) / 86400); return d <= 0 ? "Hari ini" : d + " hari lalu"; };

const P = { key: "M21 2l-2 2m-7.6 7.6a5.5 5.5 0 11-7.8 7.8 5.5 5.5 0 017.8-7.8zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4", home: "M3 11l9-8 9 8M5 10v10h14V10", book: "M4 19.5A2.5 2.5 0 016.5 17H20V3H6.5A2.5 2.5 0 004 5.5zM4 19.5V21h16", task: "M9 11l3 3 8-8M20 12v7a2 2 0 01-2 2H6a2 2 0 01-2-2V5a2 2 0 012-2h9", star: "M12 2l3 6.9 7.5.7-5.7 5 1.7 7.4L12 18l-6.5 4 1.7-7.4-5.7-5 7.5-.7z", upload: "M12 16V4M7 9l5-5 5 5M4 20h16", check: "M5 13l4 4L19 7", out: "M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9", users: "M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM23 21v-2a4 4 0 00-3-3.9M16 3.1a4 4 0 010 7.8", clock: "M12 22a10 10 0 100-20 10 10 0 000 20zM12 6v6l4 2", file: "M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8zM14 2v6h6", grid: "M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z", download: "M12 4v12M7 11l5 5 5-5M4 20h16", trash: "M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6", sliders: "M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6", chart: "M3 3v18h18M7 15l4-4 3 3 5-6", edit: "M12 20h9M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4z" };
export const icon = (n) => `<svg class="i" viewBox="0 0 24 24"><path d="${P[n] || ""}"/></svg>`;
const fill = () => document.querySelectorAll("[data-ic]:empty").forEach((e) => (e.innerHTML = icon(e.dataset.ic)));
new MutationObserver(fill).observe(document.documentElement, { childList: true, subtree: true });
fill();

// ---- Unggah file jawaban
export const UPLOAD = { maxKB: 700, maxFiles: 3, accept: ".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.csv,.txt,.zip,.png,.jpg,.jpeg,.webp" };
const MIME = { pdf: "application/pdf", doc: "application/msword", docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", ppt: "application/vnd.ms-powerpoint", pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation", xls: "application/vnd.ms-excel", xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", csv: "text/csv", txt: "text/plain", zip: "application/zip", png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", webp: "image/webp" };
export const extOf = (n = "") => (n.split(".").pop() || "").toLowerCase();
export const fileOk = (f) => !!MIME[extOf(f.name)];
export const mimeOf = (f) => MIME[extOf(f.name)] || f.type || "application/octet-stream";
export const fmtSize = (b = 0) => (b >= 1048576 ? (b / 1048576).toFixed(1) + " MB" : Math.max(1, Math.round(b / 1024)) + " KB");
export const isImg = (f) => /^image\//.test(mimeOf(f));
export const toB64 = (b) => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result).split(",")[1]); r.onerror = () => rej(new Error("Gagal membaca file")); r.readAsDataURL(b); });
// Foto otomatis dikecilkan agar muat di batas ukuran; file lain harus sudah di bawah batas.
export async function kecilkan(f) {
  const max = UPLOAD.maxKB * 1024, type = mimeOf(f);
  if (f.size <= max) return { blob: f, name: f.name, type, size: f.size };
  if (!isImg(f)) throw new Error(f.name + " lebih dari " + UPLOAD.maxKB + " KB");
  const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error("Gambar tidak bisa dibaca")); i.src = URL.createObjectURL(f); });
  let dim = 1600, q = 0.82;
  for (let t = 0; t < 7; t++) {
    const sc = Math.min(1, dim / Math.max(img.width, img.height)), c = document.createElement("canvas");
    c.width = Math.round(img.width * sc); c.height = Math.round(img.height * sc);
    const x = c.getContext("2d"); x.fillStyle = "#fff"; x.fillRect(0, 0, c.width, c.height); x.drawImage(img, 0, 0, c.width, c.height);
    const blob = await new Promise((r) => c.toBlob(r, "image/jpeg", q));
    if (blob && blob.size <= max) return { blob, name: f.name.replace(/\.\w+$/, "") + ".jpg", type: "image/jpeg", size: blob.size };
    dim *= 0.75; q = Math.max(0.5, q - 0.06);
  }
  throw new Error(f.name + " terlalu besar meski sudah dikecilkan");
}
// Daftar file (guru & siswa). Isi file dibaca dari koleksi "berkas" hanya saat diklik.
export const fileChips = (arr) => (Array.isArray(arr) && arr.length ? `<div class="files">${arr.map((f) => `<a class="fchip" href="#" data-fid="${esc(f.id)}" data-fn="${esc(f.nama)}" data-ft="${esc(f.tipe || "")}">${icon("file")}<span class="fn">${esc(f.nama)}</span><small>${fmtSize(f.ukuran)}</small>${icon("download")}</a>`).join("")}</div>` : "");
export async function bukaBerkas(id, nama, tipe) {
  const pre = /pdf|image/.test(tipe || "") ? window.open("", "_blank") : null;
  try {
    const s = await getDoc(doc(db, "berkas", id));
    if (!s.exists()) throw new Error("file tidak ditemukan");
    const bin = atob(s.data().data), u = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
    const url = URL.createObjectURL(new Blob([u], { type: tipe || "application/octet-stream" }));
    if (pre) pre.location = url; else Object.assign(document.createElement("a"), { href: url, download: nama }).click();
    setTimeout(() => URL.revokeObjectURL(url), 6e4);
  } catch (e) { pre?.close(); toast("Gagal membuka file: " + e.message); }
}
document.addEventListener("click", (e) => { const a = e.target.closest("[data-fid]"); if (a) { e.preventDefault(); bukaBerkas(a.dataset.fid, a.dataset.fn, a.dataset.ft); } });

export function toast(m) {
  const t = Object.assign(document.createElement("div"), { className: "toast", textContent: m });
  document.body.append(t); setTimeout(() => t.remove(), 2400);
}
if (DEMO) document.body.insertAdjacentHTML("afterbegin", '<div class="demo">MODE DEMO: data contoh. Isi js/firebase.js untuk memakai Firebase. (Masuk dengan email berisi "guru" untuk melihat tampilan admin.)</div>');


// ---- Pengaturan tampilan (nama, warna, teks, logo) dari Firestore: settings/site
let S = {};
const paint = () => document.querySelectorAll(".logo:not([data-p])").forEach((l) => {
  if (!S.nama && !S.logo) return;
  l.dataset.p = 1;
  const i = l.querySelector("i");
  if (i) i.innerHTML = S.logo ? `<img src="${S.logo}" alt="" style="width:100%;height:100%;border-radius:inherit;object-fit:cover">` : esc((S.nama || "D")[0]);
  if (l.lastChild?.nodeType === 3) l.lastChild.textContent = S.nama || "DASPRO";
});
new MutationObserver(paint).observe(document.documentElement, { childList: true, subtree: true });
export function applySettings(s = {}) {
  S = s; const r = document.documentElement.style;
  if (/^#[0-9a-f]{6}$/i.test(s.warna || "")) {
    r.setProperty("--brand", s.warna);
    r.setProperty("--b2", `color-mix(in srgb, ${s.warna} 72%, #fff)`);
    r.setProperty("--soft", `color-mix(in srgb, ${s.warna} 9%, #fff)`);
  }
  document.querySelectorAll("[data-set]").forEach((e) => { const v = s[e.dataset.set]; if (v) e.innerHTML = esc(v).replace(/\n/g, "<br>"); });
  if (s.nama && document.title.includes("DASPRO")) document.title = document.title.replace("DASPRO", s.nama);
  document.querySelectorAll(".logo[data-p]").forEach((l) => l.removeAttribute("data-p"));
  paint();
}
try { applySettings(JSON.parse(localStorage.getItem("daspro_set") || "{}")); } catch {}
getDoc(doc(db, "settings", "site")).then((d) => {
  if (d.exists()) { localStorage.setItem("daspro_set", JSON.stringify(d.data())); applySettings(d.data()); }
  else localStorage.removeItem("daspro_set");
}).catch(() => {});

// Membuat sidebar + navigasi tab. views = { idTab: fungsiRender }
export function guard(needAdmin, tabs, views = {}) {
  return new Promise((resolve) => onAuthStateChanged(auth, async (user) => {
    if (!user) return (location.href = "login.html");
    const profile = (await getDoc(doc(db, "users", user.uid))).data() || {};
    // Siswa yang belum disetujui guru / ditolak hanya melihat halaman status ini
    if (profile.role !== "admin" && (profile.status === "menunggu" || profile.status === "ditolak")) {
      const w = profile.status === "menunggu";
      document.body.classList.remove("hide");
      document.body.innerHTML = `<div style="min-height:100vh;display:grid;place-items:center;padding:20px"><div class="card" style="max-width:440px;text-align:center;padding:32px"><h1>${w ? "Menunggu persetujuan guru" : "Pendaftaran ditolak"}</h1><p class="mute" style="margin:12px 0 22px;line-height:1.6">${w ? "Akun Anda sudah dibuat. Anda bisa mulai belajar setelah guru menyetujui pendaftaran ini. Coba periksa lagi nanti." : "Guru tidak menyetujui pendaftaran ini. Hubungi guru Anda jika merasa ini keliru."}</p><button class="btn full" id="cekLagi">Periksa lagi</button><button class="btn ghost full" id="keluarW" style="margin-top:8px">Keluar</button></div></div>`;
      $("#cekLagi").onclick = () => location.reload();
      $("#keluarW").onclick = () => signOut(auth).then(() => (location.href = "login.html"));
      return;
    }
    if (needAdmin && profile.role !== "admin") return (location.href = "dashboard.html");
    const nama = profile.nama || user.email || "Pengguna";
    const out = () => signOut(auth).then(() => (location.href = "login.html"));
    $(".app").insertAdjacentHTML("afterbegin", `<aside class="side"><div class="logo"><i>D</i>DASPRO</div>
      <nav>${tabs.map(([id, l, ic]) => `<button data-t="${id}"><span data-ic="${ic}"></span>${l}</button>`).join("")}</nav>
      <div class="me"><div class="av" style="overflow:hidden">${profile.foto && /^data:image\//.test(profile.foto) ? `<img src="${profile.foto}" alt="" style="width:100%;height:100%;object-fit:cover">` : esc(nama[0])}</div><div class="who"><b>${esc(nama)}</b><small>${needAdmin ? "Guru (admin)" : "Siswa"}</small></div><button id="keluar" title="Keluar" data-ic="out"></button></div></aside>`);
    $(".main").insertAdjacentHTML("afterbegin", `<div class="mtop"><div class="logo"><i>D</i>DASPRO</div><button id="keluar2" data-ic="out"></button></div>`);
    $("#keluar").onclick = out; $("#keluar2").onclick = out;
    const show = (id) => {
      document.querySelectorAll(".main > section").forEach((s) => s.classList.toggle("hide", s.id !== id));
      document.querySelectorAll(".side nav button").forEach((b) => b.classList.toggle("on", b.dataset.t === id));
      window.scrollTo(0, 0); views[id]?.();
    };
    document.querySelectorAll(".side nav button").forEach((b) => (b.onclick = () => show(b.dataset.t)));
    document.body.classList.remove("hide");
    resolve({ user, profile, show });
  }));
}
