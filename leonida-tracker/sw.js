const SHELL='leonida-tracker-shell-v2-3-1';
const FILES=['./','./index.html','./icon.svg','./manifest.webmanifest'];
self.addEventListener('install',event=>event.waitUntil(caches.open(SHELL).then(cache=>cache.addAll(FILES)).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil(Promise.all([caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('leonida-tracker-shell-')&&key!==SHELL).map(key=>caches.delete(key)))),self.clients.claim()])));
self.addEventListener('fetch',event=>{
 const u=new URL(event.request.url);
 if(u.origin!==self.location.origin||event.request.method!=='GET')return;
 if(event.request.mode==='navigate'){
  event.respondWith(fetch(event.request).then(res=>{const copy=res.clone();caches.open(SHELL).then(cache=>cache.put(event.request,copy));return res}).catch(()=>caches.match('./index.html')));
 }else event.respondWith(caches.match(event.request).then(hit=>hit||fetch(event.request)));
});