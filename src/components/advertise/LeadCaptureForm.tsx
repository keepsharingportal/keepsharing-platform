'use client'

import { useState } from 'react'
import { ArrowRight, RefreshCw, Check } from 'lucide-react'

const BUSINESS_TYPES = [
  'Healthcare / Medical Practice',
  'Pediatric / Children\'s Services',
  'Education / Private School',
  'Childcare / Preschool / Daycare',
  'Family Service / Counseling',
  'Restaurant / Food & Beverage',
  'Boutique / Retail',
  'Sports / Activities / Fitness',
  'Faith Community / Church',
  'Event Venue / Entertainment',
  'Professional Services',
  'Other',
]

const INTEREST_OPTIONS = [
  { id: 'print',    label: 'Print Advertising' },
  { id: 'social',   label: 'Social Media Promotion' },
  { id: 'digital',  label: 'Digital & Email Exposure' },
  { id: 'system',   label: 'Full Customer Acquisition System' },
  { id: 'unsure',   label: 'Not Sure Yet — Help Me Decide' },
]

const inp = {
  width: '100%',
  padding: '12px 16px',
  fontSize: 14,
  borderRadius: 10,
  border: '1.5px solid rgba(0,0,0,0.12)',
  outline: 'none',
  backgroundColor: 'white',
  fontFamily: 'var(--font-dm-sans, sans-serif)',
  boxSizing: 'border-box' as const,
  color: '#1a1a1a',
}

const lbl = {
  display: 'block',
  fontSize: 12,
  fontWeight: 600,
  color: '#555',
  marginBottom: 6,
  letterSpacing: '0.01em',
} as const

export function LeadCaptureForm({ sourcePage = '/advertise' }: { sourcePage?: string } = {}) {
  const [form, setForm] = useState({
    first_name: '', last_name: '', business_name: '',
    email: '', phone: '', business_type: '',
    interests: [] as string[], notes: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  function toggleInterest(id: string) {
    setForm(f => ({
      ...f,
      interests: f.interests.includes(id)
        ? f.interests.filter(i => i !== id)
        : [...f.interests, id],
    }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.first_name || !form.email) return
    setSubmitting(true)
    setErr(null)
    try {
      const res = await fetch('/api/leads/capture', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'full-form',
          name: `${form.first_name} ${form.last_name}`.trim(),
          email: form.email,
          phone: form.phone,
          businessName: form.business_name,
          businessType: form.business_type,
          interests: form.interests,
          notes: form.notes,
          sourcePage,
        }),
      })
      if (!res.ok) throw new Error('Server error')
      setDone(true)
    } catch {
      setErr('Something went wrong — please try again or call us directly.')
    }
    setSubmitting(false)
  }

  if (done) return (
    <div style={{ textAlign: 'center', padding: '48px 24px', backgroundColor: 'white', borderRadius: 20 }}>
      <div style={{ width: 60, height: 60, borderRadius: '50%', backgroundColor: '#edf5f0', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
        <Check size={28} color="#5a8a6a" strokeWidth={2.5} />
      </div>
      <h3 style={{ fontFamily: 'var(--font-fraunces, serif)', fontSize: 24, fontWeight: 700, color: '#1a2744', marginBottom: 10 }}>
        We&apos;ve got your info!
      </h3>
      <p style={{ fontSize: 15, color: '#666', lineHeight: 1.65, maxWidth: 360, margin: '0 auto' }}>
        Jason will be in touch within 24 hours. In the meantime, browse our current partners to see the system in action.
      </p>
    </div>
  )

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label style={lbl}>First name *</label>
          <input style={inp} required placeholder="First" value={form.first_name} onChange={e => setForm(f => ({...f, first_name: e.target.value}))} />
        </div>
        <div>
          <label style={lbl}>Last name *</label>
          <input style={inp} required placeholder="Last" value={form.last_name} onChange={e => setForm(f => ({...f, last_name: e.target.value}))} />
        </div>
      </div>

      <div>
        <label style={lbl}>Business / Organization name *</label>
        <input style={inp} required placeholder="Your business name" value={form.business_name} onChange={e => setForm(f => ({...f, business_name: e.target.value}))} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label style={lbl}>Email *</label>
          <input style={inp} type="email" required placeholder="you@business.com" value={form.email} onChange={e => setForm(f => ({...f, email: e.target.value}))} />
        </div>
        <div>
          <label style={lbl}>Phone *</label>
          <input style={inp} type="tel" required placeholder="(334) 555-0100" value={form.phone} onChange={e => setForm(f => ({...f, phone: e.target.value}))} />
        </div>
      </div>

      <div>
        <label style={lbl}>Business type</label>
        <select style={{...inp, cursor: 'pointer', color: form.business_type ? '#1a1a1a' : '#999'}} value={form.business_type} onChange={e => setForm(f => ({...f, business_type: e.target.value}))}>
          <option value="">Select your business type…</option>
          {BUSINESS_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>

      <div>
        <label style={lbl}>What kind of advertising are you most interested in?</label>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4 }}>
          {INTEREST_OPTIONS.map(opt => (
            <label key={opt.id} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: 14, color: '#333' }}>
              <div style={{
                width: 20, height: 20, borderRadius: 5, border: `2px solid ${form.interests.includes(opt.id) ? '#ef6442' : 'rgba(0,0,0,0.2)'}`,
                backgroundColor: form.interests.includes(opt.id) ? '#ef6442' : 'white',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }} onClick={() => toggleInterest(opt.id)}>
                {form.interests.includes(opt.id) && <Check size={12} color="white" strokeWidth={3} />}
              </div>
              <span onClick={() => toggleInterest(opt.id)}>{opt.label}</span>
            </label>
          ))}
        </div>
      </div>

      <div>
        <label style={lbl}>Anything you&apos;d like us to know? <span style={{ fontWeight: 400 }}>(optional)</span></label>
        <textarea
          style={{...inp, resize: 'none', height: 88} as React.CSSProperties}
          placeholder="What's your biggest marketing challenge right now? What have you tried before?"
          value={form.notes}
          onChange={e => setForm(f => ({...f, notes: e.target.value}))}
        />
      </div>

      {err && <p style={{ fontSize: 13, color: '#ef6442', fontWeight: 600 }}>{err}</p>}

      <button type="submit" disabled={submitting} style={{
        padding: '15px 24px', borderRadius: 12, fontSize: 15, fontWeight: 800,
        backgroundColor: submitting ? '#ddd' : '#ef6442',
        color: submitting ? '#888' : 'white',
        border: 'none', cursor: submitting ? 'not-allowed' : 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        fontFamily: 'var(--font-dm-sans, sans-serif)',
      }}>
        {submitting
          ? <><RefreshCw size={15} style={{ animation: 'spin 1s linear infinite' }} /> Sending…</>
          : <>See Advertising Options <ArrowRight size={15} /></>
        }
      </button>

      <p style={{ fontSize: 11, color: '#999', textAlign: 'center', lineHeight: 1.5 }}>
        No obligation. No automated spam. Jason reads every submission personally.
      </p>
    </form>
  )
}
