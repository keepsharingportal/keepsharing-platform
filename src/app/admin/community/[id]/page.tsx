// ── /admin/community/[id] ─────────────────────────────────────────────────────
// Submission detail and editorial review workflow.
// Operator-friendly: guidance, checklist, status workflow, notes, assignment,
// publishing destination, and placeholder panels for AI and GHL.

import type { Metadata }         from 'next'
import { notFound, redirect }    from 'next/navigation'
import Link                      from 'next/link'
import { createAdminClient }     from '@/lib/supabase/admin'
import { generateCommunityDraft } from '@/lib/community-drafts'
import {
  STATUS_CONFIG, SUBMISSION_TYPES, TYPE_COLORS,
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

  const accentColor  = TYPE_COLORS[sub.submission_type] ?? '#374151'
  const sc           = STATUS_CONFIG[sub.status]
  const checklist    = buildChecklist(sub, config)
  const guidance     = buildGuidance(sub, config, checklist)
  const missingReq   = checklist.filter(c => c.required && !c.present)
  const photoItem    = checklist.find(c => c.key === 'photo')
  const allComplete  = missingReq.length === 0 && !(photoItem && !photoItem.present && photoItem.required)
  const nextStatus   = recommendedNext(sub.status, allComplete)
  const publishDest  = PUBLISH_DEST[sub.submission_type]

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
        <Link href="/admin/community" className="text-sm text-portal-muted hover:text-portal-text font-medium transition-colors">
          ← Community Submissions
        </Link>
        <div className="mt-4 flex items-start gap-4 flex-wrap">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className="text-2xl">{config.emoji}</span>
              <span className="text-xs font-bold text-portal-muted uppercase tracking-wide">{config.label}</span>
              <span
                className="px-2.5 py-0.5 rounded-full text-xs font-semibold"
                style={{ backgroundColor: sc?.bg ?? '#f9fafb', color: sc?.color ?? '#374151' }}
              >
                {sc?.label ?? sub.status}
              </span>
              {sub.internal_priority !== 'normal' && (
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                  sub.internal_priority === 'urgent' ? 'bg-portal-red-lt text-portal-red' : 'bg-portal-amber-lt text-portal-amber'
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
          <div className="shrink-0 flex gap-2">
            <Link
              href={`/admin/editorial/approval?id=${id}`}
              className="px-4 py-2 text-sm font-semibold text-white bg-portal-navy rounded-lg hover:opacity-90 transition-opacity"
              title="Approve channels + publish to homepage"
            >
              Approve & Publish →
            </Link>
            <Link
              href={`/admin/community/${id}/edit`}
              className="px-4 py-2 text-sm font-semibold text-portal-text bg-white border border-portal-border rounded-lg hover:bg-portal-bg transition-colors"
            >
              Edit →
            </Link>
          </div>
        </div>
      </div>

      {/* ── TWO-COLUMN BODY ──────────────────────────────────────────────── */}
      <div className="flex gap-6 items-start flex-wrap">

        {/* ── LEFT COLUMN: Content ────────────────────────────────────── */}
        <div className="flex-1 min-w-[320px] space-y-4">

          {/* Routing / meta */}
          <div className="bg-white border border-portal-border rounded-lg p-5">
            <h2 className="text-xs font-bold text-portal-muted uppercase tracking-wide mb-3">Routing & Targeting</h2>
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
                  <p className="text-[10px] font-semibold text-portal-muted uppercase tracking-wide">{label}</p>
                  <p className="text-sm font-medium text-portal-text mt-0.5 truncate">{val}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Submitter */}
          <div className="bg-white border border-portal-border rounded-lg p-5">
            <h2 className="text-xs font-bold text-portal-muted uppercase tracking-wide mb-3">Submitter</h2>
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
                  <p className="text-xs text-portal-muted mt-0.5">{sub.submitter_phone}</p>
                )}
              </div>
            </div>
          </div>

          {/* Submission answers */}
          <div
            className="bg-white border border-portal-border rounded-lg overflow-hidden"
            style={{ borderTop: `4px solid ${accentColor}` }}
          >
            <div className="p-5">
              <h2 className="text-xs font-bold text-portal-muted uppercase tracking-wide mb-4">Submission Answers</h2>
              <div className="space-y-5">
                {config.fields.map((field: SubmissionField) => {
                  const answer = sub.payload[field.id]
                  return (
                    <div key={field.id}>
                      <p className="text-xs font-semibold text-portal-sub mb-1">
                        {field.label}
                        {field.required && <span className="text-portal-red ml-0.5">*</span>}
                      </p>
                      {answer ? (
                        <p className={`text-sm text-portal-text leading-relaxed ${field.type === 'textarea' ? 'whitespace-pre-wrap' : ''}`}>
                          {answer}
                        </p>
                      ) : (
                        <p className="text-sm italic text-portal-border-2">
                          {field.required ? 'Not provided — required' : 'Not provided'}
                        </p>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Photos */}
          <div className="bg-white border border-portal-border rounded-lg p-5">
            <h2 className="text-xs font-bold text-portal-muted uppercase tracking-wide mb-1">
              {config.photoLabel ?? 'Photos'}
              {config.photoRequired
                ? <span className="text-portal-red font-normal ml-1">(Required)</span>
                : config.photoHint
                ? <span className="text-portal-muted font-normal ml-1">(Optional)</span>
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
                      {p.caption && <p className="text-xs text-portal-muted mt-0.5">{p.caption}</p>}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-3 space-y-2">
                <p className="text-sm text-portal-muted italic">No photos received yet.</p>
                {config.photoHint && (
                  <div className="bg-portal-amber-lt border border-portal-amber/20 rounded-lg p-3">
                    <p className="text-xs font-semibold text-portal-amber mb-1">Instructions for submitter:</p>
                    <p className="text-xs text-portal-amber">{config.photoHint}</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* AI Draft — editable when ready or edited */}
          {sub.ai_draft_content && (
            <div className={`bg-white rounded-lg overflow-hidden border ${
              sub.ai_draft_status === 'edited'     ? 'border-portal-green/30'
              : sub.ai_draft_status === 'ready'    ? 'border-indigo-200'
              : sub.ai_draft_status === 'needs_info'? 'border-portal-amber/30'
              : sub.ai_draft_status === 'failed'   ? 'border-portal-red/30'
              : 'border-portal-border'
            }`}>

              {/* Header */}
              <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h2 className="text-xs font-bold text-portal-muted uppercase tracking-wide">AI Draft</h2>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    sub.ai_draft_status === 'ready'      ? 'bg-portal-blue-lt text-portal-blue'
                    : sub.ai_draft_status === 'edited'   ? 'bg-portal-green-lt text-portal-green'
                    : sub.ai_draft_status === 'needs_info'? 'bg-portal-amber-lt text-portal-amber'
                    : sub.ai_draft_status === 'generating'? 'bg-portal-blue-lt text-portal-blue'
                    : sub.ai_draft_status === 'failed'   ? 'bg-portal-red-lt text-portal-red'
                    : 'bg-portal-row-hover text-portal-sub'
                  }`}>
                    {DRAFT_STATUS_LABELS[sub.ai_draft_status] ?? sub.ai_draft_status}
                  </span>
                </div>
                {sub.ai_prompt_used && (
                  <span className="text-[10px] text-portal-muted font-mono">{sub.ai_prompt_used}</span>
                )}
              </div>

              {/* Warning — always visible when ready or edited */}
              {['ready', 'edited'].includes(sub.ai_draft_status) && (
                <div className="px-5 py-2.5 bg-portal-amber-lt border-b border-portal-amber/20">
                  <p className="text-xs text-portal-amber font-medium leading-relaxed">
                    ⚠️ AI-assisted draft. Verify all facts before publishing. Do not publish without human editorial approval.
                  </p>
                </div>
              )}

              {/* Editable form — when ready, edited, or submission is in-editing */}
              {isDraftEditable ? (
                <form action={saveDraftEdits}>
                  <div className="px-5 pt-4 pb-3">
                    <label className="block text-xs font-semibold text-portal-sub mb-1">
                      Edit Draft
                      <span className="ml-2 font-normal text-portal-muted">— not published</span>
                    </label>
                    <p className="text-[11px] text-portal-muted mb-2.5 leading-relaxed">
                      Edit for accuracy, tone, and local voice before approval. Changes are saved as a draft only.
                    </p>
                    <textarea
                      name="draft_content"
                      defaultValue={sub.ai_draft_content}
                      rows={14}
                      className="w-full text-sm border border-portal-border rounded-lg px-3.5 py-3 resize-vertical outline-none focus:border-indigo-300 transition-colors leading-relaxed text-portal-text"
                    />
                  </div>
                  <div className="px-5 pb-4 flex items-center justify-between border-t border-gray-50 pt-3">
                    <button
                      type="submit"
                      className="px-5 py-2 bg-portal-navy text-white text-xs font-bold rounded-lg hover:bg-portal-navy transition-colors"
                    >
                      Save Edited Draft
                    </button>
                    <p className="text-[10px] text-portal-muted">Last updated {fmtDate(sub.updated_at)}</p>
                  </div>
                </form>
              ) : (
                /* Read-only for needs_info / failed / generating */
                <div className="px-5 py-5">
                  <p className="text-sm text-portal-text leading-relaxed whitespace-pre-wrap">{sub.ai_draft_content}</p>
                  <p className="text-[10px] text-portal-muted mt-4">AI assist only — human approval required</p>
                </div>
              )}

              {/* Mark Ready for Editorial Pipeline */}
              {['ready', 'edited'].includes(sub.ai_draft_status) && (
                <div className="px-5 pb-5 pt-1">
                  <form action={markReadyForEditorial}>
                    <button
                      type="submit"
                      className="w-full py-2.5 rounded-lg text-sm font-bold text-white bg-portal-green hover:bg-portal-green transition-colors"
                    >
                      ✓ Mark Ready for Editorial Pipeline
                    </button>
                  </form>
                </div>
              )}
            </div>
          )}

          {/* Raw data — collapsed by default */}
          <details className="bg-white border border-portal-border rounded-lg overflow-hidden">
            <summary className="px-5 py-4 text-xs font-semibold text-portal-muted cursor-pointer hover:bg-portal-bg transition-colors select-none uppercase tracking-wide">
              Advanced: Raw Submission Data
            </summary>
            <div className="px-5 pb-5 pt-2 border-t border-gray-50">
              <div className="space-y-1.5">
                {Object.entries(sub.payload).map(([k, v]) => (
                  <div key={k} className="flex gap-3 text-xs">
                    <span className="font-mono text-portal-muted shrink-0 w-40">{k}</span>
                    <span className="text-portal-text break-all">{String(v)}</span>
                  </div>
                ))}
                <div className="border-t border-portal-border pt-2 mt-2 space-y-1.5">
                  <div className="flex gap-3 text-xs">
                    <span className="font-mono text-portal-muted w-40">id</span>
                    <span className="text-portal-sub font-mono break-all">{sub.id}</span>
                  </div>
                  <div className="flex gap-3 text-xs">
                    <span className="font-mono text-portal-muted w-40">submission_type</span>
                    <span className="text-portal-sub">{sub.submission_type}</span>
                  </div>
                  <div className="flex gap-3 text-xs">
                    <span className="font-mono text-portal-muted w-40">created_at</span>
                    <span className="text-portal-sub">{sub.created_at}</span>
                  </div>
                  <div className="flex gap-3 text-xs">
                    <span className="font-mono text-portal-muted w-40">updated_at</span>
                    <span className="text-portal-sub">{sub.updated_at}</span>
                  </div>
                </div>
              </div>
            </div>
          </details>

        </div>

        {/* ── RIGHT COLUMN: Actions & Metadata ────────────────────────── */}
        <div className="w-80 shrink-0 space-y-4">

          {/* Operator guidance */}
          <div className="bg-white border border-portal-border rounded-lg p-5">
            <h2 className="text-xs font-bold text-portal-muted uppercase tracking-wide mb-3">Operator Guidance</h2>
            {guidance.length === 0 ? (
              <p className="text-sm text-portal-muted">No specific guidance available.</p>
            ) : (
              <div className="space-y-2">
                {guidance.map((g, i) => (
                  <div key={i} className={`flex gap-2.5 items-start px-3 py-2.5 rounded-lg border text-xs font-medium ${SEV_CLS[g.severity]}`}>
                    <span className="shrink-0 mt-0.5">{g.icon}</span>
                    <span className="leading-relaxed">{g.message}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Status workflow */}
          <div className="bg-white border border-portal-border rounded-lg p-5">
            <h2 className="text-xs font-bold text-portal-muted uppercase tracking-wide mb-3">Status Workflow</h2>

            {/* Recommended next — prominent */}
            {nextStatus && (
              <form action={updateStatus} className="mb-3">
                <input type="hidden" name="status" value={nextStatus} />
                <button
                  type="submit"
                  className="w-full py-2.5 rounded-lg text-sm font-bold text-white transition-opacity hover:opacity-90"
                  style={{ backgroundColor: accentColor }}
                >
                  → {STATUS_CONFIG[nextStatus]?.label}
                </button>
              </form>
            )}

            {/* Full status grid */}
            <div className="grid grid-cols-2 gap-1.5">
              {(Object.keys(STATUS_CONFIG) as SubmissionStatus[]).map(s => {
                const cfg      = STATUS_CONFIG[s]
                const isCurrent = s === sub.status
                if (isCurrent) {
                  return (
                    <div
                      key={s}
                      className="py-1.5 px-2 rounded-lg text-xs font-semibold text-center"
                      style={{ backgroundColor: cfg.bg, color: cfg.color, border: `1.5px solid ${cfg.color}40` }}
                    >
                      ● {cfg.label}
                    </div>
                  )
                }
                return (
                  <form key={s} action={updateStatus}>
                    <input type="hidden" name="status" value={s} />
                    <button
                      type="submit"
                      className="w-full py-1.5 px-2 rounded-lg text-xs font-semibold border border-portal-border text-portal-sub hover:bg-portal-bg transition-colors text-left"
                    >
                      {cfg.label}
                    </button>
                  </form>
                )
              })}
            </div>
          </div>

          {/* Missing info checklist */}
          {checklist.length > 0 && (
            <div className="bg-white border border-portal-border rounded-lg p-5">
              <h2 className="text-xs font-bold text-portal-muted uppercase tracking-wide mb-3">Info Checklist</h2>
              <div className="space-y-2.5">
                {checklist.map(item => (
                  <div key={item.key} className="flex items-start gap-2.5">
                    <span className={`text-base shrink-0 leading-none mt-0.5 ${
                      item.present ? 'text-portal-green' : item.required ? 'text-portal-red' : 'text-portal-amber'
                    }`}>
                      {item.present ? '✓' : item.required ? '✗' : '○'}
                    </span>
                    <div className="flex-1 min-w-0">
                      <span className={`text-xs ${
                        item.present ? 'text-portal-sub' : item.required ? 'text-portal-red font-semibold' : 'text-portal-amber'
                      }`}>
                        {item.label}
                      </span>
                      {!item.present && !item.required && (
                        <span className="text-xs text-portal-muted ml-1">(optional)</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              {allComplete && (
                <p className="text-xs text-portal-green font-semibold mt-3 pt-3 border-t border-gray-50">
                  All required info received ✓
                </p>
              )}
            </div>
          )}

          {/* Editor notes */}
          <div className="bg-white border border-portal-border rounded-lg p-5">
            <h2 className="text-xs font-bold text-portal-muted uppercase tracking-wide mb-1">Editor Notes</h2>
            <p className="text-[11px] text-portal-muted mb-2">Internal only — never shown to submitters.</p>
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

          {/* Assignment */}
          <div className="bg-white border border-portal-border rounded-lg p-5">
            <h2 className="text-xs font-bold text-portal-muted uppercase tracking-wide mb-3">Assignment</h2>
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
                Save Assignment
              </button>
            </form>
          </div>

          {/* Publishing destination */}
          {publishDest && (
            <div className="bg-white border border-portal-border rounded-lg p-5">
              <h2 className="text-xs font-bold text-portal-muted uppercase tracking-wide mb-3">Publishing Destination</h2>
              <div className="space-y-3">
                <div>
                  <p className="text-[10px] font-semibold text-portal-muted uppercase tracking-wide">Destination</p>
                  <p className="text-sm font-semibold text-portal-text mt-0.5">{publishDest.destination}</p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold text-portal-muted uppercase tracking-wide">Section</p>
                  <p className="text-sm text-portal-text mt-0.5">{publishDest.section}</p>
                </div>
                <div className="flex gap-2">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                    publishDest.print ? 'bg-portal-blue-lt text-portal-blue' : 'bg-portal-row-hover text-portal-muted'
                  }`}>
                    {publishDest.print ? '✓ Print' : '— Print'}
                  </span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                    publishDest.digital ? 'bg-portal-green-lt text-portal-green' : 'bg-portal-row-hover text-portal-muted'
                  }`}>
                    {publishDest.digital ? '✓ Digital' : '— Digital'}
                  </span>
                </div>
                <p className="text-xs text-portal-sub leading-relaxed">{publishDest.notes}</p>
                {sub.published_url && (
                  <a href={sub.published_url} target="_blank" rel="noopener noreferrer"
                    className="text-xs text-portal-blue hover:underline font-medium">
                    View Published →
                  </a>
                )}
              </div>
            </div>
          )}

          {/* AI Assist */}
          <div className="bg-white border border-portal-border rounded-lg p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs font-bold text-portal-muted uppercase tracking-wide">AI Assist</h2>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                sub.ai_draft_status === 'none'        ? 'bg-portal-row-hover text-portal-muted'
                : sub.ai_draft_status === 'ready'     ? 'bg-portal-blue-lt text-portal-blue'
                : sub.ai_draft_status === 'edited'    ? 'bg-portal-green-lt text-portal-green'
                : sub.ai_draft_status === 'needs_info'? 'bg-portal-amber-lt text-portal-amber'
                : sub.ai_draft_status === 'generating'? 'bg-portal-blue-lt text-portal-blue'
                : sub.ai_draft_status === 'failed'    ? 'bg-portal-red-lt text-portal-red'
                : 'bg-portal-row-hover text-portal-sub'
              }`}>
                {DRAFT_STATUS_LABELS[sub.ai_draft_status] ?? sub.ai_draft_status}
              </span>
            </div>

            {/* Generate / Regenerate */}
            <form action={generateDraft} className="mb-2">
              <button
                type="submit"
                className="w-full py-2.5 rounded-lg text-sm font-bold text-white bg-portal-blue hover:bg-portal-navy transition-colors"
              >
                {sub.ai_draft_status === 'none' ? '✍️  Generate Draft' : '↺  Regenerate Draft'}
              </button>
            </form>

            {/* Secondary actions when a draft exists */}
            {['ready', 'edited', 'needs_info', 'failed'].includes(sub.ai_draft_status) && (
              <div className="flex gap-2 mb-3">
                {sub.status !== 'in-editing' && (
                  <form action={markForEditing} className="flex-1">
                    <button
                      type="submit"
                      className="w-full py-1.5 text-xs font-semibold border border-portal-border rounded-lg text-portal-text hover:bg-portal-bg transition-colors"
                    >
                      → Move to Editing
                    </button>
                  </form>
                )}
                <form action={clearDraft}>
                  <button
                    type="submit"
                    className="py-1.5 px-3 text-xs font-semibold border border-portal-red/30 rounded-lg text-portal-red hover:bg-portal-red-lt transition-colors"
                  >
                    Clear
                  </button>
                </form>
              </div>
            )}

            {/* Generating indicator */}
            {sub.ai_draft_status === 'generating' && (
              <p className="text-xs text-portal-blue text-center py-1 mb-2">Generating draft…</p>
            )}

            {/* Future AI features */}
            <div className="space-y-1.5 border-t border-gray-50 pt-3">
              {[
                { icon: '💡', label: 'Suggest Headline' },
                { icon: '📱', label: 'Write Social Caption' },
                { icon: '📧', label: 'Request Missing Info Email' },
              ].map(item => (
                <button
                  key={item.label}
                  disabled
                  className="w-full text-left flex items-center gap-2.5 px-3 py-2 rounded-lg border border-portal-border text-xs text-portal-muted cursor-not-allowed"
                >
                  <span>{item.icon}</span>
                  <span className="flex-1">{item.label}</span>
                  <span className="text-[10px] bg-portal-row-hover text-portal-muted px-1.5 py-0.5 rounded font-medium">Soon</span>
                </button>
              ))}
            </div>
          </div>

          {/* GHL future */}
          <div className="bg-white border border-portal-border rounded-lg p-5">
            <h2 className="text-xs font-bold text-portal-muted uppercase tracking-wide mb-1">GHL Workflow</h2>
            <p className="text-[11px] text-portal-muted mb-3">Future automation — not yet wired.</p>
            <div className="space-y-1.5">
              {[
                { icon: '💌', label: 'Send Thank-You',         sent: sub.thank_you_sent_at },
                { icon: '📋', label: 'Request Missing Info',   sent: sub.follow_up_sent_at },
                { icon: '🎉', label: 'Notify When Published',  sent: sub.published_notice_sent_at },
                { icon: '🔗', label: 'Send Share Link',        sent: null },
              ].map(item => (
                <div key={item.label} className="flex items-center gap-2 px-3 py-2 rounded-lg border border-portal-border">
                  <span className="text-base">{item.icon}</span>
                  <span className="text-xs text-portal-sub flex-1">{item.label}</span>
                  {item.sent ? (
                    <span className="text-[10px] text-portal-green font-semibold">Sent</span>
                  ) : (
                    <span className="text-[10px] bg-portal-row-hover text-portal-muted px-1.5 py-0.5 rounded font-medium">Soon</span>
                  )}
                </div>
              ))}
              {sub.ghl_contact_id && (
                <p className="text-[10px] text-portal-muted mt-1 px-1">GHL: {sub.ghl_contact_id}</p>
              )}
            </div>
          </div>

        </div>
      </div>
    </main>
  )
}
