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
  if (days <= 7)  return { label: 'Fresh',    cls: 'bg-green-50 text-green-700'  }
  if (days <= 21) return { label: 'Recent',   cls: 'bg-portal-blue-lt text-portal-blue'   }
  if (days <= 60) return { label: 'Aging',    cls: 'bg-portal-amber-lt text-portal-amber' }
  return                 { label: 'Stale',    cls: 'bg-red-50 text-red-700'     }
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
      className="bg-white border border-gray-100 rounded-xl overflow-hidden hover:border-portal-border transition-colors"
      style={{ borderLeft: `3px solid ${accent}` }}
    >
      <div className={`px-4 ${compact ? 'py-2.5' : 'py-3'} flex items-start gap-3`}>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
            <span className="text-sm">{tc?.emoji ?? '📝'}</span>
            <span className="text-[10px] font-bold text-portal-muted uppercase tracking-wide">{tc?.shortLabel ?? item.submission_type}</span>
            <span className="text-[10px] bg-gray-100 text-portal-sub px-1.5 py-0.5 rounded font-semibold">{item.target_publication.toUpperCase()}</span>
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
              <span className="text-[10px] bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded font-semibold">{item.destination_section}</span>
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
            className="text-[11px] font-bold text-indigo-600 hover:underline"
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
  const { view: rawView = 'queue', pub: rawPub } = await searchParams
  const filterPub = normalizePublication(rawPub) // validated publication slug or null
  const activeView = (VIEWS.some(v => v.key === rawView) ? rawView : 'queue') as ViewKey

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

  const [
    { data: rawItems },
    { data: rawSponsors },
    { data: rawArticleStats },
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
  ])

  const items    = (rawItems    ?? []) as unknown as SubmissionRow[]
  const sponsors = (rawSponsors ?? []) as SponsorRow[]

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

  // Health score (0–100)
  const total         = items.length || 1
  const routed        = items.filter(i => !!i.destination_section).length
  const healthPct     = Math.round((routed / total) * 100)

  // ── Sponsor alignment ─────────────────────────────────────────────────────

  // For each sponsor, find content items that editorially align with their category
  const sponsorOpportunities = sponsors.map(sp => {
    const aligned = items.filter(i => {
      const cat = TYPE_CATEGORY[i.submission_type]
      return cat === sp.sponsor_category_slug || i.destination_guide_slug === sp.sponsor_guide_slug
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
    <main className="p-6 max-w-[1100px] mx-auto space-y-6 pb-16">

      {/* ── HEADER ──────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-portal-text tracking-tight">Distribution & Amplification</h1>
          <p className="text-sm text-portal-sub mt-0.5">
            Strategic content deployment — homepage, newsletter, social, guides, and sponsors.
          </p>
        </div>
        <Link href="/admin/editorial" className="text-xs px-3 py-2 rounded-lg border border-portal-border text-portal-sub hover:bg-portal-bg font-medium shrink-0">
          ← Editorial Pipeline
        </Link>
      </div>

      {/* ── VIEW TABS ───────────────────────────────────────────────────── */}
      <div className="flex gap-1 overflow-x-auto pb-1">
        {VIEWS.map(v => (
          <Link
            key={v.key}
            href={viewHref(v.key)}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors flex items-center gap-1.5 ${
              activeView === v.key
                ? 'bg-gray-900 text-white'
                : 'bg-white border border-portal-border text-portal-sub hover:bg-portal-bg'
            }`}
          >
            <span>{v.icon}</span>
            <span>{v.label}</span>
          </Link>
        ))}
      </div>

      {/* ── HEALTH STRIP — always visible ───────────────────────────────── */}
      <div className="grid grid-cols-4 gap-2 sm:grid-cols-7">
        {[
          { label: 'Ready',        val: items.length,              color: '#374151', href: viewHref('queue')      },
          { label: 'Homepage',     val: groups.homepage.length,    color: '#c4622d', href: viewHref('homepage')   },
          { label: 'Newsletter',   val: groups.newsletter.length,  color: '#0284c7', href: viewHref('newsletter') },
          { label: 'Social',       val: groups.social.length,      color: '#7c3aed', href: viewHref('social')     },
          { label: 'Guides',       val: groups.guides.length,      color: '#16a34a', href: viewHref('guides')     },
          { label: 'Stale HP',     val: staleHomepage.length,      color: '#dc2626', href: viewHref('homepage')   },
          { label: 'No Image',     val: missingImages.length,      color: '#b8860b', href: viewHref('health')     },
        ].map(m => (
          <Link key={m.label} href={m.href}
            className="bg-white border border-gray-100 rounded-xl px-3 py-2.5 hover:border-portal-border transition-colors block">
            <div className="text-xl font-bold" style={{ color: m.color }}>{m.val}</div>
            <div className="text-[10px] text-portal-muted mt-0.5 leading-tight">{m.label}</div>
          </Link>
        ))}
      </div>

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
            <div className="bg-white border border-gray-100 rounded-2xl px-8 py-16 text-center">
              <div className="text-4xl mb-4">📭</div>
              <p className="text-portal-sub font-medium">No approved content in the distribution queue.</p>
              <Link href="/admin/editorial" className="text-sm text-indigo-600 mt-2 inline-block hover:underline">
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
          <div className="bg-portal-blue-lt border border-portal-blue/20 rounded-2xl px-5 py-3">
            <p className="text-xs text-portal-blue font-medium">
              💡 Assign content to homepage sections below. Changes are editorial assignments only — no auto-publishing. Homepage items should rotate every 1–3 weeks.
            </p>
          </div>

          {/* Stale alert */}
          {staleHomepage.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-2xl px-5 py-4">
              <p className="text-sm font-bold text-red-800 mb-2">⚠️ Stale Homepage Items ({staleHomepage.length})</p>
              <div className="space-y-1.5">
                {staleHomepage.map(item => (
                  <div key={item.id} className="flex items-center justify-between gap-4">
                    <p className="text-xs text-red-700">{displayTitle(item)} — {freshnessDays(item.updated_at)}d old</p>
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
                  <div className="flex-1 h-px bg-gray-100" />
                  {secItems.length === 0 && (
                    <span className="text-[10px] bg-portal-amber-lt text-portal-amber px-2 py-0.5 rounded-full font-semibold">Empty</span>
                  )}
                </div>
                <div className="space-y-1.5">
                  {secItems.map(item => (
                    <div key={item.id} className="flex items-center gap-3 bg-white border border-gray-100 rounded-xl px-4 py-3">
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
                        <button type="submit" className="text-xs px-3 py-1.5 bg-gray-800 text-white rounded-lg font-semibold hover:bg-gray-700">Save</button>
                      </form>
                      <form action={toggleHomepage}>
                        <input type="hidden" name="id"      value={item.id} />
                        <input type="hidden" name="current" value="true" />
                        <input type="hidden" name="v"       value="homepage" />
                        <button type="submit" className="text-[11px] px-2 py-1.5 border border-red-200 text-portal-red rounded-lg hover:bg-portal-red-lt">Remove</button>
                      </form>
                    </div>
                  ))}
                  {secItems.length === 0 && (
                    <p className="text-xs text-gray-300 italic px-4 py-2">No content assigned to this section.</p>
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
                  <div key={item.id} className="flex items-center gap-3 bg-white border border-gray-100 rounded-xl px-4 py-3">
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
                      <Link href={`/admin/editorial/${item.id}`} className="text-xs text-indigo-600 hover:underline px-2 py-1.5 font-semibold">Edit →</Link>
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
          <div className="bg-portal-blue-lt border border-portal-blue/20 rounded-2xl px-5 py-3">
            <p className="text-xs text-portal-blue font-medium">
              📧 Assign content to newsletter sections and set ordering. Preview the lineup below. No ESP integration yet — use this to plan and copy content into your email tool.
            </p>
          </div>

          {/* Section lineup preview */}
          <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden">
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
                            <span className="text-[11px] font-bold text-gray-300 w-4 shrink-0">{idx + 1}</span>
                            <p className="text-xs font-semibold text-portal-text flex-1 truncate">{displayTitle(item)}</p>
                            <span className="text-[10px] text-portal-muted">{SUBMISSION_TYPES.find(t => t.type === item.submission_type)?.emoji}</span>
                            <Link href={`/admin/editorial/${item.id}`} className="text-[10px] text-indigo-500 hover:underline shrink-0">Edit</Link>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-gray-300 italic px-3">Empty — assign content below</p>
                    )}
                  </div>
                )
              })}
              {groups.newsletter.filter(i => !i.newsletter_section).length > 0 && (
                <div>
                  <p className="text-[11px] font-bold text-amber-600 uppercase tracking-wide mb-1.5">No Section Assigned</p>
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
                <div key={item.id} className="flex items-center gap-3 bg-white border border-gray-100 rounded-xl px-4 py-3">
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
                    <button type="submit" className="text-xs px-3 py-1.5 bg-gray-800 text-white rounded-lg font-semibold hover:bg-gray-700">Save</button>
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
                <div key={i} className={`flex items-start gap-3 px-4 py-3 rounded-xl border text-xs font-medium ${
                  w.level === 'error'   ? 'bg-red-50 border-red-200 text-red-800'
                  : w.level === 'warning' ? 'bg-portal-amber-lt border-amber-200 text-portal-amber'
                  : 'bg-portal-blue-lt border-portal-blue/20 text-portal-blue'
                }`}>
                  <span className="shrink-0 mt-0.5">{w.level === 'error' ? '✗' : w.level === 'warning' ? '⚠️' : 'ℹ️'}</span>
                  <span>{w.msg}</span>
                </div>
              ))}
            </div>
          )}

          {/* Suggested subject lines */}
          {groups.newsletter.length > 0 && (
            <div className="bg-white border border-gray-100 rounded-2xl p-5">
              <h2 className="text-sm font-bold text-portal-text mb-1">Suggested Subject Lines</h2>
              <p className="text-[11px] text-portal-muted mb-3">Based on your current lineup. Choose one, mix, or write your own.</p>
              <div className="space-y-1.5">
                {nlSubjects.map((s, i) => (
                  <div key={i} className="flex items-center gap-3 px-3 py-2 bg-portal-bg rounded-lg">
                    <span className="text-[11px] font-bold text-gray-300 w-4 shrink-0">{i + 1}</span>
                    <p className="text-xs text-portal-text flex-1 font-medium">{s}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Export panel */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-portal-text">Newsletter Export</h2>
              <span className="text-[11px] text-portal-muted">Select all and copy into your email tool</span>
            </div>

            {groups.newsletter.length === 0 ? (
              <div className="bg-white border border-gray-100 rounded-2xl px-6 py-10 text-center">
                <p className="text-portal-muted text-sm">No items in the newsletter queue yet.</p>
                <p className="text-[11px] text-portal-muted mt-1">Use the assignment forms above to add content.</p>
              </div>
            ) : (
              <>
                {/* Plain text */}
                <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden">
                  <div className="px-5 py-3.5 border-b border-gray-50 flex items-center justify-between">
                    <div>
                      <h3 className="text-xs font-bold text-portal-sub">Plain Text</h3>
                      <p className="text-[11px] text-portal-muted">Paste into any email builder as plain content</p>
                    </div>
                    <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded font-semibold">Ready</span>
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
                <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden">
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
                <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden">
                  <div className="px-5 py-3.5 border-b border-gray-50 flex items-center justify-between">
                    <div>
                      <h3 className="text-xs font-bold text-portal-sub">Mobile Short Version</h3>
                      <p className="text-[11px] text-portal-muted">For SMS teaser, push notification, or social preview</p>
                    </div>
                    <span className="text-[10px] bg-purple-100 text-purple-700 px-2 py-0.5 rounded font-semibold">Compact</span>
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
          <div className="bg-portal-bg border border-portal-border rounded-2xl px-5 py-4">
            <p className="text-xs font-bold text-portal-sub mb-1">🔮 Future Phase: GHL Email Builder Handoff</p>
            <p className="text-xs text-portal-muted leading-relaxed">
              After editor approval in the Approval Desk, the assembled newsletter will be sent directly to the GHL email builder or social planner — no copy-paste required.
              This phase requires API integration and editorial sign-off workflow. For now, copy the export above into your email tool.
            </p>
          </div>

          {/* AI Future */}
          <div className="bg-white border border-gray-100 rounded-2xl p-5">
            <p className="text-xs font-bold text-portal-muted uppercase tracking-wide mb-2">AI Assist — Coming Soon</p>
            <div className="flex gap-2 flex-wrap">
              {['Suggest Newsletter Lineup', 'Generate Section Intros', 'Suggest Subject Lines'].map(label => (
                <button key={label} disabled
                  className="text-xs px-3 py-1.5 border border-gray-100 rounded-lg text-portal-muted cursor-not-allowed flex items-center gap-1.5">
                  {label}
                  <span className="text-[10px] bg-gray-100 px-1.5 py-0.5 rounded font-medium">Soon</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          VIEW: SOCIAL
      ══════════════════════════════════════════════════════════════════════ */}
      {activeView === 'social' && (
        <div className="space-y-6">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex-1 bg-purple-50 border border-purple-100 rounded-2xl px-5 py-3">
              <p className="text-xs text-purple-800 font-medium">
                📱 Social amplification is editorial judgment, not automation. Surface high-share potential content, set priority, and hand off to your social workflow.
              </p>
            </div>
            <Link
              href="/admin/distribution/social-export"
              className="shrink-0 text-xs px-4 py-2.5 bg-purple-600 text-white rounded-xl font-semibold hover:bg-purple-700 transition-colors flex items-center gap-1.5"
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
                  <div key={item.id} className="flex items-center gap-3 bg-white border border-gray-100 rounded-xl px-4 py-3" style={{ borderLeft: `3px solid ${TYPE_COLORS[item.submission_type] ?? '#374151'}` }}>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span>{tc?.emoji}</span>
                        <span className="text-[10px] font-bold text-portal-muted uppercase tracking-wide">{tc?.shortLabel}</span>
                        <span className="text-[10px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded font-bold">High Share</span>
                        {item.social_queue && <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-bold">In Queue</span>}
                      </div>
                      <p className="text-sm font-semibold text-portal-text truncate">{displayTitle(item)}</p>
                    </div>
                    <div className="shrink-0 flex gap-2">
                      <form action={updateSocialPriority}>
                        <input type="hidden" name="id" value={item.id} />
                        <input type="hidden" name="v"  value="social" />
                        <select name="social_priority" defaultValue={item.social_priority || 'normal'}
                          className="text-xs border border-portal-border rounded-lg px-2 py-1.5 outline-none">
                          <option value="low">Low</option>
                          <option value="normal">Normal</option>
                          <option value="high">High Priority</option>
                        </select>
                        <button type="submit" className="text-xs px-3 py-1.5 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 ml-1.5">Set</button>
                      </form>
                      <Link href={`/admin/editorial/${item.id}`} className="text-xs text-indigo-600 hover:underline px-2 py-1.5 font-semibold">Edit →</Link>
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
          <div className="bg-white border border-gray-100 rounded-2xl p-5">
            <p className="text-xs font-bold text-portal-muted uppercase tracking-wide mb-2">AI Assist — Coming Soon</p>
            <div className="flex gap-2 flex-wrap">
              {['Generate Social Captions', 'Identify Viral Potential', 'Suggest Posting Schedule'].map(label => (
                <button key={label} disabled className="text-xs px-3 py-1.5 border border-gray-100 rounded-lg text-portal-muted cursor-not-allowed flex items-center gap-1.5">
                  {label}
                  <span className="text-[10px] bg-gray-100 px-1.5 py-0.5 rounded font-medium">Soon</span>
                </button>
              ))}
            </div>
          </div>
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
                  <div key={item.id} className="flex items-center gap-3 bg-white border border-gray-100 rounded-xl px-4 py-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-portal-text truncate">{displayTitle(item)}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[11px] text-portal-muted">{item.submission_type}</span>
                        {item.destination_guide_slug && (
                          <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-semibold">
                            → {guideName(item.destination_guide_slug)}
                          </span>
                        )}
                        {!item.destination_guide_slug && (
                          <span className="text-[10px] bg-portal-amber-lt text-portal-amber px-2 py-0.5 rounded-full font-semibold">No guide selected</span>
                        )}
                      </div>
                    </div>
                    <Link href={`/admin/editorial/${item.id}`} className="text-xs text-indigo-600 hover:underline font-semibold shrink-0">Assign Guide →</Link>
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
                  <div key={g.slug} className="bg-white border border-gray-100 rounded-xl px-4 py-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-portal-text leading-tight">{guideName(g.slug)}</p>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <span className="text-[11px] text-portal-sub">{count} articles</span>
                          {count < 5 && <span className="text-[10px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded font-semibold">Needs content</span>}
                          {count === 0 && <span className="text-[10px] bg-red-200 text-red-800 px-1.5 py-0.5 rounded font-bold">Empty</span>}
                          <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${fc.cls}`}>{fc.label}</span>
                          {inQueue > 0 && <span className="text-[10px] bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded font-semibold">{inQueue} queued</span>}
                        </div>
                      </div>
                      <div className="w-16 bg-gray-100 rounded-full h-2 mt-1.5 shrink-0">
                        <div className="h-2 rounded-full bg-green-500" style={{ width: `${Math.min(count * 10, 100)}%` }} />
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
          <div className="bg-portal-amber-lt border border-amber-200 rounded-2xl px-5 py-3">
            <p className="text-xs text-portal-amber font-medium">
              🤝 Editorial integrity first. Sponsor alignment is an opportunity signal — never auto-insert sponsors into content. All sponsor/content pairing requires editorial review.
            </p>
          </div>

          {/* Sponsor opportunities — strong alignment */}
          <div>
            <SectionHeader
              title="Sponsor Alignment Opportunities"
              count={sponsorOpportunities.filter(o => o.aligned.length > 0).length}
              description="Active sponsors with editorially aligned content ready to distribute."
            />
            <div className="space-y-2">
              {sponsorOpportunities.filter(o => o.aligned.length > 0).slice(0, 12).map(({ sponsor, aligned }) => (
                <div key={sponsor.id} className="bg-white border border-gray-100 rounded-xl px-4 py-3">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold text-portal-text">{sponsor.business_name}</p>
                        {sponsor.package_tier && (
                          <span className="text-[10px] bg-portal-amber-lt text-portal-amber px-2 py-0.5 rounded-full font-semibold">{sponsor.package_tier}</span>
                        )}
                        {sponsor.sponsor_category_slug && (
                          <span className="text-[10px] bg-gray-100 text-portal-sub px-2 py-0.5 rounded-full font-semibold">{sponsor.sponsor_category_slug}</span>
                        )}
                      </div>
                      <p className="text-xs text-portal-muted mt-0.5">
                        {aligned.length} aligned piece{aligned.length !== 1 ? 's' : ''}: {aligned.slice(0, 3).map(displayTitle).join(', ')}
                        {aligned.length > 3 ? ` +${aligned.length - 3} more` : ''}
                      </p>
                    </div>
                    <span className="text-xs font-bold text-green-600 bg-green-50 px-3 py-1 rounded-full shrink-0">
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
                  <div key={sponsor.id} className="flex items-center gap-3 bg-white border border-amber-100 rounded-xl px-4 py-3">
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
          <div className="bg-white border border-gray-100 rounded-2xl p-5">
            <p className="text-xs font-bold text-portal-muted uppercase tracking-wide mb-2">AI Assist — Coming Soon</p>
            <div className="flex gap-2 flex-wrap">
              {['Suggest Sponsor Pairings', 'Identify Coverage Gaps', 'Flag Conflict Risk'].map(label => (
                <button key={label} disabled className="text-xs px-3 py-1.5 border border-gray-100 rounded-lg text-portal-muted cursor-not-allowed flex items-center gap-1.5">
                  {label}
                  <span className="text-[10px] bg-gray-100 px-1.5 py-0.5 rounded font-medium">Soon</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          VIEW: HEALTH
      ══════════════════════════════════════════════════════════════════════ */}
      {activeView === 'health' && (
        <div className="space-y-6">
          {/* Distribution coverage */}
          <div className="bg-white border border-gray-100 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold text-portal-text">Distribution Coverage</h2>
              <span className="text-lg font-bold" style={{ color: healthPct >= 80 ? '#16a34a' : healthPct >= 50 ? '#b8860b' : '#dc2626' }}>
                {healthPct}%
              </span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-3 mb-4">
              <div className="h-3 rounded-full transition-all" style={{ width: `${healthPct}%`, backgroundColor: healthPct >= 80 ? '#16a34a' : healthPct >= 50 ? '#b8860b' : '#dc2626' }} />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: 'Total Ready',    val: items.length },
                { label: 'Routed',         val: items.length - noDestination.length },
                { label: 'No Destination', val: noDestination.length },
                { label: 'No Title',       val: noTitle.length },
              ].map(m => (
                <div key={m.label} className="bg-portal-bg rounded-xl px-3 py-2.5">
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
              const cls = alert.severity === 'critical' ? 'bg-red-50 border-red-200 text-red-800'
                        : alert.severity === 'warning'  ? 'bg-portal-amber-lt border-amber-200 text-portal-amber'
                        : 'bg-portal-blue-lt border-portal-blue/20 text-portal-blue'
              return (
                <Link key={i} href={alert.href}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-sm font-medium ${cls} hover:opacity-90 transition-opacity`}>
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
              <div key={m.label} className="bg-white border border-gray-100 rounded-xl px-4 py-3">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-semibold text-portal-sub">{m.label}</p>
                  <span className="text-sm font-bold" style={{ color: m.color }}>{m.val}</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-1.5">
                  <div className="h-1.5 rounded-full" style={{ width: `${Math.min((m.val / m.max) * 100, 100)}%`, backgroundColor: m.color }} />
                </div>
              </div>
            ))}
          </div>

          {/* AI Future */}
          <div className="bg-white border border-gray-100 rounded-2xl p-5">
            <p className="text-xs font-bold text-portal-muted uppercase tracking-wide mb-2">AI Assist — Coming Soon</p>
            <div className="flex gap-2 flex-wrap">
              {['Suggest Homepage Lineup', 'Flag Under-Amplified Content', 'Identify Seasonal Gaps'].map(label => (
                <button key={label} disabled className="text-xs px-3 py-1.5 border border-gray-100 rounded-lg text-portal-muted cursor-not-allowed flex items-center gap-1.5">
                  {label}
                  <span className="text-[10px] bg-gray-100 px-1.5 py-0.5 rounded font-medium">Soon</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

    </main>
  )
}
