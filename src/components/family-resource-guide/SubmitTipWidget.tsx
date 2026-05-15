'use client'

// SubmitTipWidget — quick form for moms to text in recommendations.
// Feeds the editorial pipeline for future Best-Of lists.

import { useState } from 'react'
import { Send, Check, MessageCircle, RefreshCw } from 'lucide-react'

const CATEGORIES = [
  'Best Park',
  'Day Trip',
  'Sweet Treat',
  'Sports League',
  'Counselor / Therapist',
  'Pediatrician',
  'Childcare',
  'Restaurant',
  'Something Else',
]

const TOWNS = [
  'Montgomery',
  'Prattville',
  'Wetumpka',
  'Millbrook',
  'Pike Road',
  'Anywhere',
]

export function SubmitTipWidget() {
  const [open,         setOpen]       = useState(false)
  const [category,     setCategory]   = useState(CATEGORIES[0])
  const [town,         setTown]       = useState(TOWNS[0])
  const [businessName, setBusiness]   = useState('')
  const [recommendation, setRec]      = useState('')
  const [name,         setName]       = useState('')
  const [submitting,   setSubmitting] = useState(false)
  const [done,         setDone]       = useState(false)
  const [error,        setError]      = useState<string | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!recommendation.trim()) return
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch('/api/submit-tip', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          category,
          town,
          business_name:  businessName.trim() || null,
          recommendation: recommendation.trim(),
          submitter_name: name.trim() || null,
        }),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        setError(j?.error ?? 'Could not send. Try again in a moment.')
        return
      }
      setDone(true)
    } catch {
      setError('Network error. Try again in a moment.')
    } finally {
      setSubmitting(false)
    }
  }

  if (done) {
    return (
      <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-5">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-full bg-emerald-200 flex items-center justify-center shrink-0">
            <Check className="h-5 w-5 text-emerald-700" strokeWidth={2.5} />
          </div>
          <div>
            <p className="text-sm font-bold text-emerald-900 mb-1">Got it — thank you!</p>
            <p className="text-xs text-emerald-800/80 leading-relaxed">
              We read every tip. The good ones end up in our next Best-Of list.
            </p>
          </div>
        </div>
      </div>
    )
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="group w-full text-left rounded-2xl bg-secondary/10 border border-secondary/30 hover:border-secondary/50 hover:bg-secondary/15 transition-all p-5"
      >
        <MessageCircle className="h-5 w-5 text-secondary mb-2" />
        <p className="text-[10px] font-bold uppercase tracking-widest text-secondary mb-1">Got a tip?</p>
        <p className="text-sm font-bold text-foreground leading-snug mb-1">
          Tell us your favorite spot
        </p>
        <p className="text-xs text-muted-foreground leading-relaxed">
          One sentence. We&apos;ll consider it for the next Best-Of list. <span className="font-semibold text-secondary">Submit a tip →</span>
        </p>
      </button>
    )
  }

  const inp = 'w-full px-3 py-2 text-sm rounded-lg border border-border outline-none focus:border-secondary bg-white'

  return (
    <div className="rounded-2xl bg-card border border-secondary/30 p-5">
      <div className="flex items-center justify-between mb-3">
        <p className="text-[10px] font-bold uppercase tracking-widest text-secondary">Submit a tip</p>
        <button
          onClick={() => setOpen(false)}
          className="text-[11px] text-muted-foreground hover:text-foreground"
        >
          Cancel
        </button>
      </div>

      <form onSubmit={submit} className="space-y-2.5">
        <div className="grid grid-cols-2 gap-2">
          <select className={inp} value={category} onChange={e => setCategory(e.target.value)}>
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <select className={inp} value={town} onChange={e => setTown(e.target.value)}>
            {TOWNS.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <input
          className={inp}
          value={businessName}
          onChange={e => setBusiness(e.target.value)}
          placeholder="Business name (optional)"
        />
        <textarea
          rows={3}
          className={`${inp} resize-y`}
          value={recommendation}
          onChange={e => setRec(e.target.value)}
          placeholder="Why is this great? (One sentence is fine.)"
          required
        />
        <input
          className={inp}
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Your first name (optional)"
        />
        {error && <p className="text-xs text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={submitting || !recommendation.trim()}
          className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-secondary text-white rounded-lg text-sm font-bold hover:bg-secondary/90 disabled:opacity-50 transition-colors"
        >
          {submitting ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
          {submitting ? 'Sending…' : 'Send Tip'}
        </button>
      </form>
    </div>
  )
}
