// ── /submit/[type] ────────────────────────────────────────────────────────────
// Dynamic form renderer for all community submission types.
// Server component with a bound server action. Redirects to ?submitted=true
// on success and renders the thank-you view from the same route.

import type { Metadata }       from 'next'
import type { ReactNode }      from 'react'
import { redirect, notFound }  from 'next/navigation'
import Link                    from 'next/link'
import { ArrowLeft, ArrowRight, Camera, Clock, Users } from 'lucide-react'
import { createAdminClient }   from '@/lib/supabase/admin'
import {
  SUBMISSION_TYPES, getSubmissionType, TYPE_COLORS,
  type SubmissionField,
} from '@/lib/submissions'
import { uploadSubmissionPhoto } from '@/lib/submissions-photo'

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
  searchParams: Promise<{ submitted?: string; error?: string }>
}) {
  const { type }      = await params
  const { submitted, error: errorParam } = await searchParams

  const config = getSubmissionType(type)
  if (!config || config.externalUrl) notFound()

  const accentColor = TYPE_COLORS[type] ?? '#ef6442'

  // ── Server action ──────────────────────────────────────────────────────────

  async function submitForm(formData: FormData) {
    'use server'

    // Service-role client. Public form, so we sidestep RLS entirely
    // and rely on field validation in this handler to keep junk out.
    // (Previously this used the SSR anon client, which silently dropped
    // inserts on tables with restrictive RLS — same failure mode that
    // hit /admin/trending and /admin/community earlier.)
    const supabase = createAdminClient()

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

    let webImageUrl:   string | null = null
    let printImageUrl: string | null = null
    const photoUrls: Array<{ web: string; print: string }> = []
    if (currentConfig.photoUpload) {
      // formData.getAll('photo') handles both single-file (max=1) and
      // multi-file (max>1) cases — the input renders with the same name
      // either way. We cap at the configured max to keep both upload time
      // and storage bounded; extras silently get dropped.
      const maxCount = Math.max(1, currentConfig.photoMaxCount ?? 1)
      const all  = (formData.getAll('photo') as File[]).filter(f => f && f.size > 0).slice(0, maxCount)

      if (all.length === 0 && currentConfig.photoRequired) {
        redirect(`/submit/${type}?error=${encodeURIComponent('A photo is required for this submission.')}`)
      }

      for (const file of all) {
        try {
          const uploaded = await uploadSubmissionPhoto({
            file,
            submissionType: type,
            submitterName:  related_person_name ?? submitter_name,
          })
          photoUrls.push({ web: uploaded.webImageUrl, print: uploaded.printImageUrl })
        } catch (e) {
          const msg = encodeURIComponent(e instanceof Error ? e.message : 'Photo upload failed')
          redirect(`/submit/${type}?error=${msg}`)
        }
      }

      // First photo populates the legacy single-column fields so downstream
      // article rendering / print export keeps working without changes.
      if (photoUrls[0]) {
        webImageUrl   = photoUrls[0].web
        printImageUrl = photoUrls[0].print
      }
    }

    const { error: insertErr } = await supabase.from('community_submissions').insert({
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
      web_image_url:   webImageUrl,
      print_image_url: printImageUrl,
      // photo_urls captures every uploaded photo. The first matches
      // web_image_url/print_image_url (set above); the rest are extras.
      // Stored as JSONB array of { web, print } objects so the editor
      // can pull either when building the article hero / print spread.
      photo_urls:      photoUrls.length > 0 ? photoUrls : null,
      status: 'new',
    })

    if (insertErr) {
      // Log the real message to Vercel so the next failure is debuggable
      // instead of the form just "looking like it worked." Bounce the
      // submitter back with a friendly error so they don't think their
      // story landed when it didn't.
      console.error('[submit insert] failed:', type, insertErr.message)
      redirect(`/submit/${type}?error=${encodeURIComponent('Sorry — we couldn\'t save your submission. Please try again or email us directly.')}`)
    }

    // Fire-and-forget editor notification. Best-effort — never block the
    // submitter on email delivery. Logs failures to Vercel; the
    // submission row still landed.
    try {
      const { notifyEditorOfSubmission } = await import('@/lib/notify/submission-email')
      await notifyEditorOfSubmission({
        submissionType: type,
        submitterName:  submitter_name,
        submitterEmail: submitter_email,
        subjectLine:    related_person_name ?? related_business_name ?? related_school_name ?? '(no name given)',
        payload,
        photoCount:     photoUrls.length,
      })
    } catch (e) {
      console.error('[submit notify] failed:', e)
    }

    redirect(`/submit/${type}?submitted=true`)
  }

  // ── Thank-you state ────────────────────────────────────────────────────────

  if (submitted === 'true') {
    return (
      <main className="container py-12 md:py-16">
        <div className="max-w-xl mx-auto bg-card rounded-3xl border border-border/50 shadow-sm p-8 md:p-10 text-center">
          <div className="text-6xl mb-5" aria-hidden="true">{config.emoji}</div>
          <h1 className="text-3xl md:text-4xl font-black text-foreground leading-tight mb-3">
            Thank You!
          </h1>
          <p className="text-base text-foreground/80 leading-relaxed mb-2">
            Your {config.label.toLowerCase()} submission has been received.
          </p>
          <p className="text-sm text-muted-foreground leading-relaxed mb-8">
            {config.whatHappensNext}
          </p>

          {/* Thank-you photo reminder — ONLY shows on submission types
              where photos are emailed in (photoUpload === false). When
              uploads are wired (Play Ball, Student Spotlight, etc.) the
              photos already landed with the submission, so no reminder. */}
          {!config.photoUpload && (config.photoRequired || config.photoHint) && (
            <div className="bg-muted/40 border border-border/50 rounded-2xl px-5 py-4 mb-8 text-left">
              <p className="text-sm font-bold text-foreground mb-1 flex items-center gap-1.5">
                <Camera className="h-4 w-4" /> {config.photoLabel ?? 'Photo'}
                {config.photoRequired ? ' (Required)' : ' (Optional)'}
              </p>
              <p className="text-sm text-muted-foreground leading-relaxed">{config.photoHint}</p>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/submit"
              className="inline-flex items-center gap-1.5 rounded-full bg-primary text-primary-foreground font-bold text-sm px-5 py-2.5 hover:bg-primary/90 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" /> All Submission Types
            </Link>
            <Link
              href="/"
              className="inline-flex items-center rounded-full border border-border bg-card text-foreground font-semibold text-sm px-5 py-2.5 hover:bg-muted/40 transition-colors"
            >
              Go to Homepage
            </Link>
          </div>
        </div>
      </main>
    )
  }

  // ── Form state ─────────────────────────────────────────────────────────────

  const inputCls = 'w-full text-sm rounded-xl border border-border bg-card px-4 py-2.5 outline-none transition-colors focus:border-primary/60 focus:ring-2 focus:ring-primary/15'

  return (
    <main className="container py-8 space-y-8">

      {/* ── HERO — homepage-style rounded-3xl card with gradient ─────────── */}
      <section
        className="rounded-3xl border border-border/50 shadow-sm overflow-hidden bg-gradient-to-br from-primary/8 via-background to-secondary/6"
      >
        <div className="px-6 md:px-10 py-10 md:py-14">
          <Link
            href="/submit"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors mb-5"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> All Submission Types
          </Link>
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest mb-3" style={{ color: accentColor }}>
              <span className="text-base leading-none" aria-hidden="true">{config.emoji}</span>
              {config.group}
            </div>
            <h1 className="text-3xl md:text-5xl font-black text-foreground leading-tight mb-4">
              {config.headline}
            </h1>
            <p className="text-base md:text-lg text-muted-foreground leading-relaxed max-w-2xl">
              {config.description}
            </p>
          </div>
        </div>
      </section>

      {/* ── META STRIP (Who / Time) ──────────────────────────────────────── */}
      <section className="grid sm:grid-cols-2 gap-4">
        <div className="bg-card rounded-2xl border border-border/50 shadow-sm px-5 py-4 flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <Users className="h-4 w-4 text-primary" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Who Should Submit</p>
            <p className="text-sm text-foreground leading-snug">{config.whoShouldUse}</p>
          </div>
        </div>
        <div className="bg-card rounded-2xl border border-border/50 shadow-sm px-5 py-4 flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-secondary/10 flex items-center justify-center shrink-0">
            <Clock className="h-4 w-4 text-secondary" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Time</p>
            <p className="text-sm text-foreground leading-snug">About {config.estimatedTime}</p>
          </div>
        </div>
      </section>

      {/* ── FORM ─────────────────────────────────────────────────────────── */}
      <section className="max-w-3xl">

        {errorParam && (
          <div className="rounded-2xl border-2 border-rose-200 bg-rose-50 px-5 py-4 mb-6">
            <p className="text-sm font-bold text-rose-900 mb-1">Submission didn&apos;t go through</p>
            <p className="text-sm text-rose-800/90 leading-relaxed">{decodeURIComponent(errorParam)}</p>
          </div>
        )}

        <form action={submitForm} encType="multipart/form-data" className="flex flex-col gap-6">

          <FormCard title="About You">
            <FormRow label="Your Name" required>
              <input name="submitter_name" type="text" required placeholder="Jane Smith" className={inputCls} />
            </FormRow>
            <FormRow label="Your Email" required hint="We'll only contact you about this submission.">
              <input name="submitter_email" type="email" required placeholder="jane@example.com" className={inputCls} />
            </FormRow>
            <FormRow label="Your Phone (optional)">
              <input name="submitter_phone" type="tel" placeholder="(334) 555-0100" className={inputCls} />
            </FormRow>
          </FormCard>

          <FormCard title={`${config.label} Details`} accentColor={accentColor}>
            {config.fields.map(field => (
              <FormRow key={field.id} label={field.label} required={field.required} hint={field.hint}>
                <FieldInput field={field} inputCls={inputCls} />
              </FormRow>
            ))}
          </FormCard>

          {/* Photo upload or hint */}
          {config.photoUpload ? (
            <div
              className="rounded-3xl border-2 bg-card shadow-sm px-6 py-6 md:px-8"
              style={{ borderColor: `${accentColor}40` }}
            >
              <h2 className="text-lg font-bold text-foreground mb-1 flex items-center gap-2">
                <Camera className="h-5 w-5" />
                {config.photoLabel ?? 'Photo'}{config.photoRequired ? ' *' : ''}
              </h2>
              {config.photoHint && (
                <p className="text-sm text-muted-foreground leading-relaxed mb-4">{config.photoHint}</p>
              )}
              <input
                type="file"
                name="photo"
                accept="image/jpeg,image/png,image/webp,image/gif,image/avif,image/heic,image/heif"
                required={config.photoRequired}
                multiple={(config.photoMaxCount ?? 1) > 1}
                className="block w-full text-sm text-foreground/80 file:mr-3 file:rounded-md file:border-0 file:bg-muted file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-foreground hover:file:bg-muted/70"
              />
              <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                {(config.photoMaxCount ?? 1) > 1
                  ? `Up to ${config.photoMaxCount} photos. Hold Ctrl/Cmd to select multiple. Max 15 MB each.`
                  : 'Max 15 MB.'}
                {' '}JPG, PNG, HEIC, or WebP. We&apos;ll save high-resolution copies for print and web-optimized copies for the website.
              </p>
            </div>
          ) : (config.photoRequired || config.photoHint) ? (
            <div
              className="rounded-2xl border px-5 py-4"
              style={{ backgroundColor: `${accentColor}0d`, borderColor: `${accentColor}33` }}
            >
              <p className="text-sm font-bold text-foreground mb-1 flex items-center gap-1.5">
                <Camera className="h-4 w-4" />
                {config.photoLabel ?? 'Photo'}{config.photoRequired ? ' (Required)' : ' (Optional)'}
              </p>
              <p className="text-sm text-muted-foreground leading-relaxed">{config.photoHint}</p>
            </div>
          ) : null}

          {/* Submit */}
          <div className="pt-1">
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 rounded-full text-white font-bold text-sm px-7 py-3 shadow-sm transition-opacity hover:opacity-90"
              style={{ backgroundColor: accentColor }}
            >
              Submit {config.shortLabel} <ArrowRight className="h-4 w-4" />
            </button>
            <p className="text-xs text-muted-foreground leading-relaxed mt-3 max-w-md">
              Our editorial team reads every submission. We may not feature everything, but we appreciate your participation in the River Region community.
            </p>
          </div>

        </form>
      </section>
    </main>
  )
}

// ── Sub-components ────────────────────────────────────────────────────────────

function FormCard({ title, accentColor, children }: { title: string; accentColor?: string; children: ReactNode }) {
  return (
    <div
      className="rounded-3xl border border-border/50 bg-card shadow-sm px-6 py-6 md:px-8 md:py-7"
      style={accentColor ? { borderTopWidth: 4, borderTopColor: accentColor } : undefined}
    >
      <h2 className="text-lg font-bold text-foreground mb-5">{title}</h2>
      <div className="flex flex-col gap-4">{children}</div>
    </div>
  )
}

function FormRow({ label, required, hint, children }: {
  label: string; required?: boolean; hint?: string; children: ReactNode
}) {
  return (
    <div>
      <label className="block text-xs font-semibold text-foreground mb-1.5">
        {label}{required && <span className="text-primary ml-0.5">*</span>}
      </label>
      {children}
      {hint && <p className="text-[11px] text-muted-foreground mt-1.5 leading-relaxed">{hint}</p>}
    </div>
  )
}

function FieldInput({ field, inputCls }: { field: SubmissionField; inputCls: string }) {
  if (field.type === 'textarea') {
    return (
      <textarea
        name={field.id}
        required={field.required}
        placeholder={field.placeholder}
        rows={field.rows ?? 4}
        maxLength={field.maxLength}
        className={`${inputCls} resize-y`}
        style={{ minHeight: `${(field.rows ?? 4) * 1.6}em` }}
      />
    )
  }

  if (field.type === 'select' && field.options) {
    return (
      <select name={field.id} required={field.required} className={inputCls} defaultValue="">
        <option value="" disabled>Select one…</option>
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
      className={inputCls}
    />
  )
}
