'use client'

import { useState } from 'react'
import { CheckCircle2, AlertTriangle, Send } from 'lucide-react'

export function ShareYourPartyClient() {
  const [form, setForm] = useState({
    submitter_name:  '',
    submitter_email: '',
    child_name:      '',
    child_age:       '',
    party_theme:     '',
    venue:           '',
    vendor_credits:  '',
    caption:         '',
    photo_url:       '',
    party_month:     '',
    party_year:      '',
  })
  const [busy,  setBusy]  = useState(false)
  const [done,  setDone]  = useState(false)
  const [error, setError] = useState<string | null>(null)

  function update<K extends keyof typeof form>(key: K, value: string) {
    setForm(f => ({ ...f, [key]: value }))
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true); setError(null)
    try {
      const res = await fetch('/api/birthday/real-parties/submit', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          ...form,
          child_age:      form.child_age   ? Number(form.child_age) : null,
          party_month:    form.party_month ? Number(form.party_month) : null,
          party_year:     form.party_year  ? Number(form.party_year)  : null,
          vendor_credits: form.vendor_credits ? form.vendor_credits.split(',').map(s => s.trim()).filter(Boolean) : [],
        }),
      })
      const j = await res.json()
      if (!res.ok) setError(j?.error ?? 'Submit failed.')
      else         setDone(true)
    } finally { setBusy(false) }
  }

  if (done) {
    return (
      <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6">
        <CheckCircle2 size={28} className="text-emerald-600 mb-2" />
        <h2 className="text-[18px] font-bold text-slate-900">Got it — thank you!</h2>
        <p className="text-[13px] text-slate-700 mt-2 leading-relaxed">
          Our editor will review your submission within a couple of days. If it&apos;s a great fit (and it usually is),
          it&apos;ll land on the Real River Region Parties wall. We&apos;ll email you when it&apos;s live.
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={submit} className="bg-white rounded-2xl border border-black/5 shadow-sm p-6 space-y-4">

      <Field label="Photo URL *" hint="Upload to Google Drive / Dropbox / imgur and paste the public URL. (We&apos;ll add direct upload soon.)">
        <input type="url" required value={form.photo_url} onChange={e => update('photo_url', e.target.value)}
          placeholder="https://…"
          className="w-full px-3 py-2 text-[13px] border border-slate-200 rounded-lg" />
      </Field>

      <Field label="Caption *" hint="2-3 sentences about how the party went. Honest is better than polished.">
        <textarea required rows={4} value={form.caption} onChange={e => update('caption', e.target.value)}
          placeholder="What you did, how it went, what you'd do differently…"
          className="w-full px-3 py-2 text-[13px] border border-slate-200 rounded-lg resize-vertical" />
      </Field>

      <div className="grid sm:grid-cols-2 gap-3">
        <Field label="Kid's first name">
          <input type="text" value={form.child_name} onChange={e => update('child_name', e.target.value)}
            placeholder="Eli" className="w-full px-3 py-2 text-[13px] border border-slate-200 rounded-lg" />
        </Field>
        <Field label="Age at party">
          <input type="number" min={1} max={18} value={form.child_age} onChange={e => update('child_age', e.target.value)}
            placeholder="4" className="w-full px-3 py-2 text-[13px] border border-slate-200 rounded-lg" />
        </Field>
      </div>

      <Field label="Theme">
        <input type="text" value={form.party_theme} onChange={e => update('party_theme', e.target.value)}
          placeholder="Dinosaur Dig, Princess Tea Party, etc."
          className="w-full px-3 py-2 text-[13px] border border-slate-200 rounded-lg" />
      </Field>

      <Field label="Venue">
        <input type="text" value={form.venue} onChange={e => update('venue', e.target.value)}
          placeholder="Snapology / your backyard / etc."
          className="w-full px-3 py-2 text-[13px] border border-slate-200 rounded-lg" />
      </Field>

      <Field label="Vendor credits" hint="Comma-separated. Other businesses used (cake, entertainment, decor).">
        <input type="text" value={form.vendor_credits} onChange={e => update('vendor_credits', e.target.value)}
          placeholder="Bruster's, Dynamite Magic, Party City"
          className="w-full px-3 py-2 text-[13px] border border-slate-200 rounded-lg" />
      </Field>

      <div className="grid sm:grid-cols-2 gap-3">
        <Field label="Month">
          <select value={form.party_month} onChange={e => update('party_month', e.target.value)}
            className="w-full px-3 py-2 text-[13px] border border-slate-200 rounded-lg bg-white">
            <option value="">—</option>
            {Array.from({ length: 12 }, (_, i) => (
              <option key={i + 1} value={i + 1}>{new Date(2000, i, 1).toLocaleDateString('en-US', { month: 'long' })}</option>
            ))}
          </select>
        </Field>
        <Field label="Year">
          <input type="number" min={2020} max={new Date().getFullYear() + 1} value={form.party_year} onChange={e => update('party_year', e.target.value)}
            placeholder={String(new Date().getFullYear())}
            className="w-full px-3 py-2 text-[13px] border border-slate-200 rounded-lg" />
        </Field>
      </div>

      <hr className="border-slate-100" />

      <div className="grid sm:grid-cols-2 gap-3">
        <Field label="Your name" hint="First name only — that's what appears as the credit.">
          <input type="text" value={form.submitter_name} onChange={e => update('submitter_name', e.target.value)}
            placeholder="Sarah" className="w-full px-3 py-2 text-[13px] border border-slate-200 rounded-lg" />
        </Field>
        <Field label="Your email *" hint="Only for editor follow-up — never displayed.">
          <input type="email" required value={form.submitter_email} onChange={e => update('submitter_email', e.target.value)}
            placeholder="you@example.com" className="w-full px-3 py-2 text-[13px] border border-slate-200 rounded-lg" />
        </Field>
      </div>

      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 rounded-lg p-3 text-[12px] inline-flex items-start gap-2">
          <AlertTriangle size={14} className="mt-0.5 shrink-0" /> {error}
        </div>
      )}

      <button type="submit" disabled={busy || !form.caption.trim() || !form.photo_url.trim() || !form.submitter_email.trim()}
        className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 text-[14px] font-bold text-white bg-[#ff7a59] rounded-lg hover:opacity-90 disabled:opacity-50">
        <Send size={14} />
        {busy ? 'Sending…' : 'Submit my party'}
      </button>
    </form>
  )
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[12px] font-bold text-slate-900 mb-1">{label}</label>
      {hint && <p className="text-[11px] text-slate-500 mb-1.5">{hint}</p>}
      {children}
    </div>
  )
}
