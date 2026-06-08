// Client-side School Bits engagement tracking.
//
//   trackBitView(id)  → card scrolled into view in the public feed
//   trackBitClick(id) → reader opened the lightbox for this bit
//
// Both dedupe per-session via sessionStorage so a scroll-up-scroll-down or
// next/prev page through the lightbox doesn't double-count the same bit
// for the same reader. Fires via navigator.sendBeacon when available so a
// slow network call never blocks the page.

const SESSION_KEY = (event: 'view' | 'click', id: string) => `kp.bit.${event}.${id}`

function alreadyCounted(event: 'view' | 'click', id: string): boolean {
  if (typeof window === 'undefined' || !window.sessionStorage) return false
  try {
    const key = SESSION_KEY(event, id)
    if (window.sessionStorage.getItem(key)) return true
    window.sessionStorage.setItem(key, '1')
    return false
  } catch {
    // Private mode / quota exceeded — don't dedupe but still ship the event.
    return false
  }
}

function send(id: string, event: 'view' | 'click') {
  if (typeof window === 'undefined') return
  const payload = JSON.stringify({ id, event })
  const url = '/api/school-bits/track'
  // sendBeacon won't reject when the page unloads mid-request, which is
  // ideal for impression counts. Fallback fetch keeps it working in
  // environments where Beacon is disabled.
  if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
    const blob = new Blob([payload], { type: 'text/plain' })
    if (navigator.sendBeacon(url, blob)) return
  }
  fetch(url, { method: 'POST', body: payload, keepalive: true }).catch(() => {})
}

export function trackBitView(id: string) {
  if (!id) return
  if (alreadyCounted('view', id)) return
  send(id, 'view')
}

export function trackBitClick(id: string) {
  if (!id) return
  if (alreadyCounted('click', id)) return
  send(id, 'click')
}
