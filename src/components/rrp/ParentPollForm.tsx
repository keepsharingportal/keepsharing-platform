'use client'

import { useState } from 'react'
import { RefreshCw, CheckCircle2 } from 'lucide-react'
import { RRPFormShell, rrpInput, rrpLabel, rrpTa } from './RRPFormShell'

// This month's poll question — would be dynamic in production
const THIS_MONTHS_QUESTION = "What's the biggest challenge you face when choosing after-school activities for your kids?"

const NEIGHBORHOODS = ['Prattville', 'Wetumpka', 'Millbrook', 'Pike Road', 'Eastchase', 'Montgomery (other)', 'Outside River Region']

export function ParentPollForm() {
  const [form, setForm] = useState({ answer: '', firstName: '', neighborhood: NEIGHBORHOODS[0], email: '' })
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
          formType: 'parent-poll',
          name:  form.firstName,
          email: form.email,
          formData: {
            question:     THIS_MONTHS_QUESTION,
            answer:       form.answer,
            first_name:   form.firstName,
            neighborhood: form.neighborhood,
          },
        }),
      })
      setDone(true)
    } finally { setSubmitting(false) }
  }

  if (done) return (
    <RRPFormShell title="Parent Poll" subtitle="" department="Parent Poll">
      <div className="text-center py-6">
        <CheckCircle2 size={40} className="mx-auto text-green-500 mb-3" />
        <h2 className="text-lg font-bold text-gray-900 mb-2">Answer submitted, {form.firstName}!</h2>
        <p className="text-sm text-gray-600">Your perspective helps make the Parent Poll reflect the real experience of River Region families. Results publish next issue.</p>
      </div>
    </RRPFormShell>
  )

  return (
    <RRPFormShell
      title="Parent Poll"
      subtitle="Each month, we ask River Region Parents one real question and share the results in the magazine. This month's question:"
      department="Parent Poll"
    >
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-5">
        <p className="text-sm font-semibold text-blue-900 leading-relaxed">&ldquo;{THIS_MONTHS_QUESTION}&rdquo;</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className={rrpLabel}>Your Answer *</label>
          <textarea required rows={4} value={form.answer} onChange={set('answer')} className={rrpTa} placeholder="Share your honest perspective — we quote real parents in the magazine." />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={rrpLabel}>First Name *</label>
            <input required value={form.firstName} onChange={set('firstName')} className={rrpInput} placeholder="Your first name" />
          </div>
          <div>
            <label className={rrpLabel}>Neighborhood</label>
            <select value={form.neighborhood} onChange={set('neighborhood')} className={rrpInput}>
              {NEIGHBORHOODS.map(n => <option key={n}>{n}</option>)}
            </select>
          </div>
          <div className="col-span-2">
            <label className={rrpLabel}>Email (optional)</label>
            <input type="email" value={form.email} onChange={set('email')} className={rrpInput} placeholder="In case we want to follow up" />
          </div>
        </div>

        <p className="text-xs text-gray-400">Responses may be quoted in River Region Parents (first name + neighborhood only). No last names ever published.</p>

        <button type="submit" disabled={submitting || !form.answer || !form.firstName}
          className="w-full py-3 text-sm font-bold text-white bg-blue-600 rounded-xl hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2">
          {submitting && <RefreshCw size={14} className="animate-spin" />}
          Submit My Answer →
        </button>
      </form>
    </RRPFormShell>
  )
}
