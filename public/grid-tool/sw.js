// Service worker for the grid tool.
//
// ── Scope is the whole safety story ─────────────────────────────────────────
// This file sits at /grid-tool/sw.js, so the browser will only ever let it
// control pages under /grid-tool/. It cannot touch the magazine sites that
// share this deployment — which matters, because a service worker that
// cached a news site wrongly would serve stale articles to readers with no
// obvious way to clear it.
//
// Belt and braces: the fetch handler also bails out on anything that is not
// the tool or a Next static asset, so even a scope misconfiguration cannot
// make it intercept someone else's pages.
//
// ── Caching strategy ────────────────────────────────────────────────────────
// Documents  network first, cache as the offline fallback. A deploy lands as
//            soon as the device is online rather than being pinned to
//            whatever was cached first — the failure mode of a naive
//            cache-first shell is an app that can never update itself.
// Assets     cache first. Next gives /_next/static files content-hashed
//            names, so a given URL's bytes never change and a stale read is
//            impossible.

const VERSION = 'grid-tool-v1'
const SHELL   = ['/grid-tool']

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(VERSION)
      // Not addAll: one failed request would reject the whole install and
      // leave the tool with no offline copy at all.
      .then((cache) => Promise.allSettled(SHELL.map((u) => cache.add(u))))
      .then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((k) => k !== VERSION && k.startsWith('grid-tool-')).map((k) => caches.delete(k)),
      ))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const req = event.request
  if (req.method !== 'GET') return

  let url
  try { url = new URL(req.url) } catch { return }
  if (url.origin !== self.location.origin) return

  const isAsset = url.pathname.startsWith('/_next/static/')
  const isTool  = url.pathname === '/grid-tool' || url.pathname.startsWith('/grid-tool/')
  if (!isAsset && !isTool) return

  // Never cache the worker or the manifest — they are how the app updates.
  if (url.pathname === '/grid-tool/sw.js' || url.pathname.endsWith('.webmanifest')) return

  if (isAsset) {
    event.respondWith(
      caches.match(req).then((hit) => hit || fetch(req).then((res) => {
        if (res && res.ok) {
          const copy = res.clone()
          caches.open(VERSION).then((c) => c.put(req, copy)).catch(() => {})
        }
        return res
      })),
    )
    return
  }

  event.respondWith(
    fetch(req)
      .then((res) => {
        if (res && res.ok) {
          const copy = res.clone()
          caches.open(VERSION).then((c) => c.put(req, copy)).catch(() => {})
        }
        return res
      })
      .catch(() => caches.match(req).then((hit) => hit || caches.match('/grid-tool'))),
  )
})
