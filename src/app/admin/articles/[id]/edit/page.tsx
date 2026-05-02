'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Check, RefreshCw } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface Props { params: Promise<{ id: string }> }

function slugify(text: string) {
  return text.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').replace(/(^-|-$)/g, '').slice(0, 80)
}

export default function ArticleEditPage({ params }: Props) {
  const { id } = use(params)
  const router = useRouter()
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    title: '', slug: '', author_byline: '', subtitle: '',
    body_content: '', hero_image_url: '', editorial_notes: '',
  })

  useEffect(() => {
    async function load() {
      const { data } = await supabase.from('guide_articles').select('*').eq('id', id).single()
      if (data) {
        setForm({
          title:          data.title ?? '',
          slug:           data.slug ?? '',
          author_byline:  data.author_byline ?? '',
          subtitle:       data.subtitle ?? '',
          body_content:   data.body_content ?? '',
          hero_image_url: data.hero_image_url ?? '',
          editorial_notes: data.editorial_notes ?? '',
        })
      }
      setLoading(false)
    }
    load()
  }, [id])

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(f => ({...f, [k]: e.target.value}))

  function updateTitleAndSlug(title: string) {
    setForm(f => ({
      ...f,
      title,
      slug: f.slug === slugify(f.title) || !f.slug ? slugify(title) : f.slug,
    }))
  }

  async function save(approveAfterSave = false) {
    setSaving(true)
    try {
      const update: Record<string, unknown> = {
        title:          form.title,
        slug:           form.slug,
        author_byline:  form.author_byline || null,
        subtitle:       form.subtitle || null,
        body_content:   form.body_content,
        hero_image_url: form.hero_image_url || null,
        editorial_notes: form.editorial_notes || null,
      }

      if (approveAfterSave) {
        update.editorial_review_status = 'approved'
        update.published_at = new Date().toISOString()
      } else {
        update.editorial_review_status = 'needs_edit'
      }

      await supabase.from('guide_articles').update(update).eq('id', id)
      if (approveAfterSave) {
        router.push('/admin/articles/review')
      }
    } catch (e) {
      console.error(e)
    }
    setSaving(false)
  }

  const inp = 'w-full px-3.5 py-2.5 text-sm rounded-lg border border-gray-200 outline-none focus:border-blue-400 bg-white'

  if (loading) return <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">Loading…</div>

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/admin/articles/review" className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1">
            <ArrowLeft size={13} /> Review Queue
          </Link>
          <h1 className="text-xl font-semibold text-gray-900">Edit Article</h1>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => save(false)} disabled={saving} className="px-4 py-2 text-sm font-semibold border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-40">
            Save (Keep as Needs Edit)
          </button>
          <button onClick={() => save(true)} disabled={saving} className="flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-40">
            {saving ? <><RefreshCw size={13} className="animate-spin" /> Saving…</> : <><Check size={13} /> Save & Approve</>}
          </button>
        </div>
      </div>

      <div className="p-6 max-w-3xl">
        <div className="bg-white rounded-xl border border-gray-200 p-5 mb-5">
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">Title *</label>
              <input className={inp} value={form.title} onChange={e => updateTitleAndSlug(e.target.value)} placeholder="Article title" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">URL slug *</label>
                <input className={inp} value={form.slug} onChange={set('slug')} placeholder="url-friendly-slug" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">Author</label>
                <input className={inp} value={form.author_byline} onChange={set('author_byline')} placeholder="Author name" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">Subtitle / lead paragraph</label>
              <textarea className={`${inp} resize-none`} rows={2} value={form.subtitle} onChange={set('subtitle')} placeholder="Brief summary shown in listings" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">Hero image URL</label>
              <input className={inp} value={form.hero_image_url} onChange={set('hero_image_url')} placeholder="https://..." />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5 mb-5">
          <label className="block text-xs font-semibold text-gray-500 mb-1.5">Body content (Markdown)</label>
          <textarea
            className={`${inp} resize-y font-mono text-xs`}
            rows={24}
            value={form.body_content}
            onChange={set('body_content')}
            placeholder="## Article section heading&#10;&#10;Body paragraph text...&#10;&#10;- Bullet point 1&#10;- Bullet point 2"
          />
          <p className="text-xs text-gray-400 mt-1.5">
            Use ## for section headings, ** for bold, - for bullets.
            <Link href={`/newcomer-guide/articles/${form.slug}`} target="_blank" className="ml-2 text-blue-500 hover:text-blue-700">Preview →</Link>
          </p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <label className="block text-xs font-semibold text-gray-500 mb-1.5">Editorial notes (internal only)</label>
          <textarea className={`${inp} resize-none`} rows={3} value={form.editorial_notes} onChange={set('editorial_notes')} placeholder="Notes for editorial review..." />
        </div>
      </div>
    </div>
  )
}
