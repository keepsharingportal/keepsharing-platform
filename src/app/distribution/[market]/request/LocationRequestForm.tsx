'use client'

import { useState } from 'react'
import { Loader2, Check } from 'lucide-react'

interface Props { market: string; regionName: string }

export function LocationRequestForm({ market, regionName }: Props) {
  const [biz,     setBiz]     = useState('')
  const [address, setAddress] = useState('')
  const [name,    setName]    = useState('')
  const [phone,   setPhone]   = useState('')
  const [email,   setEmail]   = useState('')
  const [notes,   setNotes]   = useState('')
  // Honeypot — visible CSS-hidden field. Bots fill everything. Real
  // humans never see it. Server bounces if populated.
  const [honey,   setHoney]   = useState('')
  const [busy,    setBusy]    = useState(false)
  const [done,    setDone]    = useState(false)
  const [err,     setErr]     = useState<string | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setErr(null)
    try {
      const res = await fetch('/api/circulation/location-request', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          market,
          business_name: biz,
          address,
          contact_name:  name,
          contact_phone: phone,
          contact_email: email,
          notes,
          website:       honey,
        }),
      })
      const j = await res.json().catch(() => ({})) as { error?: string; ok?: boolean }
      if (!res.ok || !j.ok) throw new Error(j.error ?? 'Could not submit')
      setDone(true)
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  if (done) {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-center">
        <Check className="h-8 w-8 text-emerald-600 mx-auto mb-2" />
        <h2 className="text-lg font-bold text-emerald-900">Thanks — we got it</h2>
        <p className="text-sm text-emerald-800 mt-1">
          Someone from {regionName} distribution will be in touch soon. Pickup locations are typically added at the start of the next print cycle.
        </p>
      </div>
    )
  }

  const inp = 'mt-1 w-full rounded-md border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 bg-card'
  const lbl = 'block text-xs font-bold uppercase tracking-wider text-muted-foreground'

  return (
    <form onSubmit={submit} className="space-y-3">
      <div>
        <label className={lbl}>Business name <span className="text-red-600">*</span></label>
        <input value={biz} onChange={e => setBiz(e.target.value)} required className={inp} />
      </div>
      <div>
        <label className={lbl}>Address</label>
        <input value={address} onChange={e => setAddress(e.target.value)} placeholder="123 Main St, Montgomery, AL" className={inp} />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className={lbl}>Contact name</label>
          <input value={name} onChange={e => setName(e.target.value)} className={inp} />
        </div>
        <div>
          <label className={lbl}>Phone</label>
          <input value={phone} onChange={e => setPhone(e.target.value)} type="tel" inputMode="tel" className={inp} />
        </div>
      </div>
      <div>
        <label className={lbl}>Email</label>
        <input value={email} onChange={e => setEmail(e.target.value)} type="email" className={inp} />
      </div>
      <div>
        <label className={lbl}>Anything else?</label>
        <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} className={`${inp} resize-y`} placeholder="Days/hours, where to place the rack, etc." />
      </div>

      {/* Honeypot — visually hidden, screen-reader skippable. */}
      <div style={{ position: 'absolute', left: '-10000px', height: 0, width: 0, overflow: 'hidden' }} aria-hidden="true">
        <label>Website (leave blank)</label>
        <input value={honey} onChange={e => setHoney(e.target.value)} tabIndex={-1} autoComplete="off" />
      </div>

      {err && <p className="text-xs text-red-600">{err}</p>}

      <button
        type="submit"
        disabled={busy || !biz.trim()}
        className="inline-flex items-center gap-1.5 text-sm font-bold px-5 py-2.5 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        {busy ? 'Sending…' : 'Submit request'}
      </button>
    </form>
  )
}
