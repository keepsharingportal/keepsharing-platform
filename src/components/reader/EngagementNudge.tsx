'use client'

// Newsletter subscribe nudge that pops in after a reader hits the
// engagement threshold (3+ article views in the rolling 7-day window).
// Dismissable; silenced for 30 days after either a dismiss or a
// successful subscribe. Reads engagement from /api/reader/engagement on
// mount via a `GET` of the same row (the bump endpoint also returns the
// row on POST, but mount fires before the beacon's POST has finished, so
// we read separately).
//
// Sits in the corner of the page, intentionally small. The brand-aware
// copy keeps the prompt feeling like "this site" rather than "some
// signup form."

import { useEffect, useState } from 'react'
import { Mail, X } from 'lucide-react'
import { readDeviceToken } from '@/lib/reader/device-token'

interface Props {
  brandSlug:    string
  brandName:    string
  /** Article-views-in-7-days threshold to fire the nudge. Defaults to 3. */
  threshold?:   number
}

const STORAGE_DISMISSED = 'rrp_nudge_dismissed_at'
const SILENCE_DAYS      = 30

export function EngagementNudge({ brandSlug, brandName, threshold = 3 }: Props) {
  const [show, setShow] = useState(false)
  const [email, setEmail] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)

  useEffect(() => {
    // Respect local dismiss within the silence window.
    try {
      const last = window.localStorage.getItem(STORAGE_DISMISSED)
      if (last && (Date.now() - parseInt(last, 10)) < SILENCE_DAYS * 86_400_000) return
    } catch { /* private browsing — fall through */ }

    const token = readDeviceToken()
    if (!token) return

    // Look up the engagement counters via the rate-limited fetch path;
    // a 503 (migration pending) is fine — we just won't show the nudge.
    let cancelled = false
    void (async () => {
      try {
        // The engagement bump runs on a dwell timer too, so we read AFTER
        // a longer dwell to make sure the most recent visit has counted.
        await new Promise(r => setTimeout(r, 12_000))
        if (cancelled) return
        const res = await fetch(`/api/reader/engagement-status?device_token=${encodeURIComponent(token)}`)
        if (!res.ok) return
        const j = await res.json() as { articles_read_7d?: number; nudge_silenced_until?: string | null } | null
        if (!j) return
        if (j.nudge_silenced_until && new Date(j.nudge_silenced_until).getTime() > Date.now()) return
        if ((j.articles_read_7d ?? 0) >= threshold) setShow(true)
      } catch { /* ignore */ }
    })()
    return () => { cancelled = true }
  }, [threshold])

  async function subscribe(e: React.FormEvent) {
    e.preventDefault()
    if (!email || submitting) return
    setSubmitting(true)
    try {
      const token = readDeviceToken()
      const res = await fetch('/api/newsletter/subscribe', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          email, source: 'engagement-nudge', brand_slug: brandSlug, device_token: token,
        }),
      })
      if (res.ok) setDone(true)
    } finally {
      setSubmitting(false)
    }
  }

  function dismiss() {
    try { window.localStorage.setItem(STORAGE_DISMISSED, String(Date.now())) } catch { /* ignore */ }
    setShow(false)
  }

  if (!show) return null

  return (
    <div className="fixed bottom-4 right-4 left-4 sm:left-auto sm:max-w-sm z-40 bg-card border-2 border-primary rounded-2xl shadow-lg p-5">
      <button
        onClick={dismiss}
        aria-label="Dismiss"
        className="absolute top-2 right-2 text-muted-foreground hover:text-foreground"
      >
        <X size={14} />
      </button>
      {done ? (
        <div className="text-center py-2">
          <Mail size={28} className="mx-auto text-primary mb-2" />
          <p className="text-sm font-bold text-foreground">You&apos;re in. Look for your first issue soon.</p>
        </div>
      ) : (
        <>
          <div className="flex items-start gap-3 mb-3">
            <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
              <Mail size={16} />
            </div>
            <div>
              <p className="text-sm font-bold text-foreground leading-tight">You&apos;ve been reading.</p>
              <p className="text-xs text-muted-foreground mt-0.5">Get next week&apos;s {brandName} stories in your inbox.</p>
            </div>
          </div>
          <form onSubmit={subscribe} className="flex gap-2">
            <input
              type="email"
              required
              placeholder="you@email.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="flex-1 px-3 py-2 text-sm rounded-lg border border-border bg-background focus:outline-none focus:border-primary"
            />
            <button
              type="submit"
              disabled={submitting}
              className="bg-primary text-primary-foreground rounded-lg px-3 py-2 text-sm font-bold hover:opacity-90 disabled:opacity-50"
            >
              {submitting ? '…' : 'Sign up'}
            </button>
          </form>
        </>
      )}
    </div>
  )
}
