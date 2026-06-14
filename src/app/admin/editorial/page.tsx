// ── /admin/editorial ──────────────────────────────────────────────────────────
// Editorial Production Pipeline — queue view.
// Groups community submissions by editorial stage.
// Operator entry point for moving approved content toward publication.

import type { Metadata } from 'next'
import Link              from 'next/link'
import { createClient }  from '@/lib/supabase/server'
import { SUBMISSION_TYPES, STATUS_CONFIG, TYPE_COLORS } from '@/lib/submissions'

export const metadata: Metadata = { title: 'Editorial Pipeline — Admin' }
export const dynamic = 'force-dynamic'

// ── Types ─────────────────────────────────────────────────────────────────────

interface EditorialItem {
  id:                    string
  submission_type:       string
  target_publication:    string
  issue_month:           string | null
  issue_year:            number | null
  submitter_name:        string
  related_person_name:   string | null
  related_business_name: string | null
  related_school_name:   string | null
  status:                string
  ai_draft_status:       string
  internal_priority:     string
  assigned_to:           string | null
  working_title:         string | null
  excerpt:               string | null
  destination_section:   string | null
  photo_urls:            Array<{ url: string }>
  editor_notes:          string | null
  created_at:            string
}

// ── Editorial stages ───────────────────────────────────────────────────────────

type Stage = 'awaiting-draft' | 'draft-ready' | 'in-editing' | 'approved' | 'scheduled' | 'published'

interface StageConfig {
  key:         Stage
  label:       string
  color:       string
  description: string
}

const STAGES: StageConfig[] = [
  { key: 'awaiting-draft', label: 'Awaiting Draft',     color: '#6b7280', description: 'Needs AI draft or editorial start.' },
  { key: 'draft-ready',    label: 'Draft Ready',        color: '#6366f1', description: 'AI draft generated — needs editorial review.' },
  { key: 'in-editing',     label: 'In Editing',         color: '#ef6442', description: 'Editor actively working on this content.' },
  { key: 'approved',       label: 'Approved',           color: '#16a34a', description: 'Approved and ready to assign or publish.' },
  { key: 'scheduled',      label: 'Scheduled',          color: '#b8860b', description: 'Assigned to an issue or publish date.' },
  { key: 'published',      label: 'Published',          color: '#374151', description: 'Live in digital or print.' },
]

