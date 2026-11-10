// Kindstart's service worker: a small script the browser keeps next to the app.
// It does one job: shows reminders as notifications (Chrome on Android only allows them
// from a service worker) and brings the app to the front when one is tapped.
// It caches nothing, so a new version of the app always shows up straight away.

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((windows) => {
      const open = windows.find((w) => "focus" in w);
      return open ? open.focus() : self.clients.openWindow("./");
    }),
  );
});
