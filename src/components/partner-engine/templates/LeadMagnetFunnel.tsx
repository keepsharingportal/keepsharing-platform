'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { CheckCircle2, Layers, TrendingUp, Calculator, FileText, Star, ArrowRight, RefreshCw, Check } from 'lucide-react'
import { getColorScheme } from '@/lib/color-schemes'

export interface LeadMagnetFunnelProps {
  business_name: string
  display_logo_emoji?: string
  logo_url?: string
  hero_badge: string
  hero_headline: string
  hero_headline_emphasis: string
  hero_description: string
  hero_benefits: string[]
  hero_image_url?: string
  trust_strip?: Array<{ label: string }>
  form_headline: string
  form_subheadline: string
  form_button_label: string
  form_extra_fields?: 'business' | 'category-interest' | 'none'
  whats_inside_headline: string
  whats_inside_features: Array<{ icon: string; title: string; description: string }>
  social_proof_quote?: string
  social_proof_author?: string
  close_section_headline?: string
  close_section_description?: string
  final_cta_headline: string
  final_cta_emphasis: string
  final_cta_button_label: string
  redirect_after_submit?: string
  delivery_message?: string
  partner_id: string
  offer_id: string
  color_scheme: string
}

const ICON_MAP: Record<string, React.ReactNode> = {
  Layers:     <Layers     size={22} />,
  TrendingUp: <TrendingUp size={22} />,
  Calculator: <Calculator size={22} />,
  FileText:   <FileText   size={22} />,
  Star:       <Star       size={22} />,
}

const CATEGORY_OPTIONS = [
  'Healthcare / Medical',
  'Education / School',
  'Childcare / Preschool',
  'Family Service',
  'Restaurant / Food',
  'Boutique / Retail',
  'Sports / Activities',
  'Faith Community',
  'Not sure yet',
]

