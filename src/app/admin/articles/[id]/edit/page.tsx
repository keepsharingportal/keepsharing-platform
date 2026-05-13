'use client'

import { useState, useEffect, use } from 'react'
import Link from 'next/link'
import {
  ArrowLeft, Check, RefreshCw, Eye, ExternalLink,
  ChevronDown, ChevronUp, AlertTriangle,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { RichArticleEditor } from '@/components/admin/RichArticleEditor'
import { COLUMNS, GUIDES } from '@/lib/content-taxonomy'
import DOMPurify from 'isomorphic-dompurify'

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

// ── Article preview component (renders body HTML like the public page) ────────

function ArticlePreview({
  title, subtitle, heroUrl, body,
}: {
  title: string; subtitle: string; heroUrl: string; body: string
}) {
  const clean = DOMPurify.sanitize(body, {
    ALLOWED_TAGS: ['p','br','span','div','h2','h3','h4','strong','em','b','i','u','a','ul','ol','li','blockquote','figure','figcaption','img'],
    ALLOWED_ATTR: ['href','src','alt','title','class','target','rel'],
  })

  return (
    <div className="max-w-2xl mx-auto py-6 px-2">
      {title && (
        <h1 style={{ fontFamily: 'Georgia, serif', fontSize: 32, fontWeight: 700, lineHeight: 1.15, marginBottom: 12, color: '#111' }}>
          {title}
        </h1>
      )}
      {subtitle && (
        <p style={{ fontSize: 18, color: '#555', lineHeight: 1.6, marginBottom: 20, fontFamily: 'Georgia, serif' }}>
          {subtitle}
        </p>
      )}
      {heroUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={heroUrl}
          alt={title}
          style={{ width: '100%', borderRadius: 12, marginBottom: 28, objectFit: 'cover', maxHeight: 360, display: 'block' }}
        />
      )}
      <div
        dangerouslySetInnerHTML={{ __html: clean }}
        style={{ fontFamily: 'Georgia, serif', fontSize: 17, lineHeight: 1.8, color: '#1c1c1e' }}
      />
      <style>{`
        .article-preview-body p  { margin: 0 0 1.1em; }
        .article-preview-body h2 { font-size: 1.55em; font-weight: 700; margin: 1.6em 0 0.5em; font-family: system-ui, sans-serif; color: #111; }
        .article-preview-body h3 { font-size: 1.2em; font-weight: 700; margin: 1.4em 0 0.4em; font-family: system-ui, sans-serif; color: #111; }
        .article-preview-body blockquote { border-left: 4px solid #d1d5db; margin: 1.75em 0; padding: 0.6em 0 0.6em 1.25em; color: #555; font-style: italic; background: #f9fafb; border-radius: 0 8px 8px 0; }
        .article-preview-body img { max-width: 100%; border-radius: 8px; margin: 1.5em auto; display: block; }
        .article-preview-body a { color: #2563eb; text-decoration: underline; }
        .article-preview-body ul { list-style: disc; margin: 0.75em 0 0.75em 1.75em; }
        .article-preview-body ol { list-style: decimal; margin: 0.75em 0 0.75em 1.75em; }
        .article-preview-body li { margin-bottom: 0.35em; }
        .article-preview-body strong, .article-preview-body b { font-weight: 700; }
        .article-preview-body em, .article-preview-body i { font-style: italic; }
      `}</style>
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

  const [form, setForm] = useState({
    title: '', slug: '', author_byline: '', subtitle: '', excerpt: '',
    body: '', hero_image_url: '', column_slug: '', guide_slug: '',
    source_issue_month: '',
  })

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
        setForm({
          title:              data.title           ?? '',
          slug:               data.slug            ?? '',
          author_byline:      data.author_byline   ?? data.author_name ?? '',
          subtitle:           data.subtitle        ?? '',
          excerpt:            data.excerpt         ?? '',
          body:               data.body            ?? '',
          hero_image_url:     data.hero_image_url  ?? '',
          column_slug:        data.column_slug     ?? '',
          guide_slug:         data.guide_slug      ?? '',
          source_issue_month: data.source_issue_month ?? '',
        })
        setBaseNotes(cleaned)
        setSchoolRegion(region)
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
    const published_at = published ? new Date().toISOString() : undefined

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
      column_slug:             form.column_slug               || null,
      guide_slug:              form.guide_slug                || form.column_slug || null,
      editorial_review_status: editStatus,
      published,
      editorial_notes,
      source_issue_month:      form.source_issue_month        || null,
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

              {/* Subtitle */}
              <div>
                <textarea
                  className="w-full text-base text-gray-600 outline-none placeholder:text-gray-300 border-0 border-b border-gray-100 focus:border-blue-300 bg-transparent resize-none py-1.5 leading-relaxed transition-colors"
                  rows={2}
                  value={form.subtitle}
                  onChange={e => setField('subtitle', e.target.value)}
                  placeholder="Subtitle or opening sentence shown in article listings…"
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

            {/* ── Excerpt ── */}
            <div>
              <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Excerpt</label>
              <textarea
                className={`${inp} resize-none`}
                rows={3}
                value={form.excerpt}
                onChange={e => setField('excerpt', e.target.value)}
                placeholder="Short summary shown on article cards and in search results…"
              />
              <p className="text-[11px] text-gray-400 mt-1">Shown on the homepage, article listings, and in meta descriptions.</p>
            </div>

            {/* ── Hero image ── */}
            <div>
              <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Hero Image URL</label>
              <input className={inp} value={form.hero_image_url} onChange={e => setField('hero_image_url', e.target.value)} placeholder="https://..." />
              {form.hero_image_url ? (
                <div className="mt-2 rounded-lg overflow-hidden border border-gray-100">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={form.hero_image_url} alt="Hero" className="w-full h-28 object-cover" />
                </div>
              ) : (
                <div className="mt-2 flex items-start gap-2 p-2.5 rounded-lg bg-orange-50 border border-orange-200">
                  <AlertTriangle size={13} className="text-orange-500 shrink-0 mt-0.5" />
                  <p className="text-[11px] text-orange-700 leading-relaxed">Missing image — articles without a hero photo look blank in listings.</p>
                </div>
              )}
            </div>

            {/* ── Section (column_slug) ── */}
            <div>
              <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Section</label>
              <select className={sel} value={form.column_slug} onChange={e => handleColumnChange(e.target.value)}>
                <option value="">— Choose section —</option>
                {COLUMNS.map(c => <option key={c.slug} value={c.slug}>{c.label}</option>)}
              </select>
            </div>

            {/* ── Guide (guide_slug) ── */}
            <div>
              <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Guide / Resource</label>
              <select className={sel} value={form.guide_slug} onChange={e => setField('guide_slug', e.target.value)}>
                <option value="">— Not a guide article —</option>
                {GUIDES.map(g => <option key={g.slug} value={g.slug}>{g.label}</option>)}
              </select>
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
