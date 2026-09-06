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

/* ---------- Notifications push ---------- */
self.addEventListener("push", (event)=>{
  let data = { title: "Électrotechnique", body: "Nouvelle notification", url: "/espace-admin.html" };
  try{ data = { ...data, ...event.data.json() }; }catch(e){}
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-96.png",
      data: { url: data.url }
    })
  );
});

self.addEventListener("notificationclick", (event)=>{
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/espace-admin.html";
  event.waitUntil(
    clients.matchAll({ type:"window", includeUncontrolled:true }).then(clientList=>{
      for(const client of clientList){
        if(client.url.includes(url) && "focus" in client) return client.focus();
      }
      if(clients.openWindow) return clients.openWindow(url);
    })
  );
});
