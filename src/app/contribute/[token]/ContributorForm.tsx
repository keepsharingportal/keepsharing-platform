'use client'

import { useState } from 'react'
import { Send } from 'lucide-react'

interface Question { key: string; label: string; placeholder?: string; required?: boolean }
interface Props { token: string; questions: Question[] }

export function ContributorForm({ token, questions }: Props) {
  const [responses, setResponses] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  function setVal(key: string, val: string) {
    setResponses(r => ({ ...r, [key]: val }))
  }

  async function submit() {
    setErr(null)
    for (const q of questions) {
      if (q.required && !(responses[q.key] ?? '').trim()) {
        setErr(`Please answer: ${q.label}`)
        return
      }
    }
    setSubmitting(true)
    try {
      const res = await fetch(`/api/contributors/submit`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ token, responses }),
      })
      const json = await res.json() as { ok: boolean; error?: string }
      if (!res.ok || !json.ok) {
        setErr(json.error ?? 'Submission failed. Please try again.')
        setSubmitting(false)
        return
      }
      setDone(true)
      // Reload so the page picks up the completed state.
      window.location.reload()
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Network error.')
      setSubmitting(false)
    }
  }

  if (done) {
    return (
      <div className="text-portal-text">
        <p className="text-base">Sending…</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {questions.map(q => (
        <div key={q.key}>
          <label className="block text-sm font-bold text-portal-text mb-1">
            {q.label}
            {q.required && <span className="text-red-600 ml-1">*</span>}
          </label>
          <textarea
            rows={4}
            value={responses[q.key] ?? ''}
            onChange={e => setVal(q.key, e.target.value)}
            placeholder={q.placeholder ?? ''}
            className="w-full text-sm px-3 py-2 border border-portal-border rounded-md bg-white text-portal-text focus:outline-none focus:border-portal-blue resize-y"
          />
        </div>
      ))}

      {err && (
        <div className="bg-red-50 border border-red-200 rounded-md px-3 py-2 text-sm text-red-700">{err}</div>
      )}

      <div>
        <button
          onClick={submit}
          disabled={submitting}
          className="text-sm font-bold text-white bg-portal-blue hover:bg-portal-blue-dk px-5 py-2.5 rounded-md disabled:opacity-50 inline-flex items-center gap-2"
        >
          <Send size={14} /> {submitting ? 'Sending…' : 'Send to the editor'}
        </button>
        <p className="text-[11px] text-portal-muted mt-2">
          Your responses go to the editorial team. You&apos;ll get a draft back to review before anything is published.
        </p>
      </div>
    </div>
  )
}
