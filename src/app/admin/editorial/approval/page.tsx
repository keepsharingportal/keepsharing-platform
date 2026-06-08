// ── /admin/editorial/approval ─────────────────────────────────────────────────
// Editor Review Desk — DeAnne's editorial approval workspace.
// Review drafts, approve per-channel, prepare social copy, hand off to planner.
// Human approval required before anything is published, emailed, or posted.

import type { Metadata }      from 'next'
import type { ReactNode }     from 'react'
import { notFound, redirect } from 'next/navigation'
import Link                   from 'next/link'
import { createClient }       from '@/lib/supabase/server'
import { generatePromo }      from '@/lib/editorial-promo-ai'
import { SUBMISSION_TYPES, TYPE_COLORS } from '@/lib/submissions'

export const metadata: Metadata = { title: 'Editor Review Desk — Admin' }

// ── Types ─────────────────────────────────────────────────────────────────────

interface QueueItem {
  id:                    string
  submission_type:       string
  target_publication:    string
  status:                string
  ai_draft_status:       string
  working_title:         string | null
  related_person_name:   string | null
  related_business_name: string | null
  related_school_name:   string | null
  destination_section:   string | null
  issue_month:           string | null
  approved_web:          boolean
  approved_newsletter:   boolean
  approved_social:       boolean
  needs_changes_note:    string | null
  social_planner_ready:  boolean
  feature_image_url:     string | null
  photo_urls:            Array<{ url: string }>
  created_at:            string
}

interface ApprovalItem extends QueueItem {
  issue_year:            number | null
  excerpt:               string | null
  editor_notes:          string | null
  ai_draft_content:      string | null
  ai_prompt_used:        string | null
  payload:               Record<string, string>
  homepage_feature:      boolean
  newsletter_include:    boolean
  social_queue:          boolean
  permissions_confirmed: boolean
  caption_facebook:      string | null
  caption_instagram:     string | null
  caption_sms:           string | null
  newsletter_teaser:     string | null
  social_hashtags:       string[] | null
  social_image_note:     string | null
  social_publish_date:   string | null
  social_link:           string | null
  editor_reviewed_at:    string | null
  editor_name:           string | null
  updated_at:            string
}

// ── Approval stage ────────────────────────────────────────────────────────────

type ApprovalStage = 'needs-review' | 'needs-changes' | 'approved' | 'planner-ready' | 'published'

