// ── /admin/community/[id]/edit ────────────────────────────────────────────────
// Operator editing for community submissions.
// Fixes typos, adds phone/email-received info, corrects routing.
// Payload is edited field-by-field from config — no raw JSON exposed.

import type { Metadata }      from 'next'
import type { ReactNode }     from 'react'
import { notFound, redirect } from 'next/navigation'
import Link                   from 'next/link'
import { createClient }       from '@/lib/supabase/server'
import {
  getSubmissionType, TYPE_COLORS,
  type SubmissionField,
} from '@/lib/submissions'

export const metadata: Metadata = { title: 'Edit Submission — Admin' }

// ── Types ─────────────────────────────────────────────────────────────────────

interface PhotoEntry { url: string; caption?: string; alt?: string }

interface FullSubmission {
  id:                    string
  submission_type:       string
  target_publication:    string
  target_market:         string | null
  issue_month:           string | null
  issue_year:            number | null
  submitter_name:        string
  submitter_email:       string
  submitter_phone:       string | null
  payload:               Record<string, string>
  photo_urls:            PhotoEntry[]
  internal_priority:     string
  assigned_to:           string | null
  editor_notes:          string | null
}

// ── Static data ───────────────────────────────────────────────────────────────

const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
]

const PUBLICATIONS = [
  { value: 'rrp',  label: 'RRP — River Region Parents'      },
  { value: 'mbp',  label: 'MBP — Mobile Bay Parents'        },
  { value: 'aop',  label: 'AOP — Auburn Opelika Parents'    },
  { value: 'esp',  label: 'ESP — Eastern Shore Parents'     },
  { value: 'gpp',  label: 'GPP — Greater Pensacola Parents' },
  { value: 'boom', label: 'BOOM — River Region Boom'        },
]

// ── Style helpers ─────────────────────────────────────────────────────────────

const iCls = 'w-full text-sm border border-portal-border rounded-lg px-3 py-2 outline-none focus:border-portal-blue transition-colors'
const iClsTA = `${iCls} resize-vertical`

// ── Sub-components (server-safe, no hooks) ────────────────────────────────────

function Section({ title, accentColor, children }: {
  title: string; accentColor: string; children: ReactNode
}) {
  return (
    <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden" style={{ borderTop: `3px solid ${accentColor}` }}>
      <div className="px-6 py-4 border-b border-gray-50">
        <h2 className="text-sm font-bold text-portal-text">{title}</h2>
      </div>
      <div className="px-6 py-5 space-y-4">{children}</div>
    </div>
  )
}

