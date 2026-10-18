# DASPRO (Daus Academic & Skills Platform)

Website statis HTML + CSS + JavaScript, terhubung ke Firebase. Tanpa build. Tinggal upload ke GitHub dan deploy di Vercel.

CSS sudah tertanam di setiap file HTML, jadi tampilan tetap muncul walau file dipindah-pindah.
Folder `js/` WAJIB ikut di-upload.

## Lihat tampilan dulu (Mode Demo)
Selama `js/firebase.js` belum diisi, website berjalan dalam MODE DEMO dengan data contoh.
- Buka lewat server lokal (module JS tidak jalan jika file dibuka dengan klik ganda): `npx serve .` atau ekstensi "Live Server" di VS Code.
- Masuk dengan email apa saja untuk tampilan siswa, atau email yang mengandung "guru" (mis. guru@daspro.id) untuk tampilan admin.

## Memakai Firebase sungguhan
1. Firebase Console: buat project, aktifkan Authentication (Email/Password), Firestore, dan Storage.
2. Tempel `firestore.rules` dan `storage.rules` di tab Rules.
3. Daftarkan Web App, salin `firebaseConfig` ke `js/firebase.js` (ganti semua nilai `ISI_...`).
4. Upload semua file ke GitHub, lalu Vercel > Add New Project > pilih repo > Deploy.
5. Firebase > Authentication > Settings > Authorized domains > tambahkan domain Vercel.
6. Jadikan akun Anda admin: daftar di login.html, buka Firestore > koleksi `users` > dokumen akun Anda > ubah `role` menjadi `admin`, lalu login ulang.
