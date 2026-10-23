// Pelacakan integritas kuis: mencatat berapa kali siswa meninggalkan halaman kuis (pindah tab/aplikasi).
// Ini PENCEGAH dan indikator untuk guru, bukan bukti mutlak (HP bisa terganggu notifikasi, dsb.).
// Simpan di: js/integritas.js

const MIN = 1; // jeda di bawah 1 detik diabaikan (mis. dialog bawaan browser)
const kunci = (k) => "daspro_ig_" + k;
const kosong = () => ({ pindah: 0, detik: 0, maks: 0, kiri: 0 });
const baca = (k) => {
  try { const o = JSON.parse(localStorage.getItem(kunci(k)) || "null"); if (o && typeof o === "object") return { pindah: +o.pindah || 0, detik: +o.detik || 0, maks: +o.maks || 0, kiri: +o.kiri || 0 }; } catch {}
  return kosong();
};
const tulis = (k, s) => { try { localStorage.setItem(kunci(k), JSON.stringify(s)); } catch {} };

/* ===== Sisi siswa ===== */
/* key: pengenal unik percobaan (uid_kuis_percobaan). Hitungan disimpan di perangkat sehingga memuat ulang halaman tidak mengatur ulang angka.
   onUbah(state, jedaDetik) dipanggil setiap siswa kembali ke halaman (jedaDetik > 0 bila jeda dihitung). */
export function lacak(key, onUbah) {
  const s = baca(key);
  const kembali = () => {
    if (!s.kiri) return;
    const dt = Math.round((Date.now() - s.kiri) / 1000); s.kiri = 0;
    if (dt >= MIN) { s.pindah++; s.detik += dt; s.maks = Math.max(s.maks, dt); }
    tulis(key, s); if (onUbah) onUbah({ ...s }, dt >= MIN ? dt : 0);
  };
  const pergi = () => { if (s.kiri) return; s.kiri = Date.now(); tulis(key, s); };
  const vis = () => (document.hidden ? pergi() : document.hasFocus() && kembali());
  const fokus = () => kembali(), blur = () => pergi();
  document.addEventListener("visibilitychange", vis);
  window.addEventListener("blur", blur); window.addEventListener("focus", fokus); window.addEventListener("pagehide", pergi);
  if (s.kiri) kembali(); // halaman dimuat ulang setelah ditinggalkan: waktu di luar tetap dihitung
  const berhenti = () => {
    document.removeEventListener("visibilitychange", vis);
    window.removeEventListener("blur", blur); window.removeEventListener("focus", fokus); window.removeEventListener("pagehide", pergi);
  };
  return {
    /* cuplikan angka saat ini (termasuk jeda yang sedang berlangsung) untuk dikirim ke server */
    ambil() {
      let { pindah, detik, maks } = s;
      if (s.kiri) { const dt = Math.round((Date.now() - s.kiri) / 1000); if (dt >= MIN) { pindah++; detik += dt; maks = Math.max(maks, dt); } }
      return { pindah, detik, maks };
    },
    berhenti,
    selesai() { berhenti(); try { localStorage.removeItem(kunci(key)); } catch {} },
  };
}

export const catatanHtml = () => { css(); return `<div class="ig-note"><svg class="i" viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12zM12 15a3 3 0 100-6 3 3 0 000 6z"/></svg><span>Selama kuis berlangsung, berpindah ke tab atau aplikasi lain <b>dicatat</b> dan dapat dilihat guru.</span></div>`; };

/* ===== Sisi guru ===== */
export const fmt = (s) => { s = Math.round(Number(s) || 0); const m = Math.floor(s / 60); return m ? `${m} mnt ${s % 60} dtk` : `${s} dtk`; };
export function level(ig) {
  if (!ig) return { k: "na", t: "Tidak tercatat" };
  const p = Number(ig.pindah) || 0;
  return p === 0 ? { k: "ok", t: "Aman" } : p <= 2 ? { k: "", t: "Rendah" } : p <= 5 ? { k: "warn", t: "Perlu dicek" } : { k: "bad", t: "Tinggi" };
}
/* label kecil, mis. di tabel rekap */
export const tagHtml = (ig) => {
  if (!ig) return "";
  css(); const l = level(ig), p = Number(ig.pindah) || 0;
  return ` <span class="ig-b ${l.k}" title="${p}× pindah tab · ${fmt(ig.detik)} di luar halaman">${p ? "Pindah tab " + p + "×" : "Tidak pindah tab"}</span>`;
};
/* blok rinci, mis. di panel periksa */
export const badgeHtml = (ig) => {
  css();
  if (!ig) return `<div class="ig-box na"><b>Integritas kuis</b><span>Tidak ada data perpindahan tab untuk pengumpulan ini.</span></div>`;
  const l = level(ig), p = Number(ig.pindah) || 0;
  const rinci = [p ? `${p}× pindah tab` : "Tidak pindah tab", p ? `${fmt(ig.detik)} di luar halaman (terlama ${fmt(ig.maks)})` : "", ig.lama ? `waktu pengerjaan ${fmt(ig.lama)}` : "", ig.tanpaLaporan ? "laporan perpindahan tab tidak terkirim" : ""].filter(Boolean).join(" · ");
  return `<div class="ig-box ${l.k}"><b>Integritas: ${l.t}</b><span>${rinci}</span></div>`;
};

let sudahCss = false;
function css() {
  if (sudahCss) return; sudahCss = true;
  const s = document.createElement("style");
  s.textContent = `
.ig-note{display:flex;gap:10px;align-items:flex-start;margin-top:14px;padding:11px 14px;border-radius:12px;background:var(--warnbg,#FFF4D6);color:var(--warn,#8A5A00);font-size:.82rem;line-height:1.45}
.ig-note svg{margin-top:2px}
.ig-b{display:inline-flex;align-items:center;font-size:.72rem;font-weight:700;padding:2px 9px;border-radius:99px;background:var(--soft);color:var(--brand);white-space:nowrap;vertical-align:middle}
.ig-b.ok{background:var(--okbg,#E3F8EE);color:var(--ok,#0E9F6E)}.ig-b.warn{background:var(--warnbg,#FFF4D6);color:var(--warn,#B45309)}.ig-b.bad{background:#FDE8E8;color:#B42318}.ig-b.na{background:color-mix(in srgb,var(--ink) 7%,var(--card,#fff));color:var(--mute)}
.ig-box{display:flex;flex-direction:column;gap:2px;margin-top:14px;padding:11px 14px;border-radius:12px;font-size:.84rem;background:var(--soft);color:var(--ink)}
.ig-box b{font-size:.86rem}.ig-box span{color:var(--mute)}
.ig-box.ok{background:var(--okbg,#E3F8EE)}.ig-box.warn{background:var(--warnbg,#FFF4D6)}.ig-box.bad{background:#FDE8E8}.ig-box.bad b{color:#B42318}.ig-box.na{background:color-mix(in srgb,var(--ink) 5%,var(--card,#fff))}
.ig-tag{white-space:nowrap}
.ig-row{gap:12px}.ig-row .ig-info{flex:1;min-width:0}.ig-row .ig-info b{display:block;overflow-wrap:anywhere}
.ig-row .ig-meta{display:flex;flex-wrap:wrap;gap:4px 10px;margin-top:2px}
.ig-side{display:flex;flex-direction:column;align-items:flex-end;gap:4px;text-align:right;flex:none}
@media(max-width:860px){.ig-row{align-items:flex-start;flex-wrap:wrap}.ig-side{flex-direction:row;align-items:center;gap:8px;width:100%;justify-content:flex-start}}`;
  document.head.appendChild(s);
}
