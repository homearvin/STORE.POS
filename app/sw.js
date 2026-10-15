const CACHE='storepos-local-v0.2.0';
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(['./','./index.html','./styles.css','./responsive.css','./app.js','./core.js','./db.js','./cloud.js','./icon.svg','./manifest.json'])));});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE&&/^storepos-(local|pilot)-/.test(k)).map(k=>caches.delete(k)))));});
self.addEventListener('fetch',event=>{if(event.request.method!=='GET'||new URL(event.request.url).origin!==location.origin)return;event.respondWith(fetch(event.request).catch(()=>caches.match(event.request).then(result=>result||Response.error())));});
