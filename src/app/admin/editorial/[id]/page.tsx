// ── /admin/editorial/[id] ─────────────────────────────────────────────────────
// Editorial production detail for one community submission.
// Focus: article metadata, destination assignment, publish readiness, draft review.
// Human editorial approval remains required before any content goes live.

import type { Metadata }         from 'next'
import type { ReactNode }        from 'react'
import { notFound, redirect }    from 'next/navigation'
import Link                      from 'next/link'
import { createClient }          from '@/lib/supabase/server'
import { generateCommunityDraft } from '@/lib/community-drafts'
import {
  SUBMISSION_TYPES, STATUS_CONFIG, TYPE_COLORS,
  type SubmissionStatus, type SubmissionTypeConfig,
} from '@/lib/submissions'
import { GUIDE_CONFIGS } from '@/app/partners/guide/configs'

export const metadata: Metadata = { title: 'Editorial Review — Admin' }

// ── Types ─────────────────────────────────────────────────────────────────────

interface FullEditorialItem {
  id:                    string
  submission_type:       string
  target_publication:    string
  target_market:         string | null
  issue_month:           string | null
  issue_year:            number | null
  submitter_name:        string
  submitter_email:       string
  related_person_name:   string | null
  related_business_name: string | null
  related_school_name:   string | null
  status:                SubmissionStatus
  ai_draft_status:       string
  ai_draft_content:      string | null
  ai_prompt_used:        string | null
  internal_priority:     string
  assigned_to:           string | null
  editor_notes:          string | null
  payload:               Record<string, string>
  photo_urls:            Array<{ url: string; caption?: string }>
  // Editorial columns (null if migration not yet run)
  working_title:          string | null
  excerpt:               string | null
  slug_suggestion:       string | null
  feature_image_url:     string | null
  tags:                  string[] | null
  destination_section:   string | null
  destination_guide_slug:string | null
  print_placement:       string | null
  publish_date:          string | null
  newsletter_include:    boolean
  social_queue:          boolean
  homepage_feature:      boolean
  permissions_confirmed: boolean
  created_at:            string
  updated_at:            string
}

// ── Static data ───────────────────────────────────────────────────────────────

const DESTINATION_SECTIONS = [
  { value: 'website-article',  label: 'Website Article'             },
  { value: 'print-issue',      label: 'Print Issue'                 },
  { value: 'grouped-roundup',  label: 'Grouped Roundup (Roundup page, Birthday page, School Bits)' },
  { value: 'guide-integration',label: 'Guide Integration'           },
  { value: 'homepage-section', label: 'Homepage Feature'            },
  { value: 'newsletter',       label: 'Newsletter Only'             },
  { value: 'social-queue',     label: 'Social Queue Only'           },
  { value: 'family-favorites', label: 'Family Favorites Feature'    },
  { value: 'event-calendar',   label: 'Event Calendar'              },
]

const PUBLICATIONS = [
  { value: 'rrp',  label: 'RRP — River Region Parents' },
  { value: 'mbp',  label: 'MBP — Mobile Bay Parents'   },
  { value: 'aop',  label: 'AOP — Auburn Opelika Parents'},
  { value: 'esp',  label: 'ESP — Eastern Shore Parents' },
  { value: 'gpp',  label: 'GPP — Greater Pensacola Parents' },
  { value: 'boom', label: 'BOOM — River Region Boom'   },
]

const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
]

// ── Readiness checklist ────────────────────────────────────────────────────────

interface ReadinessItem { label: string; present: boolean; required: boolean }

const PROFILE_TYPES = ['teacher-of-the-month', 'mom-to-mom', 'grands-are-the-greatest', 'play-ball', 'boom-profile', 'student-spotlight']

