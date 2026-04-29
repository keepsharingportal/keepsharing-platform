'use client'

import { useState } from 'react'
import { RefreshCw, Check } from 'lucide-react'
import { BoomFormShell, boomInput, boomInput2, boomLabel, GOLD, NAVY } from './BoomFormShell'

const inp = `${boomInput} ${boomInput2}`
const lbl = `${boomLabel} text-[#D8D0C0]`
const ta  = `${boomInput} ${boomInput2} resize-none`

const QUESTIONS = [
  { key: 'secret',        label: "What's your secret?",                               placeholder: "The one thing you'd tell a newly married couple…" },
  { key: 'surprised',     label: 'What surprised you most about the long haul?',      placeholder: "Something you didn't expect after all these years…" },
  { key: 'knowNow',       label: "What do you know now that you didn't then?",        placeholder: 'Wisdom that only comes with time together…' },
  { key: 'tuesday',       label: 'What does a regular Tuesday look like for you two?', placeholder: 'The ordinary moments that make up a life…' },
  { key: 'lookForward',   label: "What are you most looking forward to?",              placeholder: 'The next chapter, the next adventure…' },
]

export function ThenAndNowForm() {
  const [form, setForm] = useState({
    name1: '', name2: '', yearsTogether: '', anniversaryDate: '',
    email: '', ...Object.fromEntries(QUESTIONS.map(q => [q.key, ''])),
  })
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      await fetch('/api/submissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          formType: 'then-and-now',
          name: `${form.name1} & ${form.name2}`,
          email: form.email,
          formData: {
            couple: `${form.name1} and ${form.name2}`,
            years_together: form.yearsTogether,
            anniversary_date: form.anniversaryDate,
            ...Object.fromEntries(QUESTIONS.map(q => [q.key, form[q.key as keyof typeof form]])),
          },
        }),
      })
      setDone(true)
    } finally { setSubmitting(false) }
  }

  if (done) return (
    <BoomFormShell title="Then and Now" subtitle="" department="Relationships">
      <div className="text-center py-8">
        <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: 'rgba(201,168,75,0.15)', border: `2px solid ${GOLD}` }}>
          <Check size={28} style={{ color: GOLD }} />
        </div>
        <h2 className="text-xl font-bold mb-2">Beautiful. Thank you.</h2>
        <p className="text-base leading-relaxed" style={{ color: '#D8D0C0' }}>Your story is in. Please send your photos to photos@riverregionboom.com with your names in the subject line.</p>
      </div>
    </BoomFormShell>
  )

  return (
    <BoomFormShell
      title="Then and Now"
      subtitle="Tell us your story — from the beginning to right now. We're looking for couples who have built a life together in the River Region and have something worth sharing."
      department="Relationships"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <div><label className={lbl}>Partner 1 *</label><input required value={form.name1} onChange={set('name1')} className={inp} placeholder="First name" /></div>
          <div><label className={lbl}>Partner 2 *</label><input required value={form.name2} onChange={set('name2')} className={inp} placeholder="First name" /></div>
          <div><label className={lbl}>Years Together</label><input value={form.yearsTogether} onChange={set('yearsTogether')} className={inp} placeholder="e.g. 42" /></div>
          <div><label className={lbl}>Anniversary Date</label><input type="date" value={form.anniversaryDate} onChange={set('anniversaryDate')} className={inp} /></div>
        </div>

        <div className="pt-2 border-t border-[#1E3558]">
          <p className="text-sm font-semibold mb-4" style={{ color: GOLD }}>Five Questions</p>
          {QUESTIONS.map(q => (
            <div key={q.key} className="mb-4">
              <label className={lbl}>{q.label}</label>
              <textarea rows={3} value={form[q.key as keyof typeof form] as string} onChange={set(q.key)} className={ta} placeholder={q.placeholder} />
            </div>
          ))}
        </div>

        <div>
          <label className={lbl}>Email for follow-up *</label>
          <input required type="email" value={form.email} onChange={set('email')} className={inp} placeholder="your@email.com" />
        </div>

        <p className="text-xs" style={{ color: '#8B7340' }}>Please email photos (then + now) to photos@riverregionboom.com after submitting. Subject: Then and Now — [Your Names]</p>

        <button type="submit" disabled={submitting || !form.name1 || !form.name2 || !form.email}
          className={`w-full py-3.5 text-base font-bold rounded-xl transition-all hover:opacity-90 disabled:opacity-50`}
          style={{ backgroundColor: GOLD, color: NAVY }}>
          {submitting ? <><RefreshCw size={16} className="inline animate-spin mr-2" />Submitting…</> : 'Submit Our Story →'}
        </button>
      </form>
    </BoomFormShell>
  )
}
