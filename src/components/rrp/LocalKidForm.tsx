'use client'

import { useState } from 'react'
import { RefreshCw, CheckCircle2 } from 'lucide-react'
import { RRPFormShell, rrpInput, rrpLabel, rrpTa } from './RRPFormShell'

export function LocalKidForm() {
  const [form, setForm] = useState({
    kidName: '', age: '', school: '', neighborhood: '',
    activity: '', whatTheyDo: '', whyRemarkable: '',
    nominatorName: '', email: '',
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
          formType: 'local-kid',
          name:  form.nominatorName,
          email: form.email,
          formData: {
            kid_name:       form.kidName,
            age:            form.age,
            school:         form.school,
            neighborhood:   form.neighborhood,
            activity:       form.activity,
            what_they_do:   form.whatTheyDo,
            why_remarkable: form.whyRemarkable,
            nominator_name: form.nominatorName,
          },
        }),
      })
      setDone(true)
    } finally { setSubmitting(false) }
  }

  if (done) return (
    <RRPFormShell title="Local Kid Doing Cool Things" subtitle="" department="Local Kid Cool Things">
      <div className="text-center py-6">
        <CheckCircle2 size={40} className="mx-auto text-green-500 mb-3" />
        <h2 className="text-lg font-bold text-gray-900 mb-2">Nomination submitted!</h2>
        <p className="text-sm text-gray-600">We'll review {form.kidName}'s story. Thank you for sharing it!</p>
      </div>
    </RRPFormShell>
  )

  return (
    <RRPFormShell
      title="Local Kid Doing Cool Things"
      subtitle="Know a kid in the River Region with an extraordinary hobby, skill, passion, or achievement? We'd love to feature them in an upcoming issue."
      department="Local Kid Cool Things"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div><label className={rrpLabel}>Kid's Name *</label><input required value={form.kidName} onChange={set('kidName')} className={rrpInput} placeholder="First and last name" /></div>
          <div><label className={rrpLabel}>Age</label><input value={form.age} onChange={set('age')} className={rrpInput} placeholder="e.g. 10" /></div>
          <div><label className={rrpLabel}>School</label><input value={form.school} onChange={set('school')} className={rrpInput} placeholder="School name" /></div>
          <div><label className={rrpLabel}>Neighborhood</label><input value={form.neighborhood} onChange={set('neighborhood')} className={rrpInput} placeholder="e.g. Millbrook, Pike Road" /></div>
        </div>

        <div>
          <label className={rrpLabel}>What's the cool thing they do? *</label>
          <input required value={form.activity} onChange={set('activity')} className={rrpInput} placeholder="e.g. Competitive robotics, beekeeping, coding apps, marathon running…" />
        </div>

        <div>
          <label className={rrpLabel}>Tell us more about what they do *</label>
          <textarea required rows={3} value={form.whatTheyDo} onChange={set('whatTheyDo')} className={rrpTa} placeholder="How long have they been doing it? What have they accomplished? Any awards or milestones?" />
        </div>

        <div>
          <label className={rrpLabel}>Why is this worth sharing? *</label>
          <textarea required rows={3} value={form.whyRemarkable} onChange={set('whyRemarkable')} className={rrpTa} placeholder="What makes this kid stand out? What should River Region Parents know about them?" />
        </div>

        <div className="border-t border-gray-100 pt-4 grid grid-cols-2 gap-3">
          <div><label className={rrpLabel}>Your Name *</label><input required value={form.nominatorName} onChange={set('nominatorName')} className={rrpInput} placeholder="Parent, teacher, coach…" /></div>
          <div><label className={rrpLabel}>Email *</label><input required type="email" value={form.email} onChange={set('email')} className={rrpInput} placeholder="For follow-up only" /></div>
        </div>

        <button type="submit" disabled={submitting || !form.kidName || !form.activity || !form.whatTheyDo || !form.whyRemarkable || !form.nominatorName || !form.email}
          className="w-full py-3 text-sm font-bold text-white bg-blue-600 rounded-xl hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2">
          {submitting && <RefreshCw size={14} className="animate-spin" />}
          Submit Nomination →
        </button>
      </form>
    </RRPFormShell>
  )
}