function buildReadiness(item: FullEditorialItem, config: SubmissionTypeConfig): ReadinessItem[] {
  const dest      = item.destination_section
  const isProfile = PROFILE_TYPES.includes(item.submission_type)
  const isPrint   = dest === 'print-issue' || ['teacher-of-the-month','mom-to-mom','grands-are-the-greatest','play-ball','school-news','birthday-celebration','parent-picks','boom-profile'].includes(item.submission_type)
  const isWeb     = !dest || ['website-article','homepage-section','grouped-roundup'].includes(dest)
  const isGuide   = dest === 'guide-integration'

  const items: ReadinessItem[] = [
    { label: 'Working title set',    present: !!item.working_title?.trim(),     required: true  },
    { label: 'Destination assigned', present: !!dest,                           required: true  },
    { label: 'Publication set',      present: !!item.target_publication,        required: true  },
    { label: 'AI draft exists',      present: item.ai_draft_status === 'ready', required: false },
  ]

  if (config.photoRequired) {
    items.push({ label: 'Photo received (required)', present: item.photo_urls.length > 0, required: true })
  } else if (isProfile || config.photoHint) {
    items.push({ label: 'Photo received',            present: item.photo_urls.length > 0, required: false })
  }

  if (isPrint) {
    items.push({ label: 'Issue assigned (month + year)', present: !!(item.issue_month && item.issue_year), required: false })
    items.push({ label: 'Print placement noted',         present: !!item.print_placement?.trim(),          required: false })
  }

  if (isProfile) {
    items.push({ label: 'Permissions confirmed', present: item.permissions_confirmed, required: false })
  }

  if (isWeb || isGuide) {
    items.push({ label: 'Excerpt written', present: !!item.excerpt?.trim(), required: false })
  }

  if (dest === 'guide-integration') {
    items.push({ label: 'Guide selected', present: !!item.destination_guide_slug, required: true })
  }

  return items
}

