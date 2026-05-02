'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowRight, Check, RefreshCw } from 'lucide-react'

const QUESTIONS = [
  {
    id: 'restaurant',
    question: "What's the one River Region restaurant you bring out-of-town visitors to, and what's the dish you make them order?",
    placeholder: 'e.g. "We always take people to Acre — the smoked chicken is incredible and everyone leaves obsessed."',
  },
  {
    id: 'saturday_morning',
    question: "Where do you take your kids on a Saturday morning, and what makes that spot special?",
    placeholder: 'e.g. "The farmers market on Dexter — my kids love picking out breakfast and the atmosphere is just really warm."',
  },
  {
    id: 'newcomer_must',
    question: "If a new family moved to the River Region tomorrow, what's the one place you'd tell them they HAVE to know about?",
    placeholder: 'e.g. "Blount Cultural Park. It\'s free, beautiful, and the kids can run for hours."',
  },
  {
    id: 'hidden_gem',
    question: "What's a hidden gem in the River Region — somewhere most people don't know about — that your family loves?",
    placeholder: 'e.g. "There\'s a little trail behind Oak Park that\'s basically unknown but we go there every fall."',
  },
]

const PERMISSION_OPTIONS = [
  { value: 'yes',           label: 'Yes — publish my name and answer' },
  { value: 'yes-no-name',   label: 'Yes — but use just my first name and neighborhood' },
  { value: 'team-only',     label: 'No — keep this for your team only' },
]

