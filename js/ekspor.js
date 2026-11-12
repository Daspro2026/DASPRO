// Ekspor data ke Excel (.xlsx berformat, memakai ExcelJS dari CDN) dan CSV. Berjalan di browser guru, tanpa server.
const simpan = (blob, nama) => {
  const a = Object.assign(document.createElement("a"), { href: URL.createObjectURL(blob), download: nama });
  document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 60000);
};
export const aman = (s) => String(s || "").replace(/[\\/:*?"<>|]+/g, "").trim().replace(/\s+/g, "-");

// ---- Excel berformat (memakai ExcelJS dari CDN, karena SheetJS gratis tidak mendukung gaya sel)
const SRC_XLS = "https://cdnjs.cloudflare.com/ajax/libs/exceljs/4.4.0/exceljs.min.js";
let libX = null;
const muatX = () => (libX ??= new Promise((ok, no) => {
  if (window.ExcelJS) return ok(window.ExcelJS);
  const s = Object.assign(document.createElement("script"), { src: SRC_XLS, onload: () => ok(window.ExcelJS), onerror: () => { libX = null; no(new Error("Gagal memuat pustaka Excel. Periksa koneksi internet.")); } });
  document.head.append(s);
}));

const WARNA = { navy: "FF1F3A5F", aksen: "FF2E75B6", garis: "FFC9D3E0", zebra: "FFF2F6FB", teks: "FF1F2937", abu: "FF6B7280" };
const garis = (c = WARNA.garis) => ({ top: { style: "thin", color: { argb: c } }, left: { style: "thin", color: { argb: c } }, bottom: { style: "thin", color: { argb: c } }, right: { style: "thin", color: { argb: c } } });
const kosong = (v) => v === null || v === undefined || v === "";

// Membuat workbook berformat dari sheets. Dipisah dari unduh agar mudah diuji.
// sheets: [{ nama, rows: [[header...], [data...]], lebar?: [angka per kolom], judul?: "teks judul" }]
export function bangunWorkbook(ExcelJS, sheets, { instansi = "DASPRO", tanggal = new Date() } = {}) {
  const wb = new ExcelJS.Workbook();
  wb.creator = instansi; wb.created = tanggal;
  const cetak = "Dicetak: " + tanggal.toLocaleString("id-ID", { dateStyle: "long", timeStyle: "short" });
  const dipakai = new Set();

  for (const { nama, rows, lebar, judul } of sheets) {
    let nm = String(nama || "Data").replace(/[\\/?*\[\]:]/g, " ").trim().slice(0, 31) || "Data", k = 2;
    while (dipakai.has(nm.toLowerCase())) nm = nm.slice(0, 28) + " " + k++;
    dipakai.add(nm.toLowerCase());

    const n = Math.max(1, rows[0]?.length || 1), H = 4;            // baris judul 1-3, header di baris 4
    const ws = wb.addWorksheet(nm, { views: [{ showGridLines: false }], properties: { tabColor: { argb: WARNA.aksen } } });

    // Lebar & perataan kolom
    const kolom = Array.from({ length: n }, (_, i) => rows.map((r) => r[i]));
    const w = lebar || kolom.map((c) => Math.min(50, Math.max(9, ...c.map((v, j) => String(v ?? "").split("\n").reduce((m, t) => Math.max(m, t.length), 0) * (j === 0 ? 1.15 : 1))) + 3));
    ws.columns = w.map((x) => ({ width: x }));
    const tengah = kolom.map((c) => { const b = c.slice(1).filter((v) => !kosong(v)); return b.length > 0 && b.every((v) => typeof v === "number" || String(v).length <= 14); });

    // Judul laporan
    ws.getCell(1, 1).value = String(judul || nama).toUpperCase();
    ws.getCell(1, 1).font = { name: "Calibri", size: 16, bold: true, color: { argb: WARNA.navy } };
    ws.getCell(2, 1).value = instansi + "  |  " + cetak;
    ws.getCell(2, 1).font = { name: "Calibri", size: 10, italic: true, color: { argb: WARNA.abu } };
    ws.getRow(1).height = 28; ws.getRow(2).height = 18; ws.getRow(3).height = 6;
    for (let c = 1; c <= n; c++) ws.getCell(3, c).border = { top: { style: "medium", color: { argb: WARNA.aksen } } };

    // Header tabel
    rows[0].forEach((v, i) => {
      const c = ws.getCell(H, i + 1);
      c.value = kosong(v) ? null : v;
      c.font = { name: "Calibri", size: 11, bold: true, color: { argb: "FFFFFFFF" } };
      c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: WARNA.navy } };
      c.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
      c.border = garis(WARNA.navy);
    });
    ws.getRow(H).height = 32;

    // Isi tabel
    rows.slice(1).forEach((r, ri) => {
      const row = ws.getRow(H + 1 + ri);
      for (let i = 0; i < n; i++) {
        const v = r[i], c = row.getCell(i + 1);
        c.value = kosong(v) ? null : v;
        c.font = { name: "Calibri", size: 11, color: { argb: WARNA.teks } };
        c.alignment = { horizontal: tengah[i] ? "center" : "left", vertical: "middle", wrapText: true };
        c.border = garis();
        if (ri % 2 === 1) c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: WARNA.zebra } };
      }
      row.commit?.();
    });

    // Fitur bantu: bekukan header (+ kolom nama untuk tabel lebar), filter, pengaturan cetak
    const bekuKolom = n > 6 && /nama/i.test(String(rows[0][1] ?? "")) ? 2 : 0;
    ws.views = [{ showGridLines: false, state: "frozen", xSplit: bekuKolom, ySplit: H }];
    if (rows.length > 1) ws.autoFilter = { from: { row: H, column: 1 }, to: { row: H + rows.length - 1, column: n } };
    ws.pageSetup = { paperSize: 9, orientation: n > 6 ? "landscape" : "portrait", fitToPage: true, fitToWidth: 1, fitToHeight: 0, printTitlesRow: `${H}:${H}`, horizontalCentered: true, margins: { left: 0.5, right: 0.5, top: 0.6, bottom: 0.6, header: 0.3, footer: 0.3 } };
    ws.headerFooter = { oddFooter: `&L&8${instansi}&R&8Halaman &P dari &N` };
  }
  return wb;
}

export async function unduhExcel(sheets, namaFile, opsi) {
  const E = await muatX(), wb = bangunWorkbook(E, sheets, opsi);
  simpan(new Blob([await wb.xlsx.writeBuffer()], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }), namaFile);
}

// CSV: UTF-8 dengan BOM (agar huruf Indonesia benar di Excel). Teks yang diawali = + - @ diberi tanda ' agar tidak terbaca sebagai rumus.
export function unduhCsv(rows, namaFile) {
  const q = (v) => { let s = String(v ?? ""); if (typeof v !== "number" && /^[=+\-@\t\r]/.test(s)) s = "'" + s; return '"' + s.replace(/"/g, '""') + '"'; };
  simpan(new Blob(["\uFEFF" + rows.map((r) => r.map(q).join(",")).join("\r\n")], { type: "text/csv;charset=utf-8" }), namaFile);
}
