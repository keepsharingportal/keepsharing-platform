'use client'

import { useState, useId, useEffect } from 'react'
import Image from 'next/image'
import { Star, CheckCircle2, Shield, ArrowRight, RefreshCw, Check, Heart, Smile } from 'lucide-react'
import { getColorScheme } from '@/lib/color-schemes'
import { PartnerTeam } from '@/components/partner-engine/PartnerTeam'

export interface ConsultBookingFunnelProps {
  business_name: string
  display_logo_emoji?: string
  logo_url?: string

  hero_badge: string
  hero_headline: string
  hero_headline_emphasis: string
  hero_description: string
  hero_benefits: string[]
  social_proof_count: string
  social_proof_label: string

  form_headline: string
  form_subheadline: string
  form_button_label: string
  form_fields_config: 'parent-child' | 'name-only' | 'business' | 'general'

  experience_image_url: string
  experience_image_caption?: string
  experience_headline: string
  experience_headline_emphasis: string
  experience_description: string
  experience_features: Array<{ title: string; description: string }>

  reviews_headline: string
  reviews_subheadline: string
  reviews: Array<{ text: string; author: string; role: string }>

  final_cta_headline: string
  final_cta_emphasis: string
  final_cta_description?: string
  final_cta_button_label: string

  team_members?: Array<{ display_name?: string | null; title?: string | null; credentials?: string | null; bio?: string | null; philosophy_quote?: string | null; photo_url?: string | null; years_with_practice?: number | null }>
  team_section_headline?: string
  team_section_subheadline?: string

  partner_id: string
  offer_id: string
  color_scheme: string
  contact_phone?: string
}

// ── Scroll-aware mobile sticky bar ───────────────────────────────────────────

function MobileStickyBar({ formId, buttonLabel, phone, scheme }: { formId: string; buttonLabel: string; phone?: string; scheme: ReturnType<typeof getColorScheme> }) {
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const check = () => {
      const scrollY = window.scrollY
      const formEl = document.getElementById(formId)
      const formInView = formEl
        ? formEl.getBoundingClientRect().top < window.innerHeight && formEl.getBoundingClientRect().bottom > 0
        : false
      setVisible(scrollY > 400 && !formInView)
    }
    window.addEventListener('scroll', check, { passive: true })
    check()
    return () => window.removeEventListener('scroll', check)
  }, [formId])

  return (
    <div className="md:hidden" style={{
      position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 200,
      backgroundColor: 'rgba(255,255,255,0.97)',
      backdropFilter: 'blur(8px)',
      borderTop: '1px solid rgba(0,0,0,0.08)',
      padding: '10px 14px 18px',
      display: 'flex', gap: 10, alignItems: 'center',
      boxShadow: '0 -4px 20px rgba(0,0,0,0.08)',
      transform: visible ? 'translateY(0)' : 'translateY(100%)',
      transition: 'transform 0.3s ease',
    }}>
      {phone && (
        <a href={`tel:${phone}`} style={{ width: 44, height: 44, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: scheme.primaryLight, color: scheme.primary, textDecoration: 'none', fontSize: 18 }}>
          📞
        </a>
      )}
      <a href={`#${formId}`} onClick={e => { e.preventDefault(); document.getElementById(formId)?.scrollIntoView({ behavior: 'smooth', block: 'start' }) }} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', height: 44, borderRadius: 10, fontSize: 14, fontWeight: 800, backgroundColor: scheme.secondary, color: scheme.secondaryForeground, textDecoration: 'none' }}>
        {buttonLabel}
      </a>
    </div>
  )
}

// ── Avatar placeholder SVGs ───────────────────────────────────────────────────

const AVATAR_INITIALS = ['E', 'J', 'A']
const AVATAR_COLORS   = ['#4a90d9', '#5a8a6a', '#ef6442']

