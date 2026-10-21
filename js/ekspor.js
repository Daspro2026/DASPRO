// Ekspor data ke Excel (.xlsx, memakai SheetJS dari CDN) dan CSV. Berjalan di browser guru, tanpa server.
const SRC = "https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js";
let lib = null;
const muat = () => (lib ??= new Promise((ok, no) => {
  const s = Object.assign(document.createElement("script"), { src: SRC, onload: () => ok(window.XLSX), onerror: () => { lib = null; no(new Error("Gagal memuat pustaka Excel. Periksa koneksi internet.")); } });
  document.head.append(s);
}));
const simpan = (blob, nama) => {
  const a = Object.assign(document.createElement("a"), { href: URL.createObjectURL(blob), download: nama });
  document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 60000);
};
export const aman = (s) => String(s || "").replace(/[\\/:*?"<>|]+/g, "").trim().replace(/\s+/g, "-");

// sheets: [{ nama, rows: [[header...], [data...]], lebar?: [angka per kolom] }]
export async function unduhExcel(sheets, namaFile) {
  const X = await muat(), wb = X.utils.book_new();
  for (const { nama, rows, lebar } of sheets) {
    const ws = X.utils.aoa_to_sheet(rows);
    const w = lebar || rows[0].map((_, i) => Math.min(46, Math.max(8, ...rows.map((r) => String(r[i] ?? "").length)) + 2));
    ws["!cols"] = w.map((x) => ({ wch: x }));
    ws["!autofilter"] = { ref: X.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: rows.length - 1, c: rows[0].length - 1 } }) };
    X.utils.book_append_sheet(wb, ws, nama.slice(0, 31));
  }
  simpan(new Blob([X.write(wb, { bookType: "xlsx", type: "array" })], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }), namaFile);
}

// CSV: UTF-8 dengan BOM (agar huruf Indonesia benar di Excel). Teks yang diawali = + - @ diberi tanda ' agar tidak terbaca sebagai rumus.
export function unduhCsv(rows, namaFile) {
  const q = (v) => { let s = String(v ?? ""); if (typeof v !== "number" && /^[=+\-@\t\r]/.test(s)) s = "'" + s; return '"' + s.replace(/"/g, '""') + '"'; };
  simpan(new Blob(["\uFEFF" + rows.map((r) => r.map(q).join(",")).join("\r\n")], { type: "text/csv;charset=utf-8" }), namaFile);
}
