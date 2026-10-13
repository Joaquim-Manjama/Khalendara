import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFile, access } from 'node:fs/promises'
import vm from 'node:vm'
const script = await readFile(new URL('../dist/sw.js', import.meta.url), 'utf8')
function worker() {
  const handlers = {}
  const cache = { addAll: async () => {}, match: async path => path === '/index.html' ? new Response('<html>Offline shell</html>') : undefined }
  vm.runInNewContext(script, {
    self: { location: { origin: 'https://calendar.example' }, addEventListener: (name, fn) => { handlers[name] = fn } },
    caches: { open: async () => cache, keys: async () => [], delete: async () => true },
    URL, Response, fetch: async () => { throw new Error('offline') },
  })
  return handlers
}
test('built manifest and precache contain the app shell and icons', async () => {
  const manifest = JSON.parse(await readFile(new URL('../dist/manifest.webmanifest', import.meta.url)))
  assert.equal(manifest.display, 'standalone')
  assert.equal(manifest.start_url, '/')
  for (const icon of manifest.icons) await access(new URL(`../dist${icon.src}`, import.meta.url))
  assert.ok(manifest.icons.some(icon => icon.sizes === '192x192'))
  assert.ok(manifest.icons.some(icon => icon.sizes === '512x512' && icon.purpose === 'maskable'))
  assert.ok(script.includes('/index.html'))
  assert.ok(!script.includes('__FILES__'))
  assert.ok(!script.includes('__VERSION__'))
})
test('service worker leaves APIs, other origins and mutations to the network', () => {
  for (const [url, method, mode] of [
    ['/auth/login', 'POST', 'cors'], ['/users/me', 'GET', 'cors'], ['/events', 'GET', 'cors'],
    ['/events/event-1', 'DELETE', 'cors'], ['/api/events', 'GET', 'navigate'],
    ['https://backend.example/events', 'GET', 'cors'],
  ]) {
    let intercepted = false
    worker().fetch({ request: { url: new URL(url, 'https://calendar.example').href, method, mode }, respondWith: () => { intercepted = true } })
    assert.equal(intercepted, false, url)
  }
})
test('offline frontend navigation returns the cached app shell', async () => {
  let result
  worker().fetch({ request: { url: 'https://calendar.example/home', method: 'GET', mode: 'navigate' }, respondWith: promise => { result = promise } })
  assert.equal(await (await result).text(), '<html>Offline shell</html>')
})
