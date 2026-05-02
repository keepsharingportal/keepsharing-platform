'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Trophy, Gift, Users, Star, Check, RefreshCw, ArrowRight, Calendar, Ticket, Heart } from 'lucide-react'
import { getColorScheme } from '@/lib/color-schemes'

export interface GiveawayFunnelProps {
  business_name: string
  header_badge_text?: string
  hero_badge: string
  prize_headline: string
  event_name: string
  description: string
  hero_image_url: string
  draw_date_label: string
  features: Array<{ icon: string; text: string }>
  form_headline: string
  form_subheadline: string
  form_button_label: string
  notification_method: 'email' | 'phone' | 'both'
  footer_disclaimer?: string
  partner_id: string
  offer_id: string
  color_scheme: string
  contact_phone?: string
}

const ICON_MAP: Record<string, React.ReactNode> = {
  Trophy:   <Trophy   size={22} />,
  Gift:     <Gift     size={22} />,
  Users:    <Users    size={22} />,
  Star:     <Star     size={22} />,
  Calendar: <Calendar size={22} />,
  Ticket:   <Ticket   size={22} />,
  Heart:    <Heart    size={22} />,
}

export function GiveawayFunnel(props: GiveawayFunnelProps) {
  const scheme = getColorScheme(props.color_scheme)
  const [form, setForm] = useState({ name: '', email: '', phone: '' })
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(false)
  const [entries, setEntries] = useState(0)

  const inp: React.CSSProperties = {
    width: '100%', padding: '12px 14px', fontSize: 14, borderRadius: 8,
    border: `1px solid ${scheme.border}`, outline: 'none', backgroundColor: 'white',
    fontFamily: 'var(--font-dm-sans, sans-serif)', boxSizing: 'border-box',
  }
  const label: React.CSSProperties = { display: 'block', fontSize: 12, fontWeight: 600, color: scheme.mutedForeground, marginBottom: 5 }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      await fetch('/api/partner-leads/capture', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          offerId: props.offer_id,
          advertiserId: props.partner_id,
          offerType: 'giveaway-entry',
          leadFirstName: form.name.split(' ')[0],
          leadLastName: form.name.split(' ').slice(1).join(' '),
          leadEmail: form.email,
          leadPhone: form.phone,
          leadMetadata: { drawDateLabel: props.draw_date_label },
          sourcePage: typeof window !== 'undefined' ? window.location.pathname : undefined,
        }),
      })
      setEntries(e => e + 1)
      setDone(true)
    } catch { setDone(true) }
    setSaving(false)
  }

  return (
    <div style={{ backgroundColor: scheme.background, color: scheme.foreground, fontFamily: 'var(--font-dm-sans, sans-serif)', minHeight: '100vh' }}>

      {/* Header band */}
      <div style={{ backgroundColor: scheme.primary, padding: '14px 24px', textAlign: 'center' }}>
        <p style={{ fontSize: 12, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: scheme.primaryForeground, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, margin: 0 }}>
          <Trophy size={14} color={scheme.secondary} />
          {props.header_badge_text ?? 'OFFICIAL GIVEAWAY'}
          <Trophy size={14} color={scheme.secondary} />
        </p>
      </div>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '52px 24px 72px' }}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-start">

          {/* Left: Giveaway info */}
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 14px', borderRadius: 20, backgroundColor: scheme.secondaryLight, border: `1px solid ${scheme.border}`, fontSize: 12, fontWeight: 700, color: scheme.secondary, marginBottom: 20 }}>
              <Gift size={13} /> {props.hero_badge}
            </div>
            <h1 style={{ fontFamily: 'var(--font-fraunces, serif)', fontSize: 'clamp(28px, 5vw, 46px)', fontWeight: 900, color: scheme.foreground, lineHeight: 1.1, letterSpacing: '-0.02em', marginBottom: 16 }}>
              {props.prize_headline}{' '}
              <span style={{ color: scheme.primary }}>{props.event_name}</span>!
            </h1>
            <p style={{ fontSize: 16, color: scheme.mutedForeground, lineHeight: 1.7, marginBottom: 24 }}>{props.description}</p>

            {/* Hero image */}
            <div style={{ borderRadius: 16, overflow: 'hidden', position: 'relative', aspectRatio: '16/9', marginBottom: 16, boxShadow: '0 4px 24px rgba(0,0,0,0.1)' }}>
              <Image src={props.hero_image_url} alt={props.event_name} fill style={{ objectFit: 'cover' }} sizes="560px" />
              <div style={{ position: 'absolute', bottom: 12, left: 12, backgroundColor: scheme.primary, color: scheme.primaryForeground, padding: '5px 14px', borderRadius: 8, fontSize: 12, fontWeight: 700 }}>
                {props.draw_date_label}
              </div>
            </div>

            {/* Feature cards */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {props.features.slice(0, 3).map((f, i) => (
                <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'center', padding: '12px 16px', borderRadius: 10, backgroundColor: 'white', border: `1px solid ${scheme.border}` }}>
                  <div style={{ color: scheme.primary, flexShrink: 0 }}>{ICON_MAP[f.icon] ?? <Star size={20} />}</div>
                  <span style={{ fontSize: 14, color: scheme.foreground, fontWeight: 500 }}>{f.text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right: Entry form */}
          <div style={{ position: 'sticky', top: 24 }}>
            <div style={{ backgroundColor: 'white', borderRadius: 20, padding: '32px 28px', boxShadow: `0 8px 40px rgba(0,0,0,0.10), 0 0 0 1px ${scheme.border}` }}>
              {done ? (
                <div style={{ textAlign: 'center', padding: '20px 0' }}>
                  <div style={{ fontSize: 52, marginBottom: 12 }}>🏆</div>
                  <h3 style={{ fontFamily: 'var(--font-fraunces, serif)', fontSize: 22, fontWeight: 700, color: scheme.foreground, marginBottom: 8 }}>You&apos;re Entered!</h3>
                  <p style={{ fontSize: 14, color: scheme.mutedForeground, lineHeight: 1.65, marginBottom: 20 }}>
                    {props.notification_method !== 'phone'
                      ? `We'll email you if you're selected. The drawing is ${props.draw_date_label.replace('Drawing Date: ', '')}.`
                      : `We'll text you if you're selected. The drawing is ${props.draw_date_label.replace('Drawing Date: ', '')}.`}
                  </p>
                  <button onClick={() => { setDone(false); setForm({ name: '', email: '', phone: '' }) }} style={{ fontSize: 13, color: scheme.primary, background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', fontFamily: 'inherit' }}>
                    Submit another entry
                  </button>
                </div>
              ) : (
                <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <h3 style={{ fontFamily: 'var(--font-fraunces, serif)', fontSize: 22, fontWeight: 700, color: scheme.foreground, marginBottom: 2 }}>{props.form_headline}</h3>
                  <p style={{ fontSize: 13, color: scheme.mutedForeground, marginBottom: 6 }}>{props.form_subheadline}</p>
                  <div><label style={label}>Your name *</label>
                    <input style={inp} required placeholder="First and last" value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} />
                  </div>
                  <div><label style={label}>Email {props.notification_method !== 'phone' ? '*' : ''}</label>
                    <input style={inp} type="email" required={props.notification_method !== 'phone'} placeholder="you@example.com" value={form.email} onChange={e => setForm(f => ({...f, email: e.target.value}))} />
                  </div>
                  {props.notification_method !== 'email' && (
                    <div><label style={label}>Phone {props.notification_method === 'phone' ? '*' : ''}</label>
                      <input style={inp} type="tel" required={props.notification_method === 'phone'} placeholder="(334) 555-0100" value={form.phone} onChange={e => setForm(f => ({...f, phone: e.target.value}))} />
                    </div>
                  )}
                  <button type="submit" disabled={saving} style={{ padding: '14px', borderRadius: 10, fontSize: 15, fontWeight: 800, backgroundColor: saving ? scheme.muted : scheme.secondary, color: saving ? scheme.mutedForeground : scheme.secondaryForeground, border: 'none', cursor: saving ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontFamily: 'inherit' }}>
                    {saving ? <><RefreshCw size={15} /> Entering…</> : <>{props.form_button_label}</>}
                  </button>
                  <p style={{ fontSize: 11, color: scheme.mutedForeground, textAlign: 'center', lineHeight: 1.5 }}>
                    {props.footer_disclaimer ?? `No purchase necessary. Winner notified by ${props.notification_method === 'phone' ? 'phone' : 'email'}.`}
                  </p>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>

      <footer style={{ backgroundColor: scheme.primary, padding: '24px', textAlign: 'center' }}>
        <p style={{ fontSize: 12, color: `${scheme.primaryForeground}99` }}>
          {props.business_name} · Powered by River Region Parents · Powered by KeepSharing.
        </p>
      </footer>
    </div>
  )
}
