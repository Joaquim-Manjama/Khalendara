const CACHE = 'khalendara-shell-__VERSION__'
const FILES = __FILES__
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(FILES)))
})
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys
    .filter(key => key.startsWith('khalendara-shell-') && key !== CACHE)
    .map(key => caches.delete(key)))))
})
self.addEventListener('fetch', event => {
  const request = event.request
  const url = new URL(request.url)
  // Never intercept API traffic, mutations, or other origins.
  if (request.method !== 'GET' || url.origin !== self.location.origin
      || /^\/(auth|users|events|api)(\/|$)/.test(url.pathname)) return
  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).catch(async () => {
      const cache = await caches.open(CACHE)
      return await cache.match('/index.html') || Response.error()
    }))
  } else if (FILES.includes(url.pathname)) {
    event.respondWith(caches.open(CACHE).then(async cache =>
      await cache.match(url.pathname) || fetch(request)))
  }
})