function LMForm({ props, scheme, formId }: { props: LeadMagnetFunnelProps; scheme: ReturnType<typeof getColorScheme>; formId: string }) {
  const [form, setForm] = useState({ name: '', email: '', business: '', category: '' })
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(false)

  const inp: React.CSSProperties = { width: '100%', padding: '11px 14px', fontSize: 14, borderRadius: 8, border: `1px solid ${scheme.border}`, outline: 'none', backgroundColor: 'white', fontFamily: 'var(--font-dm-sans, sans-serif)', boxSizing: 'border-box' }
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
          offerType: 'lead-magnet',
          leadFirstName: form.name.split(' ')[0],
          leadLastName: form.name.split(' ').slice(1).join(' '),
          leadEmail: form.email,
          leadMetadata: { businessName: form.business || undefined, categoryInterest: form.category || undefined },
          sourcePage: typeof window !== 'undefined' ? window.location.pathname : undefined,
        }),
      })
      if (props.redirect_after_submit) {
        setTimeout(() => { window.location.href = props.redirect_after_submit! }, 1400)
      }
      setDone(true)
    } catch { setDone(true) }
    setSaving(false)
  }

  if (done) return (
    <div style={{ textAlign: 'center', padding: '28px 16px' }}>
      <div style={{ width: 52, height: 52, borderRadius: '50%', backgroundColor: scheme.primaryLight, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
        <Check size={24} color={scheme.primary} strokeWidth={2.5} />
      </div>
      <h3 style={{ fontFamily: 'var(--font-fraunces, serif)', fontSize: 20, fontWeight: 700, color: scheme.foreground, marginBottom: 8 }}>
        {props.redirect_after_submit ? 'On its way!' : "You're all set!"}
      </h3>
      <p style={{ fontSize: 14, color: scheme.mutedForeground, lineHeight: 1.65 }}>
        {props.redirect_after_submit ? 'Taking you there now…' : (props.delivery_message ?? 'Check your email for the resource!')}
      </p>
    </div>
  )

  return (
    <form onSubmit={submit} id={formId} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div><label style={label}>Your name *</label>
        <input style={inp} required placeholder="First and last" value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} />
      </div>
      <div><label style={label}>Email *</label>
        <input style={inp} type="email" required placeholder="you@example.com" value={form.email} onChange={e => setForm(f => ({...f, email: e.target.value}))} />
      </div>
      {props.form_extra_fields === 'business' && (
        <div><label style={label}>Business name</label>
          <input style={inp} placeholder="Your business" value={form.business} onChange={e => setForm(f => ({...f, business: e.target.value}))} />
        </div>
      )}
      {props.form_extra_fields === 'category-interest' && (
        <div><label style={label}>Business type <span style={{ fontWeight: 400 }}>(optional)</span></label>
          <select style={{...inp, cursor: 'pointer'}} value={form.category} onChange={e => setForm(f => ({...f, category: e.target.value}))}>
            <option value="">Select your business type…</option>
            {CATEGORY_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      )}
      <button type="submit" disabled={saving} style={{ padding: '14px', borderRadius: 10, fontSize: 15, fontWeight: 800, backgroundColor: saving ? scheme.muted : scheme.secondary, color: saving ? scheme.mutedForeground : scheme.secondaryForeground, border: 'none', cursor: saving ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontFamily: 'inherit' }}>
        {saving ? <><RefreshCw size={14} /> Sending…</> : <>{props.form_button_label} <ArrowRight size={14} /></>}
      </button>
      <p style={{ fontSize: 11, color: scheme.mutedForeground, textAlign: 'center' }}>No spam. Unsubscribe any time.</p>
    </form>
  )
}

export function LeadMagnetFunnel(props: LeadMagnetFunnelProps) {
  const scheme = getColorScheme(props.color_scheme)
  const formId = 'lm-form'

  const trustStrip = props.trust_strip ?? [
    { label: '30 Years in the River Region' },
    { label: '800+ Family Businesses Served' },
    { label: '100K+ Monthly Reach' },
  ]

  return (
    <div style={{ backgroundColor: scheme.background, color: scheme.foreground, fontFamily: 'var(--font-dm-sans, sans-serif)', minHeight: '100vh' }}>

      {/* ── Nav ──────────────────────────────────────────────────────────────── */}
      <nav style={{ backgroundColor: 'white', borderBottom: `1px solid ${scheme.border}`, padding: '14px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 100, boxShadow: '0 1px 6px rgba(0,0,0,0.06)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {props.logo_url ? (
            <div style={{ width: 36, height: 36, borderRadius: 8, overflow: 'hidden', position: 'relative' }}>
              <Image src={props.logo_url} alt={props.business_name} fill style={{ objectFit: 'contain' }} sizes="36px" />
            </div>
          ) : (
            <div style={{ width: 36, height: 36, borderRadius: 8, backgroundColor: scheme.primaryLight, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>
              {props.display_logo_emoji ?? '📰'}
            </div>
          )}
          <span style={{ fontFamily: 'var(--font-fraunces, serif)', fontSize: 16, fontWeight: 700, color: scheme.foreground }}>{props.business_name}</span>
        </div>
        <Link href="/advertise" style={{ fontSize: 12, color: scheme.mutedForeground, textDecoration: 'none', fontWeight: 600 }}>
          Already a Partner? →
        </Link>
      </nav>

      {/* ── Hero ─────────────────────────────────────────────────────────────── */}
      <section style={{ maxWidth: 1100, margin: '0 auto', padding: '64px 24px' }}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 14px', borderRadius: 20, backgroundColor: scheme.primaryLight, border: `1px solid ${scheme.border}`, fontSize: 12, fontWeight: 700, color: scheme.primary, marginBottom: 22 }}>
              <FileText size={13} /> {props.hero_badge}
            </div>
            <h1 style={{ fontFamily: 'var(--font-fraunces, serif)', fontSize: 'clamp(32px, 5vw, 52px)', fontWeight: 900, color: scheme.foreground, lineHeight: 1.1, letterSpacing: '-0.02em', marginBottom: 18 }}>
              {props.hero_headline}{' '}
              <span style={{ color: scheme.primary, fontStyle: 'italic' }}>{props.hero_headline_emphasis}</span>
            </h1>
            <p style={{ fontSize: 16, color: scheme.mutedForeground, lineHeight: 1.7, marginBottom: 24 }}>{props.hero_description}</p>
            <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 28 }}>
              {props.hero_benefits.slice(0, 3).map((b, i) => (
                <li key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                  <CheckCircle2 size={17} color={scheme.primary} strokeWidth={2.5} style={{ flexShrink: 0, marginTop: 2 }} />
                  <span style={{ fontSize: 15, color: scheme.foreground, lineHeight: 1.5 }}>{b}</span>
                </li>
              ))}
            </ul>

            {/* Trust strip */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {trustStrip.map((t, i) => (
                <span key={i} style={{ fontSize: 11, fontWeight: 600, color: scheme.mutedForeground, padding: '4px 10px', borderRadius: 20, backgroundColor: 'white', border: `1px solid ${scheme.border}` }}>
                  {t.label}
                </span>
              ))}
            </div>
          </div>

          {/* Form card */}
          <div style={{ backgroundColor: 'white', borderRadius: 20, padding: '32px 28px', boxShadow: `0 8px 40px rgba(0,0,0,0.10), 0 0 0 1px ${scheme.border}` }}>
            {props.hero_image_url && (
              <div style={{ borderRadius: 12, overflow: 'hidden', aspectRatio: '16/9', position: 'relative', marginBottom: 20 }}>
                <Image src={props.hero_image_url} alt={props.hero_headline} fill style={{ objectFit: 'cover' }} sizes="400px" />
              </div>
            )}
            <h3 style={{ fontFamily: 'var(--font-fraunces, serif)', fontSize: 22, fontWeight: 700, color: scheme.foreground, marginBottom: 4 }}>{props.form_headline}</h3>
            <p style={{ fontSize: 13, color: scheme.mutedForeground, marginBottom: 20 }}>{props.form_subheadline}</p>
            <LMForm props={props} scheme={scheme} formId={formId} />
          </div>
        </div>
      </section>

      {/* ── What's Inside ────────────────────────────────────────────────────── */}
      <section style={{ backgroundColor: 'white', padding: '72px 24px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <h2 style={{ fontFamily: 'var(--font-fraunces, serif)', fontSize: 'clamp(24px, 4vw, 36px)', fontWeight: 700, color: scheme.foreground, textAlign: 'center', marginBottom: 48 }}>
            {props.whats_inside_headline}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {props.whats_inside_features.slice(0, 3).map((f, i) => (
              <div key={i} style={{ backgroundColor: scheme.background, borderRadius: 16, padding: '28px 24px', border: `1px solid ${scheme.border}`, transition: 'transform 0.2s, box-shadow 0.2s' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-3px)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 12px 32px rgba(0,0,0,0.10)' }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = ''; (e.currentTarget as HTMLElement).style.boxShadow = '' }}
              >
                <div style={{ width: 52, height: 52, borderRadius: 14, backgroundColor: scheme.primaryLight, display: 'flex', alignItems: 'center', justifyContent: 'center', color: scheme.primary, marginBottom: 16 }}>
                  {ICON_MAP[f.icon] ?? <Star size={22} />}
                </div>
                <h3 style={{ fontFamily: 'var(--font-fraunces, serif)', fontSize: 18, fontWeight: 700, color: scheme.foreground, marginBottom: 8 }}>{f.title}</h3>
                <p style={{ fontSize: 14, color: scheme.mutedForeground, lineHeight: 1.65 }}>{f.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Social proof quote ────────────────────────────────────────────────── */}
      {props.social_proof_quote && (
        <section style={{ padding: '56px 24px', textAlign: 'center' }}>
          <div style={{ maxWidth: 600, margin: '0 auto' }}>
            <div style={{ width: 40, height: 4, backgroundColor: scheme.secondary, borderRadius: 2, margin: '0 auto 20px' }} />
            <p style={{ fontFamily: 'var(--font-fraunces, serif)', fontSize: 22, fontStyle: 'italic', color: scheme.foreground, lineHeight: 1.55, marginBottom: 16 }}>
              &ldquo;{props.social_proof_quote}&rdquo;
            </p>
            {props.social_proof_author && <p style={{ fontSize: 13, color: scheme.mutedForeground, fontWeight: 600 }}>— {props.social_proof_author}</p>}
          </div>
        </section>
      )}

      {/* ── Close section: cost-of-not-acting ────────────────────────────────── */}
      {(props.close_section_headline || props.close_section_description) && (
        <section style={{ backgroundColor: 'white', padding: '64px 24px' }}>
          <div style={{ maxWidth: 680, margin: '0 auto', textAlign: 'center' }}>
            <h2 style={{ fontFamily: 'var(--font-fraunces, serif)', fontSize: 'clamp(22px, 3.5vw, 32px)', fontWeight: 700, color: scheme.foreground, lineHeight: 1.2, marginBottom: 16 }}>
              {props.close_section_headline ?? "Wait Another Quarter and You're Choosing the Same Old Approach"}
            </h2>
            <p style={{ fontSize: 15, color: scheme.mutedForeground, lineHeight: 1.75, marginBottom: 28 }}>
              {props.close_section_description ?? "Every month you wait, another local business is showing up where your customers are making decisions. The resource is free. The conversation is free. The cost of not looking is the customers your competitor picks up instead."}
            </p>
            <a href={`#${formId}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '13px 28px', borderRadius: 12, fontSize: 14, fontWeight: 800, backgroundColor: scheme.secondary, color: scheme.secondaryForeground, textDecoration: 'none' }}>
              {props.final_cta_button_label} <ArrowRight size={14} />
            </a>
          </div>
        </section>
      )}

      {/* ── Final CTA — terra gradient ────────────────────────────────────────── */}
      <section style={{ background: `linear-gradient(135deg, #ef6442 0%, #a03818 100%)`, padding: '72px 24px', textAlign: 'center' }}>
        <div style={{ maxWidth: 560, margin: '0 auto' }}>
          <h2 style={{ fontFamily: 'var(--font-fraunces, serif)', fontSize: 'clamp(26px, 4vw, 40px)', fontWeight: 900, color: 'white', lineHeight: 1.1, marginBottom: 28 }}>
            {props.final_cta_headline}{' '}
            <span style={{ color: 'rgba(255,255,255,0.75)', fontStyle: 'italic' }}>{props.final_cta_emphasis}</span>
          </h2>
          <a href={`#${formId}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '14px 32px', borderRadius: 12, fontSize: 15, fontWeight: 800, backgroundColor: 'white', color: '#ef6442', textDecoration: 'none', boxShadow: '0 4px 16px rgba(0,0,0,0.15)' }}>
            {props.final_cta_button_label} <ArrowRight size={15} />
          </a>
        </div>
      </section>

      <footer style={{ backgroundColor: scheme.foreground, padding: '24px', textAlign: 'center' }}>
        <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', fontStyle: 'italic' }}>
          {props.business_name} · Powered by River Region Parents · Built by KeepSharing
        </p>
      </footer>
    </div>
  )
}