function AvatarStack({ scheme }: { scheme: ReturnType<typeof getColorScheme> }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ display: 'flex', marginRight: 4 }}>
        {AVATAR_INITIALS.map((letter, i) => (
          <div key={i} style={{
            width: 32, height: 32, borderRadius: '50%',
            backgroundColor: AVATAR_COLORS[i],
            border: '2px solid white',
            marginLeft: i > 0 ? -10 : 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'var(--font-fraunces, serif)', fontSize: 12, fontWeight: 700, color: 'white',
            position: 'relative', zIndex: 3 - i,
          }}>
            {letter}
          </div>
        ))}
      </div>
      <div>
        <div style={{ display: 'flex', gap: 1 }}>
          {[1,2,3,4,5].map(s => <Star key={s} size={12} fill={scheme.secondary} color={scheme.secondary} />)}
        </div>
      </div>
    </div>
  )
}

// ── Booking form ──────────────────────────────────────────────────────────────

type FormState = Record<string, string>

function BookingForm({
  config, scheme, headline, subheadline, buttonLabel, partnerId, offerId, formId,
}: {
  config: ConsultBookingFunnelProps['form_fields_config']
  scheme: ReturnType<typeof getColorScheme>
  headline: string
  subheadline: string
  buttonLabel: string
  partnerId: string
  offerId: string
  formId: string
}) {
  const [form, setForm] = useState<FormState>({})
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const inp: React.CSSProperties = {
    width: '100%', padding: '11px 14px', fontSize: 14, borderRadius: 8,
    border: `1px solid ${scheme.border}`,
    outline: 'none', backgroundColor: 'white',
    fontFamily: 'var(--font-dm-sans, sans-serif)',
    boxSizing: 'border-box',
  }

  const label: React.CSSProperties = {
    display: 'block', fontSize: 12, fontWeight: 600, color: scheme.mutedForeground, marginBottom: 5,
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.phone && !form.email) return
    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/partner-leads/capture', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          offerId,
          advertiserId: partnerId,
          offerType: 'schedule_consult',
          leadFirstName: form.parentName?.split(' ')[0] ?? form.name?.split(' ')[0],
          leadLastName: form.parentName?.split(' ').slice(1).join(' ') ?? form.name?.split(' ').slice(1).join(' '),
          leadEmail: form.email,
          leadPhone: form.phone,
          leadMetadata: {
            childName: form.childName,
            childAge: form.childAge,
            businessName: form.businessName,
            message: form.message,
          },
          sourcePage: typeof window !== 'undefined' ? window.location.pathname : undefined,
        }),
      })
      if (!res.ok) throw new Error('Server error')
      setDone(true)
    } catch {
      setError('Something went wrong — please call us directly.')
    }
    setSaving(false)
  }

  if (done) return (
    <div style={{ textAlign: 'center', padding: '32px 20px' }}>
      <div style={{ width: 56, height: 56, borderRadius: '50%', backgroundColor: scheme.primaryLight, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
        <Check size={26} color={scheme.primary} strokeWidth={2.5} />
      </div>
      <h3 style={{ fontFamily: 'var(--font-fraunces, serif)', fontSize: 20, fontWeight: 700, color: scheme.foreground, marginBottom: 8 }}>
        We&apos;ve received your request!
      </h3>
      <p style={{ fontSize: 14, color: scheme.mutedForeground, lineHeight: 1.65 }}>
        You&apos;ll receive a text with our direct line shortly. We&apos;ll reach out within 24 hours to schedule your visit.
      </p>
    </div>
  )

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }} id={formId}>
      <div style={{ marginBottom: 6 }}>
        <h3 style={{ fontFamily: 'var(--font-fraunces, serif)', fontSize: 22, fontWeight: 700, color: scheme.foreground, marginBottom: 4 }}>
          {headline}
        </h3>
        <p style={{ fontSize: 13, color: scheme.mutedForeground, lineHeight: 1.5 }}>{subheadline}</p>
      </div>

      {/* parent-child fields */}
      {config === 'parent-child' && (
        <>
          <div><label style={label}>Parent name *</label>
            <input style={inp} required placeholder="First and last" value={form.parentName ?? ''} onChange={e => setForm(f => ({...f, parentName: e.target.value}))} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div><label style={label}>Child&apos;s name</label>
              <input style={inp} placeholder="First name" value={form.childName ?? ''} onChange={e => setForm(f => ({...f, childName: e.target.value}))} />
            </div>
            <div><label style={label}>Child&apos;s age *</label>
              <input style={inp} required placeholder="e.g. 4 years" value={form.childAge ?? ''} onChange={e => setForm(f => ({...f, childAge: e.target.value}))} />
            </div>
          </div>
          <div><label style={label}>Phone * <span style={{ fontWeight: 400, color: scheme.muted === scheme.mutedForeground ? '#aaa' : scheme.mutedForeground }}>(we'll text you confirmation)</span></label>
            <input style={inp} type="tel" required placeholder="(334) 555-0100" value={form.phone ?? ''} onChange={e => setForm(f => ({...f, phone: e.target.value}))} />
          </div>
          <div><label style={label}>Email *</label>
            <input style={inp} type="email" required placeholder="you@example.com" value={form.email ?? ''} onChange={e => setForm(f => ({...f, email: e.target.value}))} />
          </div>
          <div><label style={label}>Message <span style={{ fontWeight: 400 }}>(optional)</span></label>
            <textarea style={{...inp, resize: 'none', height: 72} as React.CSSProperties} placeholder="Any questions or special requests?" value={form.message ?? ''} onChange={e => setForm(f => ({...f, message: e.target.value}))} />
          </div>
        </>
      )}

      {/* name-only fields */}
      {config === 'name-only' && (
        <>
          <div><label style={label}>Your name *</label>
            <input style={inp} required placeholder="First and last" value={form.name ?? ''} onChange={e => setForm(f => ({...f, name: e.target.value}))} />
          </div>
          <div><label style={label}>Phone *</label>
            <input style={inp} type="tel" required placeholder="(334) 555-0100" value={form.phone ?? ''} onChange={e => setForm(f => ({...f, phone: e.target.value}))} />
          </div>
          <div><label style={label}>Email</label>
            <input style={inp} type="email" placeholder="you@example.com" value={form.email ?? ''} onChange={e => setForm(f => ({...f, email: e.target.value}))} />
          </div>
        </>
      )}

      {/* business fields */}
      {config === 'business' && (
        <>
          <div><label style={label}>Your name *</label>
            <input style={inp} required placeholder="First and last" value={form.name ?? ''} onChange={e => setForm(f => ({...f, name: e.target.value}))} />
          </div>
          <div><label style={label}>Business name *</label>
            <input style={inp} required placeholder="Your business" value={form.businessName ?? ''} onChange={e => setForm(f => ({...f, businessName: e.target.value}))} />
          </div>
          <div><label style={label}>Phone *</label>
            <input style={inp} type="tel" required placeholder="(334) 555-0100" value={form.phone ?? ''} onChange={e => setForm(f => ({...f, phone: e.target.value}))} />
          </div>
          <div><label style={label}>Email *</label>
            <input style={inp} type="email" required placeholder="you@example.com" value={form.email ?? ''} onChange={e => setForm(f => ({...f, email: e.target.value}))} />
          </div>
        </>
      )}

      {/* general fields (default) */}
      {config === 'general' && (
        <>
          <div><label style={label}>Your name *</label>
            <input style={inp} required placeholder="First and last" value={form.name ?? ''} onChange={e => setForm(f => ({...f, name: e.target.value}))} />
          </div>
          <div><label style={label}>Phone *</label>
            <input style={inp} type="tel" required placeholder="(334) 555-0100" value={form.phone ?? ''} onChange={e => setForm(f => ({...f, phone: e.target.value}))} />
          </div>
          <div><label style={label}>Email</label>
            <input style={inp} type="email" placeholder="you@example.com" value={form.email ?? ''} onChange={e => setForm(f => ({...f, email: e.target.value}))} />
          </div>
          <div><label style={label}>Message <span style={{ fontWeight: 400 }}>(optional)</span></label>
            <textarea style={{...inp, resize: 'none', height: 72} as React.CSSProperties} placeholder="Anything we should know?" value={form.message ?? ''} onChange={e => setForm(f => ({...f, message: e.target.value}))} />
          </div>
        </>
      )}

      {error && <p style={{ fontSize: 13, color: '#ef6442', fontWeight: 600 }}>{error}</p>}

      <button type="submit" disabled={saving} style={{
        width: '100%',
        padding: '14px 20px',
        borderRadius: 10,
        fontSize: 15,
        fontWeight: 800,
        backgroundColor: saving ? scheme.muted : scheme.secondary,
        color: saving ? scheme.mutedForeground : scheme.secondaryForeground,
        border: 'none',
        cursor: saving ? 'not-allowed' : 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        letterSpacing: '-0.01em',
        fontFamily: 'var(--font-dm-sans, sans-serif)',
      }}>
        {saving
          ? <><RefreshCw size={15} style={{ animation: 'spin 1s linear infinite' }} /> Sending…</>
          : <>{buttonLabel}</>
        }
      </button>

      <p style={{ fontSize: 11, color: scheme.mutedForeground, textAlign: 'center', lineHeight: 1.5 }}>
        By submitting, you agree to be contacted. No spam — unsubscribe any time.
      </p>
    </form>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export function ConsultBookingFunnel(props: ConsultBookingFunnelProps) {
  const scheme = getColorScheme(props.color_scheme)
  const formId = 'consult-form'

  const experienceIcons = [
    <Heart key="h" size={22} color={scheme.primary} />,
    <Smile key="s" size={22} color={scheme.primary} />,
    <Shield key="sh" size={22} color={scheme.primary} />,
  ]

  return (
    <div style={{ backgroundColor: scheme.background, color: scheme.foreground, fontFamily: 'var(--font-dm-sans, sans-serif)', minHeight: '100vh' }}>

      {/* ── Top Nav ──────────────────────────────────────────────────────── */}
      <nav style={{ backgroundColor: 'white', borderBottom: `1px solid ${scheme.border}`, padding: '14px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {props.logo_url ? (
            <Image src={props.logo_url} alt={props.business_name} width={40} height={40} style={{ borderRadius: 8, objectFit: 'contain' }} />
          ) : (
            <div style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: scheme.primaryLight, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>
              {props.display_logo_emoji ?? '🏥'}
            </div>
          )}
          <span style={{ fontFamily: 'var(--font-fraunces, serif)', fontSize: 16, fontWeight: 700, color: scheme.foreground }}>
            {props.business_name}
          </span>
        </div>
        <a href={`#${formId}`} style={{
          padding: '8px 18px', borderRadius: 8, fontSize: 13, fontWeight: 700,
          backgroundColor: scheme.secondary, color: scheme.secondaryForeground,
          textDecoration: 'none', display: 'none',
        }} className="hidden md:block">
          {props.form_button_label}
        </a>
      </nav>

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section style={{ maxWidth: 1100, margin: '0 auto', padding: '64px 24px 72px' }}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">

          {/* Left: Offer copy */}
          <div>
            {/* Badge */}
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '5px 14px', borderRadius: 20, marginBottom: 22,
              backgroundColor: scheme.primaryLight,
              border: `1px solid ${scheme.border}`,
              fontSize: 12, fontWeight: 700, color: scheme.primary,
            }}>
              <CheckCircle2 size={14} color={scheme.primary} strokeWidth={2.5} />
              {props.hero_badge}
            </div>

            {/* H1 with emphasis */}
            <h1 style={{
              fontFamily: 'var(--font-fraunces, serif)',
              fontSize: 'clamp(32px, 5vw, 52px)',
              fontWeight: 900,
              color: scheme.foreground,
              lineHeight: 1.1,
              letterSpacing: '-0.02em',
              marginBottom: 20,
            }}>
              {props.hero_headline}{' '}
              <span style={{ color: scheme.primary, fontStyle: 'italic' }}>
                {props.hero_headline_emphasis}
              </span>
            </h1>

            {/* Description */}
            <p style={{ fontSize: 17, color: scheme.mutedForeground, lineHeight: 1.7, marginBottom: 24 }}>
              {props.hero_description}
            </p>

            {/* Benefits */}
            <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 28 }}>
              {props.hero_benefits.slice(0, 4).map((b, i) => (
                <li key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                  <CheckCircle2 size={18} color={scheme.primary} strokeWidth={2.5} style={{ flexShrink: 0, marginTop: 2 }} />
                  <span style={{ fontSize: 15, color: scheme.foreground, lineHeight: 1.5 }}>{b}</span>
                </li>
              ))}
            </ul>

            {/* Social proof strip */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px', borderRadius: 12, backgroundColor: 'white', border: `1px solid ${scheme.border}`, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', maxWidth: 360 }}>
              <AvatarStack scheme={scheme} />
              <p style={{ fontSize: 13, fontWeight: 600, color: scheme.foreground }}>
                {props.social_proof_label}
              </p>
            </div>
          </div>

          {/* Right: Form card */}
          <div style={{
            backgroundColor: 'white',
            borderRadius: 20,
            padding: '32px 28px',
            boxShadow: `0 8px 40px rgba(0,0,0,0.12), 0 0 0 1px ${scheme.border}`,
            position: 'sticky', top: 80,
          }}>
            <BookingForm
              config={props.form_fields_config}
              scheme={scheme}
              headline={props.form_headline}
              subheadline={props.form_subheadline}
              buttonLabel={props.form_button_label}
              partnerId={props.partner_id}
              offerId={props.offer_id}
              formId={formId}
            />
          </div>
        </div>
      </section>

      {/* ── Experience / Atmosphere Section ──────────────────────────────── */}
      <section style={{ backgroundColor: 'white', padding: '80px 24px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">

            {/* Image left */}
            <div style={{ position: 'relative' }}>
              <div style={{ borderRadius: 20, overflow: 'hidden', position: 'relative', aspectRatio: '4/3', boxShadow: `12px 12px 0 ${scheme.primaryLight}` }}>
                <Image
                  src={props.experience_image_url}
                  alt={props.experience_headline}
                  fill
                  style={{ objectFit: 'cover' }}
                  sizes="(max-width: 768px) 100vw, 500px"
                />
              </div>
              {props.experience_image_caption && (
                <div style={{
                  position: 'absolute', bottom: -16, right: -16,
                  backgroundColor: 'white',
                  borderRadius: 12, padding: '10px 16px',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.12)',
                  maxWidth: 200,
                  fontSize: 13, fontStyle: 'italic', color: scheme.mutedForeground,
                  border: `1px solid ${scheme.border}`,
                }}>
                  &ldquo;{props.experience_image_caption}&rdquo;
                </div>
              )}
            </div>

            {/* Text right */}
            <div>
              <h2 style={{
                fontFamily: 'var(--font-fraunces, serif)',
                fontSize: 'clamp(26px, 4vw, 40px)',
                fontWeight: 700,
                color: scheme.foreground,
                lineHeight: 1.15,
                marginBottom: 16,
              }}>
                {props.experience_headline}{' '}
                <span style={{ color: scheme.primary, fontStyle: 'italic' }}>
                  {props.experience_headline_emphasis}
                </span>
              </h2>
              <p style={{ fontSize: 16, color: scheme.mutedForeground, lineHeight: 1.7, marginBottom: 32 }}>
                {props.experience_description}
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                {props.experience_features.slice(0, 3).map((feat, i) => (
                  <div key={i} style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                    <div style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: scheme.primaryLight, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      {experienceIcons[i] ?? <CheckCircle2 size={20} color={scheme.primary} />}
                    </div>
                    <div>
                      <h3 style={{ fontFamily: 'var(--font-fraunces, serif)', fontSize: 17, fontWeight: 700, color: scheme.foreground, marginBottom: 4 }}>
                        {feat.title}
                      </h3>
                      <p style={{ fontSize: 14, color: scheme.mutedForeground, lineHeight: 1.6 }}>
                        {feat.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Reviews ──────────────────────────────────────────────────────── */}
      <section style={{ backgroundColor: scheme.background, padding: '80px 24px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <h2 style={{
              fontFamily: 'var(--font-fraunces, serif)',
              fontSize: 'clamp(24px, 4vw, 38px)',
              fontWeight: 700,
              color: scheme.foreground,
              marginBottom: 10,
            }}>
              {props.reviews_headline}
            </h2>
            <p style={{ fontSize: 15, color: scheme.mutedForeground, maxWidth: 520, margin: '0 auto' }}>
              {props.reviews_subheadline}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {props.reviews.slice(0, 3).map((r, i) => (
              <div key={i} style={{
                backgroundColor: 'white',
                borderRadius: 16,
                padding: '28px 24px',
                border: `1px solid ${scheme.border}`,
                boxShadow: '0 2px 16px rgba(0,0,0,0.06)',
                display: 'flex', flexDirection: 'column', gap: 16,
              }}>
                <div style={{ display: 'flex', gap: 1 }}>
                  {[1,2,3,4,5].map(s => <Star key={s} size={14} fill={scheme.secondary} color={scheme.secondary} />)}
                </div>
                <p style={{ fontSize: 14, color: scheme.foreground, lineHeight: 1.7, fontStyle: 'italic', flex: 1 }}>
                  &ldquo;{r.text}&rdquo;
                </p>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <div style={{ width: 38, height: 38, borderRadius: '50%', backgroundColor: scheme.primaryLight, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-fraunces, serif)', fontSize: 14, fontWeight: 700, color: scheme.primary, flexShrink: 0 }}>
                    {r.author[0]}
                  </div>
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 700, color: scheme.foreground }}>{r.author}</p>
                    <p style={{ fontSize: 11, color: scheme.mutedForeground }}>{r.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Partner Team (renders only if team_members provided) ─────────── */}
      {props.team_members && props.team_members.length > 0 && (
        <PartnerTeam
          team_members={props.team_members}
          section_headline={props.team_section_headline ?? `Meet the Team Who'll Care for You`}
          section_subheadline={props.team_section_subheadline}
          color_scheme={props.color_scheme}
        />
      )}

      {/* ── Final CTA ────────────────────────────────────────────────────── */}
      <section style={{ backgroundColor: scheme.primary, padding: '80px 24px', textAlign: 'center' }}>
        <div style={{ maxWidth: 640, margin: '0 auto' }}>
          <h2 style={{
            fontFamily: 'var(--font-fraunces, serif)',
            fontSize: 'clamp(28px, 5vw, 46px)',
            fontWeight: 900,
            color: scheme.primaryForeground,
            lineHeight: 1.1,
            marginBottom: 16,
          }}>
            {props.final_cta_headline}{' '}
            <span style={{ color: scheme.secondary, fontStyle: 'italic' }}>
              {props.final_cta_emphasis}
            </span>
          </h2>
          {props.final_cta_description && (
            <p style={{ fontSize: 16, color: `${scheme.primaryForeground}cc`, lineHeight: 1.7, marginBottom: 32 }}>
              {props.final_cta_description}
            </p>
          )}
          <a href={`#${formId}`} style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '15px 36px', borderRadius: 12, fontSize: 16, fontWeight: 800,
            backgroundColor: scheme.secondary, color: scheme.secondaryForeground,
            textDecoration: 'none',
          }}>
            {props.final_cta_button_label} <ArrowRight size={16} />
          </a>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <footer style={{ backgroundColor: scheme.foreground, padding: '28px 24px', textAlign: 'center' }}>
        <p style={{ fontFamily: 'var(--font-fraunces, serif)', fontSize: 16, fontWeight: 700, color: 'white', marginBottom: 4 }}>
          {props.business_name}
        </p>
        {props.contact_phone && (
          <a href={`tel:${props.contact_phone}`} style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', textDecoration: 'none', display: 'block', marginBottom: 12 }}>
            {props.contact_phone}
          </a>
        )}
        <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', fontStyle: 'italic' }}>
          Powered by River Region Parents · Built by River Region Parents. Powered by KeepSharing.
        </p>
      </footer>

      {/* ── Mobile sticky CTA — scroll-aware, cream bg, no color clash ───── */}
      <MobileStickyBar formId={formId} buttonLabel={props.form_button_label} phone={props.contact_phone} scheme={scheme} />

    </div>
  )
}
