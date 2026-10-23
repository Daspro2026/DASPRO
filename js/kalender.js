// Kalender bersama (siswa & guru). TIDAK menambah data di Firestore:
// hanya menata ulang tugas, kuis, dan pertemuan yang sudah ada menjadi tampilan kalender + agenda.
// Simpan di: js/kalender.js

const H = 864e5;
export const ymd = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const dari = (s) => new Date(s + "T00:00:00");
const hariIni = () => new Date(new Date().toDateString());
export const sisa = (s) => Math.round((dari(s) - hariIni()) / H);
const e = (s = "") => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const jam = (ms) => new Date(ms).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }).replace(".", ":");
const wajib = (x) => (x.jenis === "tugas" || x.jenis === "kuis") && x.selesai !== null;
export const JENIS = { tugas: "Tugas", kuis: "Kuis", buka: "Kuis dibuka", pertemuan: "Pertemuan" };

/* subs = { idTugas/Kuis: submission } untuk siswa; isi null untuk tampilan guru (status "selesai" tidak relevan) */
export function susunEvent({ tugas = [], kuis = [], pertemuan = [], subs = null, mapelNama = () => "", filterMapel = null } = {}) {
  const out = [], ok = (x) => filterMapel === null || (x.mapelId || "") === filterMapel;
  const sel = (id) => (subs ? !!subs[id] : null);
  tugas.filter(ok).forEach((t) => { if (t.deadline) out.push({ key: "t" + t.id, ref: t.id, jenis: "tugas", tgl: t.deadline, jam: "", judul: t.judul, sub: mapelNama(t), selesai: sel(t.id) }); });
  kuis.filter(ok).forEach((k) => {
    if (k.tutup) out.push({ key: "k" + k.id, ref: k.id, jenis: "kuis", tgl: ymd(new Date(k.tutup)), jam: jam(k.tutup), judul: k.judul, sub: mapelNama(k), selesai: sel(k.id) });
    if (k.buka && (!k.tutup || ymd(new Date(k.buka)) !== ymd(new Date(k.tutup)))) out.push({ key: "b" + k.id, ref: k.id, jenis: "buka", tgl: ymd(new Date(k.buka)), jam: jam(k.buka), judul: k.judul, sub: mapelNama(k), selesai: subs ? false : null });
  });
  pertemuan.filter(ok).forEach((p) => out.push({ key: "p" + p.id, ref: p.id, jenis: "pertemuan", tgl: p.tanggal, jam: "", judul: p.mapelNama || "Pertemuan", sub: p.topik || "", selesai: subs ? false : null }));
  return out.filter((x) => /^\d{4}-\d{2}-\d{2}$/.test(x.tgl)).sort((a, b) => a.tgl.localeCompare(b.tgl) || a.jam.localeCompare(b.jam));
}

export function chip(x) {
  const s = sisa(x.tgl), j = x.jam ? " " + x.jam : "";
  if (wajib(x)) {
    if (x.selesai) return ["ok", "Selesai"];
    if (s < 0) return ["bad", "Terlewat " + -s + " hari"];
    if (s === 0) return ["warn", "Hari ini" + j];
    if (s === 1) return ["warn", "Besok" + j];
    return [s <= 3 ? "warn" : "", s + " hari lagi"];
  }
  return s < 0 ? ["", "Lewat"] : s === 0 ? ["info", "Hari ini" + j] : ["", s === 1 ? "Besok" : s + " hari lagi"];
}

