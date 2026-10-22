// Service worker DASPRO: halaman & aset dimuat dari jaringan lebih dulu (selalu versi terbaru),
// dan memakai salinan tersimpan bila HP sedang offline. Data Firebase tidak disimpan di sini.
const V = "daspro-v1";
const SHELL = ["./", "start.html", "index.html", "login.html", "dashboard.html", "admin.html", "css/theme.css",
  "js/common.js", "js/firebase.js", "js/poin.js", "js/reset.js", "js/sertifikat.js", "js/ekspor.js", "js/mock.js",
  "icon-192.png", "manifest.webmanifest"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(V).then((c) => Promise.allSettled(SHELL.map((u) => c.add(u)))).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((k) => Promise.all(k.filter((x) => x !== V).map((x) => caches.delete(x)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", (e) => {
  const r = e.request, u = new URL(r.url);
  if (r.method !== "GET" || u.origin !== location.origin) return;
  e.respondWith(
    fetch(r, { cache: "no-cache" })
      .then((res) => { if (res.ok) { const salin = res.clone(); caches.open(V).then((c) => c.put(r, salin)); } return res; })
      .catch(() => caches.match(r, { ignoreSearch: true }).then((m) => m || (r.mode === "navigate" ? caches.match("index.html") : Response.error())))
  );
});
