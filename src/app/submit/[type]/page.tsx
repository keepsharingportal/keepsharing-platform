// ── /submit/[type] ────────────────────────────────────────────────────────────
// Dynamic form renderer for all community submission types.
// Server component with a bound server action. Redirects to ?submitted=true
// on success and renders the thank-you view from the same route.

import type { Metadata }       from 'next'
import type { CSSProperties, ReactNode } from 'react'
import { redirect, notFound }  from 'next/navigation'
import Link                    from 'next/link'
import { createClient }        from '@/lib/supabase/server'
import {
  SUBMISSION_TYPES, getSubmissionType, TYPE_COLORS,
  type SubmissionField,
} from '@/lib/submissions'

// ── Design tokens ─────────────────────────────────────────────────────────────

const N    = '#1a2744'
const T    = '#c4622d'
const C    = '#fdf8f3'
const W    = '#ffffff'
const serif = 'var(--font-fraunces, serif)'
const sans  = 'var(--font-dm-sans, sans-serif)'

// ── Static params ─────────────────────────────────────────────────────────────

export function generateStaticParams() {
  return SUBMISSION_TYPES
    .filter(t => !t.externalUrl)
    .map(t => ({ type: t.type }))
}

// ── Metadata ──────────────────────────────────────────────────────────────────

