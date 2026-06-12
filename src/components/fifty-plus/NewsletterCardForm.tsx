'use client'

// Inline newsletter form for the 50+ template's "Get the Weekly Digest"
// card. Same POST contract as the platform-wide NewsletterSignup
// component (POST /api/newsletter/subscribe) so subscribers land in the
// brand's GHL list + tag — but with the navy-on-amber 50+ visual style
// and no nested card chrome.

import { useState, FormEvent } from 'react'
import { readDeviceToken } from '@/lib/reader/device-token'

interface Props {
  brandSlug: string
}

export function FiftyPlusNewsletterCardForm({ brandSlug }: Props) {
  const [email,  setEmail]  = useState('')
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle')
  const [errMsg, setErrMsg] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!email || status === 'submitting') return
    setStatus('submitting')
    setErrMsg(null)
    try {
      const res = await fetch('/api/newsletter/subscribe', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          email,
          source:       'fifty-plus-homepage',
          brand_slug:   brandSlug,
          device_token: readDeviceToken(),
        }),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        setErrMsg(j.error ?? 'Could not subscribe. Try again.')
        setStatus('error')
        return
      }
      setStatus('success')
    } catch {
      setErrMsg('Network error — try again.')
      setStatus('error')
    }
  }

  if (status === 'success') {
    return (
      <div className="text-white text-center">
        <p className="font-heading font-bold text-lg mb-1">You&rsquo;re in.</p>
        <p className="text-sm text-white/85">Sunday morning digest is on its way.</p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <input
        type="email"
        required
        placeholder="your@email.com"
        value={email}
        onChange={e => setEmail(e.target.value)}
        className="w-full px-4 py-3 rounded-lg bg-white/95 text-primary placeholder:text-primary/50 border-none focus:outline-none focus:ring-2 focus:ring-secondary text-sm"
      />
      <button
        type="submit"
        disabled={status === 'submitting'}
        className="w-full bg-secondary text-secondary-foreground hover:bg-secondary/90 font-bold shadow-lg h-12 rounded-md disabled:opacity-70"
      >
        {status === 'submitting' ? 'Subscribing…' : 'Subscribe Free'}
      </button>
      {errMsg && <p className="text-xs text-white/90 bg-destructive/40 rounded p-2">{errMsg}</p>}
    </form>
  )
}
