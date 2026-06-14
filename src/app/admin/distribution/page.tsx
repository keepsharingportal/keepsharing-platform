// ── /admin/distribution ────────────────────────────────────────────────────────
// Content Distribution & Amplification Center.
// Orchestration layer for strategic content deployment across the ecosystem.
// Human editorial judgment primary — this system guides, surfaces, and organizes.
// It does NOT auto-publish, auto-promote, or auto-pair sponsors.

import type { Metadata } from 'next'
import Link              from 'next/link'
import { redirect }      from 'next/navigation'
import { createClient }  from '@/lib/supabase/server'
import { SUBMISSION_TYPES, TYPE_COLORS } from '@/lib/submissions'
import { GUIDE_CONFIGS } from '@/app/partners/guide/configs'
import type { SubmissionRow } from '@/types/db'
import { normalizePublication, PUBLICATION_NAMES } from '@/lib/queries/publications'
import { SUBMISSION_DISTRIBUTION_COLS } from '@/lib/queries/submissions'
import { AdminSectionHeader } from '@/components/admin/AdminSectionHeader'
import { SPONSOR_CATEGORIES } from '@/lib/sponsors/categories'
import { AISectionFiller, type Candidate as AICandidate } from './AISectionFiller'
import { AINewsletterSubjects } from './AINewsletterSubjects'
import { AISocialCaption } from './AISocialCaption'
import { NewsletterSaveDraft } from './NewsletterSaveDraft'

export const metadata: Metadata = { title: 'Distribution — Admin' }

// ── Types ─────────────────────────────────────────────────────────────────────

// DistItem is a view of SubmissionRow — uses the same shared type.
// The distribution page queries a subset of columns; SubmissionRow covers them all.
type DistItem = SubmissionRow

interface SponsorRow {
  id:                   string
  business_name:        string
  package_tier:         string | null
  sponsor_category_slug:string | null
  sponsor_guide_slug:   string | null
  lifecycle_stage:      string
}

interface GuideArticleStat {
  guide_slug:     string
  article_count:  number
  latest_article: string | null
}

// ── Static config ─────────────────────────────────────────────────────────────

const VIEWS = [
  { key: 'standup',    label: 'Today',      icon: '☕' },
  { key: 'queue',      label: 'Queue',      icon: '📋' },
  { key: 'homepage',   label: 'Homepage',   icon: '🏠' },
  { key: 'newsletter', label: 'Newsletter', icon: '📧' },
  { key: 'social',     label: 'Social',     icon: '📱' },
  { key: 'guides',     label: 'Guides',     icon: '📖' },
  { key: 'sponsors',   label: 'Sponsors',   icon: '🤝' },
  { key: 'health',     label: 'Health',     icon: '📊' },
] as const

type ViewKey = (typeof VIEWS)[number]['key']

const HOMEPAGE_SECTIONS = [
  { value: 'hero',      label: 'Hero — Top Story'         },
  { value: 'featured',  label: 'Featured Stories'          },
  { value: 'community', label: 'Community Highlights'      },
  { value: 'school',    label: 'School & Education'        },
  { value: 'events',    label: 'Events & Activities'       },
  { value: 'guides',    label: 'Explore Our Guides'        },
]

const NEWSLETTER_SECTIONS = [
  { value: 'lead',      label: 'Lead Story'      },
  { value: 'community', label: 'Community News'  },
  { value: 'school',    label: 'School Corner'   },
  { value: 'spotlight', label: 'Family Spotlight' },
  { value: 'events',    label: 'Upcoming Events' },
  { value: 'picks',     label: 'Local Picks'     },
]

const HIGH_SHARE_TYPES = new Set([
  'student-spotlight', 'birthday-celebration', 'teacher-of-the-month',
  'mom-to-mom', 'grands-are-the-greatest', 'play-ball',
])

// Submission type → editorial category (used for sponsor alignment)
const TYPE_CATEGORY: Record<string, string> = {
  'student-spotlight':    'tutoring-enrichment',
  'play-ball':            'sports-recreation',
  'school-news':          'private-independent-schools',
  'teacher-of-the-month': 'private-independent-schools',
  'parent-picks':         'family-services',
  'mom-to-mom':           'mom-wellness',
  'birthday-celebration': 'shopping-boutiques',
  'event-submission':     'sports-recreation',
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function displayTitle(item: DistItem): string {
  if (item.working_title) return item.working_title
  const entity = item.related_person_name ?? item.related_business_name ?? item.related_school_name
  const tc = SUBMISSION_TYPES.find(t => t.type === item.submission_type)
  if (entity) return `${tc?.shortLabel ?? item.submission_type}: ${entity}`
  return tc?.label ?? item.submission_type
}

function freshnessDays(iso: string): number {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86400000)
}

function freshnessChip(days: number): { label: string; cls: string } {
  if (days <= 7)  return { label: 'Fresh',    cls: 'bg-portal-green-lt text-portal-green'  }
  if (days <= 21) return { label: 'Recent',   cls: 'bg-portal-blue-lt text-portal-blue'   }
  if (days <= 60) return { label: 'Aging',    cls: 'bg-portal-amber-lt text-portal-amber' }
  return                 { label: 'Stale',    cls: 'bg-portal-red-lt text-portal-red'     }
}

function hasImage(item: DistItem): boolean {
  return !!(item.feature_image_url || (item.photo_urls?.length ?? 0) > 0)
}

function guideName(slug: string): string {
  return slug.split('-').map(w => w[0]?.toUpperCase() + w.slice(1)).join(' ')
}

// ── Newsletter export helpers ──────────────────────────────────────────────────

const NL_SEC_LABELS: Record<string, string> = {
  lead:      'Lead Story',
  community: 'Community News',
  school:    'School Corner',
  spotlight: 'Family Spotlight',
  events:    'Upcoming Events',
  picks:     'Local Picks',
}
const NL_SEC_ORDER = ['lead', 'community', 'school', 'spotlight', 'events', 'picks']

function nlBlurb(item: DistItem): string {
  return (item.newsletter_teaser ?? item.excerpt ?? '').trim()
}
function nlLink(item: DistItem): string {
  return (item.published_url ?? item.social_link ?? '').trim()
}

interface NLWarning { level: 'error' | 'warning' | 'info'; msg: string }

function buildNLWarnings(items: DistItem[]): NLWarning[] {
  if (items.length === 0) return []
  const w: NLWarning[] = []
  const n = (count: number) => count > 1 ? 's' : ''
  const noTitle    = items.filter(i => !i.working_title).length
  const noSection  = items.filter(i => !i.newsletter_section).length
  const noBlurb    = items.filter(i => !nlBlurb(i)).length
  const noLink     = items.filter(i => !nlLink(i)).length
  const unapproved = items.filter(i => !i.approved_newsletter).length
  const noImage    = items.filter(i => !hasImage(i)).length
  if (noTitle)    w.push({ level: 'error',   msg: `${noTitle} item${n(noTitle)} missing a working title.` })
  if (noSection)  w.push({ level: 'error',   msg: `${noSection} item${n(noSection)} not assigned to a newsletter section.` })
  if (unapproved) w.push({ level: 'warning', msg: `${unapproved} item${n(unapproved)} not yet approved for newsletter. Review in Approval Desk.` })
  if (noBlurb)    w.push({ level: 'warning', msg: `${noBlurb} item${n(noBlurb)} missing a teaser or excerpt — descriptions will be empty in the export.` })
  if (noLink)     w.push({ level: 'warning', msg: `${noLink} item${n(noLink)} missing a link — readers won't be able to click through.` })
  if (noImage)    w.push({ level: 'info',    msg: `${noImage} item${n(noImage)} have no feature image.` })
  return w
}

function nlGroupBySec(items: DistItem[]): Map<string, DistItem[]> {
  const map = new Map<string, DistItem[]>()
  for (const item of items) {
    const key = item.newsletter_section ?? '_unsorted'
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(item)
  }
  for (const arr of map.values()) arr.sort((a, b) => (a.newsletter_order ?? 99) - (b.newsletter_order ?? 99))
  return map
}

function suggestSubjects(items: DistItem[], pubName: string): string[] {
  const short = pubName.includes('River Region') ? 'River Region' : pubName.split(' ')[0]
  const types = new Set(items.map(i => i.submission_type))
  const lead  = items.find(i => i.newsletter_section === 'lead')
  const first = lead?.working_title ?? items[0]?.working_title ?? null
  const s: string[] = [`This Week for ${short} Families`, `Your ${short} Family Roundup`]
  if (types.has('teacher-of-the-month')) {
    s.push(first ? `Spotlight: ${first} + ${short} News` : `Teacher Spotlight, Community News & More`)
  } else if (types.has('student-spotlight')) {
    s.push(`Student Spotlights, School Bits & ${short} Highlights`)
  } else if (first) {
    s.push(`${first} + More ${short} Stories`)
  }
  if (types.has('event-submission') && types.has('school-news')) {
    s.push(`Upcoming Events, School News & ${short} Family Highlights`)
  } else if (types.has('mom-to-mom')) {
    s.push(`Real Moms, Real Stories & What's Happening in ${short}`)
  } else if (types.has('birthday-celebration')) {
    s.push(`Birthdays, Spotlights & Local Family News`)
  } else {
    s.push(`Community Spotlights, Events & ${short} Family Finds`)
  }
  const fillers = [`Local Stories, School Bits & ${short} Life`, `What's Happening for ${short} Families This Week`]
  for (const f of fillers) { if (s.length < 5) s.push(f) }
  return s.slice(0, 5)
}

