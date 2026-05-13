'use client'

import { useState } from 'react'
import { ArrowRight, Check, RefreshCw } from 'lucide-react'
import type { PartnerPageData } from './types'
import { hexWithOpacity } from '@/lib/brand-colors'

interface FormData {
  firstName: string; lastName: string; phone: string; email: string
  childName: string; childAge: string; preferredDays: string[]; preferredTimes: string
  insuranceCarrier: string; notes: string
  discountEmail: string; discountPhone: string
  infoName: string; infoEmail: string; infoPhone: string; infoMessage: string
}

const EMPTY: FormData = {
  firstName: '', lastName: '', phone: '', email: '',
  childName: '', childAge: '', preferredDays: [], preferredTimes: '',
  insuranceCarrier: '', notes: '',
  discountEmail: '', discountPhone: '',
  infoName: '', infoEmail: '', infoPhone: '', infoMessage: '',
}

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

const CONFIRM_MESSAGES: Record<string, (phone: string) => string> = {
  schedule_consult: (p) => `We've sent you a text with the office's direct line. They'll reach out within 24 hours. Can't wait? Call ${p} now.`,
  discount_code: () => 'Your discount code has been texted to your phone. Show it at the front desk or use it online.',
  booking_link: () => 'Redirecting you to book your appointment...',
  info_request: (p) => `They'll reach out within 24 hours. We've also sent you their direct line at ${p}.`,
  limited_promo: () => 'You\'re confirmed! Check your phone for next steps.',
}

