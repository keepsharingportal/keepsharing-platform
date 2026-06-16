// Planning Timeline — interactive countdown checklist + email capture
// for time-anchored reminders. Mom enters child's name + party date,
// gets a drip of reminders matching where she is in the planning arc.
//
// The drip itself fires from a cron (separate sprint); this component
// captures the row and shows a "you're set" confirmation.
'use client'

import { useState } from 'react'
import { Calendar, CheckCircle2, ClipboardCheck, Mail } from 'lucide-react'

const PHASES = [
  {
    weeks: '6-8 weeks out',
    color: '#ff7a59',
    items: [
      'Set the date + budget',
      'Settle on guest count',
      'Pick a theme (or let your kid pick)',
      'Reserve the venue or save the date for home',
    ],
  },
  {
    weeks: '4 weeks out',
    color: '#f59e0b',
    items: [
      'Send invitations (paper, text, or both)',
      'Plan the menu — cake, finger foods, drinks',
      'Book entertainment (entertainer, bounce house, etc.)',
      'Order the cake',
    ],
  },
  {
    weeks: '2 weeks out',
    color: '#eab308',
    items: [
      'Confirm RSVPs + reach out to no-shows',
      'Buy decorations + supplies',
      'Plan activities + games',
      'Prep goody bags (or pick one nicer take-home gift)',
    ],
  },
  {
    weeks: 'Week of',
    color: '#84cc16',
    items: [
      'Final headcount to venue + cake',
      'Check the weather (outdoor backup plan?)',
      'Assemble goody bags',
      'Charge the camera. Take a deep breath. You\'ve got this.',
    ],
  },
]

