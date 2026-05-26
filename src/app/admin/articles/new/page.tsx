'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Check, RefreshCw, Eye } from 'lucide-react'
import { RichArticleEditor } from '@/components/admin/RichArticleEditor'
import { HeroImageUpload } from '@/components/admin/HeroImageUpload'
import { GUIDES, CONTENT_TOPICS, columnsByVertical, findColumn, columnToVerticalRowSlug } from '@/lib/content-taxonomy'
import { HelpTip, FieldHint, SectionHelp } from '@/components/admin/AdminHelp'

const SECTION_GROUPS = columnsByVertical()

const VERTICAL_LABELS: Record<string, string> = {
  'school-zone':    'School Zone',
  'mom-knows-best': 'Mom Knows Best',
}

function slugify(text: string) {
  return text.toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 80)
}

type SaveMode = 'draft' | 'pending' | 'publish'

export default function NewArticlePage() {
  const router = useRouter()

  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState<{ text: string; ok: boolean } | null>(null)

  const [form, setForm] = useState({
    title:          '',
    slug:           '',
    subtitle:       '',
    excerpt:        '',
    body:           '',
    hero_image_url:    '',
    profile_image_url: '',
    author_byline:  '',
    column_slug:    '',
    guide_slug:     '',
    source_issue_month: '',
    editorial_notes: '',
  })
  // Topics — same field as the edit form. Pre-tagging here means newly
  // created articles surface in "Across the Site" rows on first save,
  // not just after the editor revisits the edit screen.
  const [topics, setTopics] = useState<string[]>([])

  const inp = 'w-full px-3.5 py-2.5 text-sm rounded-lg border border-gray-200 outline-none focus:border-blue-400 bg-white'
  const sel = `${inp} cursor-pointer`

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
      guide_slug:  colSlug || f.guide_slug,
    }))
  }

  async function save(mode: SaveMode) {
    if (!form.title.trim()) { setSaveMsg({ text: 'Title is required.', ok: false }); return }
    if (!form.slug.trim())  { setSaveMsg({ text: 'URL slug is required.', ok: false }); return }

    setSaving(true)
    setSaveMsg(null)

    const published    = mode === 'publish'
    const editStatus   = mode === 'draft' ? 'draft' : mode === 'publish' ? 'approved' : 'pending'
    const published_at = published ? new Date().toISOString() : null

    try {
      const res = await fetch('/api/admin/articles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          topics: topics.length > 0 ? topics : null,
          editorial_review_status: editStatus,
          published,
          published_at,
        }),
      })
      const json = await res.json()

      if (!res.ok) {
        setSaveMsg({ text: json.error ?? `Error ${res.status}`, ok: false })
        return
      }

      if (published) {
        router.push(`/admin/articles/${json.id}/edit`)
      } else if (mode === 'pending') {
        router.push('/admin/articles/review')
      } else {
        router.push(`/admin/articles/${json.id}/edit`)
      }
    } catch (e) {
      setSaveMsg({ text: e instanceof Error ? e.message : 'Network error', ok: false })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex-1 overflow-y-auto">
      {/* Sticky header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <Link href="/admin/articles" className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1">
            <ArrowLeft size={13} /> Articles
          </Link>
          <h1 className="text-xl font-semibold text-gray-900">New Article</h1>
        </div>
        <div className="flex items-center gap-2">
          {saveMsg && (
            <span className={`text-sm font-medium ${saveMsg.ok ? 'text-green-600' : 'text-red-600'}`}>
              {saveMsg.text}
            </span>
          )}
          {form.slug && (
            <Link
              href={`/articles/${form.slug}`}
              target="_blank"
              className="flex items-center gap-1.5 px-3 py-2 text-sm font-semibold border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50"
            >
              <Eye size={13} /> Preview
            </Link>
          )}
          <button
            onClick={() => save('draft')}
            disabled={saving}
            className="px-4 py-2 text-sm font-semibold border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-40"
          >
            Save Draft
          </button>
          <button
            onClick={() => save('pending')}
            disabled={saving}
            className="px-4 py-2 text-sm font-semibold bg-amber-500 text-white rounded-lg hover:bg-amber-600 disabled:opacity-40"
          >
            Save for Review
          </button>
          <button
            onClick={() => save('publish')}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-40"
          >
            {saving ? <><RefreshCw size={13} className="animate-spin" /> Saving…</> : <><Check size={13} /> Publish Now</>}
          </button>
        </div>
      </div>

      <div className="p-6 grid lg:grid-cols-[1fr_280px] gap-6 max-w-6xl">

        {/* Main content column */}
        <div className="space-y-5">
          {/* Title */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <input
              className="w-full text-2xl font-bold text-gray-900 outline-none placeholder:text-gray-300 border-none bg-transparent"
              value={form.title}
              onChange={e => handleTitle(e.target.value)}
              placeholder="Article title…"
            />
            <div className="mt-2 flex items-center gap-2">
              <span className="text-xs text-gray-400">URL slug:</span>
              <input
                className="flex-1 text-xs text-gray-500 outline-none bg-transparent border-b border-gray-200 focus:border-blue-400 py-0.5"
                value={form.slug}
                onChange={e => setField('slug', e.target.value)}
                placeholder="auto-generated-from-title"
              />
            </div>
          </div>

          {/* Article Lead — magazine-style deck shown on the article page,
               under the title, before the body. NOT used in card listings. */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <label className="block text-xs font-semibold text-gray-500 mb-1">Article Lead</label>
            <p className="text-[11px] text-gray-400 mb-2">
              Magazine-style deck shown on the article page, under the title. Two-to-three-sentence opener that pulls the reader in.
            </p>
            <textarea
              className={`${inp} resize-none`}
              rows={2}
              value={form.subtitle}
              onChange={e => setField('subtitle', e.target.value)}
              placeholder="A compelling opening shown on the article page below the title…"
            />
          </div>

          {/* Body */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-2">Article Body</label>
            <RichArticleEditor
              key="new-article"
              initialContent=""
              onChange={html => setField('body', html)}
              placeholder="Start writing your article… Use the toolbar for headings, bold, images, links, quotes, and lists."
            />
          </div>
        </div>

        {/* Sidebar meta column */}
        <div className="space-y-4">

          {/* Publish status */}
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Save As</h3>
            <div className="space-y-2">
              {[
                { mode: 'draft' as SaveMode, label: 'Save Draft', desc: 'Not visible anywhere', color: 'border-gray-200 text-gray-700 hover:bg-gray-50' },
                { mode: 'pending' as SaveMode, label: 'Send to Review', desc: 'Goes to Review Queue', color: 'border-amber-200 text-amber-700 hover:bg-amber-50 bg-amber-50' },
                { mode: 'publish' as SaveMode, label: 'Publish Now', desc: 'Goes live immediately', color: 'border-green-200 text-green-700 hover:bg-green-50' },
              ].map(opt => (
                <button
                  key={opt.mode}
                  onClick={() => save(opt.mode)}
                  disabled={saving}
                  className={`w-full text-left px-3 py-2.5 rounded-lg border text-sm font-semibold transition-colors disabled:opacity-40 ${opt.color}`}
                >
                  {opt.label}
                  <span className="block text-xs font-normal opacity-60 mt-0.5">{opt.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Author */}
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Author</h3>
            <input
              className={inp}
              value={form.author_byline}
              onChange={e => setField('author_byline', e.target.value)}
              placeholder="Author name or byline"
            />
          </div>

          {/* Hero image */}
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Hero Image</h3>
            <HeroImageUpload
              value={form.hero_image_url}
              onChange={url => setField('hero_image_url', url)}
            />
            <p className="text-[11px] text-gray-400 mt-2">Wide format. Top of the article + big homepage feature slot.</p>
          </div>

          {/* Profile image */}
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Profile Image</h3>
            <HeroImageUpload
              value={form.profile_image_url}
              onChange={url => setField('profile_image_url', url)}
            />
            <p className="text-[11px] text-gray-400 mt-2">Square portrait used in the homepage Community Spotlights sidebar. Falls back to hero image when empty.</p>
          </div>

          {/* Where this article appears */}
          <div className="bg-white rounded-xl border border-blue-100 bg-blue-50/40 p-3">
            <SectionHelp variant="info" title="Where will this appear?">
              <strong>Section</strong> = which editorial column it belongs to.{' '}
              <strong>Guide</strong> = which Guide landing page it shows up on (if any).{' '}
              <strong>Issue Month</strong> = the print issue (optional).
            </SectionHelp>
          </div>

          {/* Section / Column */}
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              Section
              <HelpTip text="Pick the editorial column. Sections are grouped by vertical (School Zone, Mom Life, etc.) — choose the one that matches your article." />
            </h3>
            <select
              className={sel}
              value={form.column_slug}
              onChange={e => handleColumnChange(e.target.value)}
            >
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
                  <FieldHint className="mt-2">
                    Sections are grouped by vertical. The description will tell you exactly
                    where the article shows up once you pick one.
                  </FieldHint>
                )
              }
              const v      = columnToVerticalRowSlug(form.column_slug)
              const vLabel = v ? (VERTICAL_LABELS[v] ?? v) : null
              return (
                <div className="mt-2 px-3 py-2 rounded-lg bg-blue-50/60 border border-blue-100 space-y-1">
                  {col.description && (
                    <p className="text-[12px] text-gray-700 leading-relaxed">{col.description}</p>
                  )}
                  {vLabel && (
                    <p className="text-[11px] text-gray-500">
                      Surfaces on the <strong className="text-gray-700">{vLabel}</strong> vertical page.
                    </p>
                  )}
                </div>
              )
            })()}
          </div>

          {/* Guide */}
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              Guide / Resource
              <HelpTip text="If this article should appear on a specific Guide's landing page (Family Resource, Summer Fun, etc.), pick it here. Leave as 'Not a guide article' for standalone pieces." />
            </h3>
            <select
              className={sel}
              value={form.guide_slug}
              onChange={e => setField('guide_slug', e.target.value)}
            >
              <option value="">— Not a guide article —</option>
              {GUIDES.map(g => (
                <option key={g.slug} value={g.slug}>{g.label}</option>
              ))}
            </select>
            <FieldHint className="mt-2">
              Optional — only pick a guide if this article should appear on that guide&apos;s landing page.
            </FieldHint>
          </div>

          {/* Topics — cross-cutting theme tags. Distinct from Guide above:
               Guide = primary home (one), Topics = themes (many) that drive
               the "Across the Site" rows on each guide page. */}
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              Topics
              <HelpTip text="Cross-cutting theme tags. Different from Guide — Guide is the article's primary home (write FOR that guide). Topics decide which guide pages ALSO surface this piece in their 'Across the Site' rows." />
            </h3>
            <p className="text-[11px] text-gray-500 leading-snug mb-2">
              <strong>Guide</strong> = one primary home. <strong>Topics</strong> = themes that cross-promote it elsewhere.
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

          {/* Issue month */}
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Issue Month</h3>
            <input
              type="month"
              className={inp}
              value={form.source_issue_month ? form.source_issue_month.slice(0, 7) : ''}
              onChange={e => setField('source_issue_month', e.target.value ? `${e.target.value}-01` : '')}
            />
            <p className="text-[11px] text-gray-400 mt-1.5">The magazine issue this article is from (optional)</p>
          </div>

          {/* Editorial notes */}
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Editorial Notes</h3>
            <textarea
              className={`${inp} resize-none`}
              rows={3}
              value={form.editorial_notes}
              onChange={e => setField('editorial_notes', e.target.value)}
              placeholder="Internal notes for the team…"
            />
          </div>

        </div>
      </div>

      {/* Bottom save bar */}
      <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-3 flex items-center justify-end gap-2">
        <Link href="/admin/articles" className="px-4 py-2 text-sm font-semibold text-gray-500 hover:text-gray-700 transition-colors">
          Cancel
        </Link>
        <button onClick={() => save('draft')} disabled={saving} className="px-4 py-2 text-sm font-semibold border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-40">
          Save Draft
        </button>
        <button onClick={() => save('pending')} disabled={saving} className="px-4 py-2 text-sm font-semibold bg-amber-500 text-white rounded-lg hover:bg-amber-600 disabled:opacity-40">
          Send for Review
        </button>
        <button onClick={() => save('publish')} disabled={saving} className="flex items-center gap-2 px-5 py-2 text-sm font-semibold bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-40">
          {saving ? <><RefreshCw size={13} className="animate-spin" /> Saving…</> : <><Check size={13} /> Publish Now</>}
        </button>
      </div>
    </div>
  )
}
