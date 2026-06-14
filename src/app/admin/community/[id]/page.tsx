// ── /admin/community/[id] ─────────────────────────────────────────────────────
// Submission detail and editorial review workflow.
// Operator-friendly: guidance, checklist, status workflow, notes, assignment,
// publishing destination, and placeholder panels for AI and GHL.

import type { Metadata }         from 'next'
import { notFound, redirect }    from 'next/navigation'
import Link                      from 'next/link'
import { createAdminClient }     from '@/lib/supabase/admin'
import { generateCommunityDraft } from '@/lib/community-drafts'
import { ApproveAndPublishPanel } from './ApproveAndPublishPanel'
import { PhaseTracker }            from './PhaseTracker'
import { NextActionPanel }         from './NextActionPanel'
import { AIDraftPanel }            from './AIDraftPanel'
import { OutreachComposerPanel }   from './OutreachComposerPanel'
import { ReconsiderButton }        from './ReconsiderButton'
import { type Phase }              from '@/lib/submissions/phases'
import {
  STATUS_CONFIG, SUBMISSION_TYPES,
  type SubmissionStatus, type SubmissionTypeConfig, type SubmissionField,
} from '@/lib/submissions'

export const metadata: Metadata = { title: 'Submission Detail — Admin' }
// Without force-dynamic, edits in /admin/community/[id]/edit don't show
// when the user navigates back here — the page is cached.
export const dynamic = 'force-dynamic'

// ── Types ─────────────────────────────────────────────────────────────────────

interface PhotoEntry { url: string; caption?: string; alt?: string }

interface FullSubmission {
  id:                       string
  submission_type:          string
  target_publication:       string
  target_market:            string | null
  source_page:              string | null
  issue_month:              string | null
  issue_year:               number | null
  submitter_name:           string
  submitter_email:          string
  submitter_phone:          string | null
  related_person_name:      string | null
  related_business_name:    string | null
  related_school_name:      string | null
  related_sport:            string | null
  payload:                  Record<string, string>
  photo_urls:               PhotoEntry[]
  status:                   SubmissionStatus
  ai_draft_status:          string
  ai_draft_content:         string | null
  ai_prompt_used:           string | null
  editor_notes:             string | null
  internal_priority:        string
  assigned_to:              string | null
  editorial_deadline:       string | null
  ghl_contact_id:           string | null
  thank_you_sent_at:        string | null
  follow_up_sent_at:        string | null
  published_notice_sent_at: string | null
  published_url:            string | null
  published_at:             string | null
  created_at:               string
  updated_at:               string
}

// ── Static data ────────────────────────────────────────────────────────────────

const PUBLISH_DEST: Record<string, {
  destination: string; section: string; print: boolean; digital: boolean; notes: string
}> = {
  'teacher-of-the-month':    { destination: 'Teacher of the Month',    section: 'Monthly Column',     print: true,  digital: true,  notes: 'One teacher per month. Print magazine and website.' },
  'mom-to-mom':              { destination: 'Mom to Mom',              section: 'Monthly Column',     print: true,  digital: true,  notes: 'Profile with follow-up interview. Print and website.' },
  'grands-are-the-greatest': { destination: 'Grands Are the Greatest', section: 'Monthly Feature',    print: true,  digital: true,  notes: 'Profile with photo — a family keepsake. Print and website.' },
  'play-ball':               { destination: 'Play Ball',               section: 'Monthly Column',     print: true,  digital: true,  notes: 'Athlete profile. Print and website.' },
  'student-spotlight':       { destination: 'Student Spotlight',       section: 'Feature / Roundup',  print: false, digital: true,  notes: 'Digital feature. May appear in print roundup by issue theme.' },
  'school-news':             { destination: 'School Bits',             section: 'Monthly Section',    print: true,  digital: true,  notes: 'Short news item. Print and website.' },
  'birthday-celebration':    { destination: 'Birthday Page',           section: 'Birthday Shoutouts', print: true,  digital: true,  notes: 'Birthday listing with photo. Print and website.' },
  'event-submission':        { destination: 'Things To Do',            section: 'Events Calendar',    print: false, digital: true,  notes: 'Online events calendar. May appear in print event listings.' },
  'parent-picks':            { destination: 'Parent Picks',            section: 'Monthly Section',    print: true,  digital: true,  notes: 'Business spotlight. Print and website.' },
  'boom-profile':            { destination: 'River Region Boom',       section: 'Profile Feature',    print: true,  digital: true,  notes: 'Profile with interview. Published in Boom magazine.' },
}

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']

// ── Derived data helpers ───────────────────────────────────────────────────────

interface CheckItem {
  key:      string
  label:    string
  present:  boolean
  required: boolean
}

function buildChecklist(sub: FullSubmission, config: SubmissionTypeConfig): CheckItem[] {
  const items: CheckItem[] = []

  for (const field of config.fields) {
    if (!field.required) continue
    const val = sub.payload[field.id]
    items.push({
      key:      field.id,
      label:    field.label,
      present:  !!val && val.trim().length > 0,
      required: true,
    })
  }

  if (config.photoRequired || config.photoHint) {
    items.push({
      key:      'photo',
      label:    config.photoLabel ?? 'Photo',
      present:  sub.photo_urls.length > 0,
      required: config.photoRequired,
    })
  }

  return items
}

interface GuidanceItem {
  icon:     string
  message:  string
  severity: 'info' | 'warning' | 'success' | 'critical'
}

