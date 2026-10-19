import { DEMO, auth, db, onAuthStateChanged, signOut, doc, getDoc } from "./firebase.js";

export const $ = (s) => document.querySelector(s);
export const esc = (s = "") => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
export const safeUrl = (u = "") => (/^https?:\/\//i.test(u) ? esc(u) : "#");
export const fdate = (s) => (s ? new Date(s).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }) : "");
export const ago = (t) => { const d = Math.floor((Date.now() / 1000 - (t?.seconds || 0)) / 86400); return d <= 0 ? "Hari ini" : d + " hari lalu"; };

const P = { home: "M3 11l9-8 9 8M5 10v10h14V10", book: "M4 19.5A2.5 2.5 0 016.5 17H20V3H6.5A2.5 2.5 0 004 5.5zM4 19.5V21h16", task: "M9 11l3 3 8-8M20 12v7a2 2 0 01-2 2H6a2 2 0 01-2-2V5a2 2 0 012-2h9", star: "M12 2l3 6.9 7.5.7-5.7 5 1.7 7.4L12 18l-6.5 4 1.7-7.4-5.7-5 7.5-.7z", upload: "M12 16V4M7 9l5-5 5 5M4 20h16", check: "M5 13l4 4L19 7", out: "M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9", users: "M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM23 21v-2a4 4 0 00-3-3.9M16 3.1a4 4 0 010 7.8", clock: "M12 22a10 10 0 100-20 10 10 0 000 20zM12 6v6l4 2", file: "M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8zM14 2v6h6", grid: "M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z", download: "M12 4v12M7 11l5 5 5-5M4 20h16", trash: "M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6", sliders: "M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6", edit: "M12 20h9M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4z" };
export const icon = (n) => `<svg class="i" viewBox="0 0 24 24"><path d="${P[n] || ""}"/></svg>`;
const fill = () => document.querySelectorAll("[data-ic]:empty").forEach((e) => (e.innerHTML = icon(e.dataset.ic)));
new MutationObserver(fill).observe(document.documentElement, { childList: true, subtree: true });
fill();

// ---- Unggah file jawaban
export const UPLOAD = { maxMB: 10, maxFiles: 5, accept: ".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.csv,.txt,.zip,.png,.jpg,.jpeg,.webp" };
const MIME = { pdf: "application/pdf", doc: "application/msword", docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", ppt: "application/vnd.ms-powerpoint", pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation", xls: "application/vnd.ms-excel", xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", csv: "text/csv", txt: "text/plain", zip: "application/zip", png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", webp: "image/webp" };
export const extOf = (n = "") => (n.split(".").pop() || "").toLowerCase();
export const fileOk = (f) => !!MIME[extOf(f.name)];
export const mimeOf = (f) => MIME[extOf(f.name)] || f.type || "application/octet-stream";
export const fmtSize = (b = 0) => (b >= 1048576 ? (b / 1048576).toFixed(1) + " MB" : Math.max(1, Math.round(b / 1024)) + " KB");
export const fileChips = (arr) => (Array.isArray(arr) && arr.length ? `<div class="files">${arr.map((f) => `<a class="fchip" href="${safeUrl(f.url)}" target="_blank" rel="noopener">${icon("file")}<span class="fn">${esc(f.nama)}</span><small>${fmtSize(f.ukuran)}</small>${icon("download")}</a>`).join("")}</div>` : "");

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
