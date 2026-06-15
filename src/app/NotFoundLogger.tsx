'use client'

// Client-side 404 logger. On mount, POSTs the current path +
// referrer + UA to /api/log/not-found so the admin's 404 monitor
// sees the hit. Fire-and-forget — never blocks render.

import { useEffect } from 'react'

export function NotFoundLogger({ path }: { path: string }) {
  useEffect(() => {
    const actualPath = path || window.location.pathname
    // Bots can hammer with junk paths — skip the obvious crawler
    // patterns to keep the table clean (wp-login, env files, etc.).
    // We block-list the most aggressive paths the editor will never
    // actually want to redirect.
    const noise = /\b(wp-(?:admin|login|content)|\.env|\.git|\.aws|\.well-known|favicon|apple-touch|browserconfig|robots|sitemap)\b/i
    if (noise.test(actualPath)) return

    fetch('/api/log/not-found', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        path:      actualPath,
        referrer:  document.referrer || null,
        userAgent: navigator.userAgent || null,
      }),
      keepalive: true,
    }).catch(() => {/* never throw */})
  }, [path])

  return null
}
