const CACHE_NAME = "electrotechnique-v1";
const STATIC_ASSETS = [
  "/css/style.css",
  "/js/main.js",
  "/js/app.js",
  "/img/logo.png",
  "/manifest.json"
];

self.addEventListener("install", (event)=>{
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache=>cache.addAll(STATIC_ASSETS)).catch(()=>{})
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event)=>{
  event.waitUntil(
    caches.keys().then(keys=>Promise.all(
      keys.filter(k=>k !== CACHE_NAME).map(k=>caches.delete(k))
    ))
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event)=>{
  const { request } = event;

  // Ne jamais mettre en cache les appels API : les données doivent rester à jour.
  if(request.url.includes("/api/")){
    return; // laisse la requête réseau normale se faire
  }

  // Pour les pages et fichiers statiques : réseau d'abord, cache en secours (hors-ligne).
  event.respondWith(
    fetch(request)
      .then(response=>{
        if(response && response.ok && request.method === "GET"){
          const copy = response.clone();
          caches.open(CACHE_NAME).then(cache=>cache.put(request, copy));
        }
        return response;
      })
      .catch(()=> caches.match(request).then(cached=> cached || caches.match("/index.html")))
  );
});
