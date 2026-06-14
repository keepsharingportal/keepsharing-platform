'use client'

import { useState } from 'react'
import { ArrowRight, RefreshCw, Check, Download } from 'lucide-react'

export interface LeadMagnetProps {
  id: 'newcomer-guide' | 'saturday-checklist' | 'school-workbook'
  headline: string
  subheadline: string
  benefits: string[]
  cta_label: string
  image_emoji?: string
  ghl_tag: string
  redirect_after_submit?: string
}

const LEAD_MAGNETS: Record<string, LeadMagnetProps> = {
  'newcomer-guide': {
    id: 'newcomer-guide',
    headline: 'New to the River Region?',
    subheadline: 'Get our 12-Page Family Welcome Guide — free. Everything you need to know to get settled fast.',
    benefits: [
      'The schools local families actually recommend',
      'The pediatricians with the shortest wait times',
      'The Saturday morning spots that become traditions',
    ],
    cta_label: 'Send Me the Welcome Guide',
    image_emoji: '📋',
    ghl_tag: 'lead-magnet-newcomer-guide',
    redirect_after_submit: '/newcomer-guide',
  },
  'saturday-checklist': {
    id: 'saturday-checklist',
    headline: 'The Family Saturday Mornings Checklist',
    subheadline: 'Free one-page guide to the best family-friendly Saturday spots in the River Region.',
    benefits: [
      'Parks, trails, and playgrounds families love',
      'Breakfast spots kids and parents both enjoy',
      'Activities organized by age group',
    ],
    cta_label: 'Get the Free Checklist',
    image_emoji: '☀️',
    ghl_tag: 'lead-magnet-saturday-checklist',
  },
  'school-workbook': {
    id: 'school-workbook',
    headline: 'The River Region School Comparison Workbook',
    subheadline: 'Free workbook to help you choose the right school for your family. Real criteria, honest comparisons.',
    benefits: [
      'Comparison matrix for public and private options',
      'Questions to ask on every campus tour',
      'What local families wish they\'d known earlier',
    ],
    cta_label: 'Get the Free Workbook',
    image_emoji: '🏫',
    ghl_tag: 'lead-magnet-school-workbook',
  },
}

interface Props {
  magnet_id: 'newcomer-guide' | 'saturday-checklist' | 'school-workbook'
}

export function LeadMagnetSignup({ magnet_id }: Props) {
  const magnet = LEAD_MAGNETS[magnet_id]
  const [email, setEmail] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setErr(null)
    try {
      const res = await fetch('/api/newsletter/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          source: `lead-magnet-${magnet_id}`,
          ghl_tags: ['rrp-main-email', magnet.ghl_tag],
        }),
      })
      if (!res.ok) throw new Error('Server error')
      setDone(true)
      if (magnet.redirect_after_submit) {
        setTimeout(() => { window.location.href = magnet.redirect_after_submit! }, 1500)
      }
    } catch {
      setErr('Something went wrong — please try again.')
    }
    setSubmitting(false)
  }

  if (done) return (
    <div style={{ padding: '24px', borderRadius: 16, backgroundColor: '#edf5f0', border: '1px solid rgba(90,138,106,0.2)', textAlign: 'center' }}>
      <div style={{ fontSize: 28, marginBottom: 8 }}>✅</div>
      <p style={{ fontFamily: 'var(--font-fraunces, serif)', fontSize: 17, fontWeight: 700, color: '#1a2744', marginBottom: 6 }}>
        On its way!
      </p>
      <p style={{ fontSize: 13, color: '#666' }}>
        {magnet.redirect_after_submit ? 'Taking you there now…' : 'Check your inbox for the download link.'}
      </p>
    </div>
  )

  return (
    <div style={{ borderRadius: 20, padding: '28px 24px', backgroundColor: 'var(--fg-cream, #faf8f5)', border: '1px solid rgba(0,0,0,0.07)', boxShadow: '0 2px 16px rgba(0,0,0,0.06)' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 16 }}>
        <div style={{ width: 56, height: 56, borderRadius: 14, backgroundColor: 'var(--fg-sky-light, #e8f2fc)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, flexShrink: 0 }}>
          {magnet.image_emoji ?? '📄'}
        </div>
        <div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 10, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--fg-terra, #ef6442)', marginBottom: 5 }}>
            <Download size={11} /> Free Download
          </div>
          <h3 style={{ fontFamily: 'var(--font-fraunces, serif)', fontSize: 18, fontWeight: 700, color: 'var(--fg-navy, #1a2744)', lineHeight: 1.2, marginBottom: 4 }}>
            {magnet.headline}
          </h3>
          <p style={{ fontSize: 13, color: 'var(--fg-mid, #666)', lineHeight: 1.55 }}>{magnet.subheadline}</p>
        </div>
      </div>

      <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 18px', display: 'flex', flexDirection: 'column', gap: 6 }}>
        {magnet.benefits.map((b, i) => (
          <li key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', fontSize: 13, color: '#333' }}>
            <Check size={13} color="var(--fg-sage, #5a8a6a)" strokeWidth={2.5} style={{ flexShrink: 0, marginTop: 1 }} />
            {b}
          </li>
        ))}
      </ul>

      <form onSubmit={handleSubmit} style={{ display: 'flex', gap: 8 }}>
        <input
          type="email" required
          style={{ flex: 1, padding: '10px 14px', fontSize: 13, borderRadius: 8, border: '1px solid rgba(0,0,0,0.1)', outline: 'none', backgroundColor: 'white', minWidth: 0 }}
          placeholder="your@email.com"
          value={email} onChange={e => setEmail(e.target.value)}
        />
        <button type="submit" disabled={submitting} style={{ padding: '10px 18px', borderRadius: 8, fontSize: 13, fontWeight: 800, backgroundColor: submitting ? '#ddd' : 'var(--fg-terra, #ef6442)', color: submitting ? '#888' : 'white', border: 'none', cursor: submitting ? 'not-allowed' : 'pointer', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 5, fontFamily: 'inherit' }}>
          {submitting ? <RefreshCw size={12} style={{ animation: 'spin 1s linear infinite' }} /> : <><ArrowRight size={13} /> {magnet.cta_label}</>}
        </button>
      </form>
      {err && <p style={{ fontSize: 12, color: '#ef6442', marginTop: 6 }}>{err}</p>}
      <p style={{ fontSize: 10, color: '#bbb', marginTop: 8 }}>Free. Unsubscribe any time.</p>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