export default function ShareYourPickPage() {
  const [responses, setResponses] = useState<Record<string, string>>({})
  const [meta, setMeta] = useState({ first_name: '', neighborhood: '', email: '', phone: '' })
  const [permission, setPermission] = useState('yes')
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const inp = 'w-full px-4 py-3 text-sm rounded-xl border border-black/10 outline-none focus:border-[#c4622d] bg-white font-sans transition-all resize-none'
  const lbl = 'block text-xs font-semibold text-gray-500 mb-1.5 tracking-wide'

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const answeredResponses = QUESTIONS
      .filter(q => responses[q.id]?.trim())
      .map(q => ({ question_id: q.id, question: q.question, answer: responses[q.id] }))

    if (answeredResponses.length === 0) {
      setError('Please answer at least one question.')
      return
    }

    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch('/api/submissions/capture', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          first_name:         meta.first_name,
          neighborhood:       meta.neighborhood,
          email:              meta.email,
          phone:              meta.phone || undefined,
          publish_permission: permission,
          source:             'full-survey',
          responses:          answeredResponses,
        }),
      })
      if (!res.ok) throw new Error('Server error')
      setDone(true)
    } catch {
      setError('Something went wrong — please try again.')
    }
    setSubmitting(false)
  }

  if (done) return (
    <div style={{ minHeight: '100vh', backgroundColor: '#faf8f5', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', fontFamily: 'var(--font-dm-sans, sans-serif)' }}>
      <div style={{ maxWidth: 480, textAlign: 'center' }}>
        <div style={{ width: 64, height: 64, borderRadius: '50%', backgroundColor: '#edf5f0', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
          <Check size={30} color="#5a8a6a" strokeWidth={2.5} />
        </div>
        <h1 style={{ fontFamily: 'var(--font-fraunces, serif)', fontSize: 28, fontWeight: 700, color: '#1a2744', marginBottom: 12 }}>
          Thank you, {meta.first_name}!
        </h1>
        <p style={{ fontSize: 15, color: '#666', lineHeight: 1.7, marginBottom: 28 }}>
          Your picks are in. When we use your answer in the magazine or on our website, you&apos;ll be the first to know. New families in the River Region will find their footing partly because of what you just shared.
        </p>
        <Link href="/newcomer-guide" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '12px 24px', borderRadius: 10, fontSize: 14, fontWeight: 700, backgroundColor: '#1a2744', color: 'white', textDecoration: 'none' }}>
          Browse the Family Guide <ArrowRight size={13} />
        </Link>
      </div>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#faf8f5', fontFamily: 'var(--font-dm-sans, sans-serif)' }}>

      {/* Header */}
      <div style={{ backgroundColor: '#1a2744', padding: '20px 24px' }}>
        <div style={{ maxWidth: 680, margin: '0 auto' }}>
          <Link href="/newcomer-guide" style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)', textDecoration: 'none' }}>
            ← River Region Parents
          </Link>
        </div>
      </div>

      {/* Hero */}
      <div style={{ backgroundColor: '#1a2744', padding: '48px 24px 56px', textAlign: 'center' }}>
        <div style={{ maxWidth: 580, margin: '0 auto' }}>
          <p style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#f0a070', marginBottom: 14 }}>
            Mom Insiders · Share Your Knowledge
          </p>
          <h1 style={{ fontFamily: 'var(--font-fraunces, serif)', fontSize: 'clamp(30px, 5vw, 46px)', fontWeight: 900, color: 'white', lineHeight: 1.1, letterSpacing: '-0.02em', marginBottom: 16 }}>
            Your voice.{' '}
            <span style={{ color: '#f0a070', fontStyle: 'italic' }}>Other moms&apos; lifeline.</span>
          </h1>
          <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.75)', lineHeight: 1.7 }}>
            Tell us about your favorite places in the River Region. Real moms read these. Real new families find their footing because of what you share.
          </p>
        </div>
      </div>

      {/* Form */}
      <div style={{ maxWidth: 680, margin: '0 auto', padding: '48px 24px 80px' }}>
        <form onSubmit={handleSubmit}>

          {/* 4 questions */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 28, marginBottom: 40 }}>
            {QUESTIONS.map((q, i) => (
              <div key={q.id} style={{ backgroundColor: 'white', borderRadius: 16, padding: '24px 22px', border: '1px solid rgba(0,0,0,0.07)', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                <p style={{ fontSize: 12, fontWeight: 800, color: '#c4622d', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 10 }}>
                  Question {i + 1} <span style={{ color: '#ccc', fontWeight: 400 }}>· Optional</span>
                </p>
                <p style={{ fontSize: 15, fontWeight: 600, color: '#1a2744', lineHeight: 1.55, marginBottom: 14 }}>{q.question}</p>
                <textarea
                  className={inp}
                  rows={4}
                  placeholder={q.placeholder}
                  maxLength={280}
                  value={responses[q.id] ?? ''}
                  onChange={e => setResponses(r => ({...r, [q.id]: e.target.value}))}
                />
                <p style={{ fontSize: 11, color: '#bbb', textAlign: 'right', marginTop: 4 }}>
                  {(responses[q.id] ?? '').length}/280
                </p>
              </div>
            ))}
          </div>

          {/* Publication permission */}
          <div style={{ backgroundColor: 'white', borderRadius: 16, padding: '24px 22px', border: '1px solid rgba(0,0,0,0.07)', marginBottom: 28 }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: '#1a2744', marginBottom: 14 }}>May we publish your answer in the magazine and on our website?</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {PERMISSION_OPTIONS.map(opt => (
                <label key={opt.value} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: 14, color: '#333' }}>
                  <input type="radio" name="permission" value={opt.value} checked={permission === opt.value} onChange={() => setPermission(opt.value)} />
                  {opt.label}
                </label>
              ))}
            </div>
          </div>

          {/* Contact info */}
          <div style={{ backgroundColor: 'white', borderRadius: 16, padding: '24px 22px', border: '1px solid rgba(0,0,0,0.07)', marginBottom: 28 }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: '#1a2744', marginBottom: 16 }}>One last thing — tell us who you are:</p>
            <div className="grid grid-cols-2 gap-3" style={{ marginBottom: 12 }}>
              <div>
                <label className={lbl}>First name *</label>
                <input className={`${inp} h-11`} required placeholder="First name" value={meta.first_name} onChange={e => setMeta(m => ({...m, first_name: e.target.value}))} />
              </div>
              <div>
                <label className={lbl}>Neighborhood *</label>
                <input className={`${inp} h-11`} required placeholder="e.g. Pike Road, EastChase" value={meta.neighborhood} onChange={e => setMeta(m => ({...m, neighborhood: e.target.value}))} />
              </div>
            </div>
            <div>
              <label className={lbl}>Email *</label>
              <input type="email" className={`${inp} h-11 mb-3`} required placeholder="you@example.com" value={meta.email} onChange={e => setMeta(m => ({...m, email: e.target.value}))} />
            </div>
            <div>
              <label className={lbl}>Phone <span style={{ fontWeight: 400 }}>(optional — for follow-ups only)</span></label>
              <input type="tel" className={`${inp} h-11`} placeholder="(334) 555-0100" value={meta.phone} onChange={e => setMeta(m => ({...m, phone: e.target.value}))} />
            </div>
          </div>

          {error && <p style={{ fontSize: 13, color: '#c4622d', fontWeight: 600, marginBottom: 12 }}>{error}</p>}

          <button type="submit" disabled={submitting} style={{ width: '100%', padding: '15px 24px', borderRadius: 12, fontSize: 15, fontWeight: 800, backgroundColor: submitting ? '#ddd' : '#c4622d', color: submitting ? '#888' : 'white', border: 'none', cursor: submitting ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontFamily: 'inherit' }}>
            {submitting ? <><RefreshCw size={15} style={{ animation: 'spin 1s linear infinite' }} /> Submitting…</> : <>Share my picks <ArrowRight size={15} /></>}
          </button>

          <p style={{ fontSize: 11, color: '#999', textAlign: 'center', marginTop: 12, lineHeight: 1.5 }}>
            No spam. Your email is used only to notify you when your picks are featured.
          </p>
        </form>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
