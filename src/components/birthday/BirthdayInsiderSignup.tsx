// Sidebar "Join our email list" signup. Originally seeded as a
// birthday-specific "Insider" drip; now a plain newsletter signup
// because RRP isn't running a separate birthday drip and every
// email capture on the site should land on the main GHL list.
//
// Wire: hits /api/newsletter/subscribe (the canonical newsletter
// endpoint) so the subscriber gets the brand-scoped `rrp-main-email`
// GHL tag by default and any brand-configured welcome workflow fires.

'use client'

import { useState } from 'react'
import { Mail, CheckCircle2 } from 'lucide-react'

export function BirthdayInsiderSignup({ brandSlug }: { brandSlug: string }) {
  const [email, setEmail] = useState('')
  const [busy,  setBusy]  = useState(false)
  const [done,  setDone]  = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function subscribe(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) return
    setBusy(true); setError(null)
    try {
      const res = await fetch('/api/newsletter/subscribe', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          email:      email.trim(),
          source:     'birthday-portal-sidebar',
          brand_slug: brandSlug,
        }),
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) setError((j as { error?: string })?.error ?? 'subscribe failed')
      else         setDone(true)
    } catch (e) {
      setError((e as Error)?.message ?? 'subscribe failed')
    } finally { setBusy(false) }
  }

  return (
    <div className="bg-gradient-to-br from-[#ff7a59] to-[#ff9d8a] rounded-2xl p-5 text-white">
      <div className="flex items-center gap-2 mb-1.5">
        <Mail size={18} />
        <h3 className="text-[14px] font-bold uppercase tracking-wider">Join Our Email List</h3>
      </div>
      <p className="text-[12px] text-white/95 leading-relaxed mb-3">
        Weekly picks for River Region parents — events, deals, features, and the local voices we love.
      </p>

      {done ? (
        <div className="bg-white/15 backdrop-blur-sm rounded-lg p-3 flex items-start gap-2">
          <CheckCircle2 size={16} className="shrink-0 mt-0.5" />
          <div className="text-[12px]">You&apos;re in — thanks for subscribing.</div>
        </div>
      ) : (
        <form onSubmit={subscribe} className="space-y-2">
          <div className="flex items-center gap-1 bg-white rounded-lg overflow-hidden">
            <Mail size={14} className="text-[#ff7a59] ml-2" />
            <input
              type="email" required value={email} onChange={e => setEmail(e.target.value)}
              placeholder="your email"
              className="flex-1 px-2 py-2 text-[13px] text-slate-900 placeholder-slate-400 bg-transparent focus:outline-none"
            />
          </div>
          <button
            type="submit" disabled={busy || !email.trim()}
            className="w-full px-3 py-2 text-[12px] font-bold text-[#ff7a59] bg-white rounded-lg hover:opacity-90 disabled:opacity-50"
          >{busy ? 'Subscribing…' : 'Subscribe'}</button>
          {error && <div className="text-[11px] bg-white/15 rounded p-1.5">{error}</div>}
          <p className="text-[10px] text-white/80">No spam. Unsubscribe anytime.</p>
        </form>
      )}
    </div>
  )
}
