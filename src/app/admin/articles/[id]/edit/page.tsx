'use client'

import { useState, useEffect, use } from 'react'
import Link from 'next/link'
import {
  ArrowLeft, Check, RefreshCw, Eye, ExternalLink,
  ChevronDown, ChevronUp, Search as SearchIcon,
  MoreVertical, Share2, Sparkles, AlertTriangle, Trash2, Send, EyeOff,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { RichArticleEditor } from '@/components/admin/RichArticleEditor'
import { COLUMNS, GUIDES, CONTENT_TOPICS, columnToVerticalRowSlug, columnsByVertical, findColumn } from '@/lib/content-taxonomy'
import { articleHref } from '@/lib/articles/slug'
import { MARKETS, siblingBrandsInFamily } from '@/lib/markets'
import { HeroImageUpload } from '@/components/admin/HeroImageUpload'
import { GalleryEditor, type GalleryImage } from '@/components/admin/GalleryEditor'
import { SpotlightSection } from '@/components/admin/SpotlightSection'
import { HelpTip, FieldHint, SectionHelp } from '@/components/admin/AdminHelp'
import { FeatureInHeroToggle } from '@/components/admin/FeatureInHeroToggle'
import { ContributorArticleLayout } from '@/components/articles/templates/ContributorArticleLayout'
import { TeacherOfMonthLayout } from '@/components/articles/templates/TeacherOfMonthLayout'
import { ArticleBody } from '@/components/articles/ArticleBody'
import Image from 'next/image'
import { getFallbackByContext } from '@/lib/image-fallbacks'
import { SPOTLIGHT_ENABLED_COLUMNS } from '@/lib/articles/spotlight-templates'

const CONTRIBUTOR_COLUMNS = ['mom-to-mom', 'grumpy-but-grateful', 'grands-greatest', 'dave-says', 'meeting-kids', 'teens-tweens-screens']

const VERTICAL_LABELS: Record<string, string> = {
  'school-zone':    'School Zone',
  'mom-knows-best': 'Mom Knows Best',
}

// Memoize the grouped section list — same on every render
const SECTION_GROUPS = columnsByVertical()

// ── Types & constants ─────────────────────────────────────────────────────────

interface Props { params: Promise<{ id: string }> }

type SaveMode = 'draft' | 'pending' | 'publish'
type Tab      = 'edit' | 'preview'

const SCHOOL_REGIONS = [
  { value: '',                    label: '— No region —'     },
  { value: 'montgomery-county',   label: 'Montgomery County' },
  { value: 'autauga-prattville',  label: 'Autauga & Elmore'  },
  { value: 'pike-road',           label: 'Pike Road'          },
  { value: 'private-schools',     label: 'Private Schools'    },
  { value: 'other',               label: 'Other / Unknown'    },
]

function slugify(text: string) {
  return text.toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 80)
}

// Extract "School region: X" from editorial_notes
function extractRegion(notes: string): string {
  const m = notes?.match(/School region:\s*([a-z-]+)/i)
  return m ? m[1].toLowerCase() : ''
}

// Merge/replace region entry in editorial_notes without wiping other content
function mergeRegion(notes: string, region: string): string {
  const base = (notes ?? '').replace(/School region:\s*[a-z-]+\n?/gi, '').trim()
  if (!region) return base
  return base ? `${base}\nSchool region: ${region}` : `School region: ${region}`
}

// Extract [homepage_hero] tag from editorial_notes
function extractHeroTag(notes: string): boolean {
  return /\[homepage_hero\]/i.test(notes ?? '')
}

// Add/remove [homepage_hero] tag in editorial_notes
function mergeHeroTag(notes: string, isHero: boolean): string {
  const base = (notes ?? '').replace(/\[homepage_hero\]\n?/gi, '').trim()
  if (!isHero) return base
  return base ? `${base}\n[homepage_hero]` : '[homepage_hero]'
}

// ── Article preview component ────────────────────────────────────────────────
// Renders the live editor state using the SAME layout components as the public
// page, so what an editor sees is what readers will see (no drift over time).

