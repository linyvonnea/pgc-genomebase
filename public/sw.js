self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  if (!event.data) return;

  let data = {};
  try {
    data = event.data.json();
  } catch {
    data = { title: "PGC Portal", body: event.data.text() };
  }

  const title = data.title || "PGC Portal";
  const options = {
    body: data.body || "You have a new message.",
    icon: data.icon || "/assets/pgc-logo.png",
    badge: data.badge || "/assets/pgc-logo.png",
    tag: data.tag || "pgc-chat",
    data: {
      url: data.url || "/client/client-info",
      threadId: data.threadId,
    },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const targetUrl = event.notification.data?.url || "/client/client-info";
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ("focus" in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }

      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