function FormRow({ label, required, hint, children }: {
  label: string; required?: boolean; hint?: string; children: ReactNode
}) {
  return (
    <div>
      <label className="block text-xs font-semibold text-portal-sub mb-1.5">
        {label}
        {required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      {children}
      {hint && <p className="text-[11px] text-portal-muted mt-1 leading-relaxed">{hint}</p>}
    </div>
  )
}

function FieldInput({ field, value }: { field: SubmissionField; value: string }) {
  if (field.type === 'textarea') {
    return (
      <textarea
        name={field.id}
        defaultValue={value}
        placeholder={field.placeholder}
        rows={field.rows ?? 4}
        maxLength={field.maxLength}
        className={iClsTA}
      />
    )
  }
  if (field.type === 'select' && field.options) {
    return (
      <select name={field.id} defaultValue={value} className={iCls}>
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
      defaultValue={value}
      placeholder={field.placeholder}
      maxLength={field.maxLength}
      className={iCls}
    />
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function EditSubmissionPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const supabase = await createClient()

  const { data, error } = await supabase
    .from('community_submissions')
    .select('id, submission_type, target_publication, target_market, issue_month, issue_year, submitter_name, submitter_email, submitter_phone, payload, photo_urls, internal_priority, assigned_to, editor_notes')
    .eq('id', id)
    .single()

  if (error || !data) notFound()

  const sub    = data as unknown as FullSubmission
  const config = getSubmissionType(sub.submission_type)
  if (!config) notFound()

  const accentColor = TYPE_COLORS[sub.submission_type] ?? '#374151'
  const photoText   = (sub.photo_urls ?? []).map(p => p.url).join('\n')

  // ── Server action ──────────────────────────────────────────────────────────

  async function saveEdits(formData: FormData) {
    'use server'

    const supabase = await createClient()

    // Fetch existing payload so unknown keys aren't lost on save
    const { data: existing } = await supabase
      .from('community_submissions')
      .select('payload')
      .eq('id', id)
      .single()

    const existingPayload                    = (existing?.payload ?? {}) as Record<string, string>
    const updatedPayload: Record<string, string> = { ...existingPayload }

    let related_person_name:   string | null = null
    let related_business_name: string | null = null
    let related_school_name:   string | null = null
    let related_sport:         string | null = null

    const submissionType  = formData.get('submission_type') as string
    const currentConfig   = getSubmissionType(submissionType)

    if (currentConfig) {
      for (const field of currentConfig.fields) {
        const val = (formData.get(field.id) as string) ?? ''
        updatedPayload[field.id] = val
        if (field.coreField === 'related_person_name')   related_person_name   = val || null
        if (field.coreField === 'related_business_name') related_business_name = val || null
        if (field.coreField === 'related_school_name')   related_school_name   = val || null
        if (field.coreField === 'related_sport')         related_sport         = val || null
      }
    }

    // Submitter
    const submitter_name  = (formData.get('submitter_name')  as string) || ''
    const submitter_email = (formData.get('submitter_email') as string) || ''
    const submitter_phone = (formData.get('submitter_phone') as string) || null

    // Routing
    const target_publication = (formData.get('target_publication') as string) || 'rrp'
    const target_market      = (formData.get('target_market')      as string) || null
    const issue_month        = (formData.get('issue_month')        as string) || null
    const iy                 = (formData.get('issue_year')         as string) || ''
    const issue_year         = iy ? parseInt(iy) : null

    // Assignment
    const internal_priority = (formData.get('internal_priority') as string) || 'normal'
    const assigned_to       = (formData.get('assigned_to')       as string) || null

    // Photos — one URL per line → [{url}] objects
    const photosRaw  = (formData.get('photo_urls') as string) || ''
    const photo_urls = photosRaw
      .split('\n')
      .map(l => l.trim())
      .filter(Boolean)
      .map(url => ({ url }))

    // Editor notes + audit timestamp
    const noteText     = ((formData.get('editor_notes') as string) || '').trimEnd()
    const today        = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    const auditLine    = `[Edited by operator on ${today}]`
    const editor_notes = noteText ? `${noteText}\n${auditLine}` : auditLine

    await supabase
      .from('community_submissions')
      .update({
        submitter_name,
        submitter_email,
        submitter_phone:      submitter_phone || null,
        target_publication,
        target_market:        target_market || null,
        issue_month:          issue_month || null,
        issue_year,
        internal_priority,
        assigned_to:          assigned_to || null,
        related_person_name,
        related_business_name,
        related_school_name,
        related_sport,
        payload:              updatedPayload,
        photo_urls,
        editor_notes,
      })
      .eq('id', id)

    redirect(`/admin/community/${id}`)
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <main className="p-6 max-w-[800px] mx-auto space-y-6 pb-16">

      {/* ── HEADER ──────────────────────────────────────────────────────── */}
      <div>
        <Link
          href={`/admin/community/${id}`}
          className="text-sm text-portal-muted hover:text-portal-text font-medium transition-colors"
        >
          ← Back to Submission
        </Link>
        <div className="mt-3 flex items-center gap-3">
          <span className="text-2xl">{config.emoji}</span>
          <div>
            <h1 className="text-xl font-bold text-portal-text tracking-tight">Edit Submission</h1>
            <p className="text-sm text-portal-sub">{config.label}</p>
          </div>
        </div>
      </div>

      {/* ── SAFETY BANNER ───────────────────────────────────────────────── */}
      <div className="bg-portal-amber-lt border border-amber-200 rounded-2xl px-5 py-4">
        <p className="text-sm font-bold text-amber-900 mb-1">⚠️ Operator Edit Mode</p>
        <p className="text-sm text-portal-amber leading-relaxed">
          Edits should preserve the submitter's intent. Do not rewrite their story here — use the editorial draft workflow later.
          This form is for fixing typos, adding info received by phone or email, and correcting routing details.
        </p>
      </div>

      {/* ── FORM ────────────────────────────────────────────────────────── */}
      <form action={saveEdits} className="space-y-5">
        <input type="hidden" name="submission_type" value={sub.submission_type} />

        {/* 1. Submitter Info */}
        <Section title="Submitter Information" accentColor={accentColor}>
          <FormRow label="Name" required>
            <input name="submitter_name" type="text" required defaultValue={sub.submitter_name} className={iCls} />
          </FormRow>
          <FormRow label="Email" required>
            <input name="submitter_email" type="email" required defaultValue={sub.submitter_email} className={iCls} />
          </FormRow>
          <FormRow label="Phone (optional)">
            <input name="submitter_phone" type="tel" defaultValue={sub.submitter_phone ?? ''} placeholder="(334) 555-0100" className={iCls} />
          </FormRow>
        </Section>

        {/* 2. Submission Answers */}
        {config.fields.length > 0 && (
          <Section title={`${config.label} Details`} accentColor={accentColor}>
            {config.fields.map(field => (
              <FormRow key={field.id} label={field.label} required={field.required} hint={field.hint}>
                <FieldInput field={field} value={sub.payload[field.id] ?? ''} />
              </FormRow>
            ))}
          </Section>
        )}

        {/* 3. Photos */}
        {(config.photoRequired || config.photoHint) && (
          <Section title={config.photoLabel ?? 'Photos'} accentColor={accentColor}>
            <FormRow
              label="Photo URLs"
              required={config.photoRequired}
              hint="Enter one URL per line. Captions can be added later by the editorial team."
            >
              <textarea
                name="photo_urls"
                defaultValue={photoText}
                placeholder={'https://example.com/photo.jpg\nhttps://example.com/photo2.jpg'}
                rows={4}
                className={iClsTA}
              />
            </FormRow>
            {config.photoHint && (
              <p className="text-xs text-portal-sub bg-portal-bg rounded-lg px-3 py-2 leading-relaxed">
                📷 {config.photoHint}
              </p>
            )}
          </Section>
        )}

        {/* 4. Routing */}
        <Section title="Issue Targeting" accentColor={accentColor}>
          <div className="grid grid-cols-2 gap-4">
            <FormRow label="Publication" required>
              <select name="target_publication" defaultValue={sub.target_publication} className={iCls}>
                {PUBLICATIONS.map(p => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
            </FormRow>
            <FormRow label="Market / City">
              <input
                name="target_market"
                type="text"
                defaultValue={sub.target_market ?? ''}
                placeholder="Montgomery"
                className={iCls}
              />
            </FormRow>
            <FormRow label="Issue Month">
              <select name="issue_month" defaultValue={sub.issue_month ?? ''} className={iCls}>
                <option value="">No preference</option>
                {MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </FormRow>
            <FormRow label="Issue Year">
              <input
                name="issue_year"
                type="number"
                defaultValue={sub.issue_year ?? ''}
                placeholder="2026"
                className={iCls}
              />
            </FormRow>
          </div>
        </Section>

        {/* 5. Assignment */}
        <Section title="Assignment" accentColor={accentColor}>
          <div className="grid grid-cols-2 gap-4">
            <FormRow label="Assigned To">
              <input
                name="assigned_to"
                type="text"
                defaultValue={sub.assigned_to ?? ''}
                placeholder="Operator name or email"
                className={iCls}
              />
            </FormRow>
            <FormRow label="Priority">
              <select name="internal_priority" defaultValue={sub.internal_priority} className={iCls}>
                <option value="low">Low</option>
                <option value="normal">Normal</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </FormRow>
          </div>
        </Section>

        {/* 6. Editor Notes */}
        <Section title="Editor Notes" accentColor={accentColor}>
          <p className="text-xs text-portal-muted -mt-1 mb-1">
            Internal only — never shown to submitters. A date stamp will be added automatically when you save.
          </p>
          <textarea
            name="editor_notes"
            defaultValue={sub.editor_notes ?? ''}
            placeholder="Notes for the editorial team…"
            rows={5}
            className={iClsTA}
          />
        </Section>

        {/* ── SAVE / CANCEL ────────────────────────────────────────────── */}
        <div className="flex gap-3 items-center pt-1">
          <button
            type="submit"
            className="px-7 py-2.5 bg-gray-900 text-white text-sm font-bold rounded-xl hover:bg-gray-700 transition-colors"
          >
            Save Changes
          </button>
          <Link
            href={`/admin/community/${id}`}
            className="px-7 py-2.5 bg-gray-100 text-portal-sub text-sm font-semibold rounded-xl hover:bg-gray-200 transition-colors"
          >
            Cancel
          </Link>
        </div>

      </form>
    </main>
  )
}
