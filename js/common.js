import { DEMO, auth, db, onAuthStateChanged, signOut, doc, getDoc } from "./firebase.js";

export const $ = (s) => document.querySelector(s);
export const esc = (s = "") => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
export const safeUrl = (u = "") => (/^https?:\/\//i.test(u) ? esc(u) : "#");
export const fdate = (s) => (s ? new Date(s).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }) : "");
export const ago = (t) => { const d = Math.floor((Date.now() / 1000 - (t?.seconds || 0)) / 86400); return d <= 0 ? "Hari ini" : d + " hari lalu"; };

const P = { home: "M3 11l9-8 9 8M5 10v10h14V10", book: "M4 19.5A2.5 2.5 0 016.5 17H20V3H6.5A2.5 2.5 0 004 5.5zM4 19.5V21h16", task: "M9 11l3 3 8-8M20 12v7a2 2 0 01-2 2H6a2 2 0 01-2-2V5a2 2 0 012-2h9", star: "M12 2l3 6.9 7.5.7-5.7 5 1.7 7.4L12 18l-6.5 4 1.7-7.4-5.7-5 7.5-.7z", upload: "M12 16V4M7 9l5-5 5 5M4 20h16", check: "M5 13l4 4L19 7", out: "M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9", users: "M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM23 21v-2a4 4 0 00-3-3.9M16 3.1a4 4 0 010 7.8", clock: "M12 22a10 10 0 100-20 10 10 0 000 20zM12 6v6l4 2", file: "M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8zM14 2v6h6", grid: "M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z", download: "M12 4v12M7 11l5 5 5-5M4 20h16", trash: "M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6", edit: "M12 20h9M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4z" };
export const icon = (n) => `<svg class="i" viewBox="0 0 24 24"><path d="${P[n] || ""}"/></svg>`;
const fill = () => document.querySelectorAll("[data-ic]:empty").forEach((e) => (e.innerHTML = icon(e.dataset.ic)));
new MutationObserver(fill).observe(document.documentElement, { childList: true, subtree: true });
fill();

export function toast(m) {
  const t = Object.assign(document.createElement("div"), { className: "toast", textContent: m });
  document.body.append(t); setTimeout(() => t.remove(), 2400);
}
if (DEMO) document.body.insertAdjacentHTML("afterbegin", '<div class="demo">MODE DEMO: data contoh. Isi js/firebase.js untuk memakai Firebase. (Masuk dengan email berisi "guru" untuk melihat tampilan admin.)</div>');

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
      <div class="me"><div class="av">${esc(nama[0])}</div><div class="who"><b>${esc(nama)}</b><small>${needAdmin ? "Guru (admin)" : "Siswa"}</small></div><button id="keluar" title="Keluar" data-ic="out"></button></div></aside>`);
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