function getStage(item: QueueItem): ApprovalStage {
  if (item.status === 'published')    return 'published'
  if (item.social_planner_ready)      return 'planner-ready'
  if (item.approved_web || item.approved_newsletter || item.approved_social) return 'approved'
  if (item.needs_changes_note)        return 'needs-changes'
  return 'needs-review'
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function displayTitle(item: QueueItem): string {
  if (item.working_title) return item.working_title
  const entity = item.related_person_name ?? item.related_business_name ?? item.related_school_name
  const tc = SUBMISSION_TYPES.find(t => t.type === item.submission_type)
  if (entity) return entity
  return tc?.label ?? item.submission_type
}

function hasImage(item: QueueItem): boolean {
  return !!(item.feature_image_url || (item.photo_urls?.length ?? 0) > 0)
}

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

// ── Server actions ─────────────────────────────────────────────────────────────

async function approveWeb(formData: FormData) {
  'use server'
  const supabase  = await createClient()
  const id        = formData.get('item_id') as string
  await supabase.from('community_submissions').update({
    approved_web:         true,
    needs_changes_note:   null,
    editor_reviewed_at:   new Date().toISOString(),
    status:               'approved',
  }).eq('id', id)
  redirect(`/admin/editorial/approval?id=${id}`)
}

async function approveNewsletter(formData: FormData) {
  'use server'
  const supabase = await createClient()
  const id       = formData.get('item_id') as string
  await supabase.from('community_submissions').update({
    approved_newsletter: true,
    editor_reviewed_at:  new Date().toISOString(),
    status:              'approved',
  }).eq('id', id)
  redirect(`/admin/editorial/approval?id=${id}`)
}

async function approveSocial(formData: FormData) {
  'use server'
  const supabase = await createClient()
  const id       = formData.get('item_id') as string
  await supabase.from('community_submissions').update({
    approved_social:    true,
    editor_reviewed_at: new Date().toISOString(),
    status:             'approved',
  }).eq('id', id)
  redirect(`/admin/editorial/approval?id=${id}`)
}

async function approveAll(formData: FormData) {
  'use server'
  const supabase = await createClient()
  const id       = formData.get('item_id') as string
  await supabase.from('community_submissions').update({
    approved_web:        true,
    approved_newsletter: true,
    approved_social:     true,
    needs_changes_note:  null,
    editor_reviewed_at:  new Date().toISOString(),
    status:              'approved',
  }).eq('id', id)
  redirect(`/admin/editorial/approval?id=${id}`)
}

async function requestChanges(formData: FormData) {
  'use server'
  const supabase = await createClient()
  const id       = formData.get('item_id') as string
  const note     = (formData.get('changes_note') as string) || ''
  await supabase.from('community_submissions').update({
    needs_changes_note: note || null,
    approved_web:       false,
    approved_newsletter:false,
    approved_social:    false,
  }).eq('id', id)
  redirect(`/admin/editorial/approval?id=${id}`)
}

async function markPublished(formData: FormData) {
  'use server'
  const supabase = await createClient()
  const id       = formData.get('item_id') as string
  await supabase.from('community_submissions').update({
    status:             'published',
    needs_changes_note: null,
  }).eq('id', id)
  redirect(`/admin/editorial/approval?id=${id}`)
}

async function markPlannerReady(formData: FormData) {
  'use server'
  const supabase = await createClient()
  const id       = formData.get('item_id') as string
  await supabase.from('community_submissions').update({
    social_planner_ready: true,
  }).eq('id', id)
  redirect(`/admin/editorial/approval?id=${id}`)
}

async function saveSocialPrep(formData: FormData) {
  'use server'
  const supabase  = await createClient()
  const id        = formData.get('item_id') as string
  const tagsRaw   = (formData.get('social_hashtags') as string) || ''
  const social_hashtags = tagsRaw.split(/[,\n]/).map(t => t.trim().replace(/^#/, '')).filter(Boolean)
  await supabase.from('community_submissions').update({
    caption_facebook:   (formData.get('caption_facebook')   as string) || null,
    caption_instagram:  (formData.get('caption_instagram')  as string) || null,
    caption_sms:        (formData.get('caption_sms')        as string) || null,
    newsletter_teaser:  (formData.get('newsletter_teaser')  as string) || null,
    social_hashtags,
    social_image_note:  (formData.get('social_image_note')  as string) || null,
    social_publish_date:(formData.get('social_publish_date')as string) || null,
    social_link:        (formData.get('social_link')        as string) || null,
  }).eq('id', id)
  redirect(`/admin/editorial/approval?id=${id}`)
}

// ── AI promo generation server actions ────────────────────────────────────────
// Each action loads submission via item_id from formData, calls generatePromo,
// and redirects back to the detail view. Approval desk remains read-only
// until the editor explicitly approves a channel.

async function genFacebook(formData: FormData) {
  'use server'
  const id = formData.get('item_id') as string
  await generatePromo(id, 'facebook')
  redirect(`/admin/editorial/approval?id=${id}`)
}

async function genInstagram(formData: FormData) {
  'use server'
  const id = formData.get('item_id') as string
  await generatePromo(id, 'instagram')
  redirect(`/admin/editorial/approval?id=${id}`)
}

async function genNewsletter(formData: FormData) {
  'use server'
  const id = formData.get('item_id') as string
  await generatePromo(id, 'newsletter')
  redirect(`/admin/editorial/approval?id=${id}`)
}

async function genSms(formData: FormData) {
  'use server'
  const id = formData.get('item_id') as string
  await generatePromo(id, 'sms')
  redirect(`/admin/editorial/approval?id=${id}`)
}

async function genHashtags(formData: FormData) {
  'use server'
  const id = formData.get('item_id') as string
  await generatePromo(id, 'hashtags')
  redirect(`/admin/editorial/approval?id=${id}`)
}

async function genImageNote(formData: FormData) {
  'use server'
  const id = formData.get('item_id') as string
  await generatePromo(id, 'image-note')
  redirect(`/admin/editorial/approval?id=${id}`)
}

// ── Sub-components ─────────────────────────────────────────────────────────────

const iCls  = 'w-full text-sm border border-portal-border rounded-lg px-3 py-2 outline-none focus:border-indigo-300 transition-colors'
const iClsTA = `${iCls} resize-vertical`

function Card({ title, children, accent }: { title: string; accent?: string; children: ReactNode }) {
  return (
    <div className="bg-white border border-portal-border rounded-lg overflow-hidden" style={accent ? { borderTop: `3px solid ${accent}` } : {}}>
      <div className="px-5 py-3.5 border-b border-gray-50">
        <h2 className="text-xs font-bold text-portal-muted uppercase tracking-wide">{title}</h2>
      </div>
      <div className="px-5 py-4">{children}</div>
    </div>
  )
}

function ApprovalBadge({ label, approved, color }: { label: string; approved: boolean; color: string }) {
  return (
    <span
      className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold"
      style={approved
        ? { backgroundColor: `${color}18`, color }
        : { backgroundColor: '#f1f5f9', color: '#94a3b8' }}
    >
      {approved ? '✓' : '○'} {label}
    </span>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function ApprovalPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>
}) {
  const { id: selectedId } = await searchParams
  const supabase = await createClient()

  // ── Queue data ──────────────────────────────────────────────────────────────

  const QUEUE_COLS = [
    'id','submission_type','target_publication','status','ai_draft_status',
    'working_title','related_person_name','related_business_name','related_school_name',
    'destination_section','issue_month',
    'approved_web','approved_newsletter','approved_social',
    'needs_changes_note','social_planner_ready',
    'feature_image_url','photo_urls','created_at',
  ].join(', ')

  const { data: rawQueue } = await supabase
    .from('community_submissions')
    .select(QUEUE_COLS)
    .in('status', ['ai-draft-ready', 'in-editing', 'approved', 'scheduled', 'published'])
    .order('created_at', { ascending: false })
    .limit(150)

  const queueItems = (rawQueue ?? []) as unknown as QueueItem[]

  // ── Selected item for detail view ──────────────────────────────────────────

  let selected: ApprovalItem | null = null
  if (selectedId) {
    const { data, error } = await supabase
      .from('community_submissions')
      .select('*')
      .eq('id', selectedId)
      .single()
    if (error || !data) notFound()
    selected = data as unknown as ApprovalItem
  }

  // ── Grouping ─────────────────────────────────────────────────────────────

  const groups = {
    needsReview:  queueItems.filter(i => getStage(i) === 'needs-review'),
    needsChanges: queueItems.filter(i => getStage(i) === 'needs-changes'),
    approved:     queueItems.filter(i => getStage(i) === 'approved'),
    plannerReady: queueItems.filter(i => getStage(i) === 'planner-ready'),
    published:    queueItems.filter(i => getStage(i) === 'published'),
  }

  // ── Readiness checklist for detail view ──────────────────────────────────

  function readinessItems(item: ApprovalItem) {
    const PROFILE_TYPES = ['teacher-of-the-month', 'mom-to-mom', 'grands-are-the-greatest', 'play-ball', 'boom-profile', 'student-spotlight']
    const needsPhoto = item.submission_type === 'birthday-celebration'
      || PROFILE_TYPES.includes(item.submission_type)

    return [
      { label: 'Working title set',      present: !!item.working_title?.trim(),                             required: true  },
      { label: 'Draft ready for review', present: ['ready','edited'].includes(item.ai_draft_status),        required: true  },
      { label: 'Destination assigned',   present: !!item.destination_section,                               required: true  },
      { label: 'Excerpt written',        present: !!item.excerpt?.trim(),                                    required: false },
      ...(needsPhoto
        ? [{ label: 'Photo received',      present: hasImage(item),                                         required: item.submission_type === 'birthday-celebration' }]
        : []),
      ...(PROFILE_TYPES.includes(item.submission_type)
        ? [{ label: 'Permissions confirmed', present: item.permissions_confirmed ?? false,                  required: false }]
        : []),
    ]
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  DETAIL VIEW — when ?id= is set
  // ══════════════════════════════════════════════════════════════════════════

  if (selected && selectedId) {
    const item    = selected
    const tc      = SUBMISSION_TYPES.find(t => t.type === item.submission_type)
    const title   = displayTitle(item)
    const accent  = TYPE_COLORS[item.submission_type] ?? '#374151'
    const stage   = getStage(item)
    const checks  = readinessItems(item)
    const allPass = checks.every(c => !c.required || c.present)
    const config  = SUBMISSION_TYPES.find(t => t.type === item.submission_type)
    const hashtagStr = Array.isArray(item.social_hashtags)
      ? item.social_hashtags.join(', ')
      : ''

    return (
      <main className="p-6 max-w-[1260px] mx-auto space-y-6 pb-16">

        {/* Header */}
        <div>
          <Link href="/admin/editorial/approval" className="text-sm text-portal-muted hover:text-portal-text font-medium transition-colors">
            ← Review Desk
          </Link>
          <div className="mt-3 flex items-start gap-4 flex-wrap">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                <span className="text-xl">{tc?.emoji}</span>
                <span className="text-xs font-bold text-portal-muted uppercase tracking-wide">{tc?.label}</span>
                <ApprovalBadge label="Web"        approved={item.approved_web}        color="#16a34a" />
                <ApprovalBadge label="Newsletter" approved={item.approved_newsletter} color="#0284c7" />
                <ApprovalBadge label="Social"     approved={item.approved_social}     color="#7c3aed" />
                {item.needs_changes_note && (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-portal-amber-lt text-portal-amber">Changes Requested</span>
                )}
                {item.social_planner_ready && (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-portal-green-lt text-green-800">Planner Ready ✓</span>
                )}
              </div>
              <h1 className="text-2xl font-bold text-portal-text tracking-tight">{title}</h1>
              <p className="text-sm text-portal-sub mt-0.5">
                {tc?.label} · {item.target_publication.toUpperCase()}
                {item.issue_month && ` · ${item.issue_month}${item.issue_year ? ` ${item.issue_year}` : ''}`}
              </p>
            </div>
            <Link href={`/admin/editorial/${item.id}`}
              className="shrink-0 px-4 py-2 text-xs font-semibold text-portal-sub bg-white border border-portal-border rounded-lg hover:bg-portal-bg">
              Full Editorial View ↗
            </Link>
          </div>
        </div>

        {/* Changes requested banner */}
        {item.needs_changes_note && (
          <div className="bg-portal-amber-lt border border-portal-amber/30 rounded-lg px-5 py-4">
            <p className="text-sm font-bold text-amber-900 mb-1">✎ Changes Requested</p>
            <p className="text-sm text-portal-amber leading-relaxed whitespace-pre-wrap">{item.needs_changes_note}</p>
            <Link href={`/admin/community/${item.id}/edit`} className="text-xs text-portal-amber hover:underline font-semibold mt-2 inline-block">
              Edit Submission →
            </Link>
          </div>
        )}

        {/* Two-column body */}
        <div className="flex gap-6 items-start flex-wrap">

          {/* ── LEFT: Content ────────────────────────────────────────────── */}
          <div className="flex-1 min-w-[320px] space-y-4">

            {/* Final Draft */}
            <div className="bg-white border border-portal-border rounded-lg overflow-hidden" style={{ borderTop: `3px solid ${accent}` }}>
              <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
                <div>
                  <h2 className="text-xs font-bold text-portal-muted uppercase tracking-wide">Final Draft</h2>
                  <p className="text-[11px] text-portal-muted mt-0.5">This content is not published. Read carefully before approving.</p>
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  item.ai_draft_status === 'edited' ? 'bg-portal-green-lt text-portal-green'
                  : item.ai_draft_status === 'ready' ? 'bg-indigo-100 text-indigo-700'
                  : 'bg-gray-100 text-portal-sub'
                }`}>
                  {item.ai_draft_status === 'edited' ? 'Edited ✓' : item.ai_draft_status === 'ready' ? 'AI Draft' : item.ai_draft_status}
                </span>
              </div>

              {item.ai_draft_content ? (
                <div className="px-6 py-6">
                  {item.working_title && (
                    <h3 className="text-lg font-bold text-portal-text mb-2 leading-tight">{item.working_title}</h3>
                  )}
                  {item.excerpt && (
                    <p className="text-sm text-portal-sub italic mb-4 leading-relaxed border-l-2 border-portal-border pl-3">{item.excerpt}</p>
                  )}
                  <p className="text-sm text-portal-text leading-[1.85] whitespace-pre-wrap">{item.ai_draft_content}</p>
                </div>
              ) : (
                <div className="px-5 py-8 text-center">
                  <p className="text-sm text-portal-muted italic">No draft generated yet.</p>
                  <Link href={`/admin/community/${item.id}`} className="text-xs text-indigo-600 hover:underline mt-2 inline-block">
                    Generate draft in submission view →
                  </Link>
                </div>
              )}

              {/* Editorial notes */}
              {item.editor_notes && (
                <div className="px-5 pb-4 border-t border-gray-50 pt-3">
                  <p className="text-[11px] font-semibold text-portal-muted uppercase tracking-wide mb-1">Editor Notes</p>
                  <p className="text-xs text-portal-sub leading-relaxed whitespace-pre-wrap">{item.editor_notes}</p>
                </div>
              )}
            </div>

            {/* Source Answers — collapsed */}
            <details className="bg-white border border-portal-border rounded-lg overflow-hidden">
              <summary className="px-5 py-4 text-xs font-semibold text-portal-muted cursor-pointer hover:bg-portal-bg select-none uppercase tracking-wide">
                Source Submission Answers
              </summary>
              <div className="px-5 pb-5 pt-2 border-t border-gray-50 space-y-4">
                {(config?.fields ?? []).map(f => {
                  const v = item.payload?.[f.id]
                  return (
                    <div key={f.id}>
                      <p className="text-[11px] font-semibold text-portal-muted mb-0.5">{f.label}</p>
                      {v ? (
                        <p className={`text-sm text-portal-text leading-relaxed ${f.type === 'textarea' ? 'whitespace-pre-wrap' : ''}`}>{v}</p>
                      ) : (
                        <p className="text-sm italic text-gray-300">Not provided</p>
                      )}
                    </div>
                  )
                })}
              </div>
            </details>

          </div>

          {/* ── RIGHT: Approvals + Social Prep ──────────────────────────── */}
          <div className="w-96 shrink-0 space-y-4">

            {/* Readiness Checklist */}
            <Card title="Content Checklist">
              <div className="space-y-2.5">
                {checks.map((c, i) => (
                  <div key={i} className="flex items-center gap-2.5">
                    <span className={`text-base shrink-0 ${c.present ? 'text-green-500' : c.required ? 'text-red-400' : 'text-gray-300'}`}>
                      {c.present ? '✓' : c.required ? '✗' : '○'}
                    </span>
                    <span className={`text-xs ${c.present ? 'text-portal-sub' : c.required ? 'text-red-700 font-semibold' : 'text-portal-muted'}`}>
                      {c.label}
                      {!c.present && !c.required && <span className="text-gray-300 ml-1">(optional)</span>}
                    </span>
                  </div>
                ))}
              </div>
              {allPass && (
                <p className="text-xs text-portal-green font-semibold mt-3 pt-3 border-t border-gray-50">
                  Content checklist complete ✓
                </p>
              )}
            </Card>

            {/* Channel Approvals — the main editorial action */}
            <div className="bg-white border border-portal-border rounded-lg p-5">
              <h2 className="text-xs font-bold text-portal-muted uppercase tracking-wide mb-4">Channel Approvals</h2>

              {/* Current status */}
              <div className="flex gap-2 flex-wrap mb-4">
                <ApprovalBadge label="Website"    approved={item.approved_web}        color="#16a34a" />
                <ApprovalBadge label="Newsletter" approved={item.approved_newsletter} color="#0284c7" />
                <ApprovalBadge label="Social"     approved={item.approved_social}     color="#7c3aed" />
              </div>

              {/* Approve all — big button */}
              {!item.approved_web && !item.approved_newsletter && !item.approved_social && (
                <form action={approveAll} className="mb-3">
                  <input type="hidden" name="item_id" value={item.id} />
                  <button type="submit"
                    className="w-full py-3 rounded-lg text-sm font-bold text-white bg-gray-900 hover:bg-gray-700 transition-colors">
                    ✓ Approve All Channels
                  </button>
                </form>
              )}

              {/* Individual channel buttons */}
              <div className="space-y-2">
                {[
                  { label: 'Approve for Website',    action: approveWeb,        approved: item.approved_web,        color: 'bg-green-600 hover:bg-green-700'  },
                  { label: 'Approve for Newsletter', action: approveNewsletter, approved: item.approved_newsletter, color: 'bg-portal-navy hover:opacity-90'    },
                  { label: 'Approve for Social',     action: approveSocial,     approved: item.approved_social,     color: 'bg-purple-600 hover:bg-purple-700'},
                ].map(ch => (
                  ch.approved ? (
                    <div key={ch.label} className="flex items-center gap-2 px-3 py-2 bg-portal-bg rounded-lg">
                      <span className="text-portal-green font-bold">✓</span>
                      <span className="text-xs font-semibold text-portal-sub">{ch.label.replace('Approve for ', '')} approved</span>
                    </div>
                  ) : (
                    <form key={ch.label} action={ch.action}>
                      <input type="hidden" name="item_id" value={item.id} />
                      <button type="submit"
                        className={`w-full py-2 rounded-lg text-xs font-bold text-white ${ch.color} transition-colors`}>
                        ✓ {ch.label}
                      </button>
                    </form>
                  )
                ))}
              </div>

              {/* Mark published */}
              {(item.approved_web || stage === 'approved') && item.status !== 'published' && (
                <form action={markPublished} className="mt-3 pt-3 border-t border-gray-50">
                  <input type="hidden" name="item_id" value={item.id} />
                  <button type="submit"
                    className="w-full py-2 rounded-lg text-xs font-bold border border-portal-border text-portal-text hover:bg-portal-bg transition-colors">
                    Mark as Published
                  </button>
                </form>
              )}
            </div>

            {/* Request Changes */}
            <Card title="Request Changes">
              <form action={requestChanges} className="space-y-2">
                <input type="hidden" name="item_id" value={item.id} />
                <textarea
                  name="changes_note"
                  defaultValue={item.needs_changes_note ?? ''}
                  placeholder="Describe what needs to be changed before this content is approved…"
                  rows={4}
                  className={iClsTA}
                />
                <button type="submit"
                  className="w-full py-2 rounded-lg text-xs font-bold text-portal-amber bg-portal-amber-lt border border-portal-amber/30 hover:bg-portal-amber-lt transition-colors">
                  ↩ Request Changes
                </button>
              </form>
            </Card>

            {/* Social Promotion Prep */}
            <div className="bg-white border border-portal-border rounded-lg overflow-hidden">
              <div className="px-5 py-3.5 border-b border-gray-50">
                <h2 className="text-xs font-bold text-portal-muted uppercase tracking-wide">Social Promotion Prep</h2>
                <p className="text-[11px] text-portal-muted mt-0.5">Prepared copy — not sent automatically. Approve before any posting.</p>
              </div>
              <div className="px-5 py-4">
                <form action={saveSocialPrep} className="space-y-4">
                  <input type="hidden" name="item_id" value={item.id} />

                  <div>
                    <label className="block text-xs font-semibold text-portal-sub mb-1.5">Facebook Caption</label>
                    <textarea name="caption_facebook" rows={4} defaultValue={item.caption_facebook ?? ''} placeholder="Write a warm, local Facebook post…" className={iClsTA} />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-portal-sub mb-1.5">Instagram Caption</label>
                    <textarea name="caption_instagram" rows={4} defaultValue={item.caption_instagram ?? ''} placeholder="Short, visual, community-feeling…" className={iClsTA} />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-portal-sub mb-1">SMS / Text Teaser <span className="text-gray-300 font-normal">(keep under 160 chars)</span></label>
                    <input name="caption_sms" type="text" maxLength={160} defaultValue={item.caption_sms ?? ''} placeholder="Quick teaser for text subscribers…" className={iCls} />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-portal-sub mb-1.5">Newsletter Teaser <span className="text-gray-300 font-normal">(2–3 sentences)</span></label>
                    <textarea name="newsletter_teaser" rows={3} defaultValue={item.newsletter_teaser ?? ''} placeholder="Brief intro for the newsletter…" className={iClsTA} />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-portal-sub mb-1.5">Hashtags <span className="text-gray-300 font-normal">(comma-separated)</span></label>
                      <input name="social_hashtags" type="text" defaultValue={hashtagStr} placeholder="rrp, montgomeryal" className={iCls} />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-portal-sub mb-1.5">Post Date</label>
                      <input name="social_publish_date" type="date" defaultValue={item.social_publish_date ?? ''} className={iCls} />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-portal-sub mb-1.5">Image Note</label>
                    <input name="social_image_note" type="text" defaultValue={item.social_image_note ?? ''} placeholder="Which photo to use…" className={iCls} />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-portal-sub mb-1.5">Link</label>
                    <input name="social_link" type="url" defaultValue={item.social_link ?? ''} placeholder="https://…" className={iCls} />
                  </div>

                  <button type="submit" className="w-full py-2.5 rounded-lg text-xs font-bold text-white bg-gray-800 hover:bg-gray-700 transition-colors">
                    Save Social Prep
                  </button>
                </form>
              </div>
            </div>

            {/* GHL / Social Planner Handoff */}
            {item.approved_social && (
              <Card title="Social Planner Handoff">
                {item.social_planner_ready ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-portal-green font-semibold text-sm">
                      <span className="text-lg">✓</span> Ready for Social Planner
                    </div>
                    <div className="space-y-1.5 text-xs">
                      {[
                        { label: 'Post Date',   val: item.social_publish_date ? fmtDate(item.social_publish_date) : '—' },
                        { label: 'Link',        val: item.social_link ?? '—' },
                        { label: 'Image Note',  val: item.social_image_note ?? '—' },
                        { label: 'Hashtags',    val: Array.isArray(item.social_hashtags) && item.social_hashtags.length > 0 ? item.social_hashtags.map(h => `#${h}`).join(' ') : '—' },
                      ].map(r => (
                        <div key={r.label} className="flex gap-2">
                          <span className="text-portal-muted w-20 shrink-0">{r.label}:</span>
                          <span className="text-portal-text break-all">{r.val}</span>
                        </div>
                      ))}
                    </div>
                    <p className="text-[11px] text-portal-muted border-t border-gray-50 pt-2">
                      No automatic posting. Hand caption and link to GHL or your scheduling tool manually.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <p className="text-xs text-portal-sub leading-relaxed">
                      Social is approved. When the caption, link, and image are ready, mark this for the social planner.
                    </p>
                    <form action={markPlannerReady}>
                      <input type="hidden" name="item_id" value={item.id} />
                      <button type="submit"
                        className="w-full py-2.5 rounded-lg text-sm font-bold text-white bg-purple-600 hover:bg-purple-700 transition-colors">
                        ✓ Mark Ready for Social Planner
                      </button>
                    </form>
                  </div>
                )}
              </Card>
            )}

            {/* AI Assist — wired */}
            <div className="bg-white border border-portal-border rounded-lg overflow-hidden">
              <div className="px-5 py-3.5 border-b border-gray-50">
                <h2 className="text-xs font-bold text-portal-muted uppercase tracking-wide">AI Assist</h2>
                <p className="text-[11px] text-portal-muted mt-0.5">
                  AI drafts first-pass copy. Edit in the Social Prep form above, then approve.
                </p>
              </div>
              <div className="px-5 py-4 space-y-1.5">

                {/* Generate channel copy */}
                {[
                  {
                    icon: '✍️', label: 'Generate Facebook Caption',
                    action: genFacebook,  has: !!item.caption_facebook,
                    field: 'Facebook caption',
                  },
                  {
                    icon: '📸', label: 'Generate Instagram Caption',
                    action: genInstagram, has: !!item.caption_instagram,
                    field: 'Instagram caption',
                  },
                  {
                    icon: '📧', label: 'Generate Newsletter Teaser',
                    action: genNewsletter, has: !!item.newsletter_teaser,
                    field: 'Newsletter teaser',
                  },
                  {
                    icon: '💬', label: 'Generate SMS Teaser',
                    action: genSms,       has: !!item.caption_sms,
                    field: 'SMS teaser',
                  },
                  {
                    icon: '#',  label: 'Generate Hashtags',
                    action: genHashtags,  has: !!(item.social_hashtags?.length),
                    field: 'Hashtags',
                  },
                  {
                    icon: '🖼️', label: 'Generate Image Note',
                    action: genImageNote, has: !!item.social_image_note,
                    field: 'Image note',
                  },
                ].map(btn => (
                  <form key={btn.label} action={btn.action}>
                    <input type="hidden" name="item_id" value={item.id} />
                    <button
                      type="submit"
                      className="w-full text-left flex items-center gap-2.5 px-3 py-2 rounded-lg border border-indigo-100 bg-indigo-50 text-xs text-indigo-700 hover:bg-indigo-100 transition-colors font-medium"
                    >
                      <span className="text-sm shrink-0">{btn.icon}</span>
                      <span className="flex-1">
                        {btn.has ? `↺ Regenerate ${btn.field}` : btn.label}
                      </span>
                      {btn.has && (
                        <span className="text-[10px] text-portal-green font-bold shrink-0">✓ Has copy</span>
                      )}
                    </button>
                  </form>
                ))}

                {/* Transformation operations — coming soon */}
                <div className="pt-2 mt-1 border-t border-gray-50 space-y-1.5">
                  <p className="text-[10px] font-semibold text-portal-muted uppercase tracking-wide">Refine — Coming Soon</p>
                  {['✂️ Shorten Caption', '🌡️ Make Warmer', '👔 Make More Professional'].map(label => (
                    <button key={label} disabled
                      className="w-full text-left flex items-center gap-2 px-3 py-2 rounded-lg border border-portal-border text-xs text-portal-muted cursor-not-allowed">
                      <span className="flex-1">{label}</span>
                      <span className="text-[10px] bg-gray-100 text-portal-muted px-1.5 py-0.5 rounded font-medium">Soon</span>
                    </button>
                  ))}
                </div>

                {/* Safety note */}
                <p className="text-[10px] text-portal-muted pt-2 leading-relaxed border-t border-gray-50 mt-1">
                  Generated copy is not approved or posted automatically. Edit in the Social Prep form above, then use channel approval and social planner handoff.
                </p>
              </div>
            </div>

          </div>
        </div>
      </main>
    )
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  QUEUE VIEW — when no ?id= selected
  // ══════════════════════════════════════════════════════════════════════════

  return (
    <main className="p-6 max-w-[900px] mx-auto space-y-6 pb-16">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-portal-text tracking-tight">Editor Review Desk</h1>
          <p className="text-sm text-portal-sub mt-0.5">
            Review drafts, approve content, and prepare social copy before anything goes out.
          </p>
        </div>
        <Link href="/admin/editorial" className="text-xs px-3 py-2 rounded-lg border border-portal-border text-portal-sub hover:bg-portal-bg font-medium shrink-0">
          ← Editorial Pipeline
        </Link>
      </div>

      {/* Metrics strip */}
      <div className="grid grid-cols-5 gap-3">
        {[
          { label: 'Needs Review',   val: groups.needsReview.length,  color: '#374151' },
          { label: 'Needs Changes',  val: groups.needsChanges.length, color: '#d97706' },
          { label: 'Approved',       val: groups.approved.length,     color: '#16a34a' },
          { label: 'Planner Ready',  val: groups.plannerReady.length, color: '#7c3aed' },
          { label: 'Published',      val: groups.published.length,    color: '#64748b' },
        ].map(m => (
          <div key={m.label} className="bg-white border border-portal-border rounded-lg px-4 py-3">
            <div className="text-2xl font-bold" style={{ color: m.color }}>{m.val}</div>
            <div className="text-[11px] text-portal-muted mt-0.5 leading-tight">{m.label}</div>
          </div>
        ))}
      </div>

      {/* Queue groups */}
      {queueItems.length === 0 ? (
        <div className="bg-white border border-portal-border rounded-lg px-8 py-16 text-center">
          <div className="text-4xl mb-4">📬</div>
          <p className="text-portal-sub font-medium">Nothing in the review queue right now.</p>
          <Link href="/admin/editorial" className="text-sm text-indigo-600 mt-2 inline-block hover:underline">
            Go to Editorial Pipeline →
          </Link>
        </div>
      ) : (
        <div className="space-y-8">
          {[
            { label: 'Needs Editor Review',   items: groups.needsReview,  stageCls: 'text-portal-text',  desc: 'Approved drafts awaiting your review.' },
            { label: 'Changes Requested',     items: groups.needsChanges, stageCls: 'text-portal-amber', desc: 'Sent back for revisions.' },
            { label: 'Approved',              items: groups.approved,     stageCls: 'text-portal-green', desc: 'Approved for at least one channel.' },
            { label: 'Ready for Planner',     items: groups.plannerReady, stageCls: 'text-purple-700',desc: 'Social copy complete and handed off.' },
            { label: 'Published / Promoted',  items: groups.published,    stageCls: 'text-portal-muted',  desc: 'Live or promoted.' },
          ].map(grp => {
            if (grp.items.length === 0) return null
            return (
              <div key={grp.label}>
                <div className="flex items-center gap-3 mb-3">
                  <h2 className={`text-sm font-bold shrink-0 ${grp.stageCls}`}>
                    {grp.label}
                    <span className="ml-2 text-portal-muted font-normal">({grp.items.length})</span>
                  </h2>
                  <div className="flex-1 h-px bg-gray-100" />
                  <p className="text-xs text-portal-muted shrink-0 hidden sm:block">{grp.desc}</p>
                </div>
                <div className="space-y-2">
                  {grp.items.map(item => {
                    const tc    = SUBMISSION_TYPES.find(t => t.type === item.submission_type)
                    const title = displayTitle(item)
                    const img   = hasImage(item)
                    return (
                      <Link
                        key={item.id}
                        href={`/admin/editorial/approval?id=${item.id}`}
                        className="block bg-white border border-portal-border rounded-lg overflow-hidden hover:border-portal-border-2 transition-colors"
                        style={{ borderLeft: `4px solid ${TYPE_COLORS[item.submission_type] ?? '#374151'}` }}
                      >
                        <div className="px-5 py-4 flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-1.5">
                              <span className="text-lg">{tc?.emoji}</span>
                              <span className="text-[10px] font-bold text-portal-muted uppercase tracking-wide">{tc?.shortLabel}</span>
                              <span className="text-[10px] bg-gray-100 text-portal-sub px-2 py-0.5 rounded font-semibold">{item.target_publication.toUpperCase()}</span>
                              {item.needs_changes_note && (
                                <span className="text-[10px] font-bold bg-portal-amber-lt text-portal-amber px-2 py-0.5 rounded">Changes Needed</span>
                              )}
                              {!img && <span className="text-[10px] bg-portal-amber-lt text-portal-amber px-2 py-0.5 rounded font-semibold">No image</span>}
                            </div>
                            <p className={`text-sm font-semibold leading-snug ${item.working_title ? 'text-portal-text' : 'text-portal-muted italic'} truncate`}>
                              {title}
                            </p>
                            <div className="flex gap-2 mt-1.5 flex-wrap">
                              <ApprovalBadge label="Web"        approved={item.approved_web}        color="#16a34a" />
                              <ApprovalBadge label="Newsletter" approved={item.approved_newsletter} color="#0284c7" />
                              <ApprovalBadge label="Social"     approved={item.approved_social}     color="#7c3aed" />
                            </div>
                          </div>
                          <span className="text-xs font-bold text-indigo-600 shrink-0 mt-1">Review →</span>
                        </div>
                      </Link>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </main>
  )
}
