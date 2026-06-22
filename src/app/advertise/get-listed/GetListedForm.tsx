'use client'

// Featured-tier signup form. POSTs to /api/advertise/featured-checkout
// which returns a Stripe Checkout URL; we redirect there.

import { useState } from 'react'
import { Loader2, AlertCircle, Star } from 'lucide-react'

interface GuideOption { value: string; label: string }

export function GetListedForm({ guides }: { guides: GuideOption[] }) {
  const [businessName, setBusinessName] = useState('')
  const [email, setEmail]               = useState('')
  const [guideSlug, setGuideSlug]       = useState(guides[0]?.value ?? 'birthday-party')
  const [website, setWebsite]           = useState('') // honeypot
  const [busy, setBusy]                 = useState(false)
  const [error, setError]               = useState<string | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true); setError(null)
    try {
      const res = await fetch('/api/advertise/featured-checkout', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          business_name: businessName.trim(),
          email:         email.trim(),
          guide_slug:    guideSlug,
          website,
        }),
      })
      const j = await res.json()
      if (!res.ok) { setError(j?.error ?? `Checkout failed (${res.status})`); return }
      if (j.url) {
        window.location.href = j.url
        return
      }
      setError('Unexpected response — no checkout URL returned.')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Network error')
    } finally { setBusy(false) }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <Field label="Business name *" required>
        <input
          type="text" required
          value={businessName}
          onChange={e => setBusinessName(e.target.value)}
          placeholder="Confetti Cove Party Studio"
          className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg bg-white outline-none focus:border-[#ff7a59]"
        />
      </Field>

      <Field label="Owner email *" required hint="Where we'll send your private editor link after payment.">
        <input
          type="email" required
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="owner@yourbusiness.com"
          className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg bg-white outline-none focus:border-[#ff7a59]"
        />
      </Field>

      <Field label="Which guide does your business belong in? *">
        <select
          value={guideSlug}
          onChange={e => setGuideSlug(e.target.value)}
          className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg bg-white outline-none focus:border-[#ff7a59]"
        >
          {guides.map(g => <option key={g.value} value={g.value}>{g.label}</option>)}
        </select>
      </Field>

      <div className="hidden" aria-hidden="true">
        <input type="text" tabIndex={-1} autoComplete="off"
          value={website} onChange={e => setWebsite(e.target.value)} />
      </div>

      {error && (
        <div className="flex items-start gap-2 p-3 bg-rose-50 border border-rose-200 rounded-lg text-[12px] text-rose-700">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={busy || !businessName.trim() || !email.trim()}
        className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 text-sm font-bold text-white bg-[#ff7a59] rounded-lg hover:opacity-90 disabled:opacity-50"
      >
        {busy
          ? <><Loader2 size={14} className="animate-spin" /> Redirecting to Stripe…</>
          : <><Star size={14} /> Continue to checkout</>
        }
      </button>

      <p className="text-[11px] text-slate-500 text-center">
        Secure payment via Stripe. Annual subscription, cancel any time.
      </p>
    </form>
  )
}

function Field({ label, hint, children }: { label: string; hint?: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[12px] font-bold text-slate-900 mb-1">{label}</label>
      {hint && <p className="text-[11px] text-slate-500 mb-1.5">{hint}</p>}
      {children}
    </div>
  )
}
