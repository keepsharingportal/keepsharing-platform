// Inspiration Articles — pulled from guide_articles tagged 'birthday'.
// 3-card grid; mom-voice articles drive return visits.

import Link from 'next/link'
import { SectionHeader } from './BudgetTiers'
import { BookOpen, ArrowRight } from 'lucide-react'

interface Article {
  id:              string
  title:           string
  slug:            string
  column_slug?:    string | null
  preview:         string                 // resolved preview text (excerpt → social_hook → body lead)
  hero_image_url?: string | null
  author_byline?:  string | null
  published_at?:   string | null
}

// Derive a ~140-char preview from the article body when neither excerpt
// nor social_hook is set. Sentence-aware trim so we don't cut mid-word.
function bodyLead(body: string | null | undefined): string {
  if (!body) return ''
  const stripped = body
    .replace(/<\/?[^>]+>/g, ' ')
    .replace(/[#*_>`~]+/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]+\)/g, ' ')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/\s+/g, ' ')
    .trim()
  if (stripped.length <= 145) return stripped
  const w = stripped.slice(0, 180)
  const end = w.search(/[.!?]\s/)
  if (end >= 50 && end <= 140) return w.slice(0, end + 1)
  return stripped.slice(0, 140).replace(/\s+\S*$/, '') + '…'
}

export function BirthdayArticles({ articles }: { articles: Array<Record<string, unknown>> }) {
  const useArticles: Article[] = articles.map(a => {
    const excerpt    = ((a.excerpt as string | null) ?? '').trim()
    const socialHook = ((a.social_hook as string | null) ?? '').trim()
    const preview    = excerpt || socialHook || bodyLead(a.body as string | null | undefined)
    return {
      id:              a.id as string,
      title:           a.title as string,
      slug:            a.slug as string,
      column_slug:     a.column_slug as string | null,
      preview,
      hero_image_url:  a.hero_image_url as string | null,
      author_byline:   a.author_byline as string | null,
      published_at:    a.published_at as string | null,
    }
  })

  return (
    <div>
      <SectionHeader
        eyebrow="Inspiration"
        title="Party planning, in your voice"
        kicker="Long-reads from River Region moms who've been there. Theme inspiration, sanity-saving tips, and budget reality checks."
      />

      {useArticles.length === 0 ? (
        <div className="bg-white rounded-2xl border border-black/5 shadow-sm p-8 text-center">
          <BookOpen size={28} className="text-slate-300 mx-auto mb-2" />
          <p className="text-[13px] text-slate-600">
            Birthday-tagged articles will appear here. Tag <code>birthday</code> on any guide_articles row
            and it&apos;ll surface automatically.
          </p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {useArticles.slice(0, 6).map(a => (
            <Link
              key={a.id}
              href={a.column_slug ? `/columns/${a.column_slug}/${a.slug}` : `/articles/${a.slug}`}
              className="bg-white rounded-2xl border border-black/5 shadow-sm overflow-hidden hover:shadow-md transition-shadow group"
            >
              <div className="aspect-[16/10] bg-slate-100 overflow-hidden">
                {a.hero_image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={a.hero_image_url} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-[#fff0eb] to-[#ffd9cc]" />
                )}
              </div>
              <div className="p-4">
                <h3 className="text-[15px] font-bold text-slate-900 leading-snug group-hover:text-[#ff7a59] transition-colors line-clamp-2">{a.title}</h3>
                {a.preview && (
                  <p className="text-[12px] text-slate-600 mt-2 leading-relaxed line-clamp-3">{a.preview}</p>
                )}
                <div className="flex items-center justify-between mt-3 text-[11px] text-slate-500">
                  <span>{a.author_byline ?? 'River Region Parents'}</span>
                  <span className="inline-flex items-center gap-1 text-[#ff7a59] font-bold">
                    Read <ArrowRight size={10} />
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
