const CACHE_NAME = "crisma-em-dia-v2";
const ASSETS = [
  "./",
  "./index.html",
  "./manifest.json",
  "./css/styles.css",
  "./js/db.js",
  "./js/export.js",
  "./js/app.js",
  "./js/vendor/jspdf.umd.min.js",
  "./js/vendor/html2canvas.min.js",
  "./assets/icon-48.png",
  "./assets/icon-72.png",
  "./assets/icon-96.png",
  "./assets/icon-128.png",
  "./assets/icon-144.png",
  "./assets/icon-152.png",
  "./assets/icon-180.png",
  "./assets/icon-192.png",
  "./assets/icon-512.png",
  "./assets/logo.png"
];

self.addEventListener("install", (event)=>{
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache=>cache.addAll(ASSETS)).then(()=>self.skipWaiting())
  );
});

self.addEventListener("activate", (event)=>{
  event.waitUntil(
    caches.keys().then(keys=>Promise.all(
      keys.filter(k=>k!==CACHE_NAME).map(k=>caches.delete(k))
    )).then(()=>self.clients.claim())
  );
});

self.addEventListener("fetch", (event)=>{
  if(event.request.method !== "GET") return;
  event.respondWith(
    caches.match(event.request).then(cached=>{
      if(cached) return cached;
      return fetch(event.request).then(resp=>{
        // cache same-origin GET responses for future offline use
        if(resp && resp.status===200 && event.request.url.startsWith(self.location.origin)){
          const clone = resp.clone();
          caches.open(CACHE_NAME).then(cache=>cache.put(event.request, clone));
        }
        return resp;
      }).catch(()=>{
        // fallback to index for navigation requests when offline and not cached
        if(event.request.mode === "navigate") return caches.match("./index.html");
      });
    })
  );
});