export function PlanningTimeline({ brandSlug }: { brandSlug: string }) {
  const [done,       setDone]       = useState<Set<string>>(new Set())
  const [email,      setEmail]      = useState('')
  const [childName,  setChildName]  = useState('')
  const [partyDate,  setPartyDate]  = useState('')
  const [busy,       setBusy]       = useState(false)
  const [submitted,  setSubmitted]  = useState(false)
  const [error,      setError]      = useState<string | null>(null)

  const totalItems = PHASES.reduce((s, p) => s + p.items.length, 0)
  const completed  = done.size

  function toggle(key: string) {
    setDone(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else               next.add(key)
      return next
    })
  }

  async function subscribe(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) return
    setBusy(true); setError(null)
    try {
      const res = await fetch('/api/birthday/subscribe', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          email:            email.trim(),
          child_first_name: childName.trim() || null,
          party_date:       partyDate || null,
          source:           'timeline-checklist',
          brand_slug:       brandSlug,
        }),
      })
      const j = await res.json()
      if (!res.ok) setError(j?.error ?? 'subscribe failed')
      else         setSubmitted(true)
    } finally { setBusy(false) }
  }

  return (
    <div className="bg-white rounded-2xl border border-black/5 shadow-sm overflow-hidden">
      <div className="bg-gradient-to-r from-[#ff7a59] to-[#ff9d8a] text-white px-5 py-4">
        <div className="flex items-center gap-2">
          <ClipboardCheck size={18} />
          <h2 className="text-[16px] font-bold">Your Planning Timeline</h2>
        </div>
        <p className="text-[12px] text-white/90 mt-1">
          The checklist every River Region mom needs. Check off as you go — and get the printable PDF + email reminders below.
        </p>
      </div>

      {/* Progress bar */}
      <div className="px-5 pt-3">
        <div className="flex items-center justify-between text-[11px] font-bold mb-1.5">
          <span className="text-slate-600">{completed} of {totalItems} done</span>
          {completed === totalItems && completed > 0 && <span className="text-[#84cc16]">You&apos;re ready! 🎉</span>}
        </div>
        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-[#ff7a59] to-[#84cc16] transition-all duration-500"
            style={{ width: `${totalItems ? (completed / totalItems) * 100 : 0}%` }}
          />
        </div>
      </div>

      {/* Phases */}
      <div className="p-5 grid sm:grid-cols-2 gap-4">
        {PHASES.map((phase, i) => (
          <div key={phase.weeks} className="border border-slate-100 rounded-lg p-3 bg-slate-50/50">
            <div className="flex items-center gap-2 mb-2">
              <span className="inline-flex w-6 h-6 rounded-full text-white text-[11px] font-bold items-center justify-center" style={{ backgroundColor: phase.color }}>{i + 1}</span>
              <h3 className="text-[13px] font-bold text-slate-900">{phase.weeks}</h3>
            </div>
            <ul className="space-y-1.5">
              {phase.items.map(item => {
                const key = `${phase.weeks}:${item}`
                const checked = done.has(key)
                return (
                  <li key={item}>
                    <label className="flex items-start gap-2 cursor-pointer group">
                      <button
                        type="button" onClick={() => toggle(key)}
                        className={`shrink-0 w-4 h-4 rounded border-2 mt-0.5 flex items-center justify-center transition-colors ${
                          checked ? 'bg-[#84cc16] border-[#84cc16]' : 'border-slate-300 group-hover:border-[#ff7a59]'
                        }`}
                      >
                        {checked && <CheckCircle2 size={12} className="text-white" />}
                      </button>
                      <span className={`text-[12px] leading-snug ${checked ? 'text-slate-400 line-through' : 'text-slate-700'}`}>
                        {item}
                      </span>
                    </label>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </div>

      {/* Email capture — drip + PDF */}
      <div className="border-t border-slate-100 bg-[#fffaf5] p-5">
        {submitted ? (
          <div className="flex items-start gap-3 text-[13px] text-slate-800">
            <CheckCircle2 size={18} className="text-[#84cc16] shrink-0 mt-0.5" />
            <div>
              <strong>You&apos;re on the list.</strong> Watch your inbox — we&apos;ll send the printable checklist PDF
              and remind you of each phase as the party gets closer.
            </div>
          </div>
        ) : (
          <form onSubmit={subscribe} className="space-y-3">
            <div className="flex items-center gap-2 text-slate-900">
              <Mail size={16} className="text-[#ff7a59]" />
              <h3 className="text-[14px] font-bold">Get the printable PDF + reminders</h3>
            </div>
            <p className="text-[12px] text-slate-600 leading-relaxed">
              Drop your email + your child&apos;s party date and we&apos;ll send the full checklist PDF now,
              plus a friendly reminder at 6 weeks, 4 weeks, 2 weeks, and the week of.
            </p>
            <div className="grid sm:grid-cols-3 gap-2">
              <input
                type="email" required value={email} onChange={e => setEmail(e.target.value)}
                placeholder="your email"
                className="px-3 py-2 text-[13px] border border-slate-200 rounded-lg bg-white focus:outline-none focus:border-[#ff7a59]"
              />
              <input
                type="text" value={childName} onChange={e => setChildName(e.target.value)}
                placeholder="kid's first name (optional)"
                className="px-3 py-2 text-[13px] border border-slate-200 rounded-lg bg-white focus:outline-none focus:border-[#ff7a59]"
              />
              <input
                type="date" value={partyDate} onChange={e => setPartyDate(e.target.value)}
                className="px-3 py-2 text-[13px] border border-slate-200 rounded-lg bg-white focus:outline-none focus:border-[#ff7a59]"
              />
            </div>
            <button
              type="submit" disabled={busy || !email.trim()}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-5 py-2.5 text-[13px] font-bold text-white bg-[#ff7a59] rounded-lg hover:opacity-90 disabled:opacity-50"
            >
              {busy ? 'Subscribing…' : 'Send me the checklist'}
            </button>
            {error && <div className="text-[12px] text-rose-600">{error}</div>}
            <p className="text-[10px] text-slate-500">No spam. Unsubscribe anytime.</p>
          </form>
        )}
      </div>
    </div>
  )
}
