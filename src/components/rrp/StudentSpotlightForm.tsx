'use client'

import { useState } from 'react'
import { RefreshCw, CheckCircle2 } from 'lucide-react'
import { RRPFormShell, rrpInput, rrpLabel, rrpTa } from './RRPFormShell'

export function StudentSpotlightForm() {
  const [form, setForm] = useState({
    studentName: '', gradeAge: '', school: '', neighborhood: '',
    whatMakesRemarkable: '', nominatorName: '', nominatorRelationship: '', email: '',
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
          formType: 'student-spotlight',
          name:  form.nominatorName,
          email: form.email,
          formData: {
            student_name:           form.studentName,
            grade_age:              form.gradeAge,
            school:                 form.school,
            neighborhood:           form.neighborhood,
            what_makes_remarkable:  form.whatMakesRemarkable,
            nominator_name:         form.nominatorName,
            nominator_relationship: form.nominatorRelationship,
          },
        }),
      })
      setDone(true)
    } finally { setSubmitting(false) }
  }

  if (done) return (
    <RRPFormShell title="Student Spotlight" subtitle="" department="Student Spotlight">
      <div className="text-center py-6">
        <CheckCircle2 size={40} className="mx-auto text-green-500 mb-3" />
        <h2 className="text-lg font-bold text-gray-900 mb-2">Nomination received!</h2>
        <p className="text-sm text-gray-600">We'll review {form.studentName}'s nomination for an upcoming issue. Thanks for sharing their story!</p>
      </div>
    </RRPFormShell>
  )

  return (
    <RRPFormShell
      title="Student Spotlight"
      subtitle="Know a student doing something exceptional — in school, in the community, or in life? Nominate them for a River Region Parents Student Spotlight."
      department="Student Spotlight"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div><label className={rrpLabel}>Student Name *</label><input required value={form.studentName} onChange={set('studentName')} className={rrpInput} placeholder="Full name" /></div>
          <div><label className={rrpLabel}>Grade / Age</label><input value={form.gradeAge} onChange={set('gradeAge')} className={rrpInput} placeholder="e.g. 8th grade, 14" /></div>
          <div><label className={rrpLabel}>School *</label><input required value={form.school} onChange={set('school')} className={rrpInput} placeholder="School name" /></div>
          <div><label className={rrpLabel}>Neighborhood</label><input value={form.neighborhood} onChange={set('neighborhood')} className={rrpInput} placeholder="e.g. Prattville, Eastchase" /></div>
        </div>

        <div>
          <label className={rrpLabel}>What makes this student remarkable? * <span className="font-normal text-gray-400">({200 - form.whatMakesRemarkable.length} chars left)</span></label>
          <textarea required rows={4} maxLength={200} value={form.whatMakesRemarkable} onChange={set('whatMakesRemarkable')} className={rrpTa} placeholder="Tell us what they've done, accomplished, or overcome. Be specific!" />
        </div>

        <div className="border-t border-gray-100 pt-4 grid grid-cols-2 gap-3">
          <div><label className={rrpLabel}>Your Name (Nominator) *</label><input required value={form.nominatorName} onChange={set('nominatorName')} className={rrpInput} placeholder="Your name" /></div>
          <div><label className={rrpLabel}>Your Relationship to Student</label><input value={form.nominatorRelationship} onChange={set('nominatorRelationship')} className={rrpInput} placeholder="e.g. Parent, teacher, coach" /></div>
          <div className="col-span-2"><label className={rrpLabel}>Email *</label><input required type="email" value={form.email} onChange={set('email')} className={rrpInput} placeholder="For follow-up only" /></div>
        </div>

        <button type="submit" disabled={submitting || !form.studentName || !form.school || !form.whatMakesRemarkable || !form.nominatorName || !form.email}
          className="w-full py-3 text-sm font-bold text-white bg-blue-600 rounded-xl hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2">
          {submitting && <RefreshCw size={14} className="animate-spin" />}
          Submit Nomination →
        </button>
      </form>
    </RRPFormShell>
  )
}
