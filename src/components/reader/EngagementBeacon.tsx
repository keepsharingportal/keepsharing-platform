'use client'

// Fires once per page load after a short dwell time. Bumps the per-
// device engagement counter on the server. Reads are otherwise free so
// this is the lightest possible "this reader is engaging" signal — no
// session, no auth, just a debounced fetch.

import { useEffect } from 'react'
import { readDeviceToken } from '@/lib/reader/device-token'

interface Props {
  brandSlug: string
  kind:      'article' | 'directory'
}

const DWELL_MS = 8_000 // 8s — enough to filter bounce traffic

export function EngagementBeacon({ brandSlug, kind }: Props) {
  useEffect(() => {
    const token = readDeviceToken()
    if (!token) return
    const t = window.setTimeout(() => {
      // Use sendBeacon when available so we don't lose the bump if the
      // reader navigates away mid-bump. Falls back to fetch.
      const payload = JSON.stringify({ device_token: token, brand_slug: brandSlug, kind })
      if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
        const blob = new Blob([payload], { type: 'application/json' })
        navigator.sendBeacon('/api/reader/engagement', blob)
      } else {
        void fetch('/api/reader/engagement', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: payload,
          keepalive: true,
        }).catch(() => undefined)
      }
    }, DWELL_MS)
    return () => window.clearTimeout(t)
  }, [brandSlug, kind])
  return null
}