function buildGuidance(
  sub: FullSubmission,
  config: SubmissionTypeConfig,
  checklist: CheckItem[],
): GuidanceItem[] {
  const items: GuidanceItem[] = []

  const missingRequired    = checklist.filter(c => c.required && !c.present)
  const photoItem          = checklist.find(c => c.key === 'photo')
  const missingReqPhoto    = !!(photoItem && !photoItem.present && photoItem.required)
  const missingOptPhoto    = !!(photoItem && !photoItem.present && !photoItem.required)
  const allComplete        = missingRequired.length === 0 && !missingReqPhoto

  // Status message
  const STATUS_MSG: Partial<Record<SubmissionStatus, GuidanceItem>> = {
    'new':           { icon: '🔍', severity: 'info',     message: 'New submission — review answers below and decide on next steps.' },
    'needs-review':  { icon: '📋', severity: 'info',     message: 'In the review queue. Check completeness, then begin editing or request info.' },
    'awaiting-info': { icon: '⏳', severity: 'warning',  message: 'Waiting on the submitter. Follow up if no reply within 5 business days.' },
    'in-progress':   { icon: '🔧', severity: 'info',     message: 'Being worked on. Move to editing when content is ready.' },
    'in-editing':    { icon: '✏️', severity: 'info',     message: 'In editing. Approve when content is polished and ready.' },
    'approved':      { icon: '✅', severity: 'success',  message: 'Approved. Schedule for an issue or publish online.' },
    'scheduled':     { icon: '📅', severity: 'success',  message: 'Scheduled. Confirm before the print deadline.' },
    'published':     { icon: '🌐', severity: 'success',  message: 'Published. Archive when done.' },
    'rejected':      { icon: '🚫', severity: 'warning',  message: 'Rejected. Archive when done.' },
  }

  const sg = STATUS_MSG[sub.status]
  if (sg) items.push(sg)

  // Missing required fields
  if (missingRequired.length > 0) {
    const fieldNames = missingRequired.map(c => c.label).join(', ')
    items.push({ icon: '⚠️', severity: 'critical', message: `Missing required info: ${fieldNames}.` })
  }

  // Photo
  if (missingReqPhoto) {
    items.push({ icon: '📷', severity: 'critical', message: `Photo required but not yet received. Ask submitter to email photos@riverregionparents.com.` })
  } else if (missingOptPhoto) {
    items.push({ icon: '📷', severity: 'warning', message: `No photo yet. A photo would strengthen this submission — consider requesting one.` })
  }

  // Completeness positive signal
  if (allComplete && (sub.status === 'new' || sub.status === 'needs-review')) {
    items.push({ icon: '✅', severity: 'success', message: 'Submission appears complete. Ready to begin editing or queue for AI draft.' })
  }

  return items
}

function recommendedNext(current: SubmissionStatus, allComplete: boolean): SubmissionStatus | null {
  const MAP: Partial<Record<SubmissionStatus, SubmissionStatus>> = {
    'new':           'needs-review',
    'needs-review':  allComplete ? 'in-editing' : 'awaiting-info',
    'awaiting-info': 'in-progress',
    'in-progress':   'in-editing',
    'in-editing':    'approved',
    'approved':      'scheduled',
    'scheduled':     'published',
    'published':     'archived',
  }
  return MAP[current] ?? null
}

function subjectName(sub: FullSubmission): string {
  return sub.related_person_name
    ?? sub.related_business_name
    ?? sub.related_school_name
    ?? 'Unnamed Submission'
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
}

/** Map legacy SubmissionStatus → portal badge class. Replaces the
 *  inline-styled STATUS_CONFIG colors (which painted the pill purple
 *  / orange — outside the portal vocabulary) with the tokenized
 *  badge classes from globals.css. */
function statusBadgeClass(status: SubmissionStatus): string {
  switch (status) {
    case 'new':            return 'badge-green'
    case 'needs-review':   return 'badge-rrp'
    case 'awaiting-info':  return 'badge-amber'
    case 'in-progress':    return 'badge-rrp'
    case 'in-editing':     return 'badge-amber'
    case 'ready-for-ai':   return 'badge-rrp'
    case 'ai-draft-ready': return 'badge-rrp'
    case 'approved':       return 'badge-green'
    case 'scheduled':      return 'badge-amber'
    case 'published':      return 'badge-gray'
    case 'rejected':       return 'badge-red'
    case 'archived':       return 'badge-gray'
    default:               return 'badge-gray'
  }
}

/** Convert a snake_case_key into a human-readable label. Used to
 *  render interview Q&A when the live submission_type_columns config
 *  isn't loaded on this page (cheap fallback — for the canonical
 *  labels, the future detail-page rewrite will join the type config). */