export async function generateMetadata(
  { params }: { params: Promise<{ type: string }> }
): Promise<Metadata> {
  const { type } = await params
  const config   = getSubmissionType(type)
  if (!config) return { title: 'Submit — River Region Parents' }
  return {
    title:       `${config.label} — River Region Parents`,
    description: config.description,
  }
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function SubmitTypePage({
  params,
  searchParams,
}: {
  params:       Promise<{ type: string }>
  searchParams: Promise<{ submitted?: string }>
}) {
  const { type }      = await params
  const { submitted } = await searchParams

  const config = getSubmissionType(type)
  if (!config || config.externalUrl) notFound()

  const accentColor = TYPE_COLORS[type] ?? T

  // ── Server action ──────────────────────────────────────────────────────────

  async function submitForm(formData: FormData) {
    'use server'

    const supabase = await createClient()

    const submitter_name  = (formData.get('submitter_name')  as string) || ''
    const submitter_email = (formData.get('submitter_email') as string) || ''
    const submitter_phone = (formData.get('submitter_phone') as string) || null

    const payload: Record<string, string> = {}
    let related_person_name:   string | null = null
    let related_business_name: string | null = null
    let related_school_name:   string | null = null
    let related_sport:         string | null = null

    const currentConfig = getSubmissionType(type)!
    for (const field of currentConfig.fields) {
      const value = (formData.get(field.id) as string) || null
      if (value) {
        payload[field.id] = value
        if (field.coreField === 'related_person_name')   related_person_name   = value
        if (field.coreField === 'related_business_name') related_business_name = value
        if (field.coreField === 'related_school_name')   related_school_name   = value
        if (field.coreField === 'related_sport')         related_sport         = value
      }
    }

    await supabase.from('community_submissions').insert({
      submission_type:       type,
      target_publication:    'rrp',
      source_page:           `/submit/${type}`,
      submitter_name,
      submitter_email,
      submitter_phone,
      related_person_name,
      related_business_name,
      related_school_name,
      related_sport,
      payload,
      status: 'new',
    })

    redirect(`/submit/${type}?submitted=true`)
  }

  // ── Thank-you state ────────────────────────────────────────────────────────

  if (submitted === 'true') {
    return (
      <div style={{ backgroundColor: C, color: '#3a2c1e', fontFamily: sans, minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '48px 24px' }}>
        <div style={{ maxWidth: 560, textAlign: 'center' }}>
          <div style={{ fontSize: 64, marginBottom: 20 }}>{config.emoji}</div>
          <h1 style={{ fontFamily: serif, fontSize: 'clamp(26px, 4vw, 40px)', fontWeight: 900, color: N, lineHeight: 1.1, marginBottom: 16 }}>
            Thank You!
          </h1>
          <p style={{ fontSize: 16, color: '#555', lineHeight: 1.8, marginBottom: 10 }}>
            Your {config.label.toLowerCase()} submission has been received.
          </p>
          <p style={{ fontSize: 14, color: '#888', lineHeight: 1.8, marginBottom: 32 }}>
            {config.whatHappensNext}
          </p>

          {(config.photoRequired || config.photoHint) && (
            <div style={{ backgroundColor: W, border: `2px solid ${accentColor}30`, borderRadius: 12, padding: '18px 22px', marginBottom: 32, textAlign: 'left' }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: N, marginBottom: 6 }}>
                📷 {config.photoLabel ?? 'Photo'}{config.photoRequired ? ' (Required)' : ' (Optional)'}
              </p>
              <p style={{ fontSize: 13, color: '#555', lineHeight: 1.6 }}>{config.photoHint}</p>
            </div>
          )}

          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link
              href="/submit"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, backgroundColor: accentColor, color: '#fff', padding: '11px 24px', borderRadius: 100, fontSize: 13, fontWeight: 700, textDecoration: 'none' }}
            >
              ← All Submission Types
            </Link>
            <Link
              href="/"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, backgroundColor: 'transparent', color: N, border: `1.5px solid ${N}30`, padding: '11px 24px', borderRadius: 100, fontSize: 13, fontWeight: 700, textDecoration: 'none' }}
            >
              Go to Homepage
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // ── Form state ─────────────────────────────────────────────────────────────

  return (
    <div style={{ backgroundColor: C, color: '#3a2c1e', fontFamily: sans }}>

      {/* ── HERO ──────────────────────────────────────────────────────────── */}
      <section style={{ backgroundColor: N, padding: '52px 24px 48px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, backgroundImage: `radial-gradient(ellipse at 72% 30%, ${accentColor}22 0%, transparent 55%)`, pointerEvents: 'none' }} />
        <div style={{ maxWidth: 680, margin: '0 auto', position: 'relative' }}>
          <Link
            href="/submit"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'rgba(255,255,255,0.4)', fontSize: 12, fontWeight: 600, letterSpacing: '0.04em', textDecoration: 'none', marginBottom: 22 }}
          >
            ← All Submission Types
          </Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            <span style={{ fontSize: 30 }}>{config.emoji}</span>
            <p style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', margin: 0 }}>
              {config.group}
            </p>
          </div>
          <h1 style={{ fontFamily: serif, fontSize: 'clamp(22px, 4vw, 40px)', fontWeight: 900, color: '#fff', lineHeight: 1.1, letterSpacing: '-0.02em', marginBottom: 14 }}>
            {config.headline}
          </h1>
          <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.6)', lineHeight: 1.8 }}>
            {config.description}
          </p>
        </div>
      </section>

      {/* ── FORM ──────────────────────────────────────────────────────────── */}
      <section style={{ padding: '52px 24px 80px' }}>
        <div style={{ maxWidth: 640, margin: '0 auto' }}>

          {/* Who / Time meta strip */}
          <div style={{ display: 'flex', gap: 24, marginBottom: 36, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', gap: 6, alignItems: 'flex-start' }}>
              <span style={{ fontSize: 11, color: '#bbb', fontWeight: 700, marginTop: 1, flexShrink: 0 }}>WHO</span>
              <span style={{ fontSize: 12, color: '#666', lineHeight: 1.5 }}>{config.whoShouldUse}</span>
            </div>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <span style={{ fontSize: 11, color: '#bbb', fontWeight: 700 }}>TIME</span>
              <span style={{ fontSize: 12, color: '#666' }}>About {config.estimatedTime}</span>
            </div>
          </div>

          <form action={submitForm} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

            {/* ── ABOUT YOU ─────────────────────────────────────────────── */}
            <div style={{ backgroundColor: W, border: '1px solid rgba(0,0,0,0.08)', borderRadius: 16, padding: '28px 28px' }}>
              <h2 style={{ fontFamily: serif, fontSize: 16, fontWeight: 800, color: N, margin: '0 0 22px' }}>About You</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                <FieldRow label="Your Name" required>
                  <input name="submitter_name" type="text" required placeholder="Jane Smith" style={inputSty} />
                </FieldRow>
                <FieldRow label="Your Email" required hint="We'll only contact you about this submission.">
                  <input name="submitter_email" type="email" required placeholder="jane@example.com" style={inputSty} />
                </FieldRow>
                <FieldRow label="Your Phone (optional)">
                  <input name="submitter_phone" type="tel" placeholder="(334) 555-0100" style={inputSty} />
                </FieldRow>
              </div>
            </div>

            {/* ── SUBMISSION DETAILS ────────────────────────────────────── */}
            <div style={{ backgroundColor: W, border: '1px solid rgba(0,0,0,0.08)', borderTop: `4px solid ${accentColor}`, borderRadius: 16, padding: '28px 28px' }}>
              <h2 style={{ fontFamily: serif, fontSize: 16, fontWeight: 800, color: N, margin: '0 0 22px' }}>
                {config.label} Details
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                {config.fields.map(field => (
                  <FieldRow key={field.id} label={field.label} required={field.required} hint={field.hint}>
                    <FieldInput field={field} />
                  </FieldRow>
                ))}
              </div>
            </div>

            {/* ── PHOTO NOTE ────────────────────────────────────────────── */}
            {(config.photoRequired || config.photoHint) && (
              <div style={{ backgroundColor: `${accentColor}08`, border: `1.5px solid ${accentColor}28`, borderRadius: 12, padding: '18px 22px' }}>
                <p style={{ fontSize: 13, fontWeight: 700, color: N, margin: '0 0 6px' }}>
                  📷 {config.photoLabel ?? 'Photo'}{config.photoRequired ? ' (Required)' : ' (Optional)'}
                </p>
                <p style={{ fontSize: 13, color: '#555', lineHeight: 1.6, margin: 0 }}>{config.photoHint}</p>
              </div>
            )}

            {/* ── SUBMIT ────────────────────────────────────────────────── */}
            <div>
              <button
                type="submit"
                style={{ backgroundColor: accentColor, color: '#fff', border: 'none', padding: '14px 32px', borderRadius: 100, fontSize: 15, fontWeight: 700, cursor: 'pointer', display: 'inline-block' }}
              >
                Submit {config.shortLabel} →
              </button>
              <p style={{ fontSize: 12, color: '#aaa', lineHeight: 1.6, marginTop: 12 }}>
                Our editorial team reads every submission. We may not feature everything, but we appreciate your participation in the River Region community.
              </p>
            </div>

          </form>
        </div>
      </section>

    </div>
  )
}