export function ringkasanHtml(events, guru = false) {
  const nyata = events.filter((x) => x.selesai !== true);
  const telat = nyata.filter((x) => wajib(x) && sisa(x.tgl) < 0).length;
  const hari = nyata.filter((x) => sisa(x.tgl) === 0).length;
  const pekan = nyata.filter((x) => { const s = sisa(x.tgl); return s >= 1 && s <= 7; }).length;
  const bln = events.filter((x) => x.tgl.slice(0, 7) === ymd(new Date()).slice(0, 7)).length;
  const t = guru ? [["Hari ini", hari, ""], ["7 hari ke depan", pekan, ""], ["Bulan ini", bln, ""]]
    : [["Terlewat", telat, telat ? "bad" : ""], ["Hari ini", hari, hari ? "warn" : ""], ["7 hari ke depan", pekan, ""]];
  return `<div class="kal-sum">${t.map(([l, n, c]) => `<div class="card kal-s ${c}"><b>${n}</b><span>${l}</span></div>`).join("")}</div>`;
}

const evItem = (x) => {
  const [c, t] = chip(x);
  const meta = [JENIS[x.jenis], x.sub].filter(Boolean).map(e).join(" · ") + (x.jam && x.jenis !== "tugas" ? " · " + x.jam : "");
  return `<button type="button" class="kal-ev ${x.jenis}${x.selesai === true ? " done" : ""}" data-k="${e(x.key)}"><i class="kal-bar"></i><span class="kal-et"><b>${e(x.judul)}</b><small>${meta}</small></span>${t ? `<span class="kal-chip ${c}">${t}</span>` : ""}</button>`;
};

/* root: elemen tujuan. opts.onKlik(event) dipanggil saat agenda diketuk. opts.state (objek) menyimpan bulan & tanggal terpilih antar render. */
export function renderKalender(root, events, opts = {}) {
  css();
  const S = opts.state || {};
  if (!S.kini) { S.kini = new Date(); S.kini.setDate(1); }
  if (!S.pilih) S.pilih = ymd(new Date());
  const byDay = {}; events.forEach((x) => (byDay[x.tgl] ||= []).push(x));
  const mobile = () => matchMedia("(max-width:860px)").matches;
  const gambar = () => {
    const y = S.kini.getFullYear(), m = S.kini.getMonth(), off = (new Date(y, m, 1).getDay() + 6) % 7, dim = new Date(y, m + 1, 0).getDate();
    const n = Math.ceil((off + dim) / 7) * 7, today = ymd(new Date());
    let sel = "";
    for (let i = 0; i < n; i++) {
      const d = new Date(y, m, 1 - off + i), k = ymd(d), ev = byDay[k] || [];
      const dots = ev.slice(0, 4).map((x) => `<span class="dt ${x.jenis}${x.selesai === true ? " done" : ""}"></span>`).join("");
      const tt = ev.slice(0, 2).map((x) => `<span class="tt ${x.jenis}${x.selesai === true ? " done" : ""}">${e(x.judul)}</span>`).join("") + (ev.length > 2 ? `<span class="tm">+${ev.length - 2} lagi</span>` : "");
      sel += `<button type="button" class="kal-d${d.getMonth() !== m ? " out" : ""}${k === today ? " now" : ""}${k === S.pilih ? " sel" : ""}" data-d="${k}" aria-label="${d.getDate()} ${d.toLocaleDateString("id-ID", { month: "long" })}, ${ev.length} agenda"><span class="kal-n">${d.getDate()}</span><span class="kal-dots">${dots}</span><span class="kal-tt">${tt}</span></button>`;
    }
    const hari = byDay[S.pilih] || [];
    const depan = events.filter((x) => x.selesai !== true && sisa(x.tgl) >= 0).slice(0, 6);
    const tglLbl = (s) => dari(s).toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long" });
    root.innerHTML = `<div class="kal">
      <div class="card kal-main"><div class="kal-head"><h2>${S.kini.toLocaleDateString("id-ID", { month: "long", year: "numeric" })}</h2>
        <div class="kal-nav"><button type="button" data-n="-1" aria-label="Bulan sebelumnya">&#8249;</button><button type="button" data-n="0" class="tx">Hari ini</button><button type="button" data-n="1" aria-label="Bulan berikutnya">&#8250;</button></div></div>
        <div class="kal-dow">${["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"].map((h) => `<span>${h}</span>`).join("")}</div>
        <div class="kal-grid">${sel}</div>
        <div class="kal-leg">${["tugas", "kuis", "buka", "pertemuan"].map((j) => `<span><span class="dt ${j}"></span>${JENIS[j]}</span>`).join("")}</div></div>
      <div class="kal-side">
        <div class="card kal-agenda"><h2>${tglLbl(S.pilih)}</h2>${hari.length ? `<div class="kal-list">${hari.map(evItem).join("")}</div>` : `<p class="mute sm" style="margin-top:10px">Tidak ada agenda di tanggal ini.</p>`}</div>
        ${depan.length ? `<div class="card"><h2>Mendatang</h2><div class="kal-list">${depan.map((x) => `<div class="kal-tg">${dari(x.tgl).toLocaleDateString("id-ID", { weekday: "short", day: "numeric", month: "short" })}</div>${evItem(x)}`).join("")}</div></div>` : ""}
      </div></div>`;
    root.querySelectorAll("[data-n]").forEach((b) => (b.onclick = () => {
      const v = Number(b.dataset.n);
      if (v === 0) { S.kini = new Date(); S.kini.setDate(1); S.pilih = ymd(new Date()); } else S.kini = new Date(S.kini.getFullYear(), S.kini.getMonth() + v, 1);
      gambar();
    }));
    root.querySelectorAll("[data-d]").forEach((b) => (b.onclick = () => {
      S.pilih = b.dataset.d; const d = dari(S.pilih);
      if (d.getMonth() !== S.kini.getMonth()) S.kini = new Date(d.getFullYear(), d.getMonth(), 1);
      gambar();
      if (mobile()) root.querySelector(".kal-agenda")?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }));
    root.querySelectorAll("[data-k]").forEach((b) => (b.onclick = () => { const x = events.find((v) => v.key === b.dataset.k); if (x && opts.onKlik) opts.onKlik(x); }));
  };
  gambar();
}