function humanize(key: string): string {
  return key
    .split('_')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

/** Page-side template substitution for the OutreachComposerPanel's
 *  initial values. Mirror of the server-side version in the
 *  /outreach API — kept in sync manually. */
function substituteTemplateClient(
  template: string | null,
  ctx: { typeLabel: string; brandName: string; nomineeName: string; nominator: string; pitch: string },
): string | null {
  if (!template) return null
  const nomineeFirst = ctx.nomineeName.split(' ')[0] || 'there'
  return template
    .replace(/\{\{\s*nominee_first\s*\}\}/g,    nomineeFirst)
    .replace(/\{\{\s*nominee_name\s*\}\}/g,     ctx.nomineeName)
    .replace(/\{\{\s*nominator_name\s*\}\}/g,   ctx.nominator || 'A community member')
    .replace(/\{\{\s*nomination_pitch\s*\}\}/g, ctx.pitch || '')
    .replace(/\{\{\s*brand_name\s*\}\}/g,       ctx.brandName)
    .replace(/\{\{\s*type_label\s*\}\}/g,       ctx.typeLabel)
    .replace(/\{\{\s*ops_email\s*\}\}/g,        '')
    .replace(/\{\{\s*interview_url\s*\}\}/g,    '')
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function SubmissionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('community_submissions')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !data) notFound()

  const sub    = data as unknown as FullSubmission
  const config = SUBMISSION_TYPES.find(t => t.type === sub.submission_type)
  if (!config) notFound()

  // accentColor (TYPE_COLORS lookup) was used for a color stripe on
  // top of the Nominator's Submission card. Removed — accent stripes
  // aren't part of the Ads & Sponsors design vocabulary the rest of
  // admin follows.
  const sc           = STATUS_CONFIG[sub.status]
  const checklist    = buildChecklist(sub, config)
  const guidance     = buildGuidance(sub, config, checklist)
  const missingReq   = checklist.filter(c => c.required && !c.present)
  const photoItem    = checklist.find(c => c.key === 'photo')
  const allComplete  = missingReq.length === 0 && !(photoItem && !photoItem.present && photoItem.required)
  const nextStatus   = recommendedNext(sub.status, allComplete)
  const publishDest  = PUBLISH_DEST[sub.submission_type]

  // ── Phase + type config from the new workflow tables (migrations 180+181)
  // Both are optional — the page degrades cleanly if migrations haven't
  // been applied yet (legacy environments just see no phase tracker).
  const subAny = sub as unknown as Record<string, unknown>
  const currentPhase = ((subAny.phase as Phase) ?? 'nominated') as Phase
  const hasInterview = !!subAny.interview_submitted_at
  const hasDraft     = !!subAny.ai_draft_content && String(subAny.ai_draft_content).trim().length > 0

  const { data: typeConfig } = await supabase
    .from('submission_type_columns')
    .select('needs_outreach, article_format, label, outreach_email_subject, outreach_email_body')
    .eq('submission_type', sub.submission_type)
    .maybeSingle()
  type TypeCfgRow = {
    needs_outreach?: boolean
    article_format?: string
    label?: string | null
    outreach_email_subject?: string | null
    outreach_email_body?:    string | null
  }
  const tc             = typeConfig as TypeCfgRow | null
  const needsOutreach  = tc?.needs_outreach ?? true
  const articleFormat  = tc?.article_format ?? 'profile'
  const typeLabel      = tc?.label ?? sub.submission_type.replace(/-/g, ' ')

  // Pre-substitute the outreach template with this submission's data
  // so the OutreachComposerPanel can show a ready-to-edit preview.
  const isParentsBrand = sub.target_publication !== 'rr50plus' && sub.target_publication !== 'boom'
  const brandDisplayName =
    sub.target_publication === 'rr50plus' ? 'River Region 50+'
    : sub.target_publication === 'rrp'    ? 'River Region Parents'
    : sub.target_publication === 'boom'   ? 'River Region 50+'
    : 'River Region Parents'
  const nomineeName = (sub.related_person_name
                   || sub.related_business_name
                   || sub.related_school_name
                   || (subAny.nominee_name as string | null)
                   || sub.submitter_name
                   || 'there') as string
  const initialOutreachSubject = substituteTemplateClient(
    tc?.outreach_email_subject ?? null,
    { typeLabel, brandName: brandDisplayName, nomineeName, nominator: sub.submitter_name ?? '', pitch: ((subAny.excerpt as string | null) ?? '') },
  ) ?? `You were nominated for ${typeLabel} in ${brandDisplayName}!`
  const initialOutreachBody = substituteTemplateClient(
    tc?.outreach_email_body ?? null,
    { typeLabel, brandName: brandDisplayName, nomineeName, nominator: sub.submitter_name ?? '', pitch: ((subAny.excerpt as string | null) ?? '') },
  ) ?? `<p>Hi ${nomineeName.split(' ')[0]},</p><p>${sub.submitter_name ?? 'A community member'} nominated you for ${typeLabel} in ${brandDisplayName}. Reply if you're interested.</p>`
  void isParentsBrand // reserved for future per-brand styling tweaks

  // ── Server actions ─────────────────────────────────────────────────────────

  async function updateStatus(formData: FormData) {
    'use server'
    const supabase  = createAdminClient()
    const newStatus = formData.get('status') as string
    await supabase.from('community_submissions').update({ status: newStatus }).eq('id', id)
    redirect(`/admin/community/${id}`)
  }

  async function saveEditorNotes(formData: FormData) {
    'use server'
    const supabase = createAdminClient()
    const notes    = formData.get('editor_notes') as string
    await supabase.from('community_submissions').update({ editor_notes: notes || null }).eq('id', id)
    redirect(`/admin/community/${id}`)
  }

  async function saveAssignment(formData: FormData) {
    'use server'
    const supabase          = createAdminClient()
    const assigned_to       = (formData.get('assigned_to')       as string) || null
    const internal_priority =  formData.get('internal_priority') as string
    const issue_month       = (formData.get('issue_month')       as string) || null
    const iy                = (formData.get('issue_year')        as string)
    const issue_year        = iy ? parseInt(iy) : null
    await supabase
      .from('community_submissions')
      .update({ assigned_to, internal_priority, issue_month, issue_year })
      .eq('id', id)
    redirect(`/admin/community/${id}`)
  }

  // AI draft generation — calls Claude, writes result to ai_draft_content
  async function generateDraft(_formData: FormData) {
    'use server'
    await generateCommunityDraft(id)
    redirect(`/admin/community/${id}`)
  }

  async function clearDraft(_formData: FormData) {
    'use server'
    const supabase = createAdminClient()
    await supabase
      .from('community_submissions')
      .update({ ai_draft_content: null, ai_draft_status: 'none', ai_prompt_used: null })
      .eq('id', id)
    redirect(`/admin/community/${id}`)
  }

  async function markForEditing(_formData: FormData) {
    'use server'
    const supabase = createAdminClient()
    await supabase
      .from('community_submissions')
      .update({ status: 'in-editing' })
      .eq('id', id)
    redirect(`/admin/community/${id}`)
  }

  // Saves operator edits to the AI draft; marks it as 'edited' (human-touched).
  async function saveDraftEdits(formData: FormData) {
    'use server'
    const supabase      = createAdminClient()
    const draftContent  = formData.get('draft_content') as string

    const { data: cur } = await supabase
      .from('community_submissions')
      .select('editor_notes')
      .eq('id', id)
      .single()

    const today      = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    const auditLine  = `[AI draft edited by operator on ${today}]`
    const baseNotes  = ((cur?.editor_notes as string | null) ?? '').trimEnd()
    const editor_notes = baseNotes ? `${baseNotes}\n${auditLine}` : auditLine

    await supabase
      .from('community_submissions')
      .update({ ai_draft_content: draftContent, ai_draft_status: 'edited', editor_notes })
      .eq('id', id)
    redirect(`/admin/community/${id}`)
  }

  // Moves submission into the editorial pipeline queue (status = 'ai-draft-ready').
  async function markReadyForEditorial(_formData: FormData) {
    'use server'
    const supabase = createAdminClient()
    await supabase
      .from('community_submissions')
      .update({ status: 'ai-draft-ready' })
      .eq('id', id)
    redirect(`/admin/community/${id}`)
  }

  // ── Severity colors ────────────────────────────────────────────────────────

  const SEV_CLS: Record<string, string> = {
    critical: 'bg-portal-red-lt border-portal-red/30 text-portal-red',
    warning:  'bg-portal-amber-lt border-portal-amber/30 text-portal-amber',
    success:  'bg-portal-green-lt border-portal-green/30 text-portal-green',
    info:     'bg-portal-blue-lt border-portal-blue/20 text-portal-blue',
  }

  // ── Draft state helpers ────────────────────────────────────────────────────

  const DRAFT_STATUS_LABELS: Record<string, string> = {
    'none':       'Not Started',
    'queued':     'Queued',
    'generating': 'Generating',
    'ready':      'Ready',
    'edited':     'Edited',
    'needs_info': 'Missing Info',
    'failed':     'Failed',
  }

  const isDraftEditable =
    ['ready', 'edited'].includes(sub.ai_draft_status) || sub.status === 'in-editing'

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <main className="flex-1 min-h-0 overflow-y-auto p-6 max-w-[1200px] mx-auto space-y-6 pb-16 w-full">

      {/* ── HEADER ──────────────────────────────────────────────────────── */}
      <div>
        <Link href="/admin/community" className="text-sm text-portal-sub hover:text-portal-text font-medium transition-colors">
          ← Community Submissions
        </Link>
        <div className="mt-4 flex items-start gap-4 flex-wrap">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className="text-2xl">{config.emoji}</span>
              <span className="text-xs font-bold text-portal-sub uppercase tracking-wide">{config.label}</span>
              {/* Status badge — uses portal badge classes mapped from
                  the legacy status string. Previously rendered with
                  inline-styled STATUS_CONFIG.bg/color which painted
                  it purple/orange — outside the portal vocabulary. */}
              <span className={`badge ${statusBadgeClass(sub.status)}`}>
                {sc?.label ?? sub.status}
              </span>
              {sub.internal_priority !== 'normal' && (
                <span className={`badge ${
                  sub.internal_priority === 'urgent' ? 'badge-red' : 'badge-amber'
                }`}>
                  ↑ {sub.internal_priority}
                </span>
              )}
            </div>
            <h1 className="text-2xl font-bold text-portal-text tracking-tight">{subjectName(sub)}</h1>
            <p className="text-sm text-portal-sub mt-1">
              {config.group} · Submitted {fmtDate(sub.created_at)} by{' '}
              <span className="font-medium text-portal-text">{sub.submitter_name}</span>
            </p>
          </div>
          <div className="shrink-0 flex gap-2 items-center">
            <Link
              href={`/admin/community/${id}/edit`}
              className="text-xs text-portal-sub hover:text-portal-text underline"
            >
              Edit raw fields
            </Link>
          </div>
        </div>
      </div>

      {/* ── REJECTED BANNER ──────────────────────────────────────────────── */}
      {/* Surfaces the editor's reason + Reconsider button at the top so
          a rejected row is unambiguous on arrival. The Reconsider
          button is a small client island; the banner itself renders
          server-side. */}
      {currentPhase === 'rejected' && (
        <div className="bg-portal-red-lt border border-portal-red rounded-lg" style={{ borderLeftWidth: 4, padding: 16 }}>
          <div className="flex items-start gap-3 flex-wrap">
            <div className="flex-1 min-w-0">
              <div className="text-portal-red fw-700" style={{ fontSize: 13, marginBottom: 4 }}>
                Rejected{subAny.rejected_at ? ` ${new Date(subAny.rejected_at as string).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}` : ''}
              </div>
              {subAny.rejection_reason ? (
                <div className="text-portal-text" style={{ fontSize: 13, lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
                  {subAny.rejection_reason as string}
                </div>
              ) : (
                <div className="text-portal-sub" style={{ fontSize: 12, fontStyle: 'italic' }}>
                  No reason was recorded.
                </div>
              )}
            </div>
            <ReconsiderButton submissionId={sub.id} />
          </div>
        </div>
      )}

      {/* ── PHASE TRACKER ────────────────────────────────────────────────── */}
      {/* Where is this submission in the multi-actor workflow? The tracker
          gives a visual at-a-glance + the right column's NextActionPanel
          tells the editor exactly what to click next. */}
      <PhaseTracker currentPhase={currentPhase} needsOutreach={needsOutreach} />

      {/* ── TWO-COLUMN BODY ──────────────────────────────────────────────── */}
      <div className="flex gap-6 items-start flex-wrap">

        {/* ── LEFT COLUMN: Content ────────────────────────────────────── */}
        <div className="flex-1 min-w-[320px] space-y-4">

          {/* Routing / meta — collapsed by default so the
              workflow content (Nominator's Submission + Interview +
              AI Draft) gets above-the-fold real estate. Click to
              expand when you actually need the routing details. */}
          <details className="bg-white border border-portal-border rounded-lg overflow-hidden">
            <summary
              className="px-5 py-3 text-xs font-bold text-portal-sub cursor-pointer hover:bg-portal-bg uppercase tracking-wide select-none"
              style={{ listStyle: 'none' }}
            >
              ▸ Routing &amp; targeting · {sub.target_publication?.toUpperCase() ?? '—'} · {sub.issue_month ?? 'no month set'}
            </summary>
            <div className="px-5 pb-4 pt-1">
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: 'Publication', val: sub.target_publication?.toUpperCase() ?? '—' },
                  { label: 'Market',      val: sub.target_market ?? '—'               },
                  { label: 'Source',      val: sub.source_page   ?? '—'               },
                  { label: 'Issue Month', val: sub.issue_month   ?? 'Not set'         },
                  { label: 'Issue Year',  val: sub.issue_year?.toString() ?? 'Not set'},
                  { label: 'Assigned',    val: sub.assigned_to   ?? 'Unassigned'      },
                ].map(({ label, val }) => (
                  <div key={label}>
                    <p className="text-[10px] font-semibold text-portal-sub uppercase tracking-wide">{label}</p>
                    <p className="text-sm font-medium text-portal-text mt-0.5 truncate">{val}</p>
                  </div>
                ))}
              </div>
            </div>
          </details>

          {/* Submitter */}
          <div className="bg-white border border-portal-border rounded-lg p-5">
            <h2 className="text-xs font-bold text-portal-sub uppercase tracking-wide mb-3">Submitter</h2>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-portal-row-hover flex items-center justify-center text-base font-bold text-portal-sub shrink-0">
                {sub.submitter_name.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="text-sm font-semibold text-portal-text">{sub.submitter_name}</p>
                <a href={`mailto:${sub.submitter_email}`} className="text-xs text-portal-blue hover:underline">
                  {sub.submitter_email}
                </a>
                {sub.submitter_phone && (
                  <p className="text-xs text-portal-sub mt-0.5">{sub.submitter_phone}</p>
                )}
              </div>
            </div>
          </div>

          {/* Nominator's Submission — renders the payload DIRECTLY
              instead of filtering against config.fields. Earlier
              version filtered config.fields by which keys existed in
              payload, but our nomination forms (added later) use
              their own key set (why_nominate, nominee_email, etc.)
              that don't match the original "apply yourself" config
              fields. Result: the panel said "didn't fill anything"
              while the RAW SUBMISSION DATA accordion below proved
              otherwise. New approach: walk the payload, prefer the
              config label when a key matches, humanize the key when
              it doesn't. Drops the separate RAW accordion entirely. */}
          <div className="bg-white border border-portal-border rounded-lg overflow-hidden">
            <div className="p-5">
              {(() => {
                // Pull every payload entry that actually has content.
                // Strings only — skip arrays/objects (those live in
                // dedicated cards: photos, interview, etc.).
                const entries = Object.entries(sub.payload ?? {})
                  .filter(([, v]) => typeof v === 'string' && v.trim().length > 0)

                // Build a lookup so we use the config's label when the
                // key happens to match a known form field.
                const fieldByKey = new Map<string, SubmissionField>(
                  config.fields.map(f => [f.id, f]),
                )

                // Surface required fields the nominator left blank.
                const missingRequired = config.fields.filter(
                  (f: SubmissionField) =>
                    f.required &&
                    !(typeof sub.payload[f.id] === 'string' && sub.payload[f.id].trim().length > 0),
                )

                if (entries.length === 0) {
                  return (
                    <>
                      <h2 className="text-xs font-bold text-portal-sub uppercase tracking-wide mb-2">Nominator&apos;s Submission</h2>
                      <p className="text-sm text-portal-sub italic">
                        The nominator submitted only the basics — see Submitter above.
                      </p>
                    </>
                  )
                }

                return (
                  <>
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-xs font-bold text-portal-sub uppercase tracking-wide">Nominator&apos;s Submission</h2>
                      <span className="text-[10px] text-portal-sub">
                        {entries.length} field{entries.length === 1 ? '' : 's'} answered
                      </span>
                    </div>
                    <div className="space-y-5">
                      {entries.map(([key, val]) => {
                        const field    = fieldByKey.get(key)
                        const label    = field?.label ?? humanize(key)
                        const isLong   = (val as string).length > 80 || (val as string).includes('\n')
                        return (
                          <div key={key}>
                            <p className="text-xs font-semibold text-portal-sub mb-1">{label}</p>
                            <p className={`text-sm text-portal-text leading-relaxed ${isLong ? 'whitespace-pre-wrap' : ''}`}>
                              {val as string}
                            </p>
                          </div>
                        )
                      })}
                    </div>
                    {missingRequired.length > 0 && (
                      <div className="alert alert-warning" style={{ marginTop: 16, fontSize: 11 }}>
                        <strong>Missing required from the nominator:</strong>
                        <ul style={{ marginTop: 6, paddingLeft: 18, lineHeight: 1.6 }}>
                          {missingRequired.map((f: SubmissionField) => (
                            <li key={f.id}>{f.label}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </>
                )
              })()}
            </div>
          </div>

          {/* Nominee Interview — only renders when the nominee has
              actually submitted their /interview/[token] form. Shows
              their Q&A responses + their uploaded images so the
              editor (or the AI drafter) has the full picture. */}
          {(() => {
            const responses = (subAny.interview_responses as Record<string, string> | null) ?? {}
            const images    = (subAny.interview_image_urls as Array<{ url: string; caption?: string }> | null) ?? []
            const hasAny    = Object.keys(responses).length > 0 || images.length > 0
            if (!hasAny) {
              if (currentPhase === 'outreach-sent' || currentPhase === 'interview-sent' || currentPhase === 'nominee-accepted') {
                return (
                  <div className="bg-white border border-portal-border rounded-lg p-5">
                    <h2 className="text-xs font-bold text-portal-sub uppercase tracking-wide mb-2">Nominee Interview</h2>
                    <p className="text-sm text-portal-sub italic">
                      Waiting on the nominee&apos;s interview form. {currentPhase === 'interview-sent' ? 'Form was sent — they have the link.' : 'Send the interview form when they accept.'}
                    </p>
                  </div>
                )
              }
              return null
            }
            return (
              <div className="bg-white border border-portal-border rounded-lg p-5">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xs font-bold text-portal-sub uppercase tracking-wide">Nominee Interview</h2>
                  <span className="text-[10px] text-portal-green fw-700">
                    ✓ Submitted{subAny.interview_submitted_at ? ` ${fmtDate(subAny.interview_submitted_at as string)}` : ''}
                  </span>
                </div>
                <div className="space-y-5">
                  {Object.entries(responses).map(([key, ans]) => (
                    <div key={key}>
                      <p className="text-xs font-semibold text-portal-sub mb-1">{humanize(key)}</p>
                      <p className="text-sm text-portal-text leading-relaxed whitespace-pre-wrap">{ans}</p>
                    </div>
                  ))}
                </div>
                {images.length > 0 && (
                  <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--color-portal-border)' }}>
                    <p className="text-xs font-semibold text-portal-sub mb-2">Photos from nominee ({images.length})</p>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: 8 }}>
                      {images.map((img, i) => (
                        <a key={i} href={img.url} target="_blank" rel="noopener noreferrer">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={img.url} alt="" style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', borderRadius: 6, border: '1px solid var(--color-portal-border)' }} />
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )
          })()}

          {/* Photos */}
          <div className="bg-white border border-portal-border rounded-lg p-5">
            <h2 className="text-xs font-bold text-portal-sub uppercase tracking-wide mb-1">
              {config.photoLabel ?? 'Photos'}
              {config.photoRequired
                ? <span className="text-portal-red font-normal ml-1">(Required)</span>
                : config.photoHint
                ? <span className="text-portal-sub font-normal ml-1">(Optional)</span>
                : null}
            </h2>

            {sub.photo_urls.length > 0 ? (
              <div className="space-y-2 mt-3">
                {sub.photo_urls.map((p, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 bg-portal-bg rounded-lg">
                    <span className="text-xl">🖼️</span>
                    <div className="flex-1 min-w-0">
                      <a href={p.url} target="_blank" rel="noopener noreferrer"
                        className="text-xs text-portal-blue hover:underline truncate block">{p.url}</a>
                      {p.caption && <p className="text-xs text-portal-sub mt-0.5">{p.caption}</p>}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-3 space-y-2">
                <p className="text-sm text-portal-sub italic">No photos received yet.</p>
                {config.photoHint && (
                  <div className="alert alert-warning" style={{ fontSize: 12 }}>
                    <strong className="block mb-1">Instructions for submitter:</strong>
                    {config.photoHint}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* AI Draft — editable when ready or edited */}
          {sub.ai_draft_content && (
            <div className="bg-white border border-portal-border rounded-lg overflow-hidden">

              {/* Header */}
              <div className="px-5 py-4 border-b border-portal-border flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h2 className="text-xs font-bold text-portal-sub uppercase tracking-wide">AI Draft</h2>
                  <span className={`badge ${
                    sub.ai_draft_status === 'ready'       ? 'badge-rrp'
                    : sub.ai_draft_status === 'edited'    ? 'badge-green'
                    : sub.ai_draft_status === 'needs_info'? 'badge-amber'
                    : sub.ai_draft_status === 'generating'? 'badge-rrp'
                    : sub.ai_draft_status === 'failed'    ? 'badge-red'
                    : 'badge-gray'
                  }`}>
                    {DRAFT_STATUS_LABELS[sub.ai_draft_status] ?? sub.ai_draft_status}
                  </span>
                </div>
                {sub.ai_prompt_used && (
                  <span className="text-[10px] text-portal-sub font-mono">{sub.ai_prompt_used}</span>
                )}
              </div>

              {/* Warning — always visible when ready or edited */}
              {['ready', 'edited'].includes(sub.ai_draft_status) && (
                <div className="px-5 py-2.5 alert alert-warning" style={{ borderRadius: 0, fontSize: 12, margin: 0 }}>
                  AI-assisted draft. Verify all facts before publishing. Do not publish without human editorial approval.
                </div>
              )}

              {/* Editable form — when ready, edited, or submission is in-editing */}
              {isDraftEditable ? (
                <form action={saveDraftEdits}>
                  <div className="px-5 pt-4 pb-3">
                    <label className="block text-xs font-semibold text-portal-sub mb-1">
                      Edit Draft
                      <span className="ml-2 font-normal text-portal-sub">— not published</span>
                    </label>
                    <p className="text-[11px] text-portal-sub mb-2.5 leading-relaxed">
                      Edit for accuracy, tone, and local voice before approval. Changes are saved as a draft only.
                    </p>
                    <textarea
                      name="draft_content"
                      defaultValue={sub.ai_draft_content}
                      rows={14}
                      className="w-full text-sm border border-portal-border rounded-lg px-3.5 py-3 resize-vertical outline-none focus:border-portal-blue transition-colors leading-relaxed text-portal-text"
                    />
                  </div>
                  <div className="px-5 pb-4 flex items-center justify-between border-t border-portal-border pt-3">
                    <button
                      type="submit"
                      className="px-5 py-2 bg-portal-navy text-white text-xs font-bold rounded-lg hover:opacity-90 transition-opacity"
                    >
                      Save Edited Draft
                    </button>
                    <p className="text-[10px] text-portal-sub">Last updated {fmtDate(sub.updated_at)}</p>
                  </div>
                </form>
              ) : (
                /* Read-only for needs_info / failed / generating */
                <div className="px-5 py-5">
                  <p className="text-sm text-portal-text leading-relaxed whitespace-pre-wrap">{sub.ai_draft_content}</p>
                  <p className="text-[10px] text-portal-sub mt-4">AI assist only — human approval required</p>
                </div>
              )}
            </div>
          )}

          {/* The separate "Advanced: Raw Submission Data" accordion used
              to live here. Removed — the Nominator's Submission card
              above now renders the entire payload directly (using
              humanized keys when no form-config label matches), so the
              raw accordion was duplicating the same data with worse
              formatting. Edit-raw-fields link in the header is enough
              for the rare case an editor needs the literal column view. */}

        </div>

        {/* ── RIGHT COLUMN: Actions & Metadata ────────────────────────── */}
        <div className="w-80 shrink-0 space-y-4">

          {/* At the nominated / nomination-accepted phases, the
              editor's ONE job is to compose + send the outreach
              email. Replace the generic NextActionPanel with a
              proper email composer (subject + body editable,
              pre-filled from the per-type template). All other
              phases get the generic NextActionPanel. */}
          {(currentPhase === 'nominated' || currentPhase === 'nomination-accepted') && needsOutreach ? (
            <OutreachComposerPanel
              submissionId={sub.id}
              typeLabel={typeLabel}
              nomineeName={nomineeName}
              nomineeEmail={(subAny.nominee_email as string | null) ?? sub.submitter_email ?? ''}
              initialSubject={initialOutreachSubject}
              initialBody={initialOutreachBody}
              isFirstSend={currentPhase === 'nominated'}
            />
          ) : (
            <NextActionPanel
              submissionId={sub.id}
              currentPhase={currentPhase}
              needsOutreach={needsOutreach}
              hasInterview={hasInterview}
              hasDraft={hasDraft}
              nomineeName={nomineeName}
            />
          )}
          {/* Reject — used to be a separate panel beneath the primary
              action. Removed: Reject now lives INSIDE the primary
              action card (OutreachComposerPanel or NextActionPanel)
              as a same-dimensions red destructive button below the
              navy primary. Opens RejectModal on click. */}

          {/* AI Draft only matters when we have something to draft
              FROM. Before interview-received the nominator's content
              is the only input and the result is thin. Hide for
              early phases AND post-publish phases to keep the right
              column focused on the phase's primary action. */}
          {['interview-received', 'draft-in-progress', 'draft-ready'].includes(currentPhase) && (
            <AIDraftPanel
              submissionId={sub.id}
              hasInterview={hasInterview}
              hasDraft={hasDraft}
              articleFormat={articleFormat}
              currentDraftLen={(subAny.ai_draft_content as string | null)?.length ?? 0}
            />
          )}

          {/* Approve & Publish — the workflow that used to live on the
              deleted /admin/editorial/approval page. Channel approvals
              + Publish-to-homepage all in one place so editors don't
              have to bounce between pages. */}
          {/* Channel approvals only matter once a draft exists.
             Before draft-ready there's nothing to approve yet, so
             we hide this panel entirely. After approved/in-pool/
             scheduled/published the approvals are frozen and shown
             as a small read-only summary instead. */}
          {(() => {
            const APPROVAL_PHASES = ['draft-ready', 'approved']
            const FROZEN_PHASES   = ['in-pool', 'scheduled', 'published', 'archived']
            if (APPROVAL_PHASES.includes(currentPhase)) {
              return (
                <ApproveAndPublishPanel
                  submissionId={sub.id}
                  initialApproved={{
                    web:        !!(sub as unknown as Record<string, unknown>).approved_web,
                    newsletter: !!(sub as unknown as Record<string, unknown>).approved_newsletter,
                    social:     !!(sub as unknown as Record<string, unknown>).approved_social,
                  }}
                  initialChangesNote={(sub as unknown as Record<string, unknown>).needs_changes_note as string | null}
                />
              )
            }
            if (FROZEN_PHASES.includes(currentPhase)) {
              const a = sub as unknown as Record<string, unknown>
              const chips = [
                { label: 'Web',        on: !!a.approved_web },
                { label: 'Newsletter', on: !!a.approved_newsletter },
                { label: 'Social',     on: !!a.approved_social },
              ]
              const articleId = a.promoted_to_article_id as string | null
              return (
                <div className="bg-white border border-portal-border rounded-lg overflow-hidden">
                  <div style={{
                    padding: '12px 16px',
                    borderBottom: '1px solid var(--color-portal-border)',
                    background: 'var(--color-portal-bg)',
                  }}>
                    <div className="fw-700 text-portal-text" style={{ fontSize: 13 }}>Channel approvals (locked)</div>
                  </div>
                  <div style={{ padding: 16 }}>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {chips.map(c => (
                        <span
                          key={c.label}
                          className={`badge ${c.on ? 'badge-green' : 'badge-gray'}`}
                        >
                          {c.on ? '✓' : '—'} {c.label}
                        </span>
                      ))}
                    </div>
                    {articleId && (
                      <a
                        href={`/admin/articles/${articleId}/edit`}
                        className="text-xs text-portal-blue fw-700"
                        style={{ display: 'block', marginTop: 12 }}
                      >
                        Edit published article →
                      </a>
                    )}
                  </div>
                </div>
              )
            }
            // Earlier phases — nothing renders. Right column stays focused
            // on the NextActionPanel + AIDraftPanel + Editor Notes.
            return null
          })()}

          {/* Legacy panels removed:
             - Operator Guidance: duplicated PhaseTracker descriptions
             - Status Workflow (16-button grid): replaced by phase machine
               (PhaseTracker visual + NextActionPanel CTA)
             - Info Checklist: was for the OLD intake-form fields that
               assumed the nominator = nominee. Nominee data now comes
               from the interview form (Phase 5) instead. Re-add if a
               specific use case shows we need it back. */}

          {/* Editor notes */}
          <div className="bg-white border border-portal-border rounded-lg p-5">
            <h2 className="text-xs font-bold text-portal-sub uppercase tracking-wide mb-1">Editor Notes</h2>
            <p className="text-[11px] text-portal-sub mb-2">Internal only — never shown to submitters.</p>
            <form action={saveEditorNotes} className="space-y-2">
              <textarea
                name="editor_notes"
                defaultValue={sub.editor_notes ?? ''}
                placeholder="Add notes for the editorial team…"
                rows={4}
                className="w-full text-sm border border-portal-border rounded-lg px-3 py-2 resize-none outline-none focus:border-portal-blue transition-colors"
              />
              <button
                type="submit"
                className="text-xs px-4 py-2 bg-portal-navy text-white rounded-lg font-semibold hover:bg-portal-navy transition-colors"
              >
                Save Notes
              </button>
            </form>
          </div>

          {/* Assignment + Publishing Destination collapsed into ONE
              metadata accordion. Both are reference info — the
              editor doesn't need to look at them on every visit, but
              they need to be findable. Default-collapsed so the
              right column shows just the 4 action cards above. */}
          <details className="bg-white border border-portal-border rounded-lg overflow-hidden">
            <summary
              className="px-5 py-3 text-xs font-bold text-portal-sub cursor-pointer hover:bg-portal-bg uppercase tracking-wide select-none"
              style={{ listStyle: 'none' }}
            >
              ▸ Assignment &amp; destination
              {sub.assigned_to && <span className="text-portal-text normal-case ml-2">· {sub.assigned_to}</span>}
              {publishDest && <span className="text-portal-sub normal-case ml-2">· {publishDest.destination}</span>}
            </summary>
            <div className="px-5 pb-4 pt-1 space-y-4">

              <form action={saveAssignment} className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-portal-sub mb-1">Assigned To</label>
                  <input
                    name="assigned_to"
                    defaultValue={sub.assigned_to ?? ''}
                    placeholder="Operator name or email"
                    className="w-full text-sm border border-portal-border rounded-lg px-3 py-2 outline-none focus:border-portal-blue transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-portal-sub mb-1">Priority</label>
                  <select
                    name="internal_priority"
                    defaultValue={sub.internal_priority}
                    className="w-full text-sm border border-portal-border rounded-lg px-3 py-2 outline-none focus:border-portal-blue transition-colors"
                  >
                    <option value="low">Low</option>
                    <option value="normal">Normal</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-semibold text-portal-sub mb-1">Issue Month</label>
                    <select
                      name="issue_month"
                      defaultValue={sub.issue_month ?? ''}
                      className="w-full text-sm border border-portal-border rounded-lg px-3 py-2 outline-none focus:border-portal-blue transition-colors"
                    >
                      <option value="">—</option>
                      {MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-portal-sub mb-1">Issue Year</label>
                    <input
                      name="issue_year"
                      type="number"
                      defaultValue={sub.issue_year ?? ''}
                      placeholder="2026"
                      className="w-full text-sm border border-portal-border rounded-lg px-3 py-2 outline-none focus:border-portal-blue transition-colors"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  className="text-xs px-4 py-2 bg-portal-navy text-white rounded-lg font-semibold hover:bg-portal-navy transition-colors"
                >
                  Save assignment
                </button>
                <p className="text-[11px] text-portal-sub">
                  Tip: for final scheduling, use{' '}
                  <a href="/admin/pending" className="text-portal-blue hover:underline">Pending Pool</a>{' '}
                  — this assignment form is for editorial planning notes only.
                </p>
              </form>

              {publishDest && (
                <div style={{ borderTop: '1px solid var(--color-portal-border)', paddingTop: 14 }}>
                  <div className="text-xs fw-700" style={{ color: 'var(--color-portal-sub)', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 8 }}>
                    Publishing destination
                  </div>
                  <div className="space-y-2">
                    <div>
                      <p className="text-[10px] font-semibold text-portal-sub uppercase">Destination</p>
                      <p className="text-sm font-semibold text-portal-text">{publishDest.destination} <span className="text-portal-sub font-normal">· {publishDest.section}</span></p>
                    </div>
                    <div className="flex gap-2">
                      <span className={`badge ${publishDest.print ? 'badge-rrp' : 'badge-gray'}`}>
                        {publishDest.print ? '✓ Print' : '— Print'}
                      </span>
                      <span className={`badge ${publishDest.digital ? 'badge-green' : 'badge-gray'}`}>
                        {publishDest.digital ? '✓ Digital' : '— Digital'}
                      </span>
                    </div>
                    <p className="text-xs text-portal-sub leading-relaxed">{publishDest.notes}</p>
                    {sub.published_url && (
                      <a href={sub.published_url} target="_blank" rel="noopener noreferrer"
                        className="text-xs text-portal-blue hover:underline font-medium">
                        View published →
                      </a>
                    )}
                  </div>
                </div>
              )}
            </div>
          </details>

          {/* Old AI Assist + GHL Workflow cards deleted — duplicates of
             AIDraftPanel (right column, top) and same dead-promise
             "Soon" buttons we already cleaned up on Distribution. */}

        </div>
      </div>
    </main>
  )
}
