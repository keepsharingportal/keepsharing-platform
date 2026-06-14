'use client'

import { useState } from 'react'
import { X, ArrowRight, Check, RefreshCw } from 'lucide-react'

export type TierInterest = 'tier-1-found' | 'tier-2-featured' | 'tier-3-chosen' | 'tier-4-won' | 'not-sure'

const TIER_LABELS: Record<TierInterest, string> = {
  'tier-1-found':    'Tier 1 — Featured Listing ($125/mo)',
  'tier-2-featured': 'Tier 2 — Featured ($400/mo)',
  'tier-3-chosen':   'Tier 3 — Chosen ($750/mo)',
  'tier-4-won':      'Tier 4 — Won ($1,500/mo)',
  'not-sure':        'Not sure yet — help me figure it out',
}

const BIZ_SIZES = ['Solo / just me', '2–10 employees', '11–50 employees', '51+ employees']
const SPEND_RANGES = ['$0 right now', 'Under $500/month', '$500–1,500/month', '$1,500–5,000/month', 'Over $5,000/month']

interface Props {
  isOpen: boolean
  onClose: () => void
  initialTier?: TierInterest
  sourcePage?: string
}

export function LeadCaptureModal({ isOpen, onClose, initialTier, sourcePage }: Props) {
  const [step, setStep]           = useState<1 | 2 | 'done'>(1)
  const [leadId, setLeadId]       = useState<string | null>(null)
  const [saving, setSaving]       = useState(false)

  // Step 1 fields
  const [name, setName]             = useState('')
  const [email, setEmail]           = useState('')
  const [phone, setPhone]           = useState('')
  const [tier, setTier]             = useState<TierInterest>(initialTier ?? 'not-sure')

  // Step 2 fields
  const [bizName, setBizName]       = useState('')
  const [bizSize, setBizSize]       = useState('')
  const [spend, setSpend]           = useState('')
  const [challenge, setChallenge]   = useState('')

  if (!isOpen) return null

  const inp = (extra?: string) =>
    `w-full px-3.5 py-2.5 text-sm rounded-lg border border-gray-200 outline-none focus:border-[#ef6442] transition-all bg-white ${extra ?? ''}`

  async function submitStep1() {
    if (!email) return
    setSaving(true)
    try {
      const res = await fetch('/api/leads/capture', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'step1', name, email, phone: phone || undefined, tierInterest: tier, sourcePage }),
      })
      const data = await res.json()
      setLeadId(data.leadId ?? null)
      setStep(2)
    } catch {
      setStep(2) // proceed even on error
    } finally {
      setSaving(false)
    }
  }

  async function submitStep2(skip = false) {
    setSaving(true)
    try {
      await fetch('/api/leads/capture', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'step2', leadId, skip,
          businessName: bizName || undefined,
          businessSize: bizSize || undefined,
          currentMarketingSpend: spend || undefined,
          biggestChallenge: challenge || undefined,
        }),
      })
    } catch { /* non-blocking */ }
    setStep('done')
    setSaving(false)
  }

  const overlayStyle: React.CSSProperties = {
    position: 'fixed', inset: 0, zIndex: 500,
    backgroundColor: 'rgba(26,39,68,0.72)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: 20,
  }

  const boxStyle: React.CSSProperties = {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: '36px 32px',
    maxWidth: 480, width: '100%',
    maxHeight: '90vh',
    overflowY: 'auto',
    position: 'relative',
    boxShadow: '0 24px 64px rgba(0,0,0,0.22)',
  }

  return (
    <div style={overlayStyle} onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div style={boxStyle}>
        <button onClick={onClose} style={{ position: 'absolute', top: 16, right: 16, background: 'none', border: 'none', cursor: 'pointer', color: '#aaa', padding: 4 }}>
          <X size={20} />
        </button>

        {/* ── Step 1 ─────────────────────────────────────────────────────── */}
        {step === 1 && (
          <div>
            <p style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--fg-terra, #ef6442)', marginBottom: 8 }}>
              Let&apos;s talk
            </p>
            <h2 style={{ fontFamily: 'var(--font-fraunces, serif)', fontSize: 26, fontWeight: 700, color: 'var(--fg-navy, #1a2744)', marginBottom: 8, lineHeight: 1.2 }}>
              Tell us a little about yourself
            </h2>
            <p style={{ fontSize: 14, color: 'var(--fg-mid, #666)', marginBottom: 28, lineHeight: 1.55 }}>
              Jason will be in touch within 24 hours to talk through what a partnership looks like for your business.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 5 }}>Your name <span style={{ color: 'var(--fg-terra)' }}>*</span></label>
                <input className={inp()} placeholder="First and last name" value={name} onChange={e => setName(e.target.value)} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 5 }}>Email <span style={{ color: 'var(--fg-terra)' }}>*</span></label>
                <input type="email" className={inp()} placeholder="you@yourbusiness.com" value={email} onChange={e => setEmail(e.target.value)} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 5 }}>Phone <span style={{ color: '#aaa', fontWeight: 400 }}>(optional)</span></label>
                <input type="tel" className={inp()} placeholder="(334) 555-0100" value={phone} onChange={e => setPhone(e.target.value)} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 5 }}>Which interests you?</label>
                <select className={inp('cursor-pointer')} value={tier} onChange={e => setTier(e.target.value as TierInterest)}>
                  {(Object.keys(TIER_LABELS) as TierInterest[]).map(t => (
                    <option key={t} value={t}>{TIER_LABELS[t]}</option>
                  ))}
                </select>
              </div>

              <button
                onClick={submitStep1}
                disabled={saving || !email}
                style={{
                  padding: '13px 20px', borderRadius: 10, fontSize: 14, fontWeight: 700,
                  backgroundColor: !email || saving ? '#ccc' : 'var(--fg-terra, #ef6442)',
                  color: 'white', border: 'none', cursor: email && !saving ? 'pointer' : 'not-allowed',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                }}>
                {saving ? <><RefreshCw size={14} className="animate-spin" /> Saving…</> : <>Continue <ArrowRight size={14} /></>}
              </button>
            </div>
          </div>
        )}

        {/* ── Step 2 ─────────────────────────────────────────────────────── */}
        {step === 2 && (
          <div>
            <p style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--fg-sage, #5a8a6a)', marginBottom: 8 }}>
              Almost there
            </p>
            <h2 style={{ fontFamily: 'var(--font-fraunces, serif)', fontSize: 22, fontWeight: 700, color: 'var(--fg-navy, #1a2744)', marginBottom: 8, lineHeight: 1.2 }}>
              Help us prepare for our conversation
            </h2>
            <p style={{ fontSize: 13, color: 'var(--fg-mid, #666)', marginBottom: 24, lineHeight: 1.55 }}>
              Takes 60 seconds. Helps Jason come to your conversation ready with real recommendations.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 5 }}>Business name <span style={{ color: 'var(--fg-terra)' }}>*</span></label>
                <input className={inp()} placeholder="Your business or organization" value={bizName} onChange={e => setBizName(e.target.value)} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 5 }}>Business size</label>
                <select className={inp('cursor-pointer')} value={bizSize} onChange={e => setBizSize(e.target.value)}>
                  <option value="">Select…</option>
                  {BIZ_SIZES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 5 }}>Current monthly marketing spend</label>
                <select className={inp('cursor-pointer')} value={spend} onChange={e => setSpend(e.target.value)}>
                  <option value="">Select…</option>
                  {SPEND_RANGES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 5 }}>Biggest marketing challenge <span style={{ color: '#aaa', fontWeight: 400 }}>(optional)</span></label>
                <textarea rows={3} className={inp('resize-none')} placeholder="What's not working with marketing right now?"
                  value={challenge} onChange={e => setChallenge(e.target.value)} />
              </div>

              <button
                onClick={() => submitStep2(false)}
                disabled={saving || !bizName}
                style={{
                  padding: '13px 20px', borderRadius: 10, fontSize: 14, fontWeight: 700,
                  backgroundColor: !bizName || saving ? '#ccc' : 'var(--fg-terra, #ef6442)',
                  color: 'white', border: 'none', cursor: bizName && !saving ? 'pointer' : 'not-allowed',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                }}>
                {saving ? <><RefreshCw size={14} className="animate-spin" /> Saving…</> : <>Submit <ArrowRight size={14} /></>}
              </button>

              <button onClick={() => submitStep2(true)} style={{ background: 'none', border: 'none', fontSize: 12, color: 'var(--fg-dim, #999)', cursor: 'pointer', textDecoration: 'underline', padding: '4px 0' }}>
                Skip for now
              </button>
            </div>
          </div>
        )}

        {/* ── Done ───────────────────────────────────────────────────────── */}
        {step === 'done' && (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--fg-sage-light, #edf5f0)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
              <Check size={26} color="var(--fg-sage, #5a8a6a)" strokeWidth={2.5} />
            </div>
            <h2 style={{ fontFamily: 'var(--font-fraunces, serif)', fontSize: 22, fontWeight: 700, color: 'var(--fg-navy, #1a2744)', marginBottom: 10 }}>
              Thanks! Jason will be in touch within 24 hours.
            </h2>
            <p style={{ fontSize: 14, color: 'var(--fg-mid, #666)', lineHeight: 1.6, marginBottom: 28 }}>
              We looked at your answers and we&apos;re already thinking about which partner tier fits your business best. Talk soon.
            </p>
            <button onClick={onClose} style={{ padding: '11px 24px', borderRadius: 10, fontSize: 14, fontWeight: 600, backgroundColor: 'var(--fg-navy, #1a2744)', color: 'white', border: 'none', cursor: 'pointer' }}>
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
