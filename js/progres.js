// Penanda progres materi. HEMAT: satu dokumen per siswa (progres/{uid}) berisi peta { idMateri: waktuSelesai }.
// Tulis ke server ditunda 0,8 detik agar beberapa klik beruntun hanya jadi 1 penulisan.
// Bila aturan Firestore belum dipublikasikan, progres tetap tersimpan di perangkat (localStorage) sebagai cadangan.
// Simpan di: js/progres.js
import { db, doc, getDoc, setDoc, getDocs, collection, serverTimestamp } from "./firebase.js";
import { icon, toast } from "./common.js";

export function buat(uid) {
  const kL = "daspro_pr_" + uid, kD = kL + "_dirty";
  let map = {}, t = null, warned = false;
  const lokal = () => { try { return JSON.parse(localStorage.getItem(kL) || "{}") || {}; } catch { return {}; } };
  const tulisLokal = () => { try { localStorage.setItem(kL, JSON.stringify(map)); } catch {} };
  const dirty = (v) => { try { v ? localStorage.setItem(kD, "1") : localStorage.removeItem(kD); } catch {} };
  const kotor = () => { try { return !!localStorage.getItem(kD); } catch { return false; } };
  async function kirim() {
    t = null; tulisLokal();
    try { await setDoc(doc(db, "progres", uid), { materi: map, updatedAt: serverTimestamp() }); dirty(false); }
    catch { dirty(true); if (!warned) { warned = true; toast("Progres tersimpan di perangkat ini (belum tersambung ke server)"); } }
  }
  return {
    async muat() {
      const l = lokal(); let remote = null;
      try { const s = await getDoc(doc(db, "progres", uid)); remote = s.exists() ? s.data().materi || {} : {}; } catch {}
      map = remote === null ? l : kotor() ? { ...remote, ...l } : remote;
      if (remote !== null && kotor()) kirim();
      return map;
    },
    ada: (id) => !!map[id],
    toggle(id) {
      if (map[id]) delete map[id]; else map[id] = Math.floor(Date.now() / 1000);
      tulisLokal(); clearTimeout(t); t = setTimeout(kirim, 800);
      return !!map[id];
    },
    hitung(materi) {
      const n = materi.filter((m) => map[m.id]).length, total = materi.length;
      return { n, total, persen: total ? Math.round((n / total) * 100) : 0 };
    },
  };
}

/* Guru: baca progres semua siswa sekali jalan → { uidSiswa: { idMateri: waktu } } */
export async function semua() {
  const o = {};
  (await getDocs(collection(db, "progres"))).docs.forEach((d) => (o[d.id] = d.data().materi || {}));
  return o;
}

export const barHtml = (h) => `<div class="pr-bar${h.total && h.persen === 100 ? " ok" : ""}" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${h.persen}"><i style="width:${h.persen}%"></i></div>`;
export const tombol = (id, on) => { css(); return `<button type="button" class="btn sm ghost pr-btn${on ? " done" : ""}" data-pr="${String(id).replace(/"/g, "")}" aria-pressed="${!!on}">${icon("check")}<span>${on ? "Selesai dibaca" : "Tandai selesai"}</span></button>`; };

/* Satu pendengar klik untuk semua tombol [data-pr]; memperbarui tampilan tanpa render ulang halaman */
export function pasangKlik(pr, onUbah) {
  css();
  document.addEventListener("click", (e) => {
    const b = e.target.closest("[data-pr]"); if (!b) return;
    const on = pr.toggle(b.dataset.pr);
    b.classList.toggle("done", on); b.setAttribute("aria-pressed", on);
    b.querySelector("span").textContent = on ? "Selesai dibaca" : "Tandai selesai";
    b.closest(".mat")?.classList.toggle("pr-done", on);
    if (onUbah) onUbah(b.dataset.pr, on);
  });
}

let sudahCss = false;
function css() {
  if (sudahCss) return; sudahCss = true;
  const s = document.createElement("style");
  s.textContent = `
.pr-bar{height:8px;border-radius:99px;background:color-mix(in srgb,var(--ink) 9%,var(--card,#fff));overflow:hidden;min-width:60px}
.pr-bar i{display:block;height:100%;border-radius:inherit;background:linear-gradient(90deg,var(--brand),var(--b2));transition:width .45s var(--ease,ease)}
.pr-bar.ok i{background:linear-gradient(90deg,#10B981,#34D399)}
.pr-mini{display:flex;align-items:center;gap:10px;min-width:0}.pr-mini .pr-bar{flex:1}.pr-mini small{color:var(--mute);font-weight:600;white-space:nowrap;font-size:.78rem}
.pr-head{margin-top:14px;max-width:460px}.pr-head .pr-bar{height:10px}
.pr-btn{transition:background .2s,color .2s}.pr-btn.done{background:var(--okbg,#E3F8EE);color:var(--ok,#0E9F6E);border-color:transparent}
.card.mat.pr-done{border-color:color-mix(in srgb,var(--ok,#0E9F6E) 45%,var(--line))}
.pr-row{gap:12px}.pr-info{flex:1;min-width:0}.pr-info b{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.pr-pct{font-weight:800;font-size:.9rem;min-width:42px;text-align:right}
@media(max-width:860px){.pr-head{max-width:none}}`;
  document.head.appendChild(s);
}