let sudahCss = false;
function css() {
  if (sudahCss) return; sudahCss = true;
  const s = document.createElement("style");
  s.textContent = `
.kal{--kt:#E8590C;--kk:#7C3AED;--kb:#0E9F6E;--kp:var(--brand);display:grid;grid-template-columns:minmax(0,1.55fr) minmax(0,1fr);gap:18px;align-items:start}
.kal-side{display:grid;gap:18px}
.kal-sum{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin-bottom:18px}
.kal-s{padding:16px 18px;display:flex;flex-direction:column;gap:2px}.kal-s b{font-size:1.7rem;font-weight:800;line-height:1.1}.kal-s span{font-size:.82rem;color:var(--mute);font-weight:600}
.kal-s.bad b{color:var(--bad,#DC2626)}.kal-s.warn b{color:var(--warn,#B45309)}
.kal-head{display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:14px}.kal-head h2{font-size:1.15rem;text-transform:capitalize}
.kal-nav{display:flex;gap:6px}.kal-nav button{border:1px solid var(--line);background:var(--card,#fff);color:var(--ink);font:inherit;font-weight:700;border-radius:10px;min-width:38px;height:38px;cursor:pointer;font-size:1.2rem;line-height:1;padding:0 8px}
.kal-nav button.tx{font-size:.8rem;padding:0 12px}.kal-nav button:hover{background:var(--soft);color:var(--brand);border-color:var(--b2)}
.kal-dow,.kal-grid{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:6px}
.kal-dow span{text-align:center;font-size:.74rem;font-weight:700;color:var(--mute);padding:4px 0 8px}
.kal-d{position:relative;display:flex;flex-direction:column;align-items:stretch;gap:4px;min-height:92px;padding:8px;border:1px solid var(--line);border-radius:12px;background:var(--card,#fff);font:inherit;color:var(--ink);cursor:pointer;text-align:left;overflow:hidden;transition:border-color .15s,background .15s}
.kal-d:hover{border-color:var(--b2);background:color-mix(in srgb,var(--soft) 55%,var(--card,#fff))}
.kal-d.out{opacity:.42}.kal-d.sel{border-color:var(--brand);background:var(--soft);box-shadow:0 0 0 2px color-mix(in srgb,var(--brand) 30%,transparent)}
.kal-n{font-weight:700;font-size:.9rem;width:26px;height:26px;display:grid;place-items:center;border-radius:50%}
.kal-d.now .kal-n{background:var(--brand);color:#fff}
.kal-dots{display:none;gap:3px;flex-wrap:wrap}.kal-tt{display:flex;flex-direction:column;gap:3px;min-width:0}
.tt{display:block;font-size:.7rem;font-weight:600;padding:2px 6px;border-radius:6px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:#fff}
.tm{font-size:.68rem;color:var(--mute);font-weight:600;padding-left:2px}
.tt.tugas,.dt.tugas{background:var(--kt)}.tt.kuis,.dt.kuis{background:var(--kk)}.tt.buka,.dt.buka{background:var(--kb)}.tt.pertemuan,.dt.pertemuan{background:var(--kp)}
.tt.done{opacity:.45;text-decoration:line-through}.dt.done{opacity:.4}
.dt{display:inline-block;width:7px;height:7px;border-radius:50%}
.kal-leg{display:flex;flex-wrap:wrap;gap:6px 16px;margin-top:14px;font-size:.78rem;color:var(--mute);font-weight:600}.kal-leg>span{display:inline-flex;align-items:center;gap:6px}
.kal-agenda h2,.kal-side h2{font-size:1rem;text-transform:capitalize}
.kal-list{display:flex;flex-direction:column;gap:8px;margin-top:12px}
.kal-tg{font-size:.74rem;font-weight:700;color:var(--mute);margin-top:6px}.kal-tg:first-child{margin-top:0}
.kal-ev{display:flex;align-items:center;gap:12px;width:100%;text-align:left;font:inherit;color:var(--ink);background:color-mix(in srgb,var(--ink) 3%,var(--card,#fff));border:1px solid var(--line);border-radius:14px;padding:11px 12px 11px 0;cursor:pointer;overflow:hidden;transition:transform .15s,border-color .15s}
.kal-ev:hover{border-color:var(--b2);transform:translateX(2px)}
.kal-bar{align-self:stretch;width:5px;border-radius:0 5px 5px 0;flex:none;background:var(--kp)}
.kal-ev.tugas .kal-bar{background:var(--kt)}.kal-ev.kuis .kal-bar{background:var(--kk)}.kal-ev.buka .kal-bar{background:var(--kb)}
.kal-et{flex:1;min-width:0;display:flex;flex-direction:column}.kal-et b{font-size:.9rem;overflow-wrap:anywhere}.kal-et small{color:var(--mute);font-size:.78rem}
.kal-ev.done .kal-et b{text-decoration:line-through;opacity:.6}
.kal-chip{flex:none;font-size:.72rem;font-weight:700;padding:3px 10px;border-radius:99px;background:var(--soft);color:var(--brand);white-space:nowrap}
.kal-chip.ok{background:var(--okbg,#E3F8EE);color:var(--ok,#0E9F6E)}.kal-chip.warn{background:var(--warnbg,#FFF4D6);color:var(--warn,#B45309)}.kal-chip.bad{background:#FDE8E8;color:#B91C1C}
@media(max-width:860px){
 .kal{grid-template-columns:minmax(0,1fr)}
 .kal-sum{gap:8px}.kal-s{padding:12px}.kal-s b{font-size:1.4rem}.kal-s span{font-size:.72rem}
 .kal-dow,.kal-grid{gap:3px}.kal-d{min-height:52px;padding:5px 2px;align-items:center;border-radius:10px}.kal-tt{display:none}.kal-dots{display:flex;justify-content:center;min-height:7px}
 .kal-n{font-size:.85rem}.kal-main{padding:16px 12px}.kal-ev{padding-right:10px}.kal-chip{font-size:.68rem;padding:3px 8px}
}`;
  document.head.appendChild(s);
}