function readinessScore(items: ReadinessItem[]): number {
  const req  = items.filter(i => i.required)
  const done = req.filter(i => i.present)
  return req.length > 0 ? Math.round((done.length / req.length) * 100) : 100
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function displayTitle(item: FullEditorialItem): string {
  if (item.working_title) return item.working_title
  const entity = item.related_person_name ?? item.related_business_name ?? item.related_school_name
  const tc = SUBMISSION_TYPES.find(t => t.type === item.submission_type)
  if (entity) return entity
  return `${tc?.label ?? item.submission_type} from ${item.submitter_name}`
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
}

// ── Sub-components ─────────────────────────────────────────────────────────────

const iCls  = 'w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-gray-400 transition-colors'
const iClsTA = `${iCls} resize-vertical`

function Card({ title, children, accent }: { title: string; accent?: string; children: ReactNode }) {
  return (
    <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden" style={accent ? { borderTop: `3px solid ${accent}` } : {}}>
      <div className="px-5 py-3.5 border-b border-gray-50">
        <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wide">{title}</h2>
      </div>
      <div className="px-5 py-4">{children}</div>
    </div>
  )
}

function Row({ label, required, hint, children }: { label: string; required?: boolean; hint?: string; children: ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-500 mb-1.5">
        {label}{required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      {children}
      {hint && <p className="text-[11px] text-gray-400 mt-1 leading-relaxed">{hint}</p>}
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function EditorialDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const supabase = await createClient()

  const { data, error } = await supabase
    .from('community_submissions')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !data) notFound()

  const item   = data as unknown as FullEditorialItem
  const config = SUBMISSION_TYPES.find(t => t.type === item.submission_type)
  if (!config) notFound()

  const accentColor = TYPE_COLORS[item.submission_type] ?? '#374151'
  const sc          = STATUS_CONFIG[item.status]
  const checklist   = buildReadiness(item, config)
  const score       = readinessScore(checklist)
  const scoreColor  = score === 100 ? '#16a34a' : score >= 60 ? '#b8860b' : '#dc2626'
  const tagsStr     = Array.isArray(item.tags) ? item.tags.join(', ') : ''

  // ── Server actions ─────────────────────────────────────────────────────────

  async function saveEditorial(formData: FormData) {
    'use server'
    const supabase = await createClient()

    const working_title         = (formData.get('working_title')         as string) || null
    const excerpt               = (formData.get('excerpt')               as string) || null
    const slug_suggestion       = (formData.get('slug_suggestion')       as string) || null
    const feature_image_url     = (formData.get('feature_image_url')     as string) || null
    const tagsRaw               = (formData.get('tags')                  as string) || ''
    const tags                  = tagsRaw.split(',').map(t => t.trim()).filter(Boolean)
    const destination_section   = (formData.get('destination_section')   as string) || null
    const destination_guide_slug= (formData.get('destination_guide_slug')as string) || null
    const print_placement       = (formData.get('print_placement')       as string) || null
    const publish_date          = (formData.get('publish_date')          as string) || null
    const target_publication    = (formData.get('target_publication')    as string) || 'rrp'
    const assigned_to           = (formData.get('assigned_to')          as string) || null
    const issue_month           = (formData.get('issue_month')           as string) || null
    const iy                    = (formData.get('issue_year')            as string) || ''
    const issue_year            = iy ? parseInt(iy) : null
    const newsletter_include    = formData.get('newsletter_include')    === 'on'
    const social_queue          = formData.get('social_queue')          === 'on'
    const homepage_feature      = formData.get('homepage_feature')      === 'on'
    const permissions_confirmed = formData.get('permissions_confirmed') === 'on'

    await supabase
      .from('community_submissions')
      .update({
        working_title,
        excerpt,
        slug_suggestion,
        feature_image_url,
        tags,
        destination_section,
        destination_guide_slug,
        print_placement,
        publish_date:        publish_date || null,
        target_publication,
        assigned_to,
        issue_month,
        issue_year,
        newsletter_include,
        social_queue,
        homepage_feature,
        permissions_confirmed,
      })
      .eq('id', id)

    redirect(`/admin/editorial/${id}`)
  }

  async function updateStatus(formData: FormData) {
    'use server'
    const supabase = await createClient()
    const status   = formData.get('status') as string
    await supabase.from('community_submissions').update({ status }).eq('id', id)
    redirect(`/admin/editorial/${id}`)
  }

  async function generateDraft(_fd: FormData) {
    'use server'
    await generateCommunityDraft(id)
    redirect(`/admin/editorial/${id}`)
  }

  async function clearDraft(_fd: FormData) {
    'use server'
    const supabase = await createClient()
    await supabase
      .from('community_submissions')
      .update({ ai_draft_content: null, ai_draft_status: 'none', ai_prompt_used: null })
      .eq('id', id)
    redirect(`/admin/editorial/${id}`)
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <main className="p-6 max-w-[1280px] mx-auto space-y-6 pb-16">

      {/* ── HEADER ──────────────────────────────────────────────────────── */}
      <div>
        <Link href="/admin/editorial" className="text-sm text-gray-400 hover:text-gray-700 font-medium transition-colors">
          ← Editorial Pipeline
        </Link>
        <div className="mt-3 flex items-start gap-4 flex-wrap">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <span className="text-xl">{config.emoji}</span>
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wide">{config.label}</span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold" style={{ backgroundColor: sc?.bg ?? '#f9fafb', color: sc?.color ?? '#374151' }}>
                {sc?.label ?? item.status}
              </span>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
                {item.target_publication.toUpperCase()}
              </span>
              {/* Readiness score */}
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: `${scoreColor}18`, color: scoreColor }}>
                {score}% ready
              </span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">{displayTitle(item)}</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {config.group} · {fmtDate(item.created_at)} · by {item.submitter_name}
            </p>
          </div>
          <Link href={`/admin/community/${id}`}
            className="shrink-0 px-4 py-2 text-xs font-semibold text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">
            Submission View ↗
          </Link>
        </div>
      </div>

      {/* ── TWO-COLUMN BODY ──────────────────────────────────────────────── */}
      <div className="flex gap-6 items-start flex-wrap">

        {/* ── LEFT COLUMN: Content ────────────────────────────────────── */}
        <div className="flex-1 min-w-[320px] space-y-4">

          {/* Source submission answers — collapsed */}
          <details className="bg-white border border-gray-100 rounded-2xl overflow-hidden">
            <summary className="px-5 py-4 text-xs font-semibold text-gray-400 cursor-pointer hover:bg-gray-50 transition-colors select-none uppercase tracking-wide flex items-center gap-2">
              <span>Source Submission Answers</span>
              <span className="text-gray-300">▸</span>
            </summary>
            <div className="px-5 pb-5 pt-1 border-t border-gray-50 space-y-4">
              {/* Submitter */}
              <div className="flex items-center gap-3 pt-2">
                <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-sm font-bold text-gray-500 shrink-0">
                  {item.submitter_name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-800">{item.submitter_name}</p>
                  <a href={`mailto:${item.submitter_email}`} className="text-xs text-blue-600 hover:underline">{item.submitter_email}</a>
                </div>
              </div>
              {/* Payload answers */}
              <div className="space-y-3 border-t border-gray-50 pt-3">
                {config.fields.map(f => {
                  const v = item.payload[f.id]
                  return (
                    <div key={f.id}>
                      <p className="text-[11px] font-semibold text-gray-400 mb-0.5">{f.label}</p>
                      {v ? (
                        <p className={`text-sm text-gray-700 leading-relaxed ${f.type === 'textarea' ? 'whitespace-pre-wrap' : ''}`}>{v}</p>
                      ) : (
                        <p className="text-sm italic text-gray-300">{f.required ? 'Not provided' : 'Not provided (optional)'}</p>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          </details>

          {/* AI Draft */}
          {item.ai_draft_content ? (
            <div className={`bg-white rounded-2xl overflow-hidden border ${
              item.ai_draft_status === 'needs_info' ? 'border-amber-200'
              : item.ai_draft_status === 'failed'  ? 'border-red-200'
              : 'border-gray-100'
            }`}>
              <div className="px-5 py-3.5 border-b border-gray-50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wide">AI Draft</h2>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    item.ai_draft_status === 'ready'     ? 'bg-green-100 text-green-700'
                    : item.ai_draft_status === 'needs_info' ? 'bg-amber-100 text-amber-700'
                    : 'bg-red-100 text-red-700'
                  }`}>
                    {item.ai_draft_status === 'needs_info' ? 'Missing Info' : item.ai_draft_status}
                  </span>
                </div>
                {item.ai_prompt_used && (
                  <span className="text-[10px] text-gray-400 font-mono">{item.ai_prompt_used}</span>
                )}
              </div>
              {item.ai_draft_status === 'ready' && (
                <div className="px-5 py-2.5 bg-amber-50 border-b border-amber-100">
                  <p className="text-xs text-amber-800 font-medium">
                    ⚠️ Review carefully. Verify all facts before publishing. Human editorial approval required.
                  </p>
                </div>
              )}
              <div className="px-5 py-5">
                <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">{item.ai_draft_content}</p>
              </div>
              <div className="px-5 pb-4 flex items-center justify-between">
                <p className="text-[10px] text-gray-400">
                  {fmtDate(item.updated_at)} · AI assist only — human approval required
                </p>
                <div className="flex gap-2">
                  <form action={generateDraft}>
                    <button type="submit" className="text-[11px] px-2.5 py-1 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 font-semibold">
                      ↺ Regenerate
                    </button>
                  </form>
                  <form action={clearDraft}>
                    <button type="submit" className="text-[11px] px-2.5 py-1 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 font-semibold">
                      Clear
                    </button>
                  </form>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white border border-gray-100 rounded-2xl p-5">
              <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3">AI Draft</h2>
              <p className="text-sm text-gray-400 italic mb-3">No draft generated yet.</p>
              <form action={generateDraft}>
                <button type="submit" className="px-5 py-2 rounded-xl text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors">
                  ✍️ Generate Draft
                </button>
              </form>
            </div>
          )}

          {/* Editor Notes */}
          {item.editor_notes && (
            <Card title="Editor Notes">
              <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{item.editor_notes}</p>
              <Link href={`/admin/community/${id}`} className="text-xs text-blue-600 hover:underline mt-2 inline-block">
                Edit in submission view →
              </Link>
            </Card>
          )}

        </div>

        {/* ── RIGHT COLUMN: Editorial controls ────────────────────────── */}
        <div className="w-96 shrink-0 space-y-4">

          {/* Article Metadata + Destination — one save form */}
          <form action={saveEditorial} className="space-y-4">

            {/* Article Metadata */}
            <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden" style={{ borderTop: `3px solid ${accentColor}` }}>
              <div className="px-5 py-3.5 border-b border-gray-50">
                <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wide">Article Metadata</h2>
              </div>
              <div className="px-5 py-4 space-y-4">
                <Row label="Working Title" required>
                  <input name="working_title" type="text" defaultValue={item.working_title ?? ''} placeholder="Enter editorial headline…" className={iCls} />
                </Row>
                <Row label="Excerpt" hint="1–2 sentences for web/newsletter use.">
                  <textarea name="excerpt" rows={3} defaultValue={item.excerpt ?? ''} placeholder="Short summary for digital use…" className={iClsTA} />
                </Row>
                <Row label="Slug Suggestion" hint="URL-friendly version of the title.">
                  <input name="slug_suggestion" type="text" defaultValue={item.slug_suggestion ?? ''} placeholder="teacher-spotlight-jane-smith-2026" className={iCls} />
                </Row>
                <Row label="Feature Image URL">
                  <input name="feature_image_url" type="url" defaultValue={item.feature_image_url ?? ''} placeholder="https://…" className={iCls} />
                </Row>
                <Row label="Tags" hint="Comma-separated. e.g. education, teacher, montgomery">
                  <input name="tags" type="text" defaultValue={tagsStr} placeholder="education, teacher, montgomery" className={iCls} />
                </Row>
                <div className="grid grid-cols-2 gap-3">
                  <Row label="Publish Date">
                    <input name="publish_date" type="date" defaultValue={item.publish_date ?? ''} className={iCls} />
                  </Row>
                  <Row label="Print Placement">
                    <input name="print_placement" type="text" defaultValue={item.print_placement ?? ''} placeholder="Page 14, left" className={iCls} />
                  </Row>
                </div>
              </div>
            </div>

            {/* Destination & Assignment */}
            <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden">
              <div className="px-5 py-3.5 border-b border-gray-50">
                <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wide">Destination & Assignment</h2>
              </div>
              <div className="px-5 py-4 space-y-4">
                <Row label="Primary Destination" required>
                  <select name="destination_section" defaultValue={item.destination_section ?? ''} className={iCls}>
                    <option value="">Select destination…</option>
                    {DESTINATION_SECTIONS.map(d => (
                      <option key={d.value} value={d.value}>{d.label}</option>
                    ))}
                  </select>
                </Row>

                {/* Guide picker — shown when guide-integration is selected */}
                {item.destination_section === 'guide-integration' && (
                  <Row label="Target Guide" required>
                    <select name="destination_guide_slug" defaultValue={item.destination_guide_slug ?? ''} className={iCls}>
                      <option value="">Select guide…</option>
                      {GUIDE_CONFIGS.map(g => (
                        <option key={g.slug} value={g.slug}>
                          {g.slug.split('-').map((w: string) => w[0].toUpperCase() + w.slice(1)).join(' ')}
                        </option>
                      ))}
                    </select>
                  </Row>
                )}
                {/* Always render the guide field (hidden when not guide-integration) */}
                {item.destination_section !== 'guide-integration' && (
                  <input type="hidden" name="destination_guide_slug" value={item.destination_guide_slug ?? ''} />
                )}

                <Row label="Publication" required>
                  <select name="target_publication" defaultValue={item.target_publication} className={iCls}>
                    {PUBLICATIONS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                  </select>
                </Row>

                <div className="grid grid-cols-2 gap-3">
                  <Row label="Issue Month">
                    <select name="issue_month" defaultValue={item.issue_month ?? ''} className={iCls}>
                      <option value="">—</option>
                      {MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </Row>
                  <Row label="Issue Year">
                    <input name="issue_year" type="number" defaultValue={item.issue_year ?? ''} placeholder="2026" className={iCls} />
                  </Row>
                </div>

                <Row label="Assigned To">
                  <input name="assigned_to" type="text" defaultValue={item.assigned_to ?? ''} placeholder="Operator name" className={iCls} />
                </Row>

                {/* Additional destination flags */}
                <div className="space-y-2.5 pt-1 border-t border-gray-50">
                  <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Also include in:</p>
                  {[
                    { name: 'newsletter_include', label: 'Newsletter',       checked: item.newsletter_include },
                    { name: 'social_queue',       label: 'Social Queue',     checked: item.social_queue       },
                    { name: 'homepage_feature',   label: 'Homepage Feature', checked: item.homepage_feature   },
                  ].map(cb => (
                    <label key={cb.name} className="flex items-center gap-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        name={cb.name}
                        defaultChecked={cb.checked}
                        className="w-4 h-4 rounded border-gray-300 text-indigo-600"
                      />
                      <span className="text-sm text-gray-700">{cb.label}</span>
                    </label>
                  ))}
                  {/* Permissions — for profile types */}
                  {PROFILE_TYPES.includes(item.submission_type) && (
                    <label className="flex items-center gap-2.5 cursor-pointer pt-1 border-t border-gray-50">
                      <input
                        type="checkbox"
                        name="permissions_confirmed"
                        defaultChecked={item.permissions_confirmed}
                        className="w-4 h-4 rounded border-gray-300 text-green-600"
                      />
                      <span className="text-sm text-gray-700 font-medium">Permissions confirmed</span>
                    </label>
                  )}
                </div>
              </div>
            </div>

            {/* Save button */}
            <button type="submit"
              className="w-full py-2.5 rounded-xl text-sm font-bold text-white bg-gray-900 hover:bg-gray-700 transition-colors">
              Save Editorial Details
            </button>
          </form>

          {/* Publish Readiness Checklist */}
          <Card title="Publish Readiness">
            <div className="flex items-center gap-2 mb-3">
              <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all" style={{ width: `${score}%`, backgroundColor: scoreColor }} />
              </div>
              <span className="text-xs font-bold" style={{ color: scoreColor }}>{score}%</span>
            </div>
            <div className="space-y-2">
              {checklist.map((ci, i) => (
                <div key={i} className="flex items-start gap-2">
                  <span className={`text-base shrink-0 leading-none mt-0.5 ${
                    ci.present ? 'text-green-500' : ci.required ? 'text-red-400' : 'text-gray-300'
                  }`}>
                    {ci.present ? '✓' : ci.required ? '✗' : '○'}
                  </span>
                  <span className={`text-xs ${
                    ci.present ? 'text-gray-600' : ci.required ? 'text-red-700 font-semibold' : 'text-gray-400'
                  }`}>
                    {ci.label}
                    {!ci.present && !ci.required && <span className="text-gray-300 ml-1">(optional)</span>}
                  </span>
                </div>
              ))}
            </div>
            {score === 100 && (
              <p className="text-xs text-green-700 font-semibold mt-3 pt-3 border-t border-gray-50">
                All required items checked ✓ — ready to approve
              </p>
            )}
          </Card>

          {/* Status Workflow */}
          <Card title="Status Workflow">
            <div className="space-y-1.5">
              {(['approved', 'scheduled', 'published', 'needs-review', 'in-editing', 'rejected'] as SubmissionStatus[]).map(s => {
                const scfg    = STATUS_CONFIG[s]
                const current = s === item.status
                if (current) {
                  return (
                    <div key={s} className="py-1.5 px-3 rounded-lg text-xs font-semibold text-center"
                      style={{ backgroundColor: scfg.bg, color: scfg.color, border: `1.5px solid ${scfg.color}40` }}>
                      ● {scfg.label} (current)
                    </div>
                  )
                }
                return (
                  <form key={s} action={updateStatus}>
                    <input type="hidden" name="status" value={s} />
                    <button type="submit"
                      className="w-full py-1.5 px-3 rounded-lg text-xs font-semibold border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors text-left">
                      {scfg.label}
                    </button>
                  </form>
                )
              })}
            </div>
          </Card>

          {/* AI Future Hooks */}
          <Card title="AI Tools">
            <p className="text-[11px] text-gray-400 mb-3">Coming in a future update.</p>
            <div className="space-y-1.5">
              {[
                '💡 Rewrite Headline',
                '✂️ Shorten Excerpt',
                '📱 Generate Social Captions',
                '🔍 Suggest SEO Keywords',
                '🤝 Suggest Sponsor Pairing',
              ].map(label => (
                <button key={label} disabled
                  className="w-full text-left flex items-center gap-2.5 px-3 py-2 rounded-lg border border-gray-100 text-xs text-gray-400 cursor-not-allowed">
                  <span className="flex-1">{label}</span>
                  <span className="text-[10px] bg-gray-100 text-gray-400 px-1.5 py-0.5 rounded font-medium">Soon</span>
                </button>
              ))}
            </div>
          </Card>

        </div>
      </div>
    </main>
  )
}
