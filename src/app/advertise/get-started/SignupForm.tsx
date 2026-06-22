'use client'

// Self-serve signup form. Posts to /api/public/onboarding/signup
// which creates the advertiser_account, generates a magic-link
// token, and emails the wizard URL to the business owner.
//
// On success we render an inline "check your email" message rather
// than redirecting — keeps the user in context and works even when
// Resend is down (server returns sent:false; we show the URL was
// generated but ask them to contact us).

import { useState } from 'react'
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react'

interface GuideOption { value: string; label: string }

export function SignupForm({ guides }: { guides: GuideOption[] }) {
  const [businessName, setBusinessName] = useState('')
  const [email, setEmail]               = useState('')
  const [guideSlug, setGuideSlug]       = useState(guides[0]?.value ?? 'birthday-party')
  const [website, setWebsite]           = useState('') // honeypot
  const [busy, setBusy]                 = useState(false)
  const [error, setError]               = useState<string | null>(null)
  const [success, setSuccess]           = useState<{ sent: boolean } | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true); setError(null); setSuccess(null)
    try {
      const res = await fetch('/api/public/onboarding/signup', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          business_name: businessName.trim(),
          email:         email.trim(),
          guide_slug:    guideSlug,
          website,        // honeypot field — bots fill it; humans don't see it
        }),
      })
      const j = await res.json()
      if (!res.ok) { setError(j?.error ?? `Signup failed (${res.status})`); return }
      setSuccess({ sent: !!j.sent })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Signup failed')
    } finally { setBusy(false) }
  }

  if (success) {
    return (
      <div className="text-center py-8 space-y-3">
        <CheckCircle2 className="h-12 w-12 text-emerald-600 mx-auto" />
        <h2 className="text-xl font-bold text-slate-900">
          {success.sent ? 'Check your email' : "You're signed up — but the email didn't go through"}
        </h2>
        <p className="text-sm text-slate-600 max-w-md mx-auto leading-relaxed">
          {success.sent
            ? `We just sent a private editor link to ${email}. Open it and start filling out your listing — you can save & exit any time.`
            : `Your account is created, but our email service didn't accept the send. Reach out to hello@riverregionparents.com with your business name and we'll get you the link.`}
        </p>
      </div>
    )
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

      <Field label="Owner email *" required hint="Where we'll send your private editor link.">
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

      {/* Honeypot — hidden from real users via aria + tabIndex + autocomplete-off */}
      <div className="hidden" aria-hidden="true">
        <label>
          Website (leave blank)
          <input
            type="text" tabIndex={-1} autoComplete="off"
            value={website} onChange={e => setWebsite(e.target.value)}
          />
        </label>
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
        {busy ? <Loader2 size={14} className="animate-spin" /> : null}
        {busy ? 'Setting up your listing…' : 'Get my listing started'}
      </button>

      <p className="text-[11px] text-slate-500 text-center">
        Free directory listing. Featured upgrade options available after you fill out your basics.
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
