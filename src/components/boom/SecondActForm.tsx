'use client'

import { useState } from 'react'
import { RefreshCw, Check } from 'lucide-react'
import { BoomFormShell, boomInput, boomInput2, boomLabel, GOLD, NAVY } from './BoomFormShell'

const inp = `${boomInput} ${boomInput2}`
const lbl = `${boomLabel} text-[#D8D0C0]`
const goldBtn = `w-full py-3.5 text-base font-bold rounded-xl transition-all hover:opacity-90 disabled:opacity-50`

export function SecondActForm() {
  const [form, setForm] = useState({
    name: '', age: '', neighborhood: '', whatStarted: '', whenStarted: '',
    why: '', whatSurprised: '', adviceForOthers: '', email: '', phone: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      await fetch('/api/submissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          formType: 'second-act',
          name: form.name,
          email: form.email,
          phone: form.phone || undefined,
          formData: {
            name: form.name,
            age: form.age,
            neighborhood: form.neighborhood,
            what_they_started: form.whatStarted,
            when_they_started: form.whenStarted,
            why: form.why,
            what_surprised_them: form.whatSurprised,
            advice_for_others: form.adviceForOthers,
          },
        }),
      })
      setDone(true)
    } finally { setSubmitting(false) }
  }

  if (done) return (
    <BoomFormShell title="Second Act" subtitle="" department="Inspiration">
      <div className="text-center py-8">
        <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: 'rgba(201,168,75,0.15)', border: `2px solid ${GOLD}` }}>
          <Check size={28} style={{ color: GOLD }} />
        </div>
        <h2 className="text-xl font-bold mb-2">Thank you, {form.name.split(' ')[0]}!</h2>
        <p className="text-base leading-relaxed" style={{ color: '#D8D0C0' }}>
          Your story has been received. Our editorial team will be in touch if we select your Second Act feature for an upcoming issue.
        </p>
      </div>
    </BoomFormShell>
  )

  return (
    <BoomFormShell
      title="Second Act: Trying Something New, Again!"
      subtitle="Tell us about something you started after 50 — a skill, a passion, a career pivot, a creative pursuit. We celebrate the brave souls who decided it was never too late."
      department="Inspiration"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={lbl}>Your Name *</label>
            <input required value={form.name} onChange={set('name')} className={inp} placeholder="Full name" />
          </div>
          <div>
            <label className={lbl}>Age</label>
            <input value={form.age} onChange={set('age')} className={inp} placeholder="e.g. 63" />
          </div>
        </div>

        <div>
          <label className={lbl}>Neighborhood / City</label>
          <input value={form.neighborhood} onChange={set('neighborhood')} className={inp} placeholder="e.g. Prattville, Eastchase, Wetumpka…" />
        </div>

        <div>
          <label className={lbl}>What did you start? *</label>
          <input required value={form.whatStarted} onChange={set('whatStarted')} className={inp} placeholder="e.g. Painting, learning Spanish, a small business, cycling…" />
        </div>

        <div>
          <label className={lbl}>When did you start it?</label>
          <input value={form.whenStarted} onChange={set('whenStarted')} className={inp} placeholder="e.g. Spring 2022, after I retired, after my diagnosis…" />
        </div>

        <div>
          <label className={lbl}>Why did you decide to do it? *</label>
          <textarea required rows={3} value={form.why} onChange={set('why')} className={`${boomInput} ${boomInput2} resize-none`} placeholder="What prompted you? What were you feeling? What made you say 'I'm going to try this'?" />
        </div>

        <div>
          <label className={lbl}>What surprised you about it?</label>
          <textarea rows={3} value={form.whatSurprised} onChange={set('whatSurprised')} className={`${boomInput} ${boomInput2} resize-none`} placeholder="What did you discover — about the activity, or about yourself?" />
        </div>

        <div>
          <label className={lbl}>What would you tell someone considering something similar?</label>
          <textarea rows={3} value={form.adviceForOthers} onChange={set('adviceForOthers')} className={`${boomInput} ${boomInput2} resize-none`} placeholder="Your honest advice for someone on the fence…" />
        </div>

        <div className="border-t border-[#1E3558] pt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={lbl}>Email *</label>
            <input required type="email" value={form.email} onChange={set('email')} className={inp} placeholder="For follow-up only" />
          </div>
          <div>
            <label className={lbl}>Phone (optional)</label>
            <input type="tel" value={form.phone} onChange={set('phone')} className={inp} placeholder="(334) …" />
          </div>
        </div>

        <p className="text-xs" style={{ color: '#8B7340' }}>By submitting, you agree that River Region Boom may publish your story (with your permission) in print and online. Your contact info is never published.</p>

        <button type="submit" disabled={submitting || !form.name || !form.whatStarted || !form.why || !form.email}
          className={goldBtn} style={{ backgroundColor: GOLD, color: NAVY }}>
          {submitting ? <><RefreshCw size={16} className="inline animate-spin mr-2" />Submitting…</> : 'Submit My Story →'}
        </button>
      </form>
    </BoomFormShell>
  )
}