function buildPlainText(items: DistItem[], pubName: string): string {
  if (items.length === 0) return 'No newsletter content assembled yet.'
  const bySec = nlGroupBySec(items)
  const year  = new Date().getFullYear()
  const hr    = (ch: string, n: number) => ch.repeat(n)
  const lines: string[] = [hr('=', 40), pubName.toUpperCase(), hr('=', 40), '']
  for (const key of NL_SEC_ORDER) {
    const sec = bySec.get(key) ?? []
    if (!sec.length) continue
    lines.push(hr('─', 36), (NL_SEC_LABELS[key] ?? key).toUpperCase(), hr('─', 36), '')
    for (const item of sec) {
      lines.push(item.working_title ?? 'Untitled')
      const b = nlBlurb(item); if (b) lines.push(b)
      const l = nlLink(item);  if (l) lines.push(`Read more: ${l}`)
      lines.push('')
    }
  }
  const unsorted = bySec.get('_unsorted') ?? []
  if (unsorted.length) {
    lines.push('── ADDITIONAL ITEMS ──', '')
    for (const item of unsorted) {
      lines.push(item.working_title ?? 'Untitled')
      const b = nlBlurb(item); if (b) lines.push(b)
      const l = nlLink(item);  if (l) lines.push(`Read more: ${l}`)
      lines.push('')
    }
  }
  lines.push(hr('─', 40), `© ${year} ${pubName}`, 'To unsubscribe, click the link in this email.')
  return lines.join('\n')
}

function buildHTML(items: DistItem[], pubName: string): string {
  if (items.length === 0) return '<!-- No newsletter content assembled yet. -->'
  const bySec = nlGroupBySec(items)
  const year  = new Date().getFullYear()
  const N = '#1a2744'; const T = '#c4622d'
  const p: string[] = [
    `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#333;">`,
    `  <div style="background:${N};padding:24px 28px;">`,
    `    <h1 style="color:#fff;font-family:Georgia,serif;font-size:22px;margin:0;">${pubName}</h1>`,
    `  </div>`,
  ]
  for (const key of NL_SEC_ORDER) {
    const sec = bySec.get(key) ?? []
    if (!sec.length) continue
    const label = NL_SEC_LABELS[key] ?? key
    p.push(
      `  <div style="padding:24px 28px 8px;">`,
      `    <p style="color:${T};font-size:10px;text-transform:uppercase;letter-spacing:.12em;font-weight:700;border-bottom:1px solid #e5e7eb;padding-bottom:8px;margin:0 0 16px;">${label}</p>`,
    )
    for (const item of sec) {
      const title = item.working_title ?? 'Untitled'
      const blurb = nlBlurb(item); const link = nlLink(item)
      p.push(link
        ? `    <h3 style="font-family:Georgia,serif;font-size:18px;color:${N};margin:0 0 6px;"><a href="${link}" style="color:${N};text-decoration:none;">${title}</a></h3>`
        : `    <h3 style="font-family:Georgia,serif;font-size:18px;color:${N};margin:0 0 6px;">${title}</h3>`)
      if (blurb) p.push(`    <p style="font-size:14px;color:#555;margin:0 0 8px;line-height:1.7;">${blurb}</p>`)
      p.push(link
        ? `    <p style="margin:0 0 24px;"><a href="${link}" style="font-size:13px;color:${T};font-weight:700;text-decoration:none;">Read More →</a></p>`
        : `    <p style="margin:0 0 24px;"></p>`)
    }
    p.push(`  </div>`)
  }
  p.push(
    `  <div style="background:#f9f9f9;padding:16px 28px;border-top:1px solid #e5e7eb;">`,
    `    <p style="font-size:11px;color:#999;margin:0;">© ${year} ${pubName} &nbsp;·&nbsp; <a href="[UNSUBSCRIBE_LINK]" style="color:#999;">Unsubscribe</a></p>`,
    `  </div>`,
    `</div>`,
  )
  return p.join('\n')
}

function buildMobile(items: DistItem[], pubName: string): string {
  if (items.length === 0) return 'No items assembled yet.'
  const bySec = nlGroupBySec(items)
  const ordered: DistItem[] = []
  for (const key of NL_SEC_ORDER) ordered.push(...(bySec.get(key) ?? []))
  ordered.push(...(bySec.get('_unsorted') ?? []))
  const lines = [`📰 ${pubName}`, '']
  for (const item of ordered.slice(0, 6)) {
    const l = nlLink(item)
    lines.push(`• ${item.working_title ?? 'New Story'}${l ? ` → ${l}` : ''}`)
  }
  lines.push('', 'See more at riverregionparents.com')
  return lines.join('\n')
}

// ── Server actions ────────────────────────────────────────────────────────────

async function updateHomepageDetails(formData: FormData) {
  'use server'
  const supabase = await createClient()
  const id       = formData.get('id')               as string
  const v        = (formData.get('v')               as string) || 'homepage'
  await supabase.from('community_submissions').update({
    homepage_section:   (formData.get('homepage_section')   as string) || null,
    homepage_priority:  parseInt((formData.get('homepage_priority') as string) || '5'),
    homepage_remove_on: (formData.get('homepage_remove_on') as string) || null,
  }).eq('id', id)
  redirect(`/admin/distribution?view=${v}`)
}

async function toggleHomepage(formData: FormData) {
  'use server'
  const supabase       = await createClient()
  const id             = formData.get('id')      as string
  const current        = formData.get('current') === 'true'
  const v              = (formData.get('v')      as string) || 'homepage'
  await supabase.from('community_submissions')
    .update({ homepage_feature: !current })
    .eq('id', id)
  redirect(`/admin/distribution?view=${v}`)
}

async function updateNewsletterDetails(formData: FormData) {
  'use server'
  const supabase = await createClient()
  const id       = formData.get('id') as string
  const v        = (formData.get('v') as string) || 'newsletter'
  const ord      = (formData.get('newsletter_order') as string) || ''
  await supabase.from('community_submissions').update({
    newsletter_section: (formData.get('newsletter_section') as string) || null,
    newsletter_order:   ord ? parseInt(ord) : null,
  }).eq('id', id)
  redirect(`/admin/distribution?view=${v}`)
}

async function updateSocialPriority(formData: FormData) {
  'use server'
  const supabase = await createClient()
  const id       = formData.get('id')              as string
  const v        = (formData.get('v')              as string) || 'social'
  await supabase.from('community_submissions').update({
    social_priority: (formData.get('social_priority') as string) || 'normal',
  }).eq('id', id)
  redirect(`/admin/distribution?view=${v}`)
}