// ── Sub-components ────────────────────────────────────────────────────────────

const inputSty: CSSProperties = {
  width: '100%',
  padding: '10px 14px',
  border: '1.5px solid rgba(0,0,0,0.12)',
  borderRadius: 8,
  fontSize: 14,
  color: '#2d1f14',
  backgroundColor: '#fff',
  outline: 'none',
  fontFamily: 'var(--font-dm-sans, sans-serif)',
  boxSizing: 'border-box',
}

function FieldRow({
  label, required, hint, children,
}: {
  label:     string
  required?: boolean
  hint?:     string
  children:  ReactNode
}) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#1a2744', marginBottom: 6 }}>
        {label}
        {required && <span style={{ color: '#c4622d', marginLeft: 3 }}>*</span>}
      </label>
      {children}
      {hint && <p style={{ fontSize: 11, color: '#999', marginTop: 5, lineHeight: 1.5, margin: '5px 0 0' }}>{hint}</p>}
    </div>
  )
}

function FieldInput({ field }: { field: SubmissionField }) {
  if (field.type === 'textarea') {
    return (
      <textarea
        name={field.id}
        required={field.required}
        placeholder={field.placeholder}
        rows={field.rows ?? 4}
        maxLength={field.maxLength}
        style={{ ...inputSty, resize: 'vertical', minHeight: `${(field.rows ?? 4) * 1.6}em` }}
      />
    )
  }

  if (field.type === 'select' && field.options) {
    return (
      <select name={field.id} required={field.required} style={inputSty}>
        <option value="">Select one…</option>
        {field.options.map(opt => (
          <option key={opt} value={opt}>{opt}</option>
        ))}
      </select>
    )
  }

  return (
    <input
      name={field.id}
      type={field.type}
      required={field.required}
      placeholder={field.placeholder}
      maxLength={field.maxLength}
      style={inputSty}
    />
  )
}
