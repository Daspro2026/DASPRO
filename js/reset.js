// Lupa / ganti kata sandi lewat email (Firebase Authentication, gratis di paket Spark).
import { auth, DEMO } from "./firebase.js";

export async function kirimReset(email) {
  if (DEMO) return; // mode demo: tidak mengirim apa pun
  const { sendPasswordResetEmail } = await import("https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js");
  auth.languageCode = "id"; // email dan halaman reset berbahasa Indonesia
  try { await sendPasswordResetEmail(auth, email); }
  catch (e) { if (e.code !== "auth/user-not-found") throw e; } // jangan bocorkan apakah email terdaftar
}

export const pesanReset = (e) => ({
  "auth/invalid-email": "Format email tidak valid.",
  "auth/too-many-requests": "Terlalu banyak percobaan. Coba lagi beberapa menit lagi.",
  "auth/network-request-failed": "Koneksi bermasalah. Coba lagi."
}[e.code] || "Gagal mengirim email. Coba lagi.");

// Tombol "ganti kata sandi" untuk pengguna yang sudah masuk (siswa & guru)
export function pasangGantiSandi(btn, email, toast) {
  btn.onclick = async () => {
    if (!email) return alert("Email akun tidak ditemukan.");
    if (!confirm("Kirim tautan ganti kata sandi ke " + email + "?")) return;
    btn.disabled = true;
    try { await kirimReset(email); toast("Tautan terkirim. Cek email Anda (termasuk folder spam)."); setTimeout(() => (btn.disabled = false), 60000); }
    catch (er) { alert(pesanReset(er)); btn.disabled = false; }
  };
}