// Apply an AI-suggested lineup pick. Sets the surface flag + section in
// one shot so the editor goes from "Suggested" ghost card to assigned
// piece with one click. Surface is `homepage` or `newsletter`.
async function applyAISuggestion(formData: FormData) {
  'use server'
  const supabase = await createClient()
  const id       = formData.get('id')      as string
  const surface  = (formData.get('surface') as 'homepage' | 'newsletter') ?? 'homepage'
  const section  = (formData.get('section') as string) || ''
  const v        = (formData.get('v') as string) || surface

  const update: Record<string, unknown> = {}
  if (surface === 'homepage') {
    update.homepage_feature  = true
    update.homepage_section  = section || null
    update.homepage_priority = 5
  } else {
    update.newsletter_include = true
    update.newsletter_section = section || null
  }
  await supabase.from('community_submissions').update(update).eq('id', id)
  redirect(`/admin/distribution?view=${v}`)
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function DistCard({ item, compact = false }: { item: DistItem; compact?: boolean }) {
  const tc     = SUBMISSION_TYPES.find(t => t.type === item.submission_type)
  const title  = displayTitle(item)
  const days   = freshnessDays(item.updated_at)
  const fc     = freshnessChip(days)
  const accent = TYPE_COLORS[item.submission_type] ?? '#374151'
  const img    = hasImage(item)

  return (
    <div
      className="bg-white border border-portal-border rounded-lg overflow-hidden hover:border-portal-border transition-colors"
      style={{ borderLeft: `3px solid ${accent}` }}
    >
      <div className={`px-4 ${compact ? 'py-2.5' : 'py-3'} flex items-start gap-3`}>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
            <span className="text-sm">{tc?.emoji ?? '📝'}</span>
            <span className="text-[10px] font-bold text-portal-muted uppercase tracking-wide">{tc?.shortLabel ?? item.submission_type}</span>
            <span className="text-[10px] bg-portal-row-hover text-portal-sub px-1.5 py-0.5 rounded font-semibold">{item.target_publication.toUpperCase()}</span>
            {!img && <span className="text-[10px] bg-portal-amber-lt text-portal-amber px-1.5 py-0.5 rounded font-semibold">No image</span>}
            <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${fc.cls}`}>{fc.label}</span>
          </div>
          <p className={`text-sm font-semibold leading-snug ${item.working_title ? 'text-portal-text' : 'text-portal-muted italic'} truncate`}>
            {title}
          </p>
          {!compact && item.excerpt && (
            <p className="text-xs text-portal-muted mt-0.5 truncate">{item.excerpt}</p>
          )}
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            {item.issue_month && (
              <span className="text-[11px] text-portal-muted">{item.issue_month}{item.issue_year ? ` ${item.issue_year}` : ''}</span>
            )}
            {item.destination_section && (
              <span className="text-[10px] bg-portal-blue-lt text-portal-blue px-1.5 py-0.5 rounded font-semibold">{item.destination_section}</span>
            )}
          </div>
        </div>
        <div className="shrink-0 flex flex-col items-end gap-1">
          <div className="flex gap-1 text-sm">
            {item.homepage_feature  && <span title="Homepage">🏠</span>}
            {item.newsletter_include && <span title="Newsletter">📧</span>}
            {item.social_queue      && <span title="Social">📱</span>}
          </div>
          <Link
            href={`/admin/editorial/${item.id}`}
            className="text-[11px] font-bold text-portal-blue hover:underline"
          >
            Review →
          </Link>
        </div>
      </div>
    </div>
  )
}

// SectionHeader is now AdminSectionHeader from @/components/admin/AdminSectionHeader
// Keeping this alias so existing JSX usage compiles without touching every call site.
const SectionHeader = AdminSectionHeader

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function DistributionPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; pub?: string }>
}) {
  const { view: rawView = 'standup', pub: rawPub } = await searchParams
  const filterPub = normalizePublication(rawPub) // validated publication slug or null
  const activeView = (VIEWS.some(v => v.key === rawView) ? rawView : 'standup') as ViewKey

  const supabase = await createClient()

  // ── Data queries (parallel) ───────────────────────────────────────────────

  // Use shared column list from lib/queries/submissions to avoid drift
  const SELECT_COLS = SUBMISSION_DISTRIBUTION_COLS

  let itemsQuery = supabase
    .from('community_submissions')
    .select(SELECT_COLS)
    .in('status', ['approved', 'scheduled', 'ai-draft-ready', 'in-editing'])
    .order('created_at', { ascending: false })
    .limit(300)

  if (filterPub) itemsQuery = itemsQuery.eq('target_publication', filterPub)

  // Pipeline counts — the page was silently empty before because items
  // sit at status='new' (and earlier stages) until an editor explicitly
  // approves them. Surfacing the count at each stage shows exactly
  // where the bottleneck is so we can fix it upstream instead of
  // staring at a 0 here.
  let pipelineQuery = supabase
    .from('community_submissions')
    .select('status')
    .in('status', [
      'new', 'needs-review', 'awaiting-info', 'in-progress',
      'ready-for-ai', 'ai-draft-ready', 'in-editing',
      'approved', 'scheduled',
    ])
    .limit(2000)
  if (filterPub) pipelineQuery = pipelineQuery.eq('target_publication', filterPub)

  const [
    { data: rawItems },
    { data: rawSponsors },
    { data: rawArticleStats },
    { data: rawPipeline },
  ] = await Promise.all([
    itemsQuery,
    supabase
      .from('advertiser_accounts')
      .select('id, business_name, package_tier, sponsor_category_slug, sponsor_guide_slug, lifecycle_stage')
      .in('lifecycle_stage', ['active', 'renewal', 'sponsor-qualified', 'upgrade-ready'])
      .limit(100),
    supabase
      .from('guide_articles')
      .select('guide_slug, created_at')
      .eq('published', true)
      .order('created_at', { ascending: false })
      .limit(500),
    pipelineQuery,
  ])

  const items    = (rawItems    ?? []) as unknown as SubmissionRow[]
  const sponsors = (rawSponsors ?? []) as SponsorRow[]

  // ── Pipeline funnel (upstream visibility) ────────────────────────────────
  // Count by status across the full pipeline so an editor opening this
  // page knows the queue is empty *because* 12 items are stuck at
  // needs-review, not because nothing was submitted.
  const pipelineCounts = new Map<string, number>()
  for (const row of (rawPipeline ?? []) as Array<{ status: string }>) {
    pipelineCounts.set(row.status, (pipelineCounts.get(row.status) ?? 0) + 1)
  }
  const pipelineStages = [
    { key: 'new',            label: 'New',           desc: 'Just submitted, not reviewed' },
    { key: 'needs-review',   label: 'Needs Review',  desc: 'Awaiting editor triage' },
    { key: 'awaiting-info',  label: 'Awaiting Info', desc: 'Replied to submitter, waiting' },
    { key: 'in-progress',    label: 'In Progress',   desc: 'Editor actively working' },
    { key: 'ready-for-ai',   label: 'Ready for AI',  desc: 'Queued for AI drafting' },
    { key: 'ai-draft-ready', label: 'AI Drafted',    desc: 'AI draft, awaiting human review' },
    { key: 'in-editing',     label: 'In Editing',    desc: 'Editor refining draft' },
    { key: 'approved',       label: 'Approved',      desc: 'Ready to deploy here' },
    { key: 'scheduled',      label: 'Scheduled',     desc: 'Assigned to specific issue' },
  ] as const
  const pipelineTotal = pipelineStages.reduce((s, st) => s + (pipelineCounts.get(st.key) ?? 0), 0)

  // Guide article stats by slug
  const guideArticleMap = new Map<string, GuideArticleStat>()
  for (const row of (rawArticleStats ?? [])) {
    const slug = (row as { guide_slug: string; created_at: string }).guide_slug
    const stat = guideArticleMap.get(slug)
    if (!stat) {
      guideArticleMap.set(slug, { guide_slug: slug, article_count: 1, latest_article: (row as { created_at: string }).created_at })
    } else {
      stat.article_count++
    }
  }

  // ── Grouping ─────────────────────────────────────────────────────────────

  const now          = new Date()
  const curMonthName = now.toLocaleString('en-US', { month: 'long' })
  const nextMonthName = new Date(now.getFullYear(), now.getMonth() + 1).toLocaleString('en-US', { month: 'long' })
  const m2Name       = new Date(now.getFullYear(), now.getMonth() + 2).toLocaleString('en-US', { month: 'long' })

  const groups = {
    homepage:   items.filter(i => i.homepage_feature || i.destination_section === 'homepage-section'),
    newsletter: items.filter(i => i.newsletter_include),
    social:     items.filter(i => i.social_queue),
    socialHigh: items.filter(i => HIGH_SHARE_TYPES.has(i.submission_type)),
    guides:     items.filter(i => i.destination_section === 'guide-integration'),
    print:      items.filter(i => ['print-issue','grouped-roundup'].includes(i.destination_section ?? '')),
    seasonal:   items.filter(i => i.issue_month && [curMonthName, nextMonthName, m2Name].includes(i.issue_month)),
    unrouted:   items.filter(i => !i.destination_section && !i.homepage_feature && !i.newsletter_include && !i.social_queue),
  }

  const staleHomepage    = groups.homepage.filter(i => freshnessDays(i.updated_at) > 21)
  const missingImages    = items.filter(i => !hasImage(i))
  const noDestination    = items.filter(i => !i.destination_section)
  const noTitle          = items.filter(i => !i.working_title)

  // ── AI candidates for the section filler ────────────────────────────────
  // Pool of items NOT YET on homepage that the AI can pick from when
  // suggesting fills. Same for newsletter. We cap the title length and
  // strip noise so the prompt stays focused.
  const aiHomepageCandidates: AICandidate[] = items
    .filter(i => !i.homepage_feature)
    .slice(0, 60)
    .map(i => ({
      id:    i.id,
      title: displayTitle(i),
      type:  i.submission_type,
      blurb: (i.excerpt ?? '').slice(0, 180) || undefined,
      freshness_days: freshnessDays(i.updated_at),
    }))
  const aiNewsletterCandidates: AICandidate[] = items
    .filter(i => !i.newsletter_include)
    .slice(0, 60)
    .map(i => ({
      id:    i.id,
      title: displayTitle(i),
      type:  i.submission_type,
      blurb: (i.newsletter_teaser ?? i.excerpt ?? '').slice(0, 180) || undefined,
      freshness_days: freshnessDays(i.updated_at),
    }))

  // Health score (0–100)
  const total         = items.length || 1
  const routed        = items.filter(i => !!i.destination_section).length
  const healthPct     = Math.round((routed / total) * 100)

  // ── Sponsor alignment ─────────────────────────────────────────────────────
  //
  // For each sponsor, find content items that editorially align with
  // their category. Two-source match:
  //   1. Legacy TYPE_CATEGORY map (this file) — submission_type → category_slug
  //   2. New SPONSOR_CATEGORIES taxonomy — each category lists which
  //      submission types align with it (alignedSubmissionTypes)
  // Plus a direct guide-slug match for sponsors targeting a specific guide.
  const sponsorOpportunities = sponsors.map(sp => {
    const aligned = items.filter(i => {
      if (sp.sponsor_guide_slug && i.destination_guide_slug === sp.sponsor_guide_slug) return true
      if (!sp.sponsor_category_slug) return false
      // Legacy map
      if (TYPE_CATEGORY[i.submission_type] === sp.sponsor_category_slug) return true
      // New taxonomy
      const taxonomyEntry = SPONSOR_CATEGORIES.find(c => c.slug === sp.sponsor_category_slug)
      if (taxonomyEntry?.alignedSubmissionTypes?.includes(i.submission_type)) return true
      return false
    })
    return { sponsor: sp, aligned }
  }).sort((a, b) => b.aligned.length - a.aligned.length)

  // Sponsors with no aligned content = visibility gap
  const sponsorGaps = sponsorOpportunities.filter(o => o.aligned.length === 0)

  // ── Newsletter export (computed for newsletter view) ──────────────────────

  const nlPubName = PUBLICATION_NAMES[filterPub ?? 'rrp'] ?? 'River Region Parents'
  const nlWarnings = buildNLWarnings(groups.newsletter)
  const nlSubjects = suggestSubjects(groups.newsletter, nlPubName)
  const nlText     = buildPlainText(groups.newsletter, nlPubName)
  const nlHtmlStr  = buildHTML(groups.newsletter, nlPubName)
  const nlMobile   = buildMobile(groups.newsletter, nlPubName)

  // ── Render ────────────────────────────────────────────────────────────────

  function viewHref(v: string) {
    return filterPub ? `/admin/distribution?view=${v}&pub=${filterPub}` : `/admin/distribution?view=${v}`
  }

  return (
    <div className="portal-app flex flex-col flex-1 min-h-0 bg-portal-bg">

      <div className="page-header">
        <div>
          <h1 className="ph-title">Content Deployment</h1>
          <div className="text-muted text-sm">
            One desk for routing every approved story to homepage, newsletter, social, guides, and sponsors.
          </div>
        </div>
        <div className="ph-actions">
          <Link href="/admin/editorial" className="btn btn-ghost btn-sm">← Editorial Pipeline</Link>
          <Link href="/admin/editorial/approval" className="btn btn-primary btn-sm">Approval Desk →</Link>
        </div>
      </div>

      <div className="content-body overflow-y-auto">

        {/* ── PIPELINE FUNNEL ────────────────────────────────────────────
            Surfaces WHERE submissions are stuck so editors stop wondering
            why the queue is empty. Each tile links to the right operator
            queue so they can unblock in one click. */}
        {pipelineTotal > 0 && (
          <div className="card mb-4">
            <div className="card-header">
              <div>
                <div className="card-title">Pipeline funnel</div>
                <div className="text-muted text-xs">{pipelineTotal.toLocaleString()} submissions across the pipeline · click any stage to operate on it</div>
              </div>
              <Link href="/admin/editorial/approval" className="btn btn-blue btn-xs">Open Approval Desk</Link>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: 8, marginTop: 12 }}>
              {pipelineStages.map(st => {
                const n   = pipelineCounts.get(st.key) ?? 0
                const hot = (st.key === 'new' || st.key === 'needs-review') && n > 0
                const ok  = (st.key === 'approved' || st.key === 'scheduled') && n > 0
                return (
                  <Link
                    key={st.key}
                    href={`/admin/editorial/approval?status=${st.key}`}
                    style={{
                      background: 'white',
                      border: `1px solid ${hot ? 'var(--color-portal-amber)' : 'var(--color-portal-border)'}`,
                      borderLeft: `3px solid ${hot ? 'var(--color-portal-amber)' : ok ? 'var(--color-portal-green)' : 'var(--color-portal-border-2)'}`,
                      borderRadius: 8,
                      padding: '10px 12px',
                      textDecoration: 'none',
                      color: 'inherit',
                      display: 'block',
                    }}
                  >
                    <div style={{ fontSize: 20, fontWeight: 800, color: hot ? 'var(--color-portal-amber)' : ok ? 'var(--color-portal-green)' : 'var(--color-portal-text)', fontFamily: 'ui-monospace,monospace' }}>{n}</div>
                    <div style={{ fontSize: 11, fontWeight: 700, marginTop: 2 }}>{st.label}</div>
                    <div style={{ fontSize: 10, color: 'var(--color-portal-muted)', marginTop: 1 }}>{st.desc}</div>
                  </Link>
                )
              })}
            </div>
            {items.length === 0 && pipelineTotal > 0 && (
              <div className="alert alert-warning" style={{ marginTop: 14 }}>
                <strong>Nothing is deployable yet.</strong> {pipelineTotal} submissions exist but none have reached <strong>Approved</strong>.
                Most likely stuck at <strong>{pipelineStages.find(s => (pipelineCounts.get(s.key) ?? 0) > 0)?.label ?? 'New'}</strong>.
                Open the <Link href="/admin/editorial/approval" style={{ textDecoration: 'underline' }}>Approval Desk</Link> to move items forward.
              </div>
            )}
          </div>
        )}

        {/* ── VIEW TABS — portal sub-nav style ───────────────────────────── */}
        <div className="card" style={{ padding: 0, marginBottom: 14, overflow: 'hidden' }}>
          <div style={{ display: 'flex', overflowX: 'auto', borderBottom: '1px solid var(--color-portal-border)' }}>
            {VIEWS.map(v => {
              const isActive = activeView === v.key
              return (
                <Link
                  key={v.key}
                  href={viewHref(v.key)}
                  style={{
                    padding: '10px 16px',
                    fontSize: 12,
                    fontWeight: 700,
                    color: isActive ? 'var(--color-portal-navy)' : 'var(--color-portal-sub)',
                    borderBottom: isActive ? '2px solid var(--color-portal-navy)' : '2px solid transparent',
                    whiteSpace: 'nowrap',
                    textDecoration: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  {v.label}
                </Link>
              )
            })}
          </div>
        </div>

        {/* ── STATS STRIP — portal stat cards ─────────────────────────── */}
        <div className="stats-row" style={{ marginBottom: 18 }}>
          {[
            { label: 'Ready to deploy', val: items.length,              href: viewHref('queue')      },
            { label: 'Homepage queue',  val: groups.homepage.length,    href: viewHref('homepage')   },
            { label: 'Newsletter',      val: groups.newsletter.length,  href: viewHref('newsletter') },
            { label: 'Social ready',    val: groups.social.length,      href: viewHref('social')     },
            { label: 'Guides',          val: groups.guides.length,      href: viewHref('guides')     },
            { label: 'Stale homepage',  val: staleHomepage.length,      href: viewHref('homepage'), alert: staleHomepage.length > 0 },
            { label: 'Missing image',   val: missingImages.length,      href: viewHref('health'),   alert: missingImages.length > 0 },
          ].map(m => (
            <Link key={m.label} href={m.href} className="stat-card" style={{ textDecoration: 'none' }}>
              <div className={`stat-num ${m.alert ? 'has-amber' : ''}`}>{m.val}</div>
              <div className="stat-label">{m.label}</div>
            </Link>
          ))}
        </div>

      {/* ══════════════════════════════════════════════════════════════════════
          VIEW: STANDUP (Today — editor morning landing)

          Built for 8am Tuesday. Five panels in priority order:
            1. What's due TODAY (homepage rotation, scheduled items)
            2. Sponsor renewal risk (no aligned content recently)
            3. Stale on the surface (homepage items aging out)
            4. Newsletter readiness for the week
            5. Pipeline at-a-glance (unblocked + bottlenecks)
      ══════════════════════════════════════════════════════════════════════ */}
      {activeView === 'standup' && (() => {
        const today    = new Date()
        const todayLbl = today.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
        const todayIso = today.toISOString().slice(0, 10)

        // Items needing action TODAY: homepage with remove_on at/past today
        const dueToday = groups.homepage.filter(i => i.homepage_remove_on && i.homepage_remove_on <= todayIso)
        // Items scheduled to publish today (issue_month aligns, status='scheduled')
        const scheduledToday = items.filter(i => i.status === 'scheduled')

        // Sponsor risk: active sponsors with category set but no aligned content
        const categorizedSponsors = sponsors.filter(s => s.sponsor_category_slug)
        const uncategorizedActive = sponsors.filter(s => !s.sponsor_category_slug).length
        const sponsorsAtRisk      = sponsorOpportunities.filter(o =>
          o.sponsor.sponsor_category_slug && o.aligned.length === 0,
        )
        const sponsorCoverage = categorizedSponsors.length > 0
          ? Math.round((categorizedSponsors.length - sponsorsAtRisk.length) / categorizedSponsors.length * 100)
          : 0

        // Newsletter readiness: how filled is each section
        const newsletterReady = NEWSLETTER_SECTIONS.filter(sec =>
          groups.newsletter.some(i => i.newsletter_section === sec.value),
        ).length

        // Pipeline at-a-glance — bottleneck stage = the largest pre-approval count
        const bottleneckStage = pipelineStages
          .filter(s => s.key !== 'approved' && s.key !== 'scheduled')
          .map(s => ({ ...s, count: pipelineCounts.get(s.key) ?? 0 }))
          .sort((a, b) => b.count - a.count)[0]

        return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* Headline */}
          <div className="card" style={{ background: 'linear-gradient(135deg, #0F2640 0%, #1E3A5F 100%)', color: 'white', border: 'none' }}>
            <div className="text-xs" style={{ color: 'rgba(255,255,255,.5)', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 700 }}>
              {todayLbl}
            </div>
            <div style={{ fontSize: 22, fontWeight: 800, marginTop: 4 }}>
              Good morning. Here&apos;s what needs you today.
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginTop: 16 }}>
              <div>
                <div className="mono" style={{ fontSize: 28, fontWeight: 800 }}>{dueToday.length + scheduledToday.length}</div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,.6)' }}>Due today</div>
              </div>
              <div>
                <div className="mono" style={{ fontSize: 28, fontWeight: 800, color: sponsorsAtRisk.length > 0 ? '#FCA5A5' : '#4ADE80' }}>{sponsorsAtRisk.length}</div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,.6)' }}>Sponsor risks</div>
              </div>
              <div>
                <div className="mono" style={{ fontSize: 28, fontWeight: 800, color: staleHomepage.length > 0 ? '#FCD34D' : '#4ADE80' }}>{staleHomepage.length}</div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,.6)' }}>Stale homepage</div>
              </div>
              <div>
                <div className="mono" style={{ fontSize: 28, fontWeight: 800 }}>{newsletterReady}<span style={{ fontSize: 14, color: 'rgba(255,255,255,.5)' }}>/{NEWSLETTER_SECTIONS.length}</span></div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,.6)' }}>Newsletter slots filled</div>
              </div>
              <div>
                <div className="mono" style={{ fontSize: 28, fontWeight: 800, color: sponsorCoverage >= 80 ? '#4ADE80' : sponsorCoverage >= 50 ? '#FCD34D' : '#FCA5A5' }}>{sponsorCoverage}%</div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,.6)' }}>Sponsor coverage</div>
              </div>
            </div>
          </div>

          {/* Due today */}
          {(dueToday.length > 0 || scheduledToday.length > 0) && (
            <div className="card">
              <div className="card-title">📌 Due today</div>
              <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
                {dueToday.slice(0, 8).map(item => (
                  <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', background: 'var(--color-portal-amber-lt)', borderRadius: 6 }}>
                    <span className="badge badge-amber" style={{ fontSize: 9 }}>Homepage rotation due</span>
                    <span className="text-sm fw-600" style={{ flex: 1, minWidth: 0 }}>{displayTitle(item)}</span>
                    <Link href={`/admin/editorial/${item.id}`} className="text-xs" style={{ color: 'var(--color-portal-blue)' }}>Review →</Link>
                  </div>
                ))}
                {scheduledToday.slice(0, 6).map(item => (
                  <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', background: 'var(--color-portal-blue-lt)', borderRadius: 6 }}>
                    <span className="badge badge-rrp" style={{ fontSize: 9 }}>Scheduled</span>
                    <span className="text-sm fw-600" style={{ flex: 1, minWidth: 0 }}>{displayTitle(item)}</span>
                    <Link href={`/admin/editorial/${item.id}`} className="text-xs" style={{ color: 'var(--color-portal-blue)' }}>Open →</Link>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Sponsor risks */}
          <div className="card">
            <div className="card-header">
              <div>
                <div className="card-title">🤝 Sponsor visibility risks</div>
                <div className="text-muted text-xs">Active sponsors with no aligned content in the current queue. Renewal signal — surface a story for them this week.</div>
              </div>
              <Link href="/admin/distribution?view=sponsors" className="btn btn-ghost btn-xs">All sponsors →</Link>
            </div>
            {uncategorizedActive > 0 && (
              <div className="alert alert-warning" style={{ marginTop: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                <span><strong>{uncategorizedActive} sponsors still need a category.</strong> The matcher can&apos;t find content for them until they&apos;re classified.</span>
                <Link href="/admin/distribution/sponsor-categorize" className="btn btn-primary btn-xs">Fix with AI →</Link>
              </div>
            )}
            {sponsorsAtRisk.length === 0 && uncategorizedActive === 0 ? (
              <div className="alert alert-success" style={{ marginTop: 10 }}>Every active sponsor has aligned content in the queue. 🎉</div>
            ) : (
              <div style={{ marginTop: 10, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 8 }}>
                {sponsorsAtRisk.slice(0, 8).map(({ sponsor }) => (
                  <div key={sponsor.id} style={{ padding: '10px 12px', background: 'white', border: '1px solid var(--color-portal-amber)', borderLeft: '3px solid var(--color-portal-amber)', borderRadius: 6 }}>
                    <div className="fw-700 text-sm">{sponsor.business_name}</div>
                    <div className="text-muted text-xs" style={{ marginTop: 2 }}>
                      {sponsor.package_tier ?? '—'} · {sponsor.sponsor_category_slug ?? 'no category'}
                    </div>
                  </div>
                ))}
                {sponsorsAtRisk.length > 8 && (
                  <Link href="/admin/distribution?view=sponsors" className="text-xs" style={{ alignSelf: 'center', color: 'var(--color-portal-blue)' }}>
                    +{sponsorsAtRisk.length - 8} more →
                  </Link>
                )}
              </div>
            )}
          </div>

          {/* Stale homepage + Newsletter readiness — two columns */}
          <div className="grid-2">
            <div className="card">
              <div className="card-title">⏳ Aging on homepage</div>
              <div className="text-muted text-xs">Items on the homepage longer than 21 days. Rotate to keep the front page feeling fresh.</div>
              <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
                {staleHomepage.length === 0 && (
                  <div className="alert alert-success">Nothing stale right now. 🎉</div>
                )}
                {staleHomepage.slice(0, 6).map(item => (
                  <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px', background: 'var(--color-portal-bg)', borderRadius: 6 }}>
                    <span className="text-sm fw-600" style={{ flex: 1, minWidth: 0 }}>{displayTitle(item)}</span>
                    <span className="badge badge-amber" style={{ fontSize: 9 }}>{freshnessDays(item.updated_at)}d</span>
                  </div>
                ))}
                {staleHomepage.length > 6 && (
                  <Link href="/admin/distribution?view=homepage" className="text-xs" style={{ alignSelf: 'flex-start', color: 'var(--color-portal-blue)' }}>+{staleHomepage.length - 6} more →</Link>
                )}
              </div>
            </div>

            <div className="card">
              <div className="card-title">📧 Newsletter slots</div>
              <div className="text-muted text-xs">Each section needs at least one item before the next send.</div>
              <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
                {NEWSLETTER_SECTIONS.map(sec => {
                  const n = groups.newsletter.filter(i => i.newsletter_section === sec.value).length
                  return (
                    <div key={sec.value} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px', background: 'var(--color-portal-bg)', borderRadius: 6 }}>
                      <span className="text-sm fw-600" style={{ flex: 1, minWidth: 0 }}>{sec.label}</span>
                      <span className={`badge ${n === 0 ? 'badge-amber' : 'badge-green'}`} style={{ fontSize: 9 }}>
                        {n === 0 ? 'Empty' : `${n} item${n === 1 ? '' : 's'}`}
                      </span>
                    </div>
                  )
                })}
                <Link href="/admin/distribution?view=newsletter" className="text-xs" style={{ alignSelf: 'flex-start', color: 'var(--color-portal-blue)', marginTop: 4 }}>Build newsletter →</Link>
              </div>
            </div>
          </div>

          {/* Pipeline at-a-glance */}
          {pipelineTotal > 0 && (
            <div className="card">
              <div className="card-header">
                <div>
                  <div className="card-title">🔍 Pipeline pulse</div>
                  <div className="text-muted text-xs">
                    {items.length} ready to deploy · {pipelineTotal - items.length} earlier in the pipeline
                    {bottleneckStage && bottleneckStage.count > 0 && (
                      <> · biggest stage: <strong>{bottleneckStage.label}</strong> ({bottleneckStage.count})</>
                    )}
                  </div>
                </div>
                <Link href="/admin/editorial/approval" className="btn btn-blue btn-xs">Approval Desk →</Link>
              </div>
            </div>
          )}

          {/* Quick-start CTAs */}
          <div className="card" style={{ background: 'var(--color-portal-bg)' }}>
            <div className="card-title">⚡ Quick actions</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
              {uncategorizedActive > 0 && (
                <Link href="/admin/distribution/sponsor-categorize" className="btn btn-primary btn-sm">
                  Categorize {uncategorizedActive} sponsors with AI
                </Link>
              )}
              {groups.newsletter.length > 0 && (
                <Link href="/admin/distribution?view=newsletter" className="btn btn-blue btn-sm">
                  Finish this week&apos;s newsletter ({groups.newsletter.length})
                </Link>
              )}
              {groups.homepage.length === 0 && items.length > 0 && (
                <Link href="/admin/distribution?view=homepage" className="btn btn-blue btn-sm">
                  Fill the homepage ({items.length} candidates)
                </Link>
              )}
              {(pipelineCounts.get('new') ?? 0) + (pipelineCounts.get('needs-review') ?? 0) > 0 && (
                <Link href="/admin/editorial/approval" className="btn btn-amber btn-sm">
                  Triage {(pipelineCounts.get('new') ?? 0) + (pipelineCounts.get('needs-review') ?? 0)} new submissions
                </Link>
              )}
              {groups.socialHigh.length > 0 && (
                <Link href="/admin/distribution?view=social" className="btn btn-ghost btn-sm">
                  Draft captions for {groups.socialHigh.length} high-share items
                </Link>
              )}
            </div>
          </div>

        </div>
        )
      })()}

      {/* ══════════════════════════════════════════════════════════════════════
          VIEW: QUEUE (default)
      ══════════════════════════════════════════════════════════════════════ */}
      {activeView === 'queue' && (
        <div className="space-y-8">
          {[
            { key: 'homepage',   label: 'Homepage Candidates',     items: groups.homepage,   desc: 'Approved content for homepage placement.'       },
            { key: 'newsletter', label: 'Newsletter Candidates',   items: groups.newsletter, desc: 'Selected for the next newsletter.'              },
            { key: 'social',     label: 'Social Ready',            items: groups.social,     desc: 'Queued for social amplification.'               },
            { key: 'guides',     label: 'Guide Amplification',     items: groups.guides,     desc: 'Content flagged for guide integration.'         },
            { key: 'print',      label: 'Print Ready',             items: groups.print,      desc: 'Assigned to a print issue or roundup.'          },
            { key: 'seasonal',   label: 'Seasonal Push',           items: groups.seasonal,   desc: `Issue-targeted for ${curMonthName}–${m2Name}.` },
            { key: 'unrouted',   label: 'Needs Routing',           items: groups.unrouted,   desc: 'Approved but no destination assigned yet.'      },
          ].map(grp => {
            if (grp.items.length === 0) return null
            return (
              <div key={grp.key}>
                <SectionHeader title={grp.label} count={grp.items.length} description={grp.desc} />
                <div className="space-y-2">
                  {grp.items.slice(0, 12).map(item => (
                    <DistCard key={item.id} item={item} compact />
                  ))}
                  {grp.items.length > 12 && (
                    <p className="text-xs text-portal-muted text-center pt-1">
                      +{grp.items.length - 12} more — use filters to narrow
                    </p>
                  )}
                </div>
              </div>
            )
          })}
          {items.length === 0 && (
            <div className="bg-white border border-portal-border rounded-lg px-8 py-16 text-center">
              <div className="text-4xl mb-4">📭</div>
              <p className="text-portal-sub font-medium">No approved content in the distribution queue.</p>
              <Link href="/admin/editorial" className="text-sm text-portal-blue mt-2 inline-block hover:underline">
                Go to Editorial Pipeline →
              </Link>
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          VIEW: HOMEPAGE
      ══════════════════════════════════════════════════════════════════════ */}
      {activeView === 'homepage' && (
        <div className="space-y-6">
          {/* Editorial note */}
          <div className="bg-portal-blue-lt border border-portal-blue/20 rounded-lg px-5 py-3">
            <p className="text-xs text-portal-blue font-medium">
              💡 Assign content to homepage sections below. Changes are editorial assignments only — no auto-publishing. Homepage items should rotate every 1–3 weeks.
            </p>
          </div>

          {/* Stale alert */}
          {staleHomepage.length > 0 && (
            <div className="bg-portal-red-lt border border-portal-red/30 rounded-lg px-5 py-4">
              <p className="text-sm font-bold text-portal-red mb-2">⚠️ Stale Homepage Items ({staleHomepage.length})</p>
              <div className="space-y-1.5">
                {staleHomepage.map(item => (
                  <div key={item.id} className="flex items-center justify-between gap-4">
                    <p className="text-xs text-portal-red">{displayTitle(item)} — {freshnessDays(item.updated_at)}d old</p>
                    <Link href={`/admin/editorial/${item.id}`} className="text-xs text-portal-red hover:underline font-semibold shrink-0">Review →</Link>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Section-by-section view */}
          {HOMEPAGE_SECTIONS.map(sec => {
            const secItems = groups.homepage.filter(i => i.homepage_section === sec.value)
            return (
              <div key={sec.value}>
                <div className="flex items-center gap-3 mb-2">
                  <h2 className="text-sm font-bold text-portal-text">{sec.label}</h2>
                  <span className="text-xs text-portal-muted">({secItems.length} assigned)</span>
                  <div className="flex-1 h-px bg-portal-row-hover" />
                  {secItems.length === 0 && (
                    <span className="text-[10px] bg-portal-amber-lt text-portal-amber px-2 py-0.5 rounded-full font-semibold">Empty</span>
                  )}
                </div>
                <div className="space-y-1.5">
                  {secItems.map(item => (
                    <div key={item.id} className="flex items-center gap-3 bg-white border border-portal-border rounded-lg px-4 py-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-portal-text truncate">{displayTitle(item)}</p>
                        <p className="text-[11px] text-portal-muted">
                          Priority {item.homepage_priority ?? 5}
                          {item.homepage_remove_on && ` · Remove by ${new Date(item.homepage_remove_on).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`}
                          {freshnessDays(item.updated_at) > 21 && ' · ⚠️ Aging'}
                        </p>
                      </div>
                      <form action={updateHomepageDetails} className="flex gap-2 items-center shrink-0">
                        <input type="hidden" name="id"      value={item.id} />
                        <input type="hidden" name="v"       value="homepage" />
                        <select name="homepage_section" defaultValue={item.homepage_section ?? ''} className="text-xs border border-portal-border rounded-lg px-2 py-1.5 outline-none">
                          <option value="">— Section —</option>
                          {HOMEPAGE_SECTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                        </select>
                        <input name="homepage_priority" type="number" min="1" max="10" defaultValue={item.homepage_priority ?? 5}
                          className="w-14 text-xs border border-portal-border rounded-lg px-2 py-1.5 outline-none" />
                        <input name="homepage_remove_on" type="date" defaultValue={item.homepage_remove_on ?? ''}
                          className="text-xs border border-portal-border rounded-lg px-2 py-1.5 outline-none" />
                        <button type="submit" className="text-xs px-3 py-1.5 bg-portal-navy text-white rounded-lg font-semibold hover:bg-portal-navy">Save</button>
                      </form>
                      <form action={toggleHomepage}>
                        <input type="hidden" name="id"      value={item.id} />
                        <input type="hidden" name="current" value="true" />
                        <input type="hidden" name="v"       value="homepage" />
                        <button type="submit" className="text-[11px] px-2 py-1.5 border border-portal-red/30 text-portal-red rounded-lg hover:bg-portal-red-lt">Remove</button>
                      </form>
                    </div>
                  ))}
                  {secItems.length === 0 && (
                    <>
                      <p className="text-xs text-portal-border-2 italic px-4 py-2">No content assigned to this section.</p>
                      <AISectionFiller
                        publication={filterPub ?? 'rrp'}
                        surface="homepage"
                        section={sec.value}
                        sectionLabel={sec.label}
                        candidates={aiHomepageCandidates}
                        targetCount={3}
                        view="homepage"
                      />
                    </>
                  )}
                </div>
              </div>
            )
          })}

          {/* Unassigned homepage items */}
          {groups.homepage.filter(i => !i.homepage_section).length > 0 && (
            <div>
              <SectionHeader
                title="Featured — No Section Assigned"
                count={groups.homepage.filter(i => !i.homepage_section).length}
                description="Homepage flag is set but no section chosen yet."
              />
              <div className="space-y-2">
                {groups.homepage.filter(i => !i.homepage_section).map(item => (
                  <DistCard key={item.id} item={item} />
                ))}
              </div>
            </div>
          )}

          {/* Candidates not yet on homepage */}
          {items.filter(i => !i.homepage_feature && i.destination_section !== 'homepage-section').length > 0 && (
            <div>
              <SectionHeader
                title="Add to Homepage"
                count={items.filter(i => !i.homepage_feature).length}
                description="Approved content not yet on the homepage. Use Editorial view to set homepage flag."
              />
              <div className="space-y-2">
                {items.filter(i => !i.homepage_feature).slice(0, 6).map(item => (
                  <div key={item.id} className="flex items-center gap-3 bg-white border border-portal-border rounded-lg px-4 py-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-portal-text truncate">{displayTitle(item)}</p>
                      <p className="text-[11px] text-portal-muted">{item.submission_type} · {item.target_publication.toUpperCase()}</p>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <form action={toggleHomepage}>
                        <input type="hidden" name="id"      value={item.id} />
                        <input type="hidden" name="current" value="false" />
                        <input type="hidden" name="v"       value="homepage" />
                        <button type="submit" className="text-xs px-3 py-1.5 border border-portal-border rounded-lg text-portal-sub hover:bg-portal-bg font-medium">
                          + Feature
                        </button>
                      </form>
                      <Link href={`/admin/editorial/${item.id}`} className="text-xs text-portal-blue hover:underline px-2 py-1.5 font-semibold">Edit →</Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          VIEW: NEWSLETTER
      ══════════════════════════════════════════════════════════════════════ */}
      {activeView === 'newsletter' && (
        <div className="space-y-6">
          <div className="bg-portal-blue-lt border border-portal-blue/20 rounded-lg px-5 py-3">
            <p className="text-xs text-portal-blue font-medium">
              📧 Assign content to newsletter sections and set ordering. Preview the lineup below. No ESP integration yet — use this to plan and copy content into your email tool.
            </p>
          </div>

          {/* Section lineup preview */}
          <div className="bg-white border border-portal-border rounded-lg overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-50">
              <h2 className="text-sm font-bold text-portal-text">Newsletter Lineup Preview</h2>
              <p className="text-xs text-portal-muted mt-0.5">{groups.newsletter.length} items selected for newsletter</p>
            </div>
            <div className="px-5 py-4 space-y-4">
              {NEWSLETTER_SECTIONS.map(sec => {
                const secItems = groups.newsletter
                  .filter(i => i.newsletter_section === sec.value)
                  .sort((a, b) => (a.newsletter_order ?? 99) - (b.newsletter_order ?? 99))
                return (
                  <div key={sec.value}>
                    <p className="text-[11px] font-bold text-portal-muted uppercase tracking-wide mb-1.5">{sec.label}</p>
                    {secItems.length > 0 ? (
                      <div className="space-y-1.5">
                        {secItems.map((item, idx) => (
                          <div key={item.id} className="flex items-center gap-2 px-3 py-2 bg-portal-bg rounded-lg">
                            <span className="text-[11px] font-bold text-portal-border-2 w-4 shrink-0">{idx + 1}</span>
                            <p className="text-xs font-semibold text-portal-text flex-1 truncate">{displayTitle(item)}</p>
                            <span className="text-[10px] text-portal-muted">{SUBMISSION_TYPES.find(t => t.type === item.submission_type)?.emoji}</span>
                            <Link href={`/admin/editorial/${item.id}`} className="text-[10px] text-portal-blue hover:underline shrink-0">Edit</Link>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <>
                        <p className="text-xs text-portal-border-2 italic px-3">Empty — assign content below</p>
                        <div style={{ padding: '0 12px' }}>
                          <AISectionFiller
                            publication={filterPub ?? 'rrp'}
                            surface="newsletter"
                            section={sec.value}
                            sectionLabel={sec.label}
                            candidates={aiNewsletterCandidates}
                            targetCount={sec.value === 'lead' ? 1 : 2}
                            view="newsletter"
                          />
                        </div>
                      </>
                    )}
                  </div>
                )
              })}
              {groups.newsletter.filter(i => !i.newsletter_section).length > 0 && (
                <div>
                  <p className="text-[11px] font-bold text-portal-amber uppercase tracking-wide mb-1.5">No Section Assigned</p>
                  {groups.newsletter.filter(i => !i.newsletter_section).map(item => (
                    <div key={item.id} className="flex items-center gap-2 px-3 py-2 bg-portal-amber-lt rounded-lg mb-1">
                      <p className="text-xs font-semibold text-portal-text flex-1 truncate">{displayTitle(item)}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Section assignment forms */}
          <div>
            <SectionHeader
              title="Assign Newsletter Sections"
              count={groups.newsletter.length}
              description="Set the section and ordering for each item."
            />
            <div className="space-y-2">
              {groups.newsletter.map(item => (
                <div key={item.id} className="flex items-center gap-3 bg-white border border-portal-border rounded-lg px-4 py-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-portal-text truncate">{displayTitle(item)}</p>
                    <p className="text-[11px] text-portal-muted">{item.submission_type} · {item.target_publication.toUpperCase()}</p>
                  </div>
                  <form action={updateNewsletterDetails} className="flex gap-2 items-center shrink-0">
                    <input type="hidden" name="id" value={item.id} />
                    <input type="hidden" name="v"  value="newsletter" />
                    <select name="newsletter_section" defaultValue={item.newsletter_section ?? ''}
                      className="text-xs border border-portal-border rounded-lg px-2 py-1.5 outline-none">
                      <option value="">— Section —</option>
                      {NEWSLETTER_SECTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                    </select>
                    <input name="newsletter_order" type="number" min="1" max="99" defaultValue={item.newsletter_order ?? ''}
                      placeholder="#"
                      className="w-14 text-xs border border-portal-border rounded-lg px-2 py-1.5 outline-none" />
                    <button type="submit" className="text-xs px-3 py-1.5 bg-portal-navy text-white rounded-lg font-semibold hover:bg-portal-navy">Save</button>
                  </form>
                </div>
              ))}
            </div>
          </div>

          {/* Quality warnings */}
          {nlWarnings.length > 0 && (
            <div className="space-y-2">
              <h2 className="text-sm font-bold text-portal-text">Quality Check</h2>
              {nlWarnings.map((w, i) => (
                <div key={i} className={`flex items-start gap-3 px-4 py-3 rounded-lg border text-xs font-medium ${
                  w.level === 'error'   ? 'bg-portal-red-lt border-portal-red/30 text-portal-red'
                  : w.level === 'warning' ? 'bg-portal-amber-lt border-portal-amber/30 text-portal-amber'
                  : 'bg-portal-blue-lt border-portal-blue/20 text-portal-blue'
                }`}>
                  <span className="shrink-0 mt-0.5">{w.level === 'error' ? '✗' : w.level === 'warning' ? '⚠️' : 'ℹ️'}</span>
                  <span>{w.msg}</span>
                </div>
              ))}
            </div>
          )}

          {/* Subject line suggestions — starts with templated picks
              (free, instant) and offers a one-click upgrade to AI-
              generated brand-voice-aware subjects from Claude. */}
          {groups.newsletter.length > 0 && (
            <div className="card">
              <AINewsletterSubjects
                publication={filterPub ?? 'rrp'}
                items={groups.newsletter.slice(0, 30).map(i => ({
                  title: displayTitle(i),
                  type:  i.submission_type,
                  blurb: (i.newsletter_teaser ?? i.excerpt ?? '').slice(0, 200) || undefined,
                }))}
                initialSubjects={nlSubjects}
              />
            </div>
          )}

          {/* Export panel */}
          <div className="space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <h2 className="text-sm font-bold text-portal-text">Newsletter Export</h2>
                <span className="text-[11px] text-portal-muted">Save the draft below so you don&apos;t lose it on browser close; copy the HTML/text into your ESP for now.</span>
              </div>
              <NewsletterSaveDraft
                publication={filterPub ?? 'rrp'}
                issueLabelHint={`${nlPubName} — ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`}
                itemIds={groups.newsletter.map(i => i.id)}
                subjectLine={nlSubjects[0] ?? ''}
                bodyHtml={nlHtmlStr}
                bodyPlainText={nlText}
                bodyMobile={nlMobile}
              />
            </div>

            {groups.newsletter.length === 0 ? (
              <div className="bg-white border border-portal-border rounded-lg px-6 py-10 text-center">
                <p className="text-portal-muted text-sm">No items in the newsletter queue yet.</p>
                <p className="text-[11px] text-portal-muted mt-1">Use the assignment forms above to add content.</p>
              </div>
            ) : (
              <>
                {/* Plain text */}
                <div className="bg-white border border-portal-border rounded-lg overflow-hidden">
                  <div className="px-5 py-3.5 border-b border-gray-50 flex items-center justify-between">
                    <div>
                      <h3 className="text-xs font-bold text-portal-sub">Plain Text</h3>
                      <p className="text-[11px] text-portal-muted">Paste into any email builder as plain content</p>
                    </div>
                    <span className="text-[10px] bg-portal-green-lt text-portal-green px-2 py-0.5 rounded font-semibold">Ready</span>
                  </div>
                  <div className="p-4">
                    <textarea
                      defaultValue={nlText}
                      readOnly
                      rows={16}
                      className="w-full text-xs font-mono border border-portal-border rounded-lg px-3 py-2.5 bg-portal-bg resize-vertical outline-none focus:border-indigo-300 transition-colors leading-relaxed"
                    />
                  </div>
                </div>

                {/* HTML */}
                <div className="bg-white border border-portal-border rounded-lg overflow-hidden">
                  <div className="px-5 py-3.5 border-b border-gray-50 flex items-center justify-between">
                    <div>
                      <h3 className="text-xs font-bold text-portal-sub">HTML</h3>
                      <p className="text-[11px] text-portal-muted">Paste into GHL, Mailchimp, or Klaviyo HTML block</p>
                    </div>
                    <span className="text-[10px] bg-portal-blue-lt text-portal-blue px-2 py-0.5 rounded font-semibold">Mobile-Friendly</span>
                  </div>
                  <div className="p-4">
                    <textarea
                      defaultValue={nlHtmlStr}
                      readOnly
                      rows={16}
                      className="w-full text-xs font-mono border border-portal-border rounded-lg px-3 py-2.5 bg-portal-bg resize-vertical outline-none focus:border-indigo-300 transition-colors leading-relaxed"
                    />
                  </div>
                </div>

                {/* Mobile short */}
                <div className="bg-white border border-portal-border rounded-lg overflow-hidden">
                  <div className="px-5 py-3.5 border-b border-gray-50 flex items-center justify-between">
                    <div>
                      <h3 className="text-xs font-bold text-portal-sub">Mobile Short Version</h3>
                      <p className="text-[11px] text-portal-muted">For SMS teaser, push notification, or social preview</p>
                    </div>
                    <span className="text-[10px] bg-portal-blue-lt text-portal-blue px-2 py-0.5 rounded font-semibold">Compact</span>
                  </div>
                  <div className="p-4">
                    <textarea
                      defaultValue={nlMobile}
                      readOnly
                      rows={8}
                      className="w-full text-xs font-mono border border-portal-border rounded-lg px-3 py-2.5 bg-portal-bg resize-vertical outline-none focus:border-indigo-300 transition-colors leading-relaxed"
                    />
                  </div>
                </div>
              </>
            )}
          </div>

          {/* GHL / Social future handoff note */}
          <div className="bg-portal-bg border border-portal-border rounded-lg px-5 py-4">
            <p className="text-xs font-bold text-portal-sub mb-1">🔮 Future Phase: GHL Email Builder Handoff</p>
            <p className="text-xs text-portal-muted leading-relaxed">
              After editor approval in the Approval Desk, the assembled newsletter will be sent directly to the GHL email builder or social planner — no copy-paste required.
              This phase requires API integration and editorial sign-off workflow. For now, copy the export above into your email tool.
            </p>
          </div>

          {/* AI suggestions wired in Phase B */}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          VIEW: SOCIAL
      ══════════════════════════════════════════════════════════════════════ */}
      {activeView === 'social' && (
        <div className="space-y-6">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex-1 bg-portal-blue-lt border border-portal-blue/20 rounded-lg px-5 py-3">
              <p className="text-xs text-portal-blue font-medium">
                📱 Social amplification is editorial judgment, not automation. Surface high-share potential content, set priority, and hand off to your social workflow.
              </p>
            </div>
            <Link
              href="/admin/distribution/social-export"
              className="shrink-0 text-xs px-4 py-2.5 bg-portal-blue text-white rounded-lg font-semibold hover:bg-portal-navy transition-colors flex items-center gap-1.5"
            >
              📤 Social Planner Export →
            </Link>
          </div>

          {/* High-share potential */}
          <div>
            <SectionHeader
              title="High-Share Potential"
              count={groups.socialHigh.length}
              description="Emotional, local, community-driven — naturally shareable."
            />
            <div className="space-y-2">
              {groups.socialHigh.slice(0, 10).map(item => {
                const tc = SUBMISSION_TYPES.find(t => t.type === item.submission_type)
                return (
                  <div key={item.id} className="flex flex-col gap-2 bg-white border border-portal-border rounded-lg px-4 py-3" style={{ borderLeft: `3px solid ${TYPE_COLORS[item.submission_type] ?? '#374151'}` }}>
                    <div className="flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span>{tc?.emoji}</span>
                          <span className="text-[10px] font-bold text-portal-muted uppercase tracking-wide">{tc?.shortLabel}</span>
                          <span className="text-[10px] bg-portal-blue-lt text-portal-blue px-1.5 py-0.5 rounded font-bold">High Share</span>
                          {item.social_queue && <span className="text-[10px] bg-portal-green-lt text-portal-green px-1.5 py-0.5 rounded font-bold">In Queue</span>}
                        </div>
                        <p className="text-sm font-semibold text-portal-text truncate">{displayTitle(item)}</p>
                      </div>
                      <div className="shrink-0 flex gap-2 items-center">
                        <AISocialCaption publication={filterPub ?? item.target_publication ?? 'rrp'} submissionId={item.id} />
                        <form action={updateSocialPriority}>
                          <input type="hidden" name="id" value={item.id} />
                          <input type="hidden" name="v"  value="social" />
                          <select name="social_priority" defaultValue={item.social_priority || 'normal'}
                            className="text-xs border border-portal-border rounded-lg px-2 py-1.5 outline-none">
                            <option value="low">Low</option>
                            <option value="normal">Normal</option>
                            <option value="high">High Priority</option>
                          </select>
                          <button type="submit" className="text-xs px-3 py-1.5 bg-portal-blue text-white rounded-lg font-semibold hover:bg-portal-navy ml-1.5">Set</button>
                        </form>
                        <Link href={`/admin/editorial/${item.id}`} className="text-xs text-portal-blue hover:underline px-2 py-1.5 font-semibold">Edit →</Link>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Social queue */}
          {groups.social.length > 0 && (
            <div>
              <SectionHeader title="Social Queue" count={groups.social.length} description="Marked for social amplification." />
              <div className="space-y-2">
                {groups.social.map(item => <DistCard key={item.id} item={item} compact />)}
              </div>
            </div>
          )}

          {/* AI Future */}
          {/* AI social captions wired in Phase C */}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          VIEW: GUIDES
      ══════════════════════════════════════════════════════════════════════ */}
      {activeView === 'guides' && (
        <div className="space-y-6">
          {/* Guide integration queue */}
          {groups.guides.length > 0 && (
            <div>
              <SectionHeader title="Guide Integration Queue" count={groups.guides.length} description="Content flagged for guide integration." />
              <div className="space-y-2">
                {groups.guides.map(item => (
                  <div key={item.id} className="flex items-center gap-3 bg-white border border-portal-border rounded-lg px-4 py-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-portal-text truncate">{displayTitle(item)}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[11px] text-portal-muted">{item.submission_type}</span>
                        {item.destination_guide_slug && (
                          <span className="text-[10px] bg-portal-green-lt text-portal-green px-2 py-0.5 rounded-full font-semibold">
                            → {guideName(item.destination_guide_slug)}
                          </span>
                        )}
                        {!item.destination_guide_slug && (
                          <span className="text-[10px] bg-portal-amber-lt text-portal-amber px-2 py-0.5 rounded-full font-semibold">No guide selected</span>
                        )}
                      </div>
                    </div>
                    <Link href={`/admin/editorial/${item.id}`} className="text-xs text-portal-blue hover:underline font-semibold shrink-0">Assign Guide →</Link>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Guide health */}
          <div>
            <SectionHeader title="Guide Content Health" count={GUIDE_CONFIGS.length} description="Published article count per guide." />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {GUIDE_CONFIGS.map(g => {
                const stat  = guideArticleMap.get(g.slug)
                const count = stat?.article_count ?? 0
                const fresh = stat?.latest_article ? freshnessDays(stat.latest_article) : 999
                const fc    = freshnessChip(fresh)
                const inQueue = groups.guides.filter(i => i.destination_guide_slug === g.slug).length
                return (
                  <div key={g.slug} className="bg-white border border-portal-border rounded-lg px-4 py-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-portal-text leading-tight">{guideName(g.slug)}</p>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <span className="text-[11px] text-portal-sub">{count} articles</span>
                          {count < 5 && <span className="text-[10px] bg-portal-red-lt text-portal-red px-1.5 py-0.5 rounded font-semibold">Needs content</span>}
                          {count === 0 && <span className="text-[10px] bg-portal-red-lt text-portal-red px-1.5 py-0.5 rounded font-bold">Empty</span>}
                          <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${fc.cls}`}>{fc.label}</span>
                          {inQueue > 0 && <span className="text-[10px] bg-portal-blue-lt text-portal-blue px-1.5 py-0.5 rounded font-semibold">{inQueue} queued</span>}
                        </div>
                      </div>
                      <div className="w-16 bg-portal-row-hover rounded-full h-2 mt-1.5 shrink-0">
                        <div className="h-2 rounded-full bg-portal-green" style={{ width: `${Math.min(count * 10, 100)}%` }} />
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          VIEW: SPONSORS
      ══════════════════════════════════════════════════════════════════════ */}
      {activeView === 'sponsors' && (
        <div className="space-y-6">
          <div className="bg-portal-amber-lt border border-portal-amber/30 rounded-lg px-5 py-3">
            <p className="text-xs text-portal-amber font-medium">
              🤝 Editorial integrity first. Sponsor alignment is an opportunity signal — never auto-insert sponsors into content. All sponsor/content pairing requires editorial review.
            </p>
          </div>

          {/* Uncategorized sponsors CTA — alignment matcher can't fire
              until every sponsor has a sponsor_category_slug. Surfacing
              the count here means editors fix it in one focused session
              instead of one-at-a-time in the CRM. */}
          {sponsors.filter(s => !s.sponsor_category_slug).length > 0 && (
            <div className="alert alert-warning" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
              <div>
                <strong>{sponsors.filter(s => !s.sponsor_category_slug).length} active sponsors have no category.</strong>{' '}
                The alignment matcher can&apos;t suggest content for them until they&apos;re categorized.
              </div>
              <Link href="/admin/distribution/sponsor-categorize" className="btn btn-primary btn-sm">
                Categorize with AI →
              </Link>
            </div>
          )}

          {/* Sponsor opportunities — strong alignment */}
          <div>
            <SectionHeader
              title="Sponsor Alignment Opportunities"
              count={sponsorOpportunities.filter(o => o.aligned.length > 0).length}
              description="Active sponsors with editorially aligned content ready to distribute."
            />
            <div className="space-y-2">
              {sponsorOpportunities.filter(o => o.aligned.length > 0).slice(0, 12).map(({ sponsor, aligned }) => (
                <div key={sponsor.id} className="bg-white border border-portal-border rounded-lg px-4 py-3">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold text-portal-text">{sponsor.business_name}</p>
                        {sponsor.package_tier && (
                          <span className="text-[10px] bg-portal-amber-lt text-portal-amber px-2 py-0.5 rounded-full font-semibold">{sponsor.package_tier}</span>
                        )}
                        {sponsor.sponsor_category_slug && (
                          <span className="text-[10px] bg-portal-row-hover text-portal-sub px-2 py-0.5 rounded-full font-semibold">{sponsor.sponsor_category_slug}</span>
                        )}
                      </div>
                      <p className="text-xs text-portal-muted mt-0.5">
                        {aligned.length} aligned piece{aligned.length !== 1 ? 's' : ''}: {aligned.slice(0, 3).map(displayTitle).join(', ')}
                        {aligned.length > 3 ? ` +${aligned.length - 3} more` : ''}
                      </p>
                    </div>
                    <span className="text-xs font-bold text-portal-green bg-portal-green-lt px-3 py-1 rounded-full shrink-0">
                      {aligned.length} match{aligned.length !== 1 ? 'es' : ''}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Visibility gaps */}
          {sponsorGaps.length > 0 && (
            <div>
              <SectionHeader
                title="Sponsor Visibility Gaps"
                count={sponsorGaps.length}
                description="Active sponsors with no editorially aligned content currently in queue."
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {sponsorGaps.slice(0, 12).map(({ sponsor }) => (
                  <div key={sponsor.id} className="flex items-center gap-3 bg-white border border-portal-amber/20 rounded-lg px-4 py-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-portal-text truncate">{sponsor.business_name}</p>
                      <p className="text-[11px] text-portal-muted">
                        {sponsor.sponsor_category_slug ?? 'No category'}
                        {sponsor.sponsor_guide_slug && ` · ${guideName(sponsor.sponsor_guide_slug)}`}
                      </p>
                    </div>
                    <span className="text-[10px] bg-portal-amber-lt text-portal-amber px-2 py-0.5 rounded font-semibold shrink-0">No match</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* AI Future */}
          {/* AI sponsor pairings wired in Phase B */}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          VIEW: HEALTH
      ══════════════════════════════════════════════════════════════════════ */}
      {activeView === 'health' && (
        <div className="space-y-6">
          {/* Distribution coverage */}
          <div className="bg-white border border-portal-border rounded-lg p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold text-portal-text">Distribution Coverage</h2>
              <span className="text-lg font-bold" style={{ color: healthPct >= 80 ? '#16a34a' : healthPct >= 50 ? '#b8860b' : '#dc2626' }}>
                {healthPct}%
              </span>
            </div>
            <div className="w-full bg-portal-row-hover rounded-full h-3 mb-4">
              <div className="h-3 rounded-full transition-all" style={{ width: `${healthPct}%`, backgroundColor: healthPct >= 80 ? '#16a34a' : healthPct >= 50 ? '#b8860b' : '#dc2626' }} />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: 'Total Ready',    val: items.length },
                { label: 'Routed',         val: items.length - noDestination.length },
                { label: 'No Destination', val: noDestination.length },
                { label: 'No Title',       val: noTitle.length },
              ].map(m => (
                <div key={m.label} className="bg-portal-bg rounded-lg px-3 py-2.5">
                  <div className="text-xl font-bold text-portal-text">{m.val}</div>
                  <div className="text-[11px] text-portal-muted">{m.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Health alerts */}
          <div className="space-y-2">
            {[
              staleHomepage.length > 0   && { severity: 'critical', icon: '⚠️', msg: `${staleHomepage.length} homepage item${staleHomepage.length > 1 ? 's are' : ' is'} over 21 days old. Consider rotating.`, href: viewHref('homepage') },
              missingImages.length > 0   && { severity: 'warning',  icon: '🖼️', msg: `${missingImages.length} approved item${missingImages.length > 1 ? 's have' : ' has'} no feature image.`, href: viewHref('queue') },
              noDestination.length > 0   && { severity: 'warning',  icon: '📍', msg: `${noDestination.length} item${noDestination.length > 1 ? 's have' : ' has'} no destination section assigned.`, href: viewHref('queue') },
              sponsorGaps.length > 0     && { severity: 'info',     icon: '🤝', msg: `${sponsorGaps.length} active sponsor${sponsorGaps.length > 1 ? 's have' : ' has'} no aligned editorial content in the current queue.`, href: viewHref('sponsors') },
              groups.guides.length === 0 && { severity: 'info',     icon: '📖', msg: 'No content is currently queued for guide integration.', href: viewHref('guides') },
              groups.newsletter.length < 3 && { severity: 'info',   icon: '📧', msg: `Only ${groups.newsletter.length} item${groups.newsletter.length !== 1 ? 's' : ''} in the newsletter queue. Consider adding more.`, href: viewHref('newsletter') },
            ].filter(Boolean).map((alert, i) => {
              if (!alert) return null
              const cls = alert.severity === 'critical' ? 'bg-portal-red-lt border-portal-red/30 text-portal-red'
                        : alert.severity === 'warning'  ? 'bg-portal-amber-lt border-portal-amber/30 text-portal-amber'
                        : 'bg-portal-blue-lt border-portal-blue/20 text-portal-blue'
              return (
                <Link key={i} href={alert.href}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg border text-sm font-medium ${cls} hover:opacity-90 transition-opacity`}>
                  <span>{alert.icon}</span>
                  <span className="flex-1">{alert.msg}</span>
                  <span className="text-[11px] opacity-60 shrink-0">View →</span>
                </Link>
              )
            })}
          </div>

          {/* Channel metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {[
              { label: 'Homepage Coverage',  val: groups.homepage.length,   max: 12, color: '#c4622d' },
              { label: 'Newsletter Queue',   val: groups.newsletter.length, max: 8,  color: '#0284c7' },
              { label: 'Social Queue',       val: groups.social.length,     max: 10, color: '#7c3aed' },
              { label: 'Guide Integration',  val: groups.guides.length,     max: 15, color: '#16a34a' },
              { label: 'Print Ready',        val: groups.print.length,      max: 20, color: '#374151' },
              { label: 'Seasonal Push',      val: groups.seasonal.length,   max: 10, color: '#b8860b' },
            ].map(m => (
              <div key={m.label} className="bg-white border border-portal-border rounded-lg px-4 py-3">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-semibold text-portal-sub">{m.label}</p>
                  <span className="text-sm font-bold" style={{ color: m.color }}>{m.val}</span>
                </div>
                <div className="w-full bg-portal-row-hover rounded-full h-1.5">
                  <div className="h-1.5 rounded-full" style={{ width: `${Math.min((m.val / m.max) * 100, 100)}%`, backgroundColor: m.color }} />
                </div>
              </div>
            ))}
          </div>

          {/* AI suggestions slot — wired in Phase B.3 */}
        </div>
      )}

      </div>
    </div>
  )
}
