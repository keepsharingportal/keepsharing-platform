'use client'

import { useState, useEffect, use } from 'react'
import Link from 'next/link'
import {
  ArrowLeft, Check, RefreshCw, Eye, ExternalLink,
  ChevronDown, ChevronUp,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { RichArticleEditor } from '@/components/admin/RichArticleEditor'
import { COLUMNS, GUIDES, CONTENT_TOPICS, columnToVerticalRowSlug, columnsByVertical, findColumn } from '@/lib/content-taxonomy'
import { HeroImageUpload } from '@/components/admin/HeroImageUpload'
import { HelpTip, FieldHint, SectionHelp } from '@/components/admin/AdminHelp'
import { ContributorArticleLayout } from '@/components/articles/templates/ContributorArticleLayout'
import { TeacherOfMonthLayout } from '@/components/articles/templates/TeacherOfMonthLayout'
import { ArticleBody } from '@/components/articles/ArticleBody'
import Image from 'next/image'
import { getFallbackByContext } from '@/lib/image-fallbacks'

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
      <div className="mb-6 pb-4 border-b border-gray-100">
        {columnSlug && (
          <p className="text-[11px] font-bold uppercase tracking-widest text-primary mb-2">
            {columnSlug.replace(/-/g, ' ')}
          </p>
        )}
        <h1 className="text-3xl md:text-4xl font-black text-gray-900 leading-tight mb-2">
          {safeTitle}
        </h1>
        {subtitle && !isContributor && (
          // For contributor previews the subtitle renders inline as the
          // italic lede inside ContributorArticleLayout — don't echo it here.
          <p className="text-lg text-gray-600 leading-relaxed">{subtitle}</p>
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
            <div className="relative w-full aspect-[3/2] md:aspect-[16/9] rounded-2xl overflow-hidden mb-6 shadow-sm border border-gray-200">
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
  // Cross-cutting topic tags — controls which "Across the Site" rows this
  // article surfaces in (FRG Real Talk, Special Needs themes, etc.).
  // Stored as text[] on the row. Independent from guide_slug, which is the
  // article's primary home if any.
  const [topics, setTopics] = useState<string[]>([])

  const [form, setForm] = useState({
    title: '', slug: '', author_byline: '', subtitle: '', excerpt: '',
    body: '', hero_image_url: '', profile_image_url: '', column_slug: '', guide_slug: '',
    source_issue_month: '', author_blogger_id: '',
    published_at: '',  // YYYY-MM-DDTHH:mm in local time; empty means "auto-set on publish"
  })

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
    }
    if (published_at !== undefined) payload.published_at = published_at

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

  const inp = 'w-full px-3 py-2 text-sm rounded-lg border border-gray-200 outline-none focus:border-blue-400 bg-white'
  const sel = `${inp} cursor-pointer`

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="flex-1 flex flex-col overflow-hidden">

      {/* ── Sticky top bar ── */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between shrink-0 z-20">
        <div className="flex items-center gap-3">
          <Link href="/admin/articles/review" className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1 whitespace-nowrap">
            <ArrowLeft size={13} /> Review Queue
          </Link>
          <span className="text-gray-300">/</span>
          <Link href="/admin/articles" className="text-sm text-blue-600 hover:text-blue-800 hidden sm:block">All Articles</Link>
          <h1 className="text-sm font-semibold text-gray-700 truncate max-w-xs hidden md:block">
            {form.title || 'Edit Article'}
          </h1>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {saveMsg && (
            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${saveMsg.ok ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
              {saveMsg.text}
            </span>
          )}
          <button onClick={() => save('draft')} disabled={saving || loading}
            className="hidden sm:block px-3 py-1.5 text-xs font-semibold border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 disabled:opacity-40">
            Save Draft
          </button>
          <button onClick={() => save('publish')} disabled={saving || loading}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-40">
            {saving ? <RefreshCw size={12} className="animate-spin" /> : <Check size={12} />}
            Publish
          </button>
        </div>
      </div>

      {/* ── Two-column workspace ── */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-[1fr_288px] overflow-hidden">

        {/* ── Left: main writing area ── */}
        <div className="overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-64 text-gray-400 text-sm">Loading article…</div>
          ) : (
            <div className="p-6 space-y-5 max-w-3xl">

              {/* Title */}
              <div>
                <input
                  className="w-full text-2xl font-bold text-gray-900 outline-none placeholder:text-gray-300 border-0 border-b-2 border-gray-100 focus:border-blue-400 bg-transparent py-2 transition-colors"
                  value={form.title}
                  onChange={e => handleTitle(e.target.value)}
                  placeholder="Article title…"
                />
                <div className="flex items-center gap-1.5 mt-1">
                  <span className="text-[11px] text-gray-400">URL:</span>
                  <input
                    className="flex-1 text-[11px] text-gray-400 outline-none bg-transparent border-b border-transparent focus:border-blue-300 py-0.5"
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
                  className="w-full text-base text-gray-600 outline-none placeholder:text-gray-300 border-0 border-b border-gray-100 focus:border-blue-300 bg-transparent resize-none py-1.5 leading-relaxed transition-colors"
                  rows={2}
                  value={form.subtitle}
                  onChange={e => setField('subtitle', e.target.value)}
                  placeholder="Article Lead — shown on the article page below the title…"
                />
              </div>

              {/* Body — Edit / Preview tabs */}
              <div>
                <div className="flex items-center gap-0 mb-3 border-b border-gray-200">
                  {(['edit', 'preview'] as Tab[]).map(t => (
                    <button
                      key={t}
                      onClick={() => setTab(t)}
                      className={[
                        'px-4 py-2 text-sm font-semibold border-b-2 -mb-px transition-colors capitalize',
                        tab === t
                          ? 'border-blue-600 text-blue-600'
                          : 'border-transparent text-gray-400 hover:text-gray-700',
                      ].join(' ')}
                    >
                      {t === 'edit' ? 'Edit' : <span className="flex items-center gap-1.5"><Eye size={13} /> Preview</span>}
                    </button>
                  ))}
                  <div className="ml-auto pb-2">
                    <span className="text-[10px] text-gray-400">Ctrl+B bold · Ctrl+I italic</span>
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
                  <div className="border border-gray-200 rounded-lg bg-white min-h-[500px] overflow-auto">
                    {!form.title && !form.body ? (
                      <div className="flex items-center justify-center h-64 text-gray-400 text-sm">
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

              {/* Formatting tips */}
              <div className="border border-gray-200 rounded-xl overflow-hidden">
                <button
                  onClick={() => setTipsOpen(v => !v)}
                  className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  <span>💡 Formatting Tips</span>
                  {tipsOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>
                {tipsOpen && (
                  <div className="px-4 pb-4 pt-1 space-y-2 text-xs text-gray-500 bg-gray-50 border-t border-gray-100">
                    {[
                      ['H2', 'Use H2 (##) for section headings like "About the School" or "Why We\'re Proud"'],
                      ['Bold', 'Bold student and teacher names on first mention'],
                      ['"', 'Use Blockquote (the " button) for standout pull quotes'],
                      ['Image', 'Insert images with the 🖼 button — add alt text for accessibility'],
                      ['Caption', 'Captions appear below images in italic — use for photo credits'],
                    ].map(([label, tip]) => (
                      <div key={label} className="flex gap-2.5">
                        <span className="shrink-0 font-bold text-gray-700 w-12">{label}</span>
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
        <div className="border-l border-gray-200 bg-white overflow-y-auto">
          <div className="p-4 space-y-4">

            {/* ── Publish status card ── */}
            <div className="border border-gray-200 rounded-xl overflow-hidden">
              <div className="bg-gray-50 px-3 py-2 border-b border-gray-100">
                <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Publish</p>
              </div>
              <div className="p-3 space-y-2">
                <button onClick={() => save('draft')} disabled={saving || loading}
                  className="w-full text-left px-3 py-2.5 rounded-lg border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-40 transition-colors">
                  Save Draft
                  <span className="block text-xs font-normal text-gray-400 mt-0.5">Not visible to the public</span>
                </button>
                <button onClick={() => save('pending')} disabled={saving || loading}
                  className="w-full text-left px-3 py-2.5 rounded-lg border border-amber-200 bg-amber-50 text-sm font-semibold text-amber-700 hover:bg-amber-100 disabled:opacity-40 transition-colors">
                  Send to Review
                  <span className="block text-xs font-normal text-amber-600/70 mt-0.5">Adds to the review queue</span>
                </button>
                <button onClick={() => save('publish')} disabled={saving || loading}
                  className="w-full text-left px-3 py-2.5 rounded-lg border border-green-200 bg-green-50 text-sm font-semibold text-green-700 hover:bg-green-100 disabled:opacity-40 transition-colors">
                  {saving
                    ? <span className="flex items-center gap-2"><RefreshCw size={13} className="animate-spin" /> Publishing…</span>
                    : 'Publish Now'}
                  <span className="block text-xs font-normal text-green-600/70 mt-0.5">Goes live immediately</span>
                </button>
                {form.slug && (
                  <Link
                    href={`/articles/${form.slug}`}
                    target="_blank"
                    className="flex items-center justify-center gap-1.5 w-full px-3 py-2 rounded-lg border border-gray-200 text-xs font-semibold text-gray-500 hover:bg-gray-50 transition-colors"
                  >
                    <ExternalLink size={12} /> Preview Public Page
                  </Link>
                )}
              </div>
            </div>

            {/* ── Danger zone — unpublish + move to trash ── */}
            <div className="border border-rose-200 rounded-xl overflow-hidden">
              <div className="bg-rose-50 px-3 py-2 border-b border-rose-100">
                <p className="text-[11px] font-bold text-rose-700 uppercase tracking-wider">Danger Zone</p>
              </div>
              <div className="p-3 space-y-2">
                <button
                  type="button"
                  disabled={saving || loading}
                  onClick={async () => {
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
                  className="w-full text-left px-3 py-2.5 rounded-lg border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-40 transition-colors"
                >
                  Unpublish
                  <span className="block text-xs font-normal text-gray-400 mt-0.5">Removes from public site; stays in your draft list</span>
                </button>

                <button
                  type="button"
                  disabled={saving || loading}
                  onClick={async () => {
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
                  className="w-full text-left px-3 py-2.5 rounded-lg border border-rose-300 bg-white text-sm font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-40 transition-colors"
                >
                  Move to Trash
                  <span className="block text-xs font-normal text-rose-500/80 mt-0.5">Restorable from /admin/articles/trash</span>
                </button>
              </div>
            </div>

            {/* ── Feature on Homepage ── */}
            <div className="border border-blue-200 rounded-xl overflow-hidden">
              <div className="bg-blue-50 px-3 py-2 border-b border-blue-100">
                <p className="text-[11px] font-bold text-blue-600 uppercase tracking-wider">Homepage</p>
              </div>
              <label className="flex items-start gap-3 p-3 cursor-pointer hover:bg-blue-50/60 transition-colors">
                <input
                  type="checkbox"
                  checked={isHomepageHero}
                  onChange={e => setIsHomepageHero(e.target.checked)}
                  className="w-4 h-4 mt-0.5 rounded text-blue-600 cursor-pointer"
                />
                <div>
                  <p className="text-sm font-semibold text-gray-700 leading-tight">Feature on Homepage</p>
                  <p className="text-xs text-gray-400 mt-0.5 leading-snug">
                    Sets this as the homepage hero story. Only one article should be featured at a time.
                  </p>
                </div>
              </label>
            </div>

            {/* ── Author ── */}
            <div>
              <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Author</label>
              <input className={inp} value={form.author_byline} onChange={e => setField('author_byline', e.target.value)} placeholder="Author name or byline" />
            </div>

            {/* ── Published date ── */}
            <div>
              <div className="flex items-baseline justify-between mb-1.5">
                <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider">Published Date</label>
                {form.published_at && (
                  <button
                    type="button"
                    onClick={() => setField('published_at', '')}
                    className="text-[10px] text-gray-400 hover:text-gray-600 underline"
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
              <p className="text-[11px] text-gray-400 mt-1">
                Drives the date shown on the article and the order in "Latest Stories" listings.
                Back-date a late-published piece to slot it where it belongs, or post-date to schedule
                it ahead. Leave blank to auto-stamp the current time when you click Publish.
              </p>
            </div>

            {/* ── Card Hook (DB column: excerpt) ── */}
            <div>
              <div className="flex items-baseline justify-between mb-1.5">
                <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider">Card Hook</label>
                <span className={`text-[10px] font-mono ${form.excerpt.length > 160 ? 'text-amber-600' : 'text-gray-400'}`}>
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
              <p className="text-[11px] text-gray-400 mt-1">
                Sales copy for listing cards — homepage hero, FRG rows, search snippets.
                Shorter and punchier than the Article Lead (which lives on the article page itself).
                Leave blank to show no teaser.
              </p>
            </div>

            {/* ── Hero image ── */}
            <div>
              <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Hero Image</label>
              <HeroImageUpload
                value={form.hero_image_url}
                onChange={url => setField('hero_image_url', url)}
              />
              <p className="text-[11px] text-gray-400 mt-1">Wide format. Used at the top of the article page and when this article is the big homepage feature.</p>
            </div>

            {/* ── Profile image (small) ── */}
            <div>
              <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Profile Image</label>
              <HeroImageUpload
                value={form.profile_image_url}
                onChange={url => setField('profile_image_url', url)}
              />
              <p className="text-[11px] text-gray-400 mt-1">Square/portrait of the honoree. Used in the homepage Community Spotlights sidebar. Falls back to the hero image when empty.</p>
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
              <label className="flex items-center gap-1.5 text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">
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
                  <div className="mt-1.5 px-3 py-2 rounded-lg bg-blue-50/50 border border-blue-100 space-y-1">
                    {col.description && (
                      <p className="text-[12px] text-gray-700 leading-relaxed">{col.description}</p>
                    )}
                    {vLabel && (
                      <p className="text-[11px] text-gray-500">
                        Surfaces on the <strong className="text-gray-700">{vLabel}</strong> vertical page
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
                <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Blogger</label>
                <select className={sel} value={form.author_blogger_id} onChange={e => setField('author_blogger_id', e.target.value)}>
                  <option value="">— Choose a blogger —</option>
                  {bloggers.map(b => <option key={b.id} value={b.id}>{b.display_name}</option>)}
                </select>
                <p className="text-[11px] text-gray-400 mt-1">
                  Required for Mom Knows Best posts so they link to her profile.
                  Manage bloggers at <a href="/admin/bloggers" className="text-blue-600 hover:underline">/admin/bloggers</a>.
                </p>
              </div>
            )}

            {/* ── Guide (guide_slug) ── */}
            <div>
              <label className="flex items-center gap-1.5 text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">
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
              <label className="flex items-center gap-1.5 text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                Topics
                <HelpTip text="Cross-cutting theme tags. Different from Guide above — Guide is the article's PRIMARY home (write FOR a guide). Topics decide which guide pages ALSO surface this piece in their 'Across the Site' rows. Tag liberally for essays; leave blank for narrow service guides that only belong on one page." />
              </label>
              <p className="text-[11px] text-gray-500 leading-snug mb-2">
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
                        <span className="block text-sm font-semibold text-gray-700 group-hover:text-gray-900">
                          {t.label}
                        </span>
                        <span className="block text-[11px] text-gray-400 leading-snug">
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
                <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">School Region</label>
                <select className={sel} value={schoolRegion} onChange={e => setSchoolRegion(e.target.value)}>
                  {SCHOOL_REGIONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
                <p className="text-[11px] text-gray-400 mt-1">Stored in editorial notes. Powers the regional filter on /school-bits.</p>
              </div>
            )}

            {/* ── Issue month ── */}
            <div>
              <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Issue Month</label>
              <input
                type="month"
                className={inp}
                value={form.source_issue_month ? form.source_issue_month.slice(0, 7) : ''}
                onChange={e => setField('source_issue_month', e.target.value ? `${e.target.value}-01` : '')}
              />
            </div>

            {/* ── Editorial notes ── */}
            <div>
              <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Editorial Notes</label>
              <textarea
                className={`${inp} resize-none`}
                rows={3}
                value={baseNotes}
                onChange={e => setBaseNotes(e.target.value)}
                placeholder="Internal notes — not shown publicly"
              />
              {schoolRegion && (
                <p className="text-[10px] text-gray-400 mt-1 italic">Region tag will be appended automatically on save.</p>
              )}
            </div>

          </div>
        </div>

      </div>
    </div>
  )
}