export function OfferConversionForm({ data }: { data: PartnerPageData }) {
  const { offer, account, brand } = data
  const [form, setForm] = useState<FormData>(EMPTY)
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!offer) return null

  const upd = (k: keyof FormData) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  const toggleDay = (day: string) =>
    setForm(f => ({ ...f, preferredDays: f.preferredDays.includes(day) ? f.preferredDays.filter(d => d !== day) : [...f.preferredDays, day] }))

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)

    try {
      const safeOffer = offer!
      const payload = {
        offerId: safeOffer.id,
        advertiserId: account.id,
        advertiserSlug: account.slug,
        offerType: safeOffer.offer_type,
        leadFirstName: form.firstName || form.infoName.split(' ')[0],
        leadLastName: form.lastName || form.infoName.split(' ').slice(1).join(' '),
        leadEmail: form.email || form.discountEmail || form.infoEmail,
        leadPhone: form.phone || form.discountPhone || form.infoPhone,
        leadMetadata: {
          childName: form.childName || undefined,
          childAge: form.childAge || undefined,
          preferredDays: form.preferredDays.length ? form.preferredDays : undefined,
          preferredTimes: form.preferredTimes || undefined,
          insuranceCarrier: form.insuranceCarrier || undefined,
          notes: form.notes || form.infoMessage || undefined,
        },
        sourcePage: typeof window !== 'undefined' ? window.location.pathname : `/partners/${account.slug}`,
        referrerUrl: typeof window !== 'undefined' ? document.referrer : undefined,
      }

      const res = await fetch('/api/partner-leads/capture', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!res.ok) throw new Error('Server error')
      const data = await res.json()

      if (safeOffer.offer_type === 'booking_link' && safeOffer.booking_url) {
        setTimeout(() => { window.location.href = safeOffer.booking_url! }, 2000)
      }

      setDone(true)
    } catch {
      setError('Something went wrong — please try calling us directly.')
    }
    setSaving(false)
  }

  const inp = 'w-full px-3.5 py-3 text-sm rounded-lg border border-gray-200 outline-none transition-all bg-white placeholder:text-gray-400'

  if (done) {
    const confirmMsg = CONFIRM_MESSAGES[offer.offer_type]?.(account.contact_phone ?? '') ?? 'You\'re all set!'
    return (
      <section id="offer-form" style={{ backgroundColor: 'white', padding: '72px 20px' }}>
        <div style={{ maxWidth: 520, margin: '0 auto', textAlign: 'center' }}>
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: hexWithOpacity(brand.accent, 0.15), display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
            <Check size={28} color={brand.accent} strokeWidth={2.5} />
          </div>
          <h2 style={{ fontFamily: 'var(--font-fraunces, serif)', fontSize: 26, fontWeight: 700, color: brand.primary, marginBottom: 12 }}>
            You&apos;re confirmed!
          </h2>
          <p style={{ fontSize: 15, color: '#555', lineHeight: 1.65, marginBottom: 28 }}>{confirmMsg}</p>
          {account.contact_phone && (
            <a href={`tel:${account.contact_phone}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '12px 24px', borderRadius: 10, fontSize: 14, fontWeight: 700, backgroundColor: brand.accent, color: 'white', textDecoration: 'none' }}>
              📞 Call {account.contact_phone}
            </a>
          )}
        </div>
      </section>
    )
  }

  return (
    <section id="offer-form" style={{ backgroundColor: 'white', padding: '72px 20px' }}>
      <div style={{ maxWidth: 580, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <p style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: brand.accent, marginBottom: 10 }}>
            Ready to claim this offer?
          </p>
          <h2 style={{ fontFamily: 'var(--font-fraunces, serif)', fontSize: 'clamp(22px, 4vw, 32px)', fontWeight: 700, color: brand.primary, marginBottom: 8, lineHeight: 1.2 }}>
            {offer.offer_headline}
          </h2>
          {offer.urgency_text && (
            <div style={{ display: 'inline-block', padding: '5px 14px', borderRadius: 20, backgroundColor: hexWithOpacity(brand.accent, 0.1), border: `1px solid ${hexWithOpacity(brand.accent, 0.3)}`, fontSize: 12, fontWeight: 700, color: brand.accent, marginTop: 8 }}>
              ⏰ {offer.urgency_text}
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} style={{ backgroundColor: 'var(--fg-cream, #faf8f5)', borderRadius: 20, padding: '32px 28px', border: '1px solid rgba(0,0,0,0.07)', display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* schedule_consult fields */}
          {offer.offer_type === 'schedule_consult' && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 5 }}>First name <span style={{ color: brand.accent }}>*</span></label>
                  <input required className={inp} placeholder="First" value={form.firstName} onChange={upd('firstName')} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 5 }}>Last name <span style={{ color: brand.accent }}>*</span></label>
                  <input required className={inp} placeholder="Last" value={form.lastName} onChange={upd('lastName')} />
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 5 }}>Phone <span style={{ color: brand.accent }}>*</span> <span style={{ color: '#aaa', fontWeight: 400 }}>(we'll text you confirmation)</span></label>
                <input required type="tel" className={inp} placeholder="(334) 555-0100" value={form.phone} onChange={upd('phone')} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 5 }}>Email <span style={{ color: brand.accent }}>*</span></label>
                <input required type="email" className={inp} placeholder="you@example.com" value={form.email} onChange={upd('email')} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 5 }}>Child&apos;s first name</label>
                  <input className={inp} placeholder="Child's name" value={form.childName} onChange={upd('childName')} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 5 }}>Child&apos;s age <span style={{ color: brand.accent }}>*</span></label>
                  <input required className={inp} placeholder="e.g. 3 years" value={form.childAge} onChange={upd('childAge')} />
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 8 }}>Best days <span style={{ color: '#aaa', fontWeight: 400 }}>(optional)</span></label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {DAYS.map(day => {
                    const on = form.preferredDays.includes(day)
                    return (
                      <button key={day} type="button" onClick={() => toggleDay(day)} style={{ padding: '5px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600, border: `1.5px solid ${on ? brand.accent : 'rgba(0,0,0,0.1)'}`, backgroundColor: on ? hexWithOpacity(brand.accent, 0.1) : 'white', color: on ? brand.accent : '#666', cursor: 'pointer' }}>
                        {day.slice(0, 3)}
                      </button>
                    )
                  })}
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 5 }}>Insurance carrier <span style={{ color: '#aaa', fontWeight: 400 }}>(optional — have your card handy, not required)</span></label>
                <input className={inp} placeholder="BCBS, Aetna, Delta Dental, etc." value={form.insuranceCarrier} onChange={upd('insuranceCarrier')} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 5 }}>Anything else we should know? <span style={{ color: '#aaa', fontWeight: 400 }}>(optional)</span></label>
                <textarea rows={3} className={`${inp} resize-none`} placeholder="Questions, special needs, concerns, etc." value={form.notes} onChange={upd('notes')} />
              </div>
            </>
          )}

          {/* info_request / limited_promo fields */}
          {(offer.offer_type === 'info_request' || offer.offer_type === 'limited_promo') && (
            <>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 5 }}>Your name <span style={{ color: brand.accent }}>*</span></label>
                <input required className={inp} value={form.infoName} onChange={upd('infoName')} placeholder="First and last" />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 5 }}>Phone <span style={{ color: brand.accent }}>*</span></label>
                <input required type="tel" className={inp} value={form.infoPhone} onChange={upd('infoPhone')} placeholder="(334) 555-0100" />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 5 }}>Email</label>
                <input type="email" className={inp} value={form.infoEmail} onChange={upd('infoEmail')} placeholder="you@example.com" />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 5 }}>Message <span style={{ color: '#aaa', fontWeight: 400 }}>(optional)</span></label>
                <textarea rows={3} className={`${inp} resize-none`} value={form.infoMessage} onChange={upd('infoMessage')} placeholder="What would you like to know?" />
              </div>
            </>
          )}

          {/* discount_code / booking_link fields */}
          {(offer.offer_type === 'discount_code' || offer.offer_type === 'booking_link') && (
            <>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 5 }}>Email <span style={{ color: brand.accent }}>*</span></label>
                <input required type="email" className={inp} value={form.discountEmail} onChange={upd('discountEmail')} placeholder="you@example.com" />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 5 }}>Phone <span style={{ color: '#aaa', fontWeight: 400 }}>(code texted here)</span></label>
                <input type="tel" className={inp} value={form.discountPhone} onChange={upd('discountPhone')} placeholder="(334) 555-0100" />
              </div>
            </>
          )}

          {error && <p style={{ fontSize: 13, color: '#c4622d', fontWeight: 600 }}>{error}</p>}

          <button type="submit" disabled={saving} style={{
            padding: '15px 24px', borderRadius: 12, fontSize: 15, fontWeight: 800,
            backgroundColor: saving ? '#ccc' : brand.accent,
            color: brand.accentText === 'white' ? 'white' : '#111',
            border: 'none', cursor: saving ? 'not-allowed' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}>
            {saving ? <><RefreshCw size={15} className="animate-spin" /> Sending…</> : <>{offer.cta_button_text ?? 'Submit'}</>}
          </button>

          <p style={{ fontSize: 11, color: '#aaa', textAlign: 'center', lineHeight: 1.5 }}>
            By submitting, you agree to be contacted about this offer. No spam. Unsubscribe any time.
          </p>
        </form>
      </div>
    </section>
  )
}
