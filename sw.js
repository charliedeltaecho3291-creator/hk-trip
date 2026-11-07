// HK Trip のオフライン用 service worker
// 版番号はビルドのたびに Build-HKSpots.ps1 が書き換える → iPhone 側が新しい sw.js を見つけて入れ替わる
const VERSION = "20261107-184642";
const CACHE = "hk-trip-" + VERSION;
const FILES = ["./", "./index.html", "./manifest.json", "./apple-touch-icon.png", "./icon-192.png", "./icon-512.png"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES.map(f => new Request(f, { cache: "reload" })))).then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k.startsWith("hk-trip-") && k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

// 自分のファイルだけ扱う（Googleマップなど外部は素通し）
// まずネットから最新を取り（4秒で諦める）、取れなければ端末に保存した版を出す
self.addEventListener("fetch", e => {
  const req = e.request;
  const url = new URL(req.url);
  if (req.method !== "GET" || url.origin !== self.location.origin) return;
  const isPage = req.mode === "navigate";
  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    try {
      const res = await Promise.race([
        fetch(req.url, { cache: "no-cache", credentials: "same-origin" }),
        new Promise((_, ng) => setTimeout(() => ng(new Error("timeout")), 4000))
      ]);
      if (res.ok) cache.put(isPage ? "./index.html" : req, res.clone());
      return res;
    } catch (err) {
      const hit = await cache.match(isPage ? "./index.html" : req, { ignoreSearch: true });
      if (hit) return hit;
      throw err;
    }
  })());
});
