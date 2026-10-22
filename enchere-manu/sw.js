/* MANU - Service Worker : notifications push opt-in, pas de cache. */
self.addEventListener("install", event => event.waitUntil(self.skipWaiting()));
self.addEventListener("activate", event => event.waitUntil(self.clients.claim()));
self.addEventListener("push", event => {
  event.waitUntil((async () => {
    let data = {};
    try { data = event.data?.json() || {}; } catch { data = {}; }
    const pages = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    // Si la page est visible, elle affiche déjà son bandeau direct.
    if (pages.some(page => page.visibilityState === "visible" && page.url.includes("/enchere-manu/"))) return;
    const amount = Number(data.amount) || 0;
    const safeNick = String(data.nickname || "Un enchérisseur").slice(0, 24);
    const title = "🔨 MANU : nouvelle enchère !";
    const body = safeNick + " vient de miser " + amount.toLocaleString("fr-FR") +
      " € fictifs ! À toi de jouer 😂";
    await self.registration.showNotification(title, {
      body,
      icon: "/supervilains-v3/enchere-manu/manu-icon-192.png",
      badge: "/supervilains-v3/enchere-manu/manu-icon-192.png",
      tag: "manu-enchere-" + String(amount),
      renotify: true,
      data: { url: "/supervilains-v3/enchere-manu/live.html" }
    });
  })());
});
self.addEventListener("notificationclick", event => {
  event.notification.close();
  event.waitUntil((async () => {
    const absolute = new URL(event.notification.data?.url ||
      "/supervilains-v3/enchere-manu/live.html", self.location.origin).href;
    const pages = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    for (const page of pages) {
      if (page.url.startsWith(self.location.origin + "/supervilains-v3/enchere-manu/")) {
        await page.focus();
        if ("navigate" in page) await page.navigate(absolute);
        return;
      }
    }
    await self.clients.openWindow(absolute);
  })());
});