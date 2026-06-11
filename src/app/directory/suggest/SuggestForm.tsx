'use client'

import { useState } from 'react'
import { Send, Check } from 'lucide-react'

export function SuggestForm({ brandSlug }: { brandSlug: string }) {
  const [name, setName]       = useState('')
  const [email, setEmail]     = useState('')
  const [bizName, setBizName] = useState('')
  const [website, setWebsite] = useState('')
  const [phone, setPhone]     = useState('')
  const [city, setCity]       = useState('')
  const [notes, setNotes]     = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [err, setErr]         = useState<string | null>(null)
  const [done, setDone]       = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!email || !notes) {
      setErr('Email + a few words about why you love this place are required.')
      return
    }
    setSubmitting(true); setErr(null)
    try {
      const res = await fetch('/api/directory/suggest', {
        method:  'POST',
        headers: { 'content-type': 'application/json' },
        body:    JSON.stringify({
          brandSlug,
          submitter_name:  name.trim() || null,
          submitter_email: email.trim().toLowerCase(),
          notes:           notes.trim(),
          submitted_data:  {
            business_name: bizName.trim() || null,
            website:       website.trim() || null,
            phone:         phone.trim()   || null,
            city:          city.trim()    || null,
          },
        }),
      })
      const json = await res.json().catch(() => ({})) as { ok?: boolean; error?: string }
      if (!res.ok || !json.ok) {
        setErr(json.error ?? `Submission failed (HTTP ${res.status})`)
        setSubmitting(false)
        return
      }
      setDone(true)
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Network error')
      setSubmitting(false)
    }
  }

  if (done) {
    return (
      <div className="rounded-xl border border-portal-green/40 bg-portal-green-lt p-6 text-center">
        <Check size={28} className="mx-auto text-portal-green mb-2" />
        <h2 className="text-lg font-bold text-portal-text mb-1">Got it — thank you.</h2>
        <p className="text-sm text-muted-foreground">
          Our editor reviews submissions weekly. If we run with it, we&apos;ll email you so you can share it.
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={submit} className="space-y-4 bg-card border border-border rounded-2xl p-6">
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">Your name</label>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="(optional)"
            className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background focus:outline-none focus:border-primary"
          />
        </div>
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
            Your email <span className="text-destructive">*</span>
          </label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            placeholder="you@example.com"
            className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background focus:outline-none focus:border-primary"
          />
        </div>
      </div>

      <div className="border-t border-border pt-4 space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">About the business</h3>
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">Business / expert name</label>
          <input
            value={bizName}
            onChange={e => setBizName(e.target.value)}
            placeholder="What's it called?"
            className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background focus:outline-none focus:border-primary"
          />
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">Website</label>
            <input
              type="url"
              value={website}
              onChange={e => setWebsite(e.target.value)}
              placeholder="https://..."
              className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background focus:outline-none focus:border-primary"
            />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">Phone</label>
            <input
              value={phone}
              onChange={e => setPhone(e.target.value)}
              placeholder="(optional)"
              className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background focus:outline-none focus:border-primary"
            />
          </div>
        </div>
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">City</label>
          <input
            value={city}
            onChange={e => setCity(e.target.value)}
            placeholder="Montgomery, Auburn, etc."
            className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background focus:outline-none focus:border-primary"
          />
        </div>
      </div>

      <div className="border-t border-border pt-4">
        <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
          Why should we feature them? <span className="text-destructive">*</span>
        </label>
        <textarea
          rows={5}
          value={notes}
          onChange={e => setNotes(e.target.value)}
          required
          placeholder="Tell us what makes them great. The more specific the better — our AI will draft a description from your notes for the editor to polish."
          className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background focus:outline-none focus:border-primary resize-y"
        />
      </div>

      {err && (
        <div className="rounded-lg bg-destructive/10 border border-destructive/30 px-3 py-2 text-sm text-destructive">{err}</div>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="w-full inline-flex items-center justify-center gap-2 bg-primary text-primary-foreground font-bold rounded-lg py-3 hover:opacity-90 transition-opacity disabled:opacity-50"
      >
        <Send size={14} /> {submitting ? 'Sending…' : 'Submit suggestion'}
      </button>
      <p className="text-[11px] text-muted-foreground text-center">
        Our editor reviews submissions before they go live.
      </p>
    </form>
  )
}
