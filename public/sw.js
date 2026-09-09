/* Whale Alert service worker — handles push payloads from buildWhalePushPayload */

self.addEventListener("push", (event) => {
  let data = { title: "Whale Alert", body: "", url: "/alerts", tag: "whale-alert" };
  if (event.data) {
    try {
      const parsed = event.data.json();
      data = {
        title: parsed.title ?? data.title,
        body: parsed.body ?? data.body,
        url: parsed.url ?? data.url,
        tag: parsed.tag ?? data.tag,
      };
    } catch {
      data.body = event.data.text();
    }
  }

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      tag: data.tag,
      data: { url: data.url },
      icon: "/icons/alert-192.png",
      badge: "/icons/alert-192.png",
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/alerts";
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if (client.url.includes(url) && "focus" in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(url);
      }
    })
  );
});