function ArticlePreview({
  title, subtitle, heroUrl, body, columnSlug, excerpt, authorByline, articleId,
}: {
  title: string
  subtitle: string
  heroUrl: string
  body: string
  columnSlug: string
  excerpt: string
  authorByline: string
  articleId: string
}) {
  const isTeacher     = columnSlug === 'teacher-of-month'
  const isContributor = CONTRIBUTOR_COLUMNS.includes(columnSlug)

  // Title fallback so the layout never renders blank during early typing
  const safeTitle    = title    || 'Untitled article'
  const safeAuthor   = authorByline || null
  const heroFallback = heroUrl  || getFallbackByContext(columnSlug || 'parenting', articleId)

  return (
    <div className="max-w-3xl mx-auto py-6 px-4">
      {/* Mimic the article page header (eyebrow + title + dek) so the preview
          matches the front-end's vertical rhythm, not just the body block. */}
      <div className="mb-6 pb-4 border-b border-portal-border">
        {columnSlug && (
          <p className="text-[11px] font-bold uppercase tracking-widest text-portal-blue mb-2">
            {columnSlug.replace(/-/g, ' ')}
          </p>
        )}
        <h1 className="text-3xl md:text-4xl font-black text-portal-text leading-tight mb-2">
          {safeTitle}
        </h1>
        {subtitle && !isContributor && (
          // For contributor previews the subtitle renders inline as the
          // italic lede inside ContributorArticleLayout — don't echo it here.
          <p className="text-lg text-portal-sub leading-relaxed">{subtitle}</p>
        )}
      </div>

      {isTeacher ? (
        <TeacherOfMonthLayout
          title={safeTitle}
          excerpt={excerpt}
          heroImageUrl={heroFallback}
          authorName={safeAuthor}
          publishedAt={null}
          body={body}
          pullQuotes={[]}
          articleId={articleId}
        />
      ) : isContributor ? (
        <ContributorArticleLayout
          title={safeTitle}
          subtitle={subtitle}
          heroImageUrl={heroFallback}
          authorName={safeAuthor}
          columnSlug={columnSlug}
          body={body}
          pullQuotes={[]}
          articleId={articleId}
        />
      ) : (
        <>
          {heroUrl && (
            <div className="relative w-full aspect-[3/2] md:aspect-[16/9] rounded-lg overflow-hidden mb-6 shadow-sm border border-portal-border">
              <Image
                src={heroUrl}
                alt={safeTitle}
                fill
                style={{ objectFit: 'cover', objectPosition: 'center top' }}
                sizes="(max-width: 1024px) 100vw, 66vw"
                unoptimized
              />
            </div>
          )}
          <ArticleBody body={body} pullQuotes={[]} />
        </>
      )}
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function ArticleEditPage({ params }: Props) {
  const { id } = use(params)
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [saving,  setSaving]  = useState(false)
  const [saveMsg, setSaveMsg] = useState<{ text: string; ok: boolean } | null>(null)
  const [tab, setTab] = useState<Tab>('edit')
  const [tipsOpen, setTipsOpen] = useState(false)

  // Notes that the user types in the textarea (without the region tag or hero tag)
  const [baseNotes, setBaseNotes]           = useState('')
  const [schoolRegion, setSchoolRegion]     = useState('')
  const [isHomepageHero, setIsHomepageHero] = useState(false)
  const [autoPostToSocial, setAutoPostToSocial] = useState(false)
  const [autoPostedAt, setAutoPostedAt] = useState<string | null>(null)
  const [queueNewsletter, setQueueNewsletter] = useState(false)
  const [newsletterDraftedAt, setNewsletterDraftedAt] = useState<string | null>(null)
  const [queueForPrint, setQueueForPrint] = useState(false)
  const [printIssueMonth, setPrintIssueMonth] = useState('')
  const [printQueuedAt, setPrintQueuedAt] = useState<string | null>(null)
  // Cross-cutting topic tags — controls which "Across the Site" rows this
  // article surfaces in (FRG Real Talk, Special Needs themes, etc.).
  // Stored as text[] on the row. Independent from guide_slug, which is the
  // article's primary home if any.
  const [topics, setTopics] = useState<string[]>([])

  // Multi-brand attribution (migration 161). brand_slug = origin (SEO +
  // canonical URL belong here). syndicated_to_brands = additional brands
  // that publish this article with rel=canonical back to the origin.
  const [brandSlug, setBrandSlug] = useState<string>('rrp')
  const [syndicatedTo, setSyndicatedTo] = useState<string[]>([])
  const [showCrossFamily, setShowCrossFamily] = useState(false)

  // SEO override fields — edited on /admin/articles/[id]/seo. Loaded here
  // so the Share Preview card can show what FB/LinkedIn will render.
  const [seoTitle,       setSeoTitle]       = useState<string>('')
  const [seoDescription, setSeoDescription] = useState<string>('')

  const [form, setForm] = useState({
    title: '', slug: '', author_byline: '', subtitle: '', excerpt: '',
    body: '', author_bio: '',  // author_bio = closing line that renders below the gallery
    hero_image_url: '', profile_image_url: '', column_slug: '', guide_slug: '',
    source_issue_month: '', author_blogger_id: '',
    published_at: '',  // YYYY-MM-DDTHH:mm in local time; empty means "auto-set on publish"
  })

  // Play Ball Spotlight — only relevant for column_slug = 'play-ball'.
  // spotlightType picks the template (athlete/coach/volunteer); spotlightData
  // is the JSONB blob keyed by template field key.
  const [spotlightType, setSpotlightType] = useState<string>('')
  const [spotlightData, setSpotlightData] = useState<Record<string, string>>({})

  // Photo gallery (migration 099) — array of { url, thumbnail_url, alt, caption }.
  // Rendered as a branded lightbox grid below the article body on the public site.
  const [galleryImages, setGalleryImages] = useState<GalleryImage[]>([])

  // Hero image original (migration 100) — private bucket path of the saved
  // raw upload. Enables the gravity picker on HeroImageUpload to re-crop
  // without re-uploading. Null for legacy heroes uploaded before this.
  const [heroOrigPath, setHeroOrigPath] = useState<string | null>(null)

  // Profile image original (migration 101) — same idea as heroOrigPath but
  // for the square avatar in the Community Spotlights sidebar.
  const [profileOrigPath, setProfileOrigPath] = useState<string | null>(null)

  // Bloggers list — loaded once, used by the Mom Knows Best blogger picker.
  const [bloggers, setBloggers] = useState<Array<{ id: string; slug: string; display_name: string }>>([])
  useEffect(() => {
    fetch('/api/admin/bloggers').then(r => r.json()).then(j => {
      if (j?.bloggers) setBloggers(j.bloggers)
    }).catch(() => { /* non-critical */ })
  }, [])

  // ── Load ────────────────────────────────────────────────────────────────────

  useEffect(() => {
    async function load() {
      const { data } = await supabase.from('guide_articles').select('*').eq('id', id).single()
      if (data) {
        const notes   = (data.editorial_notes as string | null) ?? ''
        const region  = extractRegion(notes)
        const hero    = extractHeroTag(notes)
        const cleaned = notes
          .replace(/School region:\s*[a-z-]+\n?/gi, '')
          .replace(/\[homepage_hero\]\n?/gi, '')
          .trim()

        setIsHomepageHero(hero)
        setAutoPostToSocial(!!data.auto_post_to_social)
        setAutoPostedAt(data.auto_posted_at ?? null)
        setQueueNewsletter(!!data.queue_newsletter_draft)
        setNewsletterDraftedAt(data.newsletter_drafted_at ?? null)
        setQueueForPrint(!!data.queue_for_print)
        setPrintIssueMonth(data.print_issue_month ?? '')
        setPrintQueuedAt(data.print_queued_at ?? null)

        // Convert stored UTC published_at → local <input type="datetime-local"> format
        const publishedAtLocal = data.published_at
          ? (() => {
              const d = new Date(data.published_at as string)
              const pad = (n: number) => String(n).padStart(2, '0')
              return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
            })()
          : ''

        setForm({
          title:              data.title           ?? '',
          slug:               data.slug            ?? '',
          author_byline:      data.author_byline   ?? data.author_name ?? '',
          subtitle:           data.subtitle        ?? '',
          excerpt:            data.excerpt         ?? '',
          body:               data.body            ?? '',
          author_bio:         data.author_bio      ?? '',
          hero_image_url:     data.hero_image_url  ?? '',
          profile_image_url:  data.profile_image_url ?? '',
          column_slug:        data.column_slug     ?? '',
          guide_slug:         data.guide_slug      ?? '',
          source_issue_month: data.source_issue_month ?? '',
          author_blogger_id:  data.author_blogger_id ?? '',
          published_at:       publishedAtLocal,
        })
        setBaseNotes(cleaned)
        setSchoolRegion(region)
        setTopics(Array.isArray(data.topics) ? data.topics as string[] : [])
        setBrandSlug((data.brand_slug as string) ?? 'rrp')
        setSyndicatedTo(Array.isArray(data.syndicated_to_brands) ? data.syndicated_to_brands as string[] : [])
        setSeoTitle      ((data.seo_title       as string | null) ?? '')
        setSeoDescription((data.seo_description as string | null) ?? '')
        // Spotlight (Play Ball Athlete / Coach / Volunteer)
        setSpotlightType((data.spotlight_type as string | null) ?? '')
        const sd = data.spotlight_data
        if (sd && typeof sd === 'object' && !Array.isArray(sd)) {
          const flat: Record<string, string> = {}
          for (const [k, v] of Object.entries(sd as Record<string, unknown>)) {
            flat[k] = v == null ? '' : String(v)
          }
          setSpotlightData(flat)
        } else {
          setSpotlightData({})
        }
        // Gallery — JSONB array. Filter out anything missing a URL so a bad
        // record can't crash the editor.
        const gi = data.gallery_images
        setGalleryImages(Array.isArray(gi)
          ? (gi as GalleryImage[]).filter(img => !!img && typeof img.url === 'string')
          : [])
        // Hero original — present only if the hero was uploaded after migration 100.
        setHeroOrigPath((data.hero_image_orig_path as string | null) ?? null)
        // Profile original — present only if the profile photo was uploaded after migration 101.
        setProfileOrigPath((data.profile_image_orig_path as string | null) ?? null)
      }
      setLoading(false)
    }
    load()
  }, [id]) // eslint-disable-line react-hooks/exhaustive-deps

  function setField<K extends keyof typeof form>(k: K, v: string) {
    setForm(f => ({ ...f, [k]: v }))
  }

  function handleTitle(title: string) {
    setForm(f => ({
      ...f,
      title,
      slug: f.slug === slugify(f.title) || !f.slug ? slugify(title) : f.slug,
    }))
  }

  function handleColumnChange(colSlug: string) {
    setForm(f => ({
      ...f,
      column_slug: colSlug,
      guide_slug:  colSlug && !f.guide_slug ? colSlug : f.guide_slug,
    }))
  }

  // ── Save ────────────────────────────────────────────────────────────────────

  async function save(mode: SaveMode) {
    if (!form.title.trim()) { setSaveMsg({ text: 'Title is required.', ok: false }); return }

    setSaving(true)
    setSaveMsg(null)

    const published    = mode === 'publish'
    const editStatus   = mode === 'draft' ? 'draft' : mode === 'publish' ? 'approved' : 'pending'

    // Date precedence:
    //  - If the operator set a date in the form, that wins (always saved).
    //  - Otherwise, on the publish action we auto-stamp "now".
    //  - Otherwise leave the existing value alone.
    const published_at = form.published_at.trim()
      ? new Date(form.published_at).toISOString()
      : (published ? new Date().toISOString() : undefined)

    const editorial_notes = mergeHeroTag(mergeRegion(baseNotes, schoolRegion), isHomepageHero) || null

    const payload: Record<string, unknown> = {
      title:                   form.title.trim(),
      slug:                    form.slug.trim(),
      author_byline:           form.author_byline.trim()      || null,
      author_name:             form.author_byline.trim()      || null,
      excerpt:                 form.excerpt.trim()            || null,
      subtitle:                form.subtitle.trim()           || null,
      body:                    form.body                      || null,
      body_format:             'html',
      author_bio:              form.author_bio.trim()         || null,
      hero_image_url:          form.hero_image_url.trim()     || null,
      profile_image_url:       form.profile_image_url.trim()  || null,
      column_slug:             form.column_slug               || null,
      guide_slug:              form.guide_slug                || form.column_slug || null,
      editorial_review_status: editStatus,
      published,
      editorial_notes,
      source_issue_month:      form.source_issue_month        || null,
      author_blogger_id:       form.author_blogger_id         || null,
      topics:                  topics.length > 0 ? topics : null,
      auto_post_to_social:     autoPostToSocial,
      queue_newsletter_draft:  queueNewsletter,
      queue_for_print:         queueForPrint,
      print_issue_month:       printIssueMonth.trim() || null,
      brand_slug:              brandSlug || 'rrp',
      syndicated_to_brands:    syndicatedTo,
    }
    if (published_at !== undefined) payload.published_at = published_at

    // Spotlight (Play Ball Athlete / Coach / Volunteer)
    // Only persist when type is set; otherwise null both fields so the
    // public render stays default.
    if (spotlightType) {
      payload.spotlight_type = spotlightType
      const cleaned: Record<string, string> = {}
      for (const [k, v] of Object.entries(spotlightData)) {
        if (v && v.trim()) cleaned[k] = v.trim()
      }
      payload.spotlight_data = cleaned
    } else {
      payload.spotlight_type = null
      payload.spotlight_data = {}
    }

    // Photo gallery — always persist (an empty array clears prior images).
    // Strip any rows still missing a URL just in case.
    payload.gallery_images = galleryImages.filter(img => !!img?.url)

    // Hero image original path — persist whenever it changed so the gravity
    // picker has a stable source. Set on fresh uploads, cleared on remove.
    payload.hero_image_orig_path    = heroOrigPath
    payload.profile_image_orig_path = profileOrigPath

    try {
      const res = await fetch(`/api/admin/articles/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const json = await res.json().catch(() => ({}))

      if (!res.ok) {
        setSaveMsg({ text: json.error ?? `Error ${res.status}`, ok: false })
        return
      }

      const label = mode === 'draft' ? 'Draft saved' : mode === 'pending' ? 'Sent to review' : 'Published!'
      setSaveMsg({ text: `✓ ${label}`, ok: true })
      setTimeout(() => setSaveMsg(null), 4000)
    } catch (e) {
      setSaveMsg({ text: e instanceof Error ? e.message : 'Network error', ok: false })
    } finally {
      setSaving(false)
    }
  }

  // ── Field helpers ────────────────────────────────────────────────────────────

  const inp = 'w-full px-3 py-2 text-sm rounded-lg border border-portal-border outline-none focus:border-portal-blue bg-white'
  const sel = `${inp} cursor-pointer`

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="flex-1 flex flex-col overflow-hidden">

      {/* ── Sticky top bar ── */}
      <div className="bg-white border-b border-portal-border px-4 py-3 flex items-center justify-between shrink-0 z-20">
        <div className="flex items-center gap-3">
          <Link href="/admin/articles/review" className="text-sm text-portal-blue hover:text-portal-blue flex items-center gap-1 whitespace-nowrap">
            <ArrowLeft size={13} /> Review Queue
          </Link>
          <span className="text-portal-border-2">/</span>
          <Link href="/admin/articles" className="text-sm text-portal-blue hover:text-portal-blue hidden sm:block">All Articles</Link>
          <h1 className="text-sm font-semibold text-portal-text truncate max-w-xs hidden md:block">
            {form.title || 'Edit Article'}
          </h1>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {saveMsg && (
            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${saveMsg.ok ? 'bg-portal-green-lt text-portal-green' : 'bg-portal-red-lt text-portal-red'}`}>
              {saveMsg.text}
            </span>
          )}
          <Link
            href={`/admin/articles/${id}/seo`}
            title="Edit SEO + social sharing"
            className="hidden sm:flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold border border-portal-border-2 rounded-lg text-portal-sub hover:bg-portal-bg"
          >
            <Sparkles size={12} /> SEO
          </Link>
          <Link
            href={`/admin/articles/${id}/insights`}
            title="Search Console insights"
            className="hidden sm:flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold border border-portal-border-2 rounded-lg text-portal-sub hover:bg-portal-bg"
          >
            <SearchIcon size={12} /> Insights
          </Link>
          <button onClick={() => save('draft')} disabled={saving || loading}
            className="hidden sm:block px-3 py-1.5 text-xs font-semibold border border-portal-border-2 rounded-lg text-portal-sub hover:bg-portal-bg disabled:opacity-40">
            Save Draft
          </button>
          <button onClick={() => save('publish')} disabled={saving || loading}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-portal-green text-white rounded-lg hover:bg-portal-green disabled:opacity-40">
            {saving ? <RefreshCw size={12} className="animate-spin" /> : <Check size={12} />}
            Publish
          </button>

          {/* ── More actions menu (Send to Review, Preview, Unpublish, Move to Trash) ── */}
          <MoreActionsMenu
            articleId={id}
            slug={form.slug}
            title={form.title}
            columnSlug={form.column_slug}
            isPublished={!!form.published_at}
            disabled={saving || loading}
            onSendToReview={() => save('pending')}
            onUnpublish={async () => {
              setSaving(true)
              try {
                const res = await fetch(`/api/admin/articles/${id}`, {
                  method: 'PATCH',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ published: false, editorial_review_status: 'draft' }),
                })
                if (!res.ok) {
                  const j = await res.json().catch(() => ({}))
                  setSaveMsg({ text: j.error ?? `Error ${res.status}`, ok: false })
                } else {
                  setSaveMsg({ text: '✓ Unpublished — now in draft', ok: true })
                  setTimeout(() => setSaveMsg(null), 4000)
                }
              } finally { setSaving(false) }
            }}
            onMoveToTrash={async () => {
              if (!confirm('Move this article to Trash? You can restore it from /admin/articles/trash.')) return
              setSaving(true)
              try {
                const res = await fetch(`/api/admin/articles/${id}`, { method: 'DELETE' })
                if (!res.ok) {
                  const j = await res.json().catch(() => ({}))
                  setSaveMsg({ text: j.error ?? `Error ${res.status}`, ok: false })
                  return
                }
                window.location.href = '/admin/articles'
              } finally { setSaving(false) }
            }}
          />
        </div>
      </div>

      {/* ── Two-column workspace ── */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-[1fr_288px] overflow-hidden">

        {/* ── Left: main writing area ── */}
        <div className="overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-64 text-portal-muted text-sm">Loading article…</div>
          ) : (
            <div className="p-6 space-y-5 max-w-3xl">

              {/* Title */}
              <div>
                <input
                  className="w-full text-2xl font-bold text-portal-text outline-none placeholder:text-portal-border-2 border-0 border-b-2 border-portal-border focus:border-portal-blue bg-transparent py-2 transition-colors"
                  value={form.title}
                  onChange={e => handleTitle(e.target.value)}
                  placeholder="Article title…"
                />
                <div className="flex items-center gap-1.5 mt-1">
                  <span className="text-[11px] text-portal-muted">URL:</span>
                  <input
                    className="flex-1 text-[11px] text-portal-muted outline-none bg-transparent border-b border-transparent focus:border-portal-border-2 py-0.5"
                    value={form.slug}
                    onChange={e => setField('slug', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-'))}
                    placeholder="auto-generated"
                  />
                </div>
              </div>

              {/* Article Lead — magazine-style deck shown on the article
                   page under the title. NOT used as the card teaser
                   (that's the Card Hook field in the right sidebar). */}
              <div>
                <textarea
                  className="w-full text-base text-portal-sub outline-none placeholder:text-portal-border-2 border-0 border-b border-portal-border focus:border-portal-border-2 bg-transparent resize-none py-1.5 leading-relaxed transition-colors"
                  rows={2}
                  value={form.subtitle}
                  onChange={e => setField('subtitle', e.target.value)}
                  placeholder="Article Lead — shown on the article page below the title…"
                />
              </div>

              {/* Body — Edit / Preview tabs */}
              <div>
                <div className="flex items-center gap-0 mb-3 border-b border-portal-border">
                  {(['edit', 'preview'] as Tab[]).map(t => (
                    <button
                      key={t}
                      onClick={() => setTab(t)}
                      className={[
                        'px-4 py-2 text-sm font-semibold border-b-2 -mb-px transition-colors capitalize',
                        tab === t
                          ? 'border-portal-blue text-portal-blue'
                          : 'border-transparent text-portal-muted hover:text-portal-text',
                      ].join(' ')}
                    >
                      {t === 'edit' ? 'Edit' : <span className="flex items-center gap-1.5"><Eye size={13} /> Preview</span>}
                    </button>
                  ))}
                  <div className="ml-auto pb-2">
                    <span className="text-[10px] text-portal-muted">Ctrl+B bold · Ctrl+I italic</span>
                  </div>
                </div>

                {tab === 'edit' ? (
                  <RichArticleEditor
                    key={id}
                    initialContent={form.body}
                    onChange={html => setField('body', html)}
                    placeholder="Start writing… Use H2 for section headings, bold for names, blockquote for standout quotes."
                    onSetHero={url => setField('hero_image_url', url)}
                  />
                ) : (
                  <div className="border border-portal-border rounded-lg bg-white min-h-[500px] overflow-auto">
                    {!form.title && !form.body ? (
                      <div className="flex items-center justify-center h-64 text-portal-muted text-sm">
                        Nothing to preview yet. Start writing in the Edit tab.
                      </div>
                    ) : (
                      <ArticlePreview
                        title={form.title}
                        subtitle={form.subtitle}
                        heroUrl={form.hero_image_url}
                        body={form.body}
                        columnSlug={form.column_slug}
                        excerpt={form.excerpt}
                        authorByline={form.author_byline}
                        articleId={id}
                      />
                    )}
                  </div>
                )}
              </div>

              {/* Closing bio / author line — renders below the photo gallery
                  on the public article as a thin divider + italic text.
                  No title shown, only the text. Skip when empty. */}
              <div className="border border-portal-border rounded-lg overflow-hidden bg-white">
                <div className="px-4 py-3 border-b border-portal-border">
                  <p className="text-xs font-bold text-portal-sub uppercase tracking-wider">Closing line — bio or author note</p>
                  <p className="text-[11px] text-portal-muted mt-0.5">
                    Renders as a simple italic line under the photo gallery. Example: &quot;Phyllis Palmer resides in Sturbridge with her husband Markus, Sr. They&apos;re raising two boys.&quot;
                  </p>
                </div>
                <textarea
                  className="w-full px-4 py-3 text-sm leading-relaxed outline-none resize-none"
                  rows={3}
                  value={form.author_bio}
                  onChange={e => setField('author_bio', e.target.value)}
                  placeholder="Add a short closing line about the subject or the writer. Leave blank to hide."
                />
              </div>

              {/* Formatting tips */}
              <div className="border border-portal-border rounded-lg overflow-hidden">
                <button
                  onClick={() => setTipsOpen(v => !v)}
                  className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold text-portal-sub hover:bg-portal-bg transition-colors"
                >
                  <span>💡 Formatting Tips</span>
                  {tipsOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>
                {tipsOpen && (
                  <div className="px-4 pb-4 pt-1 space-y-2 text-xs text-portal-sub bg-portal-bg border-t border-portal-border">
                    {[
                      ['H2', 'Use H2 (##) for section headings like "About the School" or "Why We\'re Proud"'],
                      ['Bold', 'Bold student and teacher names on first mention'],
                      ['"', 'Use Blockquote (the " button) for standout pull quotes'],
                      ['Image', 'Insert images with the 🖼 button — add alt text for accessibility'],
                      ['Caption', 'Captions appear below images in italic — use for photo credits'],
                    ].map(([label, tip]) => (
                      <div key={label} className="flex gap-2.5">
                        <span className="shrink-0 font-bold text-portal-text w-12">{label}</span>
                        <span className="leading-relaxed">{tip}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>
          )}
        </div>

        {/* ── Right: metadata sidebar ── */}
        <div className="border-l border-portal-border bg-white overflow-y-auto">
          <div className="p-4 space-y-4">

            {/* ── Share Preview card (replaces the old Publish status +
                 Danger Zone cards — those moved to the top-bar ⋮ menu) ── */}
            <SharePreviewCard
              articleId={id}
              shareTitle={(seoTitle.trim() || form.title)}
              shareDescription={(seoDescription.trim() || form.excerpt)}
              shareImageUrl={form.hero_image_url || null}
              hasSeoOverrides={!!seoTitle.trim() && !!seoDescription.trim()}
            />

            {/* ── Feature on Homepage ── */}
            <div className="border border-portal-blue/30 rounded-lg overflow-hidden">
              <div className="bg-portal-blue-lt px-3 py-2 border-b border-portal-blue/20">
                <p className="text-[11px] font-bold text-portal-blue uppercase tracking-wider">Homepage</p>
              </div>
              <label className="flex items-start gap-3 p-3 cursor-pointer hover:bg-portal-blue-lt/60 transition-colors">
                <input
                  type="checkbox"
                  checked={isHomepageHero}
                  onChange={e => setIsHomepageHero(e.target.checked)}
                  className="w-4 h-4 mt-0.5 rounded text-portal-blue cursor-pointer"
                />
                <div>
                  <p className="text-sm font-semibold text-portal-text leading-tight">Feature on Homepage</p>
                  <p className="text-xs text-portal-muted mt-0.5 leading-snug">
                    Sets this as the homepage hero story. Only one article should be featured at a time.
                  </p>
                </div>
              </label>
              <label className="flex items-start gap-3 p-3 cursor-pointer hover:bg-portal-blue-lt/60 transition-colors border-t border-portal-blue/20">
                <input
                  type="checkbox"
                  checked={autoPostToSocial}
                  onChange={e => setAutoPostToSocial(e.target.checked)}
                  disabled={!!autoPostedAt}
                  className="w-4 h-4 mt-0.5 rounded text-portal-blue cursor-pointer disabled:opacity-50"
                />
                <div>
                  <p className="text-sm font-semibold text-portal-text leading-tight">Auto-post to Facebook + Instagram on publish</p>
                  <p className="text-xs text-portal-muted mt-0.5 leading-snug">
                    {autoPostedAt
                      ? `Posted ${new Date(autoPostedAt).toLocaleString()}. Re-saving won't re-fire.`
                      : 'AI writes a caption using the brand voice + posts to your connected Page. IG cross-posts when a hero image is set.'}
                  </p>
                </div>
              </label>
              <label className="flex items-start gap-3 p-3 cursor-pointer hover:bg-portal-blue-lt/60 transition-colors border-t border-portal-blue/20">
                <input
                  type="checkbox"
                  checked={queueNewsletter}
                  onChange={e => setQueueNewsletter(e.target.checked)}
                  disabled={!!newsletterDraftedAt}
                  className="w-4 h-4 mt-0.5 rounded text-portal-blue cursor-pointer disabled:opacity-50"
                />
                <div>
                  <p className="text-sm font-semibold text-portal-text leading-tight">Queue GHL newsletter draft on publish</p>
                  <p className="text-xs text-portal-muted mt-0.5 leading-snug">
                    {newsletterDraftedAt
                      ? `Drafted ${new Date(newsletterDraftedAt).toLocaleString()}. View at /admin/distribution. Re-saving won't re-fire.`
                      : 'AI writes a brand-voiced subject line + 150-250 word body + CTA. Editor copies into GHL or the brand newsletter workflow picks it up.'}
                  </p>
                </div>
              </label>
              <label className="flex items-start gap-3 p-3 cursor-pointer hover:bg-portal-blue-lt/60 transition-colors border-t border-portal-blue/20">
                <input
                  type="checkbox"
                  checked={queueForPrint}
                  onChange={e => setQueueForPrint(e.target.checked)}
                  disabled={!!printQueuedAt}
                  className="w-4 h-4 mt-0.5 rounded text-portal-blue cursor-pointer disabled:opacity-50"
                />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-portal-text leading-tight">Queue for print on publish</p>
                  <p className="text-xs text-portal-muted mt-0.5 leading-snug">
                    {printQueuedAt
                      ? `Queued ${new Date(printQueuedAt).toLocaleString()} for ${printIssueMonth || '(no issue)'}. Re-saving won't re-fire.`
                      : 'Logs the article into the print queue at /admin/distribution-log. Designers pull by issue.'}
                  </p>
                  {queueForPrint && !printQueuedAt && (
                    <div className="mt-2 flex items-center gap-2">
                      <label className="text-[11px] text-portal-muted">Issue:</label>
                      <input
                        type="month"
                        value={printIssueMonth}
                        onChange={e => setPrintIssueMonth(e.target.value)}
                        className="text-xs px-2 py-1 border border-portal-border rounded bg-white"
                      />
                    </div>
                  )}
                </div>
              </label>
            </div>

            {/* ── Brand attribution (multi-brand publishing) ── */}
            <div className="bg-portal-blue-lt/40 border border-portal-blue/30 rounded-lg p-3 space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-portal-blue uppercase tracking-wider mb-1.5">Brand (origin)</label>
                <select
                  className={sel}
                  value={brandSlug}
                  onChange={e => {
                    setBrandSlug(e.target.value)
                    // Drop any cross-brand syndication that just became
                    // cross-family after the origin change, unless the
                    // editor has the override expanded.
                    if (!showCrossFamily) {
                      const sameFamily = new Set(siblingBrandsInFamily(e.target.value).map(b => b.slug))
                      setSyndicatedTo(prev => prev.filter(s => sameFamily.has(s)))
                    }
                  }}
                >
                  {MARKETS.map(m => (
                    <option key={m.slug} value={m.slug}>{m.displayName} ({m.short})</option>
                  ))}
                </select>
                <p className="text-[10px] text-portal-muted mt-1 leading-snug">
                  The brand that owns this article. SEO + rel=canonical point here.
                </p>
              </div>

              <div>
                <div className="flex items-baseline justify-between mb-1.5">
                  <label className="block text-[11px] font-bold text-portal-blue uppercase tracking-wider">Cross-publish to</label>
                  <button
                    type="button"
                    onClick={() => setShowCrossFamily(s => !s)}
                    className="text-[10px] text-portal-blue hover:text-portal-blue-dk underline"
                  >
                    {showCrossFamily ? 'Show same family only' : 'Show all brands'}
                  </button>
                </div>
                {(() => {
                  const family = MARKETS.find(m => m.slug === brandSlug)?.family
                  const candidates = showCrossFamily
                    ? MARKETS.filter(m => m.slug !== brandSlug)
                    : siblingBrandsInFamily(brandSlug)
                  if (candidates.length === 0) {
                    return <p className="text-[11px] text-portal-muted">No siblings in this brand&apos;s family.</p>
                  }
                  return (
                    <div className="flex flex-wrap gap-1.5">
                      {candidates.map(m => {
                        const on = syndicatedTo.includes(m.slug)
                        const crossFamily = m.family !== family
                        return (
                          <button
                            key={m.slug}
                            type="button"
                            onClick={() => setSyndicatedTo(prev =>
                              on ? prev.filter(s => s !== m.slug) : [...prev, m.slug]
                            )}
                            className={`text-[11px] font-bold px-2 py-1 rounded-full border transition-colors ${
                              on
                                ? 'bg-portal-blue text-white border-portal-blue'
                                : 'bg-white text-portal-text border-portal-border hover:border-portal-blue'
                            }`}
                            title={crossFamily ? `Cross-family — ${m.family}` : `Same family — ${m.family}`}
                          >
                            {m.short}{crossFamily ? ' ⚠' : ''}
                          </button>
                        )
                      })}
                    </div>
                  )
                })()}
                <p className="text-[10px] text-portal-muted mt-1 leading-snug">
                  Additional brands that show this article (with rel=canonical pointing to the origin).
                  Cross-family picks are marked with ⚠ — usually a mistake unless you mean it.
                </p>
              </div>
            </div>

            {/* ── Feature on 50+ home page slider (fifty-plus brands only) ── */}
            <FeatureInHeroToggle articleId={id} brandSlug={brandSlug} />

            {/* ── Author ── */}
            <div>
              <label className="block text-[11px] font-bold text-portal-sub uppercase tracking-wider mb-1.5">Author</label>
              <input className={inp} value={form.author_byline} onChange={e => setField('author_byline', e.target.value)} placeholder="Author name or byline" />
            </div>

            {/* ── Published date ── */}
            <div>
              <div className="flex items-baseline justify-between mb-1.5">
                <label className="block text-[11px] font-bold text-portal-sub uppercase tracking-wider">Published Date</label>
                {form.published_at && (
                  <button
                    type="button"
                    onClick={() => setField('published_at', '')}
                    className="text-[10px] text-portal-muted hover:text-portal-sub underline"
                  >
                    clear
                  </button>
                )}
              </div>
              <input
                type="datetime-local"
                className={inp}
                value={form.published_at}
                onChange={e => setField('published_at', e.target.value)}
              />
              <p className="text-[11px] text-portal-muted mt-1">
                Drives the date shown on the article and the order in "Latest Stories" listings.
                Back-date a late-published piece to slot it where it belongs, or post-date to schedule
                it ahead. Leave blank to auto-stamp the current time when you click Publish.
              </p>
            </div>

            {/* ── Card Hook (DB column: excerpt) ── */}
            <div>
              <div className="flex items-baseline justify-between mb-1.5">
                <label className="block text-[11px] font-bold text-portal-sub uppercase tracking-wider">Card Hook</label>
                <span className={`text-[10px] font-mono ${form.excerpt.length > 160 ? 'text-portal-amber' : 'text-portal-muted'}`}>
                  {form.excerpt.length} / 160
                </span>
              </div>
              <textarea
                className={`${inp} resize-none`}
                rows={3}
                value={form.excerpt}
                onChange={e => setField('excerpt', e.target.value)}
                placeholder="Why should someone click? 1–2 sentences. Different from the Article Lead."
                maxLength={300}
              />
              <p className="text-[11px] text-portal-muted mt-1">
                Sales copy for listing cards — homepage hero, FRG rows, search snippets.
                Shorter and punchier than the Article Lead (which lives on the article page itself).
                Leave blank to show no teaser.
              </p>
            </div>

            {/* ── Hero image ── */}
            <div>
              <label className="block text-[11px] font-bold text-portal-sub uppercase tracking-wider mb-1.5">Hero Image</label>
              <HeroImageUpload
                value={form.hero_image_url}
                onChange={url => setField('hero_image_url', url)}
                context="article-hero"
                articleId={id as string}
                origPath={heroOrigPath}
                onOrigPathChange={setHeroOrigPath}
              />
              <p className="text-[11px] text-portal-muted mt-1">
                Wide format (cropped to 16:9). Sharp picks the focal point automatically — use the compass buttons to nudge it.
                Big files (phone photos) are auto-resized in the browser before upload.
              </p>
            </div>

            {/* ── Profile image (small) ── */}
            <div>
              <label className="block text-[11px] font-bold text-portal-sub uppercase tracking-wider mb-1.5">Profile Image</label>
              <HeroImageUpload
                value={form.profile_image_url}
                onChange={url => setField('profile_image_url', url)}
                context="article-profile"
                articleId={id as string}
                origPath={profileOrigPath}
                onOrigPathChange={setProfileOrigPath}
              />
              <p className="text-[11px] text-portal-muted mt-1">
                Square (cropped to 1:1) for the homepage Community Spotlights sidebar.
                Sharp picks the focal point automatically — use the compass to nudge it.
                Falls back to the hero image when empty.
              </p>
            </div>

            {/* ── Photo Gallery (migration 099) ──
                 Multi-image set rendered as a branded lightbox grid below
                 the article body. Mirrors what the print magazine does with
                 the photo strip at the bottom of Play Ball and feature stories. */}
            <div>
              <label className="block text-[11px] font-bold text-portal-sub uppercase tracking-wider mb-1.5">
                Photo Gallery
                <span className="ml-1.5 text-portal-muted font-normal normal-case">— supporting photos for the lightbox</span>
              </label>
              <GalleryEditor
                value={galleryImages}
                onChange={setGalleryImages}
              />
            </div>

            {/* ── How this article gets placed ── */}
            <SectionHelp variant="info" title="Where will this article appear?">
              Three fields work together: <strong>Section</strong> = which editorial
              column it belongs to. <strong>Guide / Resource</strong> = which Guide
              landing page it shows up on (if any). <strong>Issue Month</strong> = the
              print issue this is from (optional).
            </SectionHelp>

            {/* ── Section (column_slug) ── */}
            <div>
              <label className="flex items-center gap-1.5 text-[11px] font-bold text-portal-sub uppercase tracking-wider mb-1.5">
                Section
                <HelpTip text="The editorial column this article belongs to. Pick the one that matches the kind of piece you're writing — the description below shows where it surfaces on the public site." />
              </label>
              <select className={sel} value={form.column_slug} onChange={e => handleColumnChange(e.target.value)}>
                <option value="">— Choose a section —</option>
                {SECTION_GROUPS.map(group => (
                  <optgroup key={group.vertical.slug} label={group.vertical.label}>
                    {group.columns.map(c => (
                      <option key={c.slug} value={c.slug}>{c.label}</option>
                    ))}
                  </optgroup>
                ))}
              </select>

              {(() => {
                const col = findColumn(form.column_slug)
                if (!col) {
                  return (
                    <FieldHint className="mt-1.5">
                      Sections are grouped by vertical (School Zone, Mom Life, etc.).
                      Pick the one that best matches the article — the description will
                      tell you exactly where it&apos;ll appear.
                    </FieldHint>
                  )
                }
                const v        = columnToVerticalRowSlug(form.column_slug)
                const vLabel   = v ? (VERTICAL_LABELS[v] ?? v) : null
                return (
                  <div className="mt-1.5 px-3 py-2 rounded-lg bg-portal-blue-lt/50 border border-portal-blue/20 space-y-1">
                    {col.description && (
                      <p className="text-[12px] text-portal-text leading-relaxed">{col.description}</p>
                    )}
                    {vLabel && (
                      <p className="text-[11px] text-portal-sub">
                        Surfaces on the <strong className="text-portal-text">{vLabel}</strong> vertical page
                        + any &quot;Related from {vLabel}&quot; blocks.
                      </p>
                    )}
                  </div>
                )
              })()}
            </div>

            {/* ── Blogger (only when column is Mom Knows Best) ── */}
            {form.column_slug === 'mom-knows-best' && (
              <div>
                <label className="block text-[11px] font-bold text-portal-sub uppercase tracking-wider mb-1.5">Blogger</label>
                <select className={sel} value={form.author_blogger_id} onChange={e => setField('author_blogger_id', e.target.value)}>
                  <option value="">— Choose a blogger —</option>
                  {bloggers.map(b => <option key={b.id} value={b.id}>{b.display_name}</option>)}
                </select>
                <p className="text-[11px] text-portal-muted mt-1">
                  Required for Mom Knows Best posts so they link to her profile.
                  Manage bloggers at <a href="/admin/bloggers" className="text-portal-blue hover:underline">/admin/bloggers</a>.
                </p>
              </div>
            )}

            {/* ── Spotlight section ──
                Surfaces for any column that opts into the spotlight system
                (Play Ball / Teacher of the Month / Mom to Mom). The type
                dropdown filters its options by column so editors only see
                relevant choices. */}
            {SPOTLIGHT_ENABLED_COLUMNS.includes(form.column_slug) && (
              <SpotlightSection
                columnSlug={form.column_slug}
                spotlightType={spotlightType}
                spotlightData={spotlightData}
                onTypeChange={setSpotlightType}
                onDataChange={setSpotlightData}
              />
            )}

            {/* ── Guide (guide_slug) ── */}
            <div>
              <label className="flex items-center gap-1.5 text-[11px] font-bold text-portal-sub uppercase tracking-wider mb-1.5">
                Guide / Resource
                <HelpTip text="If this article belongs to a specific guide (Family Resource, Summer Fun, Summer Camp, etc.), pick it here. The article appears on that guide's landing page in the Editorial Highlights section. Leave as 'Not a guide article' for standalone pieces." />
              </label>
              <select className={sel} value={form.guide_slug} onChange={e => setField('guide_slug', e.target.value)}>
                <option value="">— Not a guide article —</option>
                {GUIDES.map(g => <option key={g.slug} value={g.slug}>{g.label}</option>)}
              </select>
              <FieldHint className="mt-1.5">
                Optional. Pick a guide only if this article should appear on that
                guide&apos;s landing page (e.g. a swim-camp article on the Summer Camp Guide).
              </FieldHint>
            </div>

            {/* ── Topics — cross-cutting theme tags ──
                 Distinct from Guide / Resource above. Guide = "Did we write
                 this FOR a guide?" (one primary home). Topics = "What
                 themes does this touch?" (many cross-cutting tags). Each
                 guide's "Across the Site" row reads from these. */}
            <div>
              <label className="flex items-center gap-1.5 text-[11px] font-bold text-portal-sub uppercase tracking-wider mb-1.5">
                Topics
                <HelpTip text="Cross-cutting theme tags. Different from Guide above — Guide is the article's PRIMARY home (write FOR a guide). Topics decide which guide pages ALSO surface this piece in their 'Across the Site' rows. Tag liberally for essays; leave blank for narrow service guides that only belong on one page." />
              </label>
              <p className="text-[11px] text-portal-sub leading-snug mb-2">
                Decision: <strong>Guide</strong> = one primary home (the magazine wrote it for that guide).
                <strong> Topics</strong> = themes that let it cross-promote elsewhere.
              </p>
              <div className="space-y-2">
                {CONTENT_TOPICS.map(t => {
                  const checked = topics.includes(t.slug)
                  return (
                    <label key={t.slug} className="flex items-start gap-2 cursor-pointer group">
                      <input
                        type="checkbox"
                        className="mt-0.5"
                        checked={checked}
                        onChange={() => {
                          setTopics(prev =>
                            prev.includes(t.slug)
                              ? prev.filter(s => s !== t.slug)
                              : [...prev, t.slug]
                          )
                        }}
                      />
                      <span className="min-w-0">
                        <span className="block text-sm font-semibold text-portal-text group-hover:text-portal-text">
                          {t.label}
                        </span>
                        <span className="block text-[11px] text-portal-muted leading-snug">
                          {t.description}
                        </span>
                      </span>
                    </label>
                  )
                })}
              </div>
            </div>

            {/* ── School region (only shown for school-bits) ── */}
            {(form.column_slug === 'school-bits' || schoolRegion) && (
              <div>
                <label className="block text-[11px] font-bold text-portal-sub uppercase tracking-wider mb-1.5">School Region</label>
                <select className={sel} value={schoolRegion} onChange={e => setSchoolRegion(e.target.value)}>
                  {SCHOOL_REGIONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
                <p className="text-[11px] text-portal-muted mt-1">Stored in editorial notes. Powers the regional filter on /school-bits.</p>
              </div>
            )}

            {/* ── Issue month ── */}
            <div>
              <label className="block text-[11px] font-bold text-portal-sub uppercase tracking-wider mb-1.5">Issue Month</label>
              <input
                type="month"
                className={inp}
                value={form.source_issue_month ? form.source_issue_month.slice(0, 7) : ''}
                onChange={e => setField('source_issue_month', e.target.value ? `${e.target.value}-01` : '')}
              />
            </div>

            {/* ── Editorial notes ── */}
            <div>
              <label className="block text-[11px] font-bold text-portal-sub uppercase tracking-wider mb-1.5">Editorial Notes</label>
              <textarea
                className={`${inp} resize-none`}
                rows={3}
                value={baseNotes}
                onChange={e => setBaseNotes(e.target.value)}
                placeholder="Internal notes — not shown publicly"
              />
              {schoolRegion && (
                <p className="text-[10px] text-portal-muted mt-1 italic">Region tag will be appended automatically on save.</p>
              )}
            </div>

          </div>
        </div>

      </div>
    </div>
  )
}


// SpotlightSection is now in @/components/admin/SpotlightSection so /new
// and /edit can both use it. The About-card bio field was removed when the
// closing About card was retired from the public article surface.


// ── MoreActionsMenu ────────────────────────────────────────────────────
//
// Top-bar overflow menu. Collects every secondary action that used to
// live in the right-sidebar Publish status card + Danger Zone. Click
// outside to close.

function MoreActionsMenu({
  articleId, slug, title, columnSlug, isPublished, disabled,
  onSendToReview, onUnpublish, onMoveToTrash,
}: {
  articleId:      string
  slug:           string
  title:          string
  columnSlug:     string
  isPublished:    boolean
  disabled:       boolean
  onSendToReview: () => void
  onUnpublish:    () => void
  onMoveToTrash:  () => void
}) {
  const [open, setOpen] = useState(false)
  useEffect(() => {
    if (!open) return
    function close(e: MouseEvent) {
      const target = e.target as HTMLElement
      if (!target.closest('[data-more-actions]')) setOpen(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [open])

  const previewHref = slug ? articleHref({ slug, title, column_slug: columnSlug }) : null

  return (
    <div className="relative" data-more-actions>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        disabled={disabled}
        className="flex items-center px-2 py-1.5 text-xs font-semibold border border-portal-border-2 rounded-lg text-portal-sub hover:bg-portal-bg disabled:opacity-40"
        title="More actions"
      >
        <MoreVertical size={14} />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 w-56 bg-white border border-portal-border rounded-lg shadow-lg overflow-hidden z-30">
          <MenuItem onClick={() => { setOpen(false); onSendToReview() }} icon={<Send size={13} />}>
            Send to Review
          </MenuItem>
          {previewHref && (
            <Link
              href={previewHref}
              target="_blank"
              onClick={() => setOpen(false)}
              className="w-full px-3 py-2 text-left text-xs font-semibold text-portal-text hover:bg-portal-bg flex items-center gap-2"
            >
              <ExternalLink size={13} className="text-portal-sub" /> Preview Public Page
            </Link>
          )}
          <Link
            href={`/admin/articles/${articleId}/seo`}
            onClick={() => setOpen(false)}
            className="w-full px-3 py-2 text-left text-xs font-semibold text-portal-text hover:bg-portal-bg flex items-center gap-2"
          >
            <Share2 size={13} className="text-portal-sub" /> Edit social sharing copy
          </Link>
          <div className="border-t border-portal-border my-1" />
          {isPublished && (
            <MenuItem onClick={() => { setOpen(false); onUnpublish() }} icon={<EyeOff size={13} />}>
              Unpublish
            </MenuItem>
          )}
          <MenuItem
            onClick={() => { setOpen(false); onMoveToTrash() }}
            icon={<Trash2 size={13} />}
            danger
          >
            Move to Trash
          </MenuItem>
        </div>
      )}
    </div>
  )
}

function MenuItem({
  onClick, icon, children, danger,
}: {
  onClick:  () => void
  icon:     React.ReactNode
  children: React.ReactNode
  danger?:  boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full px-3 py-2 text-left text-xs font-semibold flex items-center gap-2 hover:bg-portal-bg ${
        danger ? 'text-portal-red hover:bg-portal-red-lt' : 'text-portal-text'
      }`}
    >
      <span className={danger ? '' : 'text-portal-sub'}>{icon}</span>
      {children}
    </button>
  )
}


// ── SharePreviewCard ─────────────────────────────────────────────────
//
// Sidebar card showing the OG share preview (what FB/IG/LinkedIn will
// render when this article is shared). Reads seo_title + seo_description
// + hero image. Links to the full SEO editor for editing.

function SharePreviewCard({
  articleId,
  shareTitle, shareDescription, shareImageUrl,
  hasSeoOverrides,
}: {
  articleId:         string
  shareTitle:        string
  shareDescription:  string
  shareImageUrl:     string | null
  hasSeoOverrides:   boolean
}) {
  return (
    <div className="border border-portal-border rounded-lg overflow-hidden">
      <div className="bg-portal-bg px-3 py-2 border-b border-portal-border flex items-center justify-between">
        <p className="text-[11px] font-bold text-portal-sub uppercase tracking-wider">Share preview</p>
        <Link
          href={`/admin/articles/${articleId}/seo`}
          className="text-[10px] font-bold text-portal-blue hover:underline"
        >
          Edit copy →
        </Link>
      </div>
      <div className="p-3">
        {!hasSeoOverrides && (
          <div className="mb-2 px-2 py-1.5 bg-portal-amber-lt text-portal-amber text-[10px] rounded">
            Using defaults (title + excerpt). Click Edit copy to write social-optimized text.
          </div>
        )}
        {/* Facebook / LinkedIn card preview (1.91:1 ratio) */}
        <div className="border border-portal-border rounded overflow-hidden">
          {shareImageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={shareImageUrl} alt="" className="w-full aspect-[1.91/1] object-cover bg-portal-bg" />
          ) : (
            <div className="w-full aspect-[1.91/1] bg-portal-bg flex items-center justify-center text-[10px] text-portal-muted">
              No image — add a hero image
            </div>
          )}
          <div className="p-2 bg-white">
            <div className="text-[9px] text-portal-muted uppercase tracking-wider mb-0.5">riverregionparents.com</div>
            <div className="text-[12px] font-semibold text-portal-text line-clamp-2">{shareTitle || 'Untitled'}</div>
            {shareDescription && (
              <div className="text-[10px] text-portal-sub line-clamp-2 mt-0.5">{shareDescription}</div>
            )}
          </div>
        </div>
        <p className="text-[10px] text-portal-muted mt-2 leading-relaxed">
          This is what shows when shared to Facebook + LinkedIn. Instagram uses a square crop of the same image.
        </p>
      </div>
    </div>
  )
}

