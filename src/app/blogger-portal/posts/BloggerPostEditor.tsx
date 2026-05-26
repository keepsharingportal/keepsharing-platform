'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Save, RefreshCw, Check, AlertCircle, ArrowLeft, ExternalLink, Eye, Send,
} from 'lucide-react'
import { RichArticleEditor } from '@/components/admin/RichArticleEditor'
import { HeroImageUpload } from '@/components/admin/HeroImageUpload'
import { SectionHelp, FieldLabel, FieldHint } from '@/components/admin/AdminHelp'
import { articleHref } from '@/lib/articles/slug'

type Mode = 'create' | 'edit'
type Tab  = 'edit' | 'preview'

interface InitialPost {
  id?:             string
  title:           string
  subtitle:        string
  excerpt:         string
  body:            string
  hero_image_url:  string
  published:       boolean
  published_at:    string | null
  slug:            string
}

interface Props {
  mode:        Mode
  initial:     InitialPost
  bloggerName: string
  bloggerId:   string
}

function slugify(text: string) {
  return text.toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 80)
}

export function BloggerPostEditor({ mode, initial, bloggerName, bloggerId }: Props) {
  const router = useRouter()
  const [form, setForm] = useState<InitialPost>(initial)
  const [tab, setTab]   = useState<Tab>('edit')

  const [saving, setSaving] = useState(false)
  const [msg,    setMsg]    = useState<{ text: string; ok: boolean } | null>(null)

  function setField<K extends keyof InitialPost>(k: K, v: InitialPost[K]) {
    setForm(f => ({ ...f, [k]: v }))
  }

  function handleTitle(title: string) {
    setForm(f => ({
      ...f,
      title,
      slug: !f.id && (!f.slug || f.slug === slugify(f.title)) ? slugify(title) : f.slug,
    }))
  }

  async function save(action: 'draft' | 'publish') {
    if (!form.title.trim()) { setMsg({ text: 'Add a title before saving.', ok: false }); return }

    setSaving(true)
    setMsg(null)

    const payload = {
      title:          form.title.trim(),
      subtitle:       form.subtitle.trim() || null,
      excerpt:        form.excerpt.trim() || null,
      body:           form.body || null,
      hero_image_url: form.hero_image_url.trim() || null,
      published:      action === 'publish',
    }

    try {
      const url = mode === 'edit'
        ? `/api/blogger/posts/${form.id}`
        : '/api/blogger/posts'
      const method = mode === 'edit' ? 'PATCH' : 'POST'

      const res  = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(payload),
      })
      const json = await res.json().catch(() => ({}))

      if (!res.ok) { setMsg({ text: json?.error ?? `Save failed (${res.status})`, ok: false }); return }

      const label = action === 'publish' ? (form.published ? 'Updated live post' : 'Published!') : 'Draft saved'
      setMsg({ text: label, ok: true })

      // Redirect to the edit page after a successful create so subsequent
      // saves don't recreate the row.
      if (mode === 'create' && json?.id) {
        router.replace(`/blogger-portal/posts/${json.id}/edit`)
        return
      }

      router.refresh()
      setTimeout(() => setMsg(null), 4000)
    } catch (e) {
      setMsg({ text: e instanceof Error ? e.message : 'Network error', ok: false })
    } finally {
      setSaving(false)
    }
  }

  void bloggerId
  const inp = 'w-full px-3 py-2 text-sm rounded-lg border border-gray-200 outline-none focus:border-pink-400 bg-white'

  return (
    <div className="min-h-screen" style={{ background: 'var(--fg-cream, #faf8f5)' }}>

      {/* ── Top bar ── */}
      <header className="sticky top-0 z-30 bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-2.5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <Link href="/blogger-portal" className="text-xs font-semibold text-gray-500 hover:text-pink-600 inline-flex items-center gap-1">
              <ArrowLeft size={11} /> Dashboard
            </Link>
            <span className="text-gray-300 hidden sm:inline">/</span>
            <span className="text-xs text-gray-400 hidden sm:inline truncate">{bloggerName}</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {msg && (
              <span className={`text-xs font-semibold inline-flex items-center gap-1 px-2 py-1 rounded-full ${msg.ok ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                {msg.ok ? <Check size={11} /> : <AlertCircle size={11} />}
                {msg.text}
              </span>
            )}
            <button
              onClick={() => save('draft')}
              disabled={saving}
              className="px-3 py-1.5 text-xs font-semibold border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50 inline-flex items-center gap-1.5"
            >
              {saving ? <RefreshCw size={11} className="animate-spin" /> : <Save size={11} />}
              Save Draft
            </button>
            <button
              onClick={() => save('publish')}
              disabled={saving}
              className="px-3 py-1.5 text-xs font-semibold bg-pink-600 text-white rounded-lg hover:bg-pink-700 disabled:opacity-50 inline-flex items-center gap-1.5"
            >
              {saving ? <RefreshCw size={11} className="animate-spin" /> : <Send size={11} />}
              {form.published ? 'Update Live' : 'Publish'}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6 grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6">

        {/* ── Editor ── */}
        <div className="space-y-4">
          {mode === 'create' && (
            <SectionHelp variant="tip" title="Quick tip">
              A great post often starts as a draft. Save early, write a little,
              come back later. When you&apos;re ready for the world to see it, hit
              <strong> Publish</strong>.
            </SectionHelp>
          )}

          <div className="bg-white rounded-2xl border border-gray-200 p-5 md:p-7 space-y-4">

            {/* Title */}
            <div>
              <input
                className="w-full text-2xl md:text-3xl font-bold text-gray-900 outline-none placeholder:text-gray-300 border-0 border-b-2 border-gray-100 focus:border-pink-300 bg-transparent py-2 transition-colors"
                style={{ fontFamily: 'var(--font-fraunces, serif)' }}
                value={form.title}
                onChange={e => handleTitle(e.target.value)}
                placeholder="Post title…"
              />
              <FieldHint className="mt-1.5">
                Specific titles work best — &quot;Our favorite Saturday breakfast spot in Prattville&quot; over &quot;Breakfast spots&quot;.
              </FieldHint>
            </div>

            {/* Subtitle */}
            <div>
              <input
                className="w-full text-base text-gray-600 outline-none placeholder:text-gray-300 border-0 border-b border-gray-100 focus:border-pink-200 bg-transparent py-1.5 leading-relaxed transition-colors"
                value={form.subtitle}
                onChange={e => setField('subtitle', e.target.value)}
                placeholder="Subtitle or one-line teaser (optional)"
              />
            </div>

            {/* Body — Edit / Preview */}
            <div>
              <div className="flex items-center gap-0 border-b border-gray-200 mb-3">
                {(['edit', 'preview'] as Tab[]).map(t => (
                  <button
                    key={t}
                    onClick={() => setTab(t)}
                    className={[
                      'px-3 py-1.5 text-xs font-semibold border-b-2 -mb-px transition-colors capitalize',
                      tab === t ? 'border-pink-500 text-pink-600' : 'border-transparent text-gray-400 hover:text-gray-700',
                    ].join(' ')}
                  >
                    {t === 'edit' ? 'Write' : <span className="inline-flex items-center gap-1"><Eye size={11} /> Preview</span>}
                  </button>
                ))}
              </div>

              {tab === 'edit' ? (
                <RichArticleEditor
                  initialContent={form.body}
                  onChange={html => setField('body', html)}
                  placeholder="Start writing — what's the story?"
                  onSetHero={url => setField('hero_image_url', url)}
                />
              ) : (
                <div className="prose prose-pink max-w-none rounded-xl border border-gray-200 bg-white p-5 min-h-[420px]"
                     style={{ fontFamily: 'Georgia, serif' }}
                     dangerouslySetInnerHTML={{ __html: form.body || '<p style="color:#aaa">Nothing written yet.</p>' }} />
              )}
            </div>
          </div>
        </div>

        {/* ── Sidebar ── */}
        <aside className="space-y-4">

          <div className="bg-white rounded-2xl border border-gray-200 p-4">
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">Status</p>
            <div className="flex items-center gap-2">
              <span className={`text-[11px] font-bold uppercase tracking-wider px-2 py-1 rounded-full ${form.published ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                {form.published ? 'Live' : 'Draft'}
              </span>
              {form.published && form.slug && (
                <Link href={articleHref({ slug: form.slug, title: form.title, column_slug: 'mom-knows-best' })} target="_blank" className="text-[11px] font-semibold text-pink-600 hover:underline inline-flex items-center gap-1">
                  View live <ExternalLink size={10} />
                </Link>
              )}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 p-4 space-y-3">
            <FieldLabel hint="A wide photo at the top of your post. If you skip this, we'll show a placeholder.">
              Hero Image
            </FieldLabel>
            <HeroImageUpload
              value={form.hero_image_url}
              onChange={url => setField('hero_image_url', url)}
              context="asset"
            />
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 p-4 space-y-2">
            <FieldLabel hint="A 1-2 sentence teaser shown on listing pages and in the homepage card. If empty, we'll show the first lines of your post.">
              Excerpt
            </FieldLabel>
            <textarea
              rows={4}
              className={`${inp} resize-y`}
              value={form.excerpt}
              onChange={e => setField('excerpt', e.target.value)}
              placeholder="A line or two that makes someone want to click."
            />
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 p-4 space-y-1.5">
            <FieldLabel hint='The URL slug — e.g. "my-favorite-breakfast-spot" becomes /articles/mom-knows-best-my-favorite-breakfast-spot.'>
              Page URL
            </FieldLabel>
            <input
              className={inp}
              value={form.slug}
              onChange={e => setField('slug', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-'))}
              placeholder="auto-generated from title"
              disabled={form.published}
            />
            {form.published && (
              <FieldHint>URL locked after first publish so existing links don&apos;t break.</FieldHint>
            )}
          </div>

        </aside>
      </main>
    </div>
  )
}