const DEST_LABELS: Record<string, string> = {
  'website-article':  'Website Article',
  'print-issue':      'Print Issue',
  'grouped-roundup':  'Grouped Roundup',
  'guide-integration':'Guide Integration',
  'homepage-section': 'Homepage Feature',
  'newsletter':       'Newsletter',
  'social-queue':     'Social Queue',
  'family-favorites': 'Family Favorites',
  'event-calendar':   'Event Calendar',
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function getStage(item: EditorialItem): Stage {
  const s = item.status
  if (s === 'published')     return 'published'
  if (s === 'scheduled')     return 'scheduled'
  if (s === 'approved')      return 'approved'
  if (s === 'ai-draft-ready') return 'approved'  // explicitly moved to pipeline
  if (s === 'in-editing')    return 'in-editing'
  if (['ready', 'edited'].includes(item.ai_draft_status)) return 'draft-ready'
  return 'awaiting-draft'
}

function displayTitle(item: EditorialItem): string {
  if (item.working_title) return item.working_title
  const entity = item.related_person_name ?? item.related_business_name ?? item.related_school_name
  const tc = SUBMISSION_TYPES.find(t => t.type === item.submission_type)
  if (entity) return `${tc?.shortLabel ?? item.submission_type}: ${entity}`
  return `${tc?.label ?? item.submission_type} — ${item.submitter_name}`
}

function warnings(item: EditorialItem): string[] {
  const w: string[] = []
  if (!item.working_title) w.push('No title')
  if (!item.destination_section) w.push('No destination')
  const config = SUBMISSION_TYPES.find(t => t.type === item.submission_type)
  if (config?.photoRequired && item.photo_urls.length === 0) w.push('Photo required')
  return w
}

function fmtIssue(item: EditorialItem): string {
  if (item.issue_month && item.issue_year) return `${item.issue_month} ${item.issue_year}`
  if (item.issue_month) return item.issue_month
  return ''
}

function timeAgo(iso: string): string {
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000)
  if (d === 0) return 'Today'
  if (d === 1) return 'Yesterday'
  if (d < 7) return `${d}d ago`
  return `${Math.floor(d / 7)}w ago`
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function EditorialPage({
  searchParams,
}: {
  searchParams: Promise<{ pub?: string; type?: string }>
}) {
  const { pub: filterPub, type: filterType } = await searchParams

  const supabase = await createClient()

  let query = supabase
    .from('community_submissions')
    .select('id, submission_type, target_publication, issue_month, issue_year, submitter_name, related_person_name, related_business_name, related_school_name, status, ai_draft_status, internal_priority, assigned_to, working_title, excerpt, destination_section, photo_urls, editor_notes, created_at')
    .neq('status', 'rejected')
    .neq('status', 'archived')
    .order('created_at', { ascending: false })
    .limit(300)

  if (filterPub)  query = query.eq('target_publication', filterPub)
  if (filterType) query = query.eq('submission_type', filterType)

  const { data } = await query
  const items = (data ?? []) as EditorialItem[]

  // Group by stage
  const grouped = new Map<Stage, EditorialItem[]>()
  for (const s of STAGES) grouped.set(s.key, [])
  for (const item of items) {
    const stage = getStage(item)
    grouped.get(stage)!.push(item)
  }

  // Metrics
  const total      = items.length
  const stageCounts = new Map(STAGES.map(s => [s.key, grouped.get(s.key)!.length]))
  const urgent     = items.filter(i => i.internal_priority === 'urgent').length

  // Active submissions to filter by type
  const typesInQueue = [...new Set(items.map(i => i.submission_type))]
    .map(t => SUBMISSION_TYPES.find(tc => tc.type === t))
    .filter(Boolean)

  // Publications in queue
  const pubsInQueue = [...new Set(items.map(i => i.target_publication))]

  // Filter link helpers
  function stableHref(overrides: { pub?: string | null; type?: string | null }) {
    const p = new URLSearchParams()
    const pub  = 'pub'  in overrides ? overrides.pub  : filterPub
    const type = 'type' in overrides ? overrides.type : filterType
    if (pub)  p.set('pub', pub)
    if (type) p.set('type', type)
    return `/admin/editorial${p.size ? `?${p}` : ''}`
  }

  return (
    <main className="flex-1 min-h-0 overflow-y-auto p-6 max-w-[1100px] mx-auto space-y-6 pb-16 w-full">

      {/* ── HEADER ──────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-portal-text tracking-tight">Editorial Pipeline</h1>
          <p className="text-sm text-portal-sub mt-0.5">
            Community submissions moving toward publication — assign, polish, and schedule.
          </p>
        </div>
        <Link href="/admin/community" className="text-xs px-3 py-2 rounded-lg border border-portal-border text-portal-sub hover:bg-portal-bg font-medium shrink-0">
          ← All Submissions
        </Link>
      </div>

      {/* ── METRICS STRIP ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-7 gap-2">
        {[
          { label: 'Total',        val: total,                              color: '#374151' },
          { label: 'Await Draft',  val: stageCounts.get('awaiting-draft')!, color: '#6b7280' },
          { label: 'Draft Ready',  val: stageCounts.get('draft-ready')!,   color: '#6366f1' },
          { label: 'In Editing',   val: stageCounts.get('in-editing')!,    color: '#ef6442' },
          { label: 'Approved',     val: stageCounts.get('approved')!,      color: '#16a34a' },
          { label: 'Scheduled',    val: stageCounts.get('scheduled')!,     color: '#b8860b' },
          { label: 'Urgent',       val: urgent,                            color: '#dc2626' },
        ].map(m => (
          <div key={m.label} className="bg-white border border-portal-border rounded-lg px-3 py-3">
            <div className="text-xl font-bold" style={{ color: m.color }}>{m.val}</div>
            <div className="text-[10px] text-portal-muted mt-0.5 leading-tight">{m.label}</div>
          </div>
        ))}
      </div>

      {/* ── FILTERS ─────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-4 items-center">

        {/* Publication filter */}
        {pubsInQueue.length > 1 && (
          <div className="flex gap-1.5 items-center flex-wrap">
            <span className="text-[11px] font-semibold text-portal-muted uppercase tracking-wide">Pub:</span>
            <Link href={stableHref({ pub: null })}
              className={`px-2.5 py-1 rounded-full text-xs font-semibold ${!filterPub ? 'bg-portal-navy text-white' : 'bg-portal-row-hover text-portal-sub hover:bg-portal-border-2'}`}>
              All
            </Link>
            {pubsInQueue.map(p => (
              <Link key={p} href={stableHref({ pub: p })}
                className={`px-2.5 py-1 rounded-full text-xs font-semibold transition-colors ${filterPub === p ? 'bg-portal-navy text-white' : 'bg-portal-row-hover text-portal-sub hover:bg-portal-border-2'}`}>
                {p.toUpperCase()}
              </Link>
            ))}
          </div>
        )}

        {/* Type filter */}
        {typesInQueue.length > 1 && (
          <div className="flex gap-1.5 items-center flex-wrap">
            <span className="text-[11px] font-semibold text-portal-muted uppercase tracking-wide">Type:</span>
            <Link href={stableHref({ type: null })}
              className={`px-2.5 py-1 rounded-full text-xs font-semibold ${!filterType ? 'bg-portal-navy text-white' : 'bg-portal-row-hover text-portal-sub hover:bg-portal-border-2'}`}>
              All
            </Link>
            {typesInQueue.map(tc => tc && (
              <Link key={tc.type} href={stableHref({ type: tc.type })}
                className={`px-2.5 py-1 rounded-full text-xs font-semibold transition-colors ${filterType === tc.type ? 'text-white' : 'bg-portal-row-hover text-portal-sub hover:bg-portal-border-2'}`}
                style={filterType === tc.type ? { backgroundColor: TYPE_COLORS[tc.type] ?? '#374151' } : {}}>
                {tc.emoji} {tc.shortLabel}
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* ── STAGE GROUPS ────────────────────────────────────────────────── */}
      {total === 0 ? (
        <div className="bg-white border border-portal-border rounded-lg px-8 py-16 text-center">
          <div className="text-4xl mb-4">📋</div>
          <p className="text-portal-sub font-medium">No editorial items match the current filters.</p>
          <Link href="/admin/editorial" className="text-sm text-portal-blue mt-2 inline-block hover:underline">Clear filters</Link>
        </div>
      ) : (
        <div className="space-y-8">
          {STAGES.map(stage => {
            const stageItems = grouped.get(stage.key)!
            if (stageItems.length === 0) return null

            return (
              <div key={stage.key}>
                {/* Stage header */}
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: stage.color }} />
                  <h2 className="text-sm font-bold text-portal-text">
                    {stage.label}
                    <span className="ml-2 text-portal-muted font-normal">({stageItems.length})</span>
                  </h2>
                  <div className="flex-1 h-px bg-portal-row-hover" />
                  <p className="text-xs text-portal-muted">{stage.description}</p>
                </div>

                {/* Stage items */}
                <div className="space-y-2">
                  {stageItems.map(item => {
                    const tc      = SUBMISSION_TYPES.find(t => t.type === item.submission_type)
                    const sc      = STATUS_CONFIG[item.status as keyof typeof STATUS_CONFIG]
                    const accent  = TYPE_COLORS[item.submission_type] ?? '#374151'
                    const title   = displayTitle(item)
                    const warns   = warnings(item)
                    const issue   = fmtIssue(item)

                    return (
                      <div key={item.id} className="bg-white border border-portal-border rounded-lg overflow-hidden hover:border-portal-border transition-colors"
                        style={{ borderLeft: `4px solid ${accent}` }}>
                        <div className="px-5 py-4 flex items-start gap-4">

                          {/* Main content */}
                          <div className="flex-1 min-w-0">
                            {/* Badge row */}
                            <div className="flex items-center gap-2 mb-2 flex-wrap">
                              <span className="text-base">{tc?.emoji ?? '📝'}</span>
                              <span className="text-[11px] font-bold text-portal-muted uppercase tracking-wide">{tc?.shortLabel ?? item.submission_type}</span>
                              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-portal-row-hover text-portal-sub">
                                {item.target_publication.toUpperCase()}
                              </span>
                              {item.ai_draft_status === 'ready' && (
                                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-portal-blue-lt text-portal-blue">
                                  AI Draft ✓
                                </span>
                              )}
                              {item.ai_draft_status === 'needs_info' && (
                                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-portal-amber-lt text-portal-amber">
                                  Missing Info
                                </span>
                              )}
                              {item.internal_priority === 'urgent' && (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-portal-red-lt text-portal-red">URGENT</span>
                              )}
                            </div>

                            {/* Title */}
                            <p className={`text-sm font-semibold leading-snug ${item.working_title ? 'text-portal-text' : 'text-portal-muted italic'}`}>
                              {title}
                            </p>

                            {/* Excerpt snippet */}
                            {item.excerpt && (
                              <p className="text-xs text-portal-muted mt-0.5 line-clamp-1">{item.excerpt}</p>
                            )}

                            {/* Meta row */}
                            <div className="flex items-center gap-3 mt-1.5 flex-wrap text-xs text-portal-muted">
                              {issue && <span>{issue}</span>}
                              {item.assigned_to && <span>· {item.assigned_to}</span>}
                              {item.destination_section && (
                                <span className="px-2 py-0.5 rounded-full bg-portal-row-hover text-portal-sub text-[10px] font-semibold">
                                  {DEST_LABELS[item.destination_section] ?? item.destination_section}
                                </span>
                              )}
                            </div>

                            {/* Warnings */}
                            {warns.length > 0 && (
                              <div className="flex gap-1.5 mt-2 flex-wrap">
                                {warns.map(w => (
                                  <span key={w} className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-portal-amber-lt text-portal-amber border border-portal-amber/30">
                                    ⚠ {w}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* Right: date + action */}
                          <div className="shrink-0 text-right space-y-1.5">
                            <p className="text-xs text-portal-muted">{timeAgo(item.created_at)}</p>
                            <Link
                              href={`/admin/editorial/${item.id}`}
                              className="block text-xs font-bold text-portal-blue hover:underline"
                            >
                              Review →
                            </Link>
                            <Link
                              href={`/admin/community/${item.id}`}
                              className="block text-[10px] text-portal-muted hover:text-portal-sub"
                            >
                              Submission ↗
                            </Link>
                          </div>
                        </div>
                      </div>
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
