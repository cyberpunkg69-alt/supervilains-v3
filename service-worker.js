/* SUPERVILAINS V4.20 : assets publics mis en cache localement.
   Les portraits personnels Supabase restent hors Service Worker
   et utilisent uniquement un IndexedDB cloisonné par joueur. */
const CACHE="supervilains-v4-20-visible-chase";
const FILES=["./","./index.html","./pursuit.css","./pursuit3d.js","./pursuit.js","./arena.js","./villain_creator.js","./custom_play.js","./villain_random.js","./install.js","./icon-192.png","./icon-512.png","./config.js","./manifest.webmanifest","./icon.svg","./assets/manu.jpg","./assets/lea.webp","./assets/natsu.jpg","./assets/amelie.jpg","./assets/ludo.jpg","./assets/eric.jpg","./assets/reactions/manu_capture.svg","./assets/reactions/lea_capture.svg","./assets/reactions/natsu_capture.svg","./assets/reactions/amelie_capture.svg","./assets/reactions/ludo_capture.svg","./assets/reactions/eric_capture.svg","./assets/audio/v4/manu_capture.mp3","./assets/audio/v4/manu_escape.mp3","./assets/audio/v4/lea_capture.mp3","./assets/audio/v4/lea_escape.mp3","./assets/audio/v4/natsu_capture.mp3","./assets/audio/v4/natsu_escape.mp3","./assets/audio/v4/amelie_capture.mp3","./assets/audio/v4/amelie_escape.mp3","./assets/audio/v4/ludo_capture.mp3","./assets/audio/v4/ludo_escape.mp3","./assets/audio/v4/eric_capture.mp3","./assets/audio/v4/eric_escape.mp3","./assets/audio/v4/commissaire_0_radar.mp3","./assets/audio/v4/commissaire_0_capture.mp3","./assets/audio/v4/commissaire_0_escape.mp3","./assets/audio/v4/commissaire_1_radar.mp3","./assets/audio/v4/commissaire_1_capture.mp3","./assets/audio/v4/commissaire_1_escape.mp3","./assets/audio/v4/commissaire_2_radar.mp3","./assets/audio/v4/commissaire_2_capture.mp3","./assets/audio/v4/commissaire_2_escape.mp3","./assets/audio/v4/commissaire_3_radar.mp3","./assets/audio/v4/commissaire_3_capture.mp3","./assets/audio/v4/commissaire_3_escape.mp3","./assets/reactions/manu_capture.gif","./assets/reactions/manu_troller.gif","./assets/reactions/lea_capture.gif","./assets/reactions/lea_troller.gif","./assets/reactions/natsu_capture.gif","./assets/reactions/natsu_troller.gif","./assets/reactions/amelie_capture.gif","./assets/reactions/amelie_troller.gif","./assets/reactions/ludo_capture.gif","./assets/reactions/ludo_troller.gif","./assets/reactions/eric_capture.gif","./assets/reactions/eric_troller.gif"];
const KNOWN_PATHS=new Set(FILES.map(path=>new URL(path,self.location.href).pathname));
const ASSET_PATHS=new Set(FILES.filter(path=>path.startsWith("./assets/")).map(path=>new URL(path,self.location.href).pathname));
self.addEventListener("install",event=>event.waitUntil(
  caches.open(CACHE).then(cache=>cache.addAll(FILES)).then(()=>self.skipWaiting())
));
self.addEventListener("activate",event=>event.waitUntil(
  caches.keys().then(keys=>Promise.all(keys.filter(name=>name.startsWith("supervilains-")&&name!==CACHE).map(name=>caches.delete(name))))
    .then(()=>self.clients.claim())
));
self.addEventListener("fetch",event=>{
  if(event.request.method!=="GET")return;
  const url=new URL(event.request.url);
  if(url.origin!==self.location.origin||!KNOWN_PATHS.has(url.pathname))return;
  if(["code","access_token","token_hash"].some(name=>url.searchParams.has(name)))return;
  // Portrais / GIF officiels : d'abord l'appareil (inclut les GIF avec ?t=).
  // Le cache change de nom à chaque version, donc les nouvelles images s'installent.
  if(ASSET_PATHS.has(url.pathname)){
    event.respondWith(caches.open(CACHE).then(async cache=>{
      const key=new Request(url.origin+url.pathname);
      const saved=await cache.match(key,{ignoreSearch:true});
      if(saved)return saved;
      const response=await fetch(event.request);
      if(response.ok)cache.put(key,response.clone()).catch(()=>{});
      return response;
    }).catch(()=>fetch(event.request)));
    return;
  }
  // HTML et scripts : privilégier les mises à jour, garder une copie de secours.
  event.respondWith(caches.open(CACHE).then(async cache=>{
    try{
      const response=await fetch(event.request);
      if(response.ok)cache.put(event.request,response.clone()).catch(()=>{});
      return response;
    }catch(error){
      const saved=await cache.match(event.request);
      if(saved)return saved;
      throw error;
    }
  }));
});
