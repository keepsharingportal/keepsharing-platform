'use client'

import { useState } from 'react'
import { RefreshCw, Check } from 'lucide-react'
import { BoomFormShell, boomInput, boomInput2, boomLabel, GOLD, NAVY } from './BoomFormShell'

const inp = `${boomInput} ${boomInput2}`
const lbl = `${boomLabel} text-[#D8D0C0]`

const AGE_RANGES = ['Under 50', '50–59', '60–69', '70–79', '80+', 'Prefer not to say']

export function AskTheDoctorForm() {
  const [form, setForm] = useState({ firstName: '', ageRange: AGE_RANGES[1], question: '', email: '' })
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)

  const charLeft = 300 - form.question.length

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      await fetch('/api/submissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          formType: 'ask-the-doctor',
          name: form.firstName,
          email: form.email,
          formData: {
            first_name: form.firstName,
            age_range:  form.ageRange,
            question:   form.question,
          },
        }),
      })
      setDone(true)
    } finally { setSubmitting(false) }
  }

  if (done) return (
    <BoomFormShell title="Ask the Doctor" subtitle="" department="Health">
      <div className="text-center py-8">
        <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: 'rgba(201,168,75,0.15)', border: `2px solid ${GOLD}` }}>
          <Check size={28} style={{ color: GOLD }} />
        </div>
        <h2 className="text-xl font-bold mb-2">Question received, {form.firstName}.</h2>
        <p className="text-base leading-relaxed" style={{ color: '#D8D0C0' }}>We select one question per month to answer with a local doctor partner. If yours is selected, we'll reach out by email.</p>
      </div>
    </BoomFormShell>
  )

  return (
    <BoomFormShell
      title="Ask the Doctor"
      subtitle="Got a health question you've been wondering about? Each month, we answer one reader question with the help of a local doctor. Submit yours below."
      department="Health"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="bg-[#0B1829] rounded-xl p-4 text-sm" style={{ border: '1px solid #1E3558' }}>
          <span className="font-bold" style={{ color: GOLD }}>Privacy note:</span>
          <span style={{ color: '#D8D0C0' }}> Only your first name appears in the published Q&A. Your email is never published.</span>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={lbl}>First Name *</label>
            <input required value={form.firstName} onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))} className={inp} placeholder="Your first name only" />
          </div>
          <div>
            <label className={lbl}>Age Range</label>
            <select value={form.ageRange} onChange={e => setForm(f => ({ ...f, ageRange: e.target.value }))}
              className={inp} style={{ fontFamily: 'system-ui, sans-serif' }}>
              {AGE_RANGES.map(r => <option key={r}>{r}</option>)}
            </select>
          </div>
        </div>

        <div>
          <label className={lbl}>Your Question * <span style={{ color: charLeft < 20 ? '#c95b4a' : '#8B7340', fontWeight: 400 }}>({charLeft} chars left)</span></label>
          <textarea
            required rows={4}
            maxLength={300}
            value={form.question}
            onChange={e => setForm(f => ({ ...f, question: e.target.value }))}
            className={`${boomInput} ${boomInput2} resize-none`}
            placeholder="e.g. What's the best way to manage joint pain without relying on medication every day?"
          />
        </div>

        <div>
          <label className={lbl}>Email (for follow-up only) *</label>
          <input required type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} className={inp} placeholder="your@email.com" />
        </div>

        <button type="submit" disabled={submitting || !form.firstName || !form.question || !form.email}
          className="w-full py-3.5 text-base font-bold rounded-xl transition-all hover:opacity-90 disabled:opacity-50"
          style={{ backgroundColor: GOLD, color: NAVY }}>
          {submitting ? <><RefreshCw size={16} className="inline animate-spin mr-2" />Submitting…</> : 'Submit My Question →'}
        </button>
      </form>
    </BoomFormShell>
  )
}
