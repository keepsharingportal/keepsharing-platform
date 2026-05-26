'use client'

import { useState } from 'react'
import Link from 'next/link'
import { CheckCircle2, RefreshCw, ArrowRight, Sparkles } from 'lucide-react'

// Curated category prompts — mirrors the kinds of lists the team has been
// running. "Other" lets a reader name a list theme the team hasn't tried,
// which is itself useful intel.
const CATEGORY_OPTIONS = [
  'Best Parks',
  'Best Playgrounds',
  'Best Sweet Treats',
  'Best Family Restaurants',
  'Best Day Trips',
  'Best Birthday Party Spots',
  'Best Free Family Activities',
  'Best Date Night Spots',
  'Best Pediatricians',
  'Best Dentists for Kids',
  'Best Childcare Centers',
  'Best Summer Camps',
  'Best After-School Programs',
  'Best Family-Friendly Coffee Shops',
  'Best Local Boutiques',
  'Other (write in below)',
] as const

export function BestOfSuggestForm() {
  const [category,         setCategory]         = useState('')
  const [otherCategory,    setOtherCategory]    = useState('')
  const [nomineeName,      setNomineeName]      = useState('')
  const [reason,           setReason]           = useState('')
  const [submitterName,    setSubmitterName]    = useState('')
  const [submitterEmail,   setSubmitterEmail]   = useState('')
  const [website,          setWebsite]          = useState('')  // honeypot
  const [busy,             setBusy]             = useState(false)
  const [err,              setErr]              = useState<string | null>(null)
  const [done,             setDone]             = useState(false)

  const isOther = category === 'Other (write in below)'

  function resetForm() {
    setCategory('')
    setOtherCategory('')
    setNomineeName('')
    setReason('')
    setSubmitterName('')
    setSubmitterEmail('')
    setErr(null)
    setDone(false)
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setErr(null)

    const finalCategory = isOther ? otherCategory.trim() : category
    if (!finalCategory) { setErr('Pick a category, or write one in.'); return }
    if (!nomineeName.trim()) { setErr('Tell us who you\'re nominating.'); return }

    setBusy(true)
    try {
      const res = await fetch('/api/best-of/suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category:           finalCategory,
          nominee_name:       nomineeName.trim(),
          reason:             reason.trim() || undefined,
          submitted_by_name:  submitterName.trim() || undefined,
          submitted_by_email: submitterEmail.trim() || undefined,
          website,  // honeypot — empty for real users
        }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) { setErr(json?.error ?? `HTTP ${res.status}`); return }
      setDone(true)
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Network error')
    } finally {
      setBusy(false)
    }
  }

  if (done) {
    return (
      <div className="bg-card border border-border/60 rounded-2xl p-6 md:p-8 text-center">
        <div className="w-12 h-12 rounded-full bg-green-100 text-green-700 flex items-center justify-center mx-auto mb-3">
          <CheckCircle2 className="h-6 w-6" />
        </div>
        <h3 className="text-xl font-bold text-foreground mb-1">Got it — thank you!</h3>
        <p className="text-sm text-muted-foreground max-w-md mx-auto mb-5">
          Your suggestion is in the queue. If it makes the next list, we&apos;ll roll it
          into a Best Of feature on the Family Resource Guide.
        </p>
        <div className="flex items-center justify-center gap-3 flex-wrap">
          <button
            type="button"
            onClick={resetForm}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-bold rounded-full bg-amber-400 text-amber-950 hover:bg-amber-500 transition-colors shadow-sm"
          >
            <Sparkles className="h-3.5 w-3.5" />
            Suggest another
          </button>
          <Link
            href="/family-resource-guide"
            className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:text-primary/80 transition-colors"
          >
            Back to the Guide <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    )
  }

  const inp = 'w-full px-3.5 py-2.5 text-sm rounded-lg border border-border bg-card outline-none focus:border-primary'

  return (
    <form onSubmit={submit} className="bg-card border border-border/60 rounded-2xl p-5 md:p-6 space-y-4">
      {/* Honeypot — invisible to humans, irresistible to dumb bots */}
      <div className="hidden" aria-hidden="true">
        <label>
          Website
          <input
            type="text"
            tabIndex={-1}
            autoComplete="off"
            value={website}
            onChange={e => setWebsite(e.target.value)}
          />
        </label>
      </div>

      <div>
        <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
          Category *
        </label>
        <select
          value={category}
          onChange={e => setCategory(e.target.value)}
          className={`${inp} cursor-pointer`}
          required
        >
          <option value="">— Pick a category —</option>
          {CATEGORY_OPTIONS.map(c => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        {isOther && (
          <input
            type="text"
            value={otherCategory}
            onChange={e => setOtherCategory(e.target.value)}
            placeholder="e.g., Best Outdoor Birthday Venues"
            className={`${inp} mt-2`}
            maxLength={120}
          />
        )}
      </div>

      <div>
        <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
          Who are you nominating? *
        </label>
        <input
          type="text"
          value={nomineeName}
          onChange={e => setNomineeName(e.target.value)}
          placeholder="Name of the place, business, or service"
          className={inp}
          maxLength={200}
          required
        />
      </div>

      <div>
        <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
          Why is it the best? <span className="font-normal text-muted-foreground/70">(optional)</span>
        </label>
        <textarea
          value={reason}
          onChange={e => setReason(e.target.value)}
          placeholder="What makes it stand out for River Region families?"
          className={`${inp} resize-y min-h-[100px]`}
          maxLength={2000}
        />
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
            Your name <span className="font-normal text-muted-foreground/70">(optional)</span>
          </label>
          <input
            type="text"
            value={submitterName}
            onChange={e => setSubmitterName(e.target.value)}
            placeholder="So we can credit you if it makes the list"
            className={inp}
            maxLength={120}
          />
        </div>
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
            Email <span className="font-normal text-muted-foreground/70">(optional)</span>
          </label>
          <input
            type="email"
            value={submitterEmail}
            onChange={e => setSubmitterEmail(e.target.value)}
            placeholder="We may follow up for details"
            className={inp}
            maxLength={200}
          />
        </div>
      </div>

      {err && <p className="text-sm text-rose-700 font-semibold">{err}</p>}

      <div className="flex items-center gap-3 flex-wrap pt-1">
        <button
          type="submit"
          disabled={busy}
          className="inline-flex items-center gap-1.5 px-5 py-2.5 text-sm font-bold rounded-full bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 shadow-sm"
        >
          {busy ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          {busy ? 'Sending…' : 'Send my suggestion'}
        </button>
        <Link
          href="/family-resource-guide"
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          Cancel
        </Link>
      </div>
    </form>
  )
}
