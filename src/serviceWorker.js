// CRA leftover, trimmed down: the app never registers a service worker,
// but keeps unregistering so visitors who got one from an old deploy
// stop being served stale cached content.

export function unregister() {
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.ready.then((registration) => {
      registration.unregister();
    });
  }
}
