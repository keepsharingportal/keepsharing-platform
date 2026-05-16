// FromSchoolZone — cross-pollination block showing 3 recent School Zone
// articles on the FRG page. Mirrors the MomKnowsBestRow shape so the
// two cross-vertical surfaces feel like siblings. Schools are the
// single biggest mom concern — surfacing this here keeps families
// circulating into the School Zone vertical.

import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight, GraduationCap } from 'lucide-react'
import { getFallback } from '@/lib/image-fallbacks'
import { columnLabel } from '@/lib/content-taxonomy'

interface SchoolArticle {
  id:             string
  slug:           string
  title:          string
  excerpt:        string | null
  hero_image_url: string | null
  author_name:    string | null
  published_at:   string | null
  column_slug:    string | null
}

interface Props {
  articles: SchoolArticle[]
}

function fmtDate(iso: string | null) {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function FromSchoolZone({ articles }: Props) {
  if (articles.length === 0) return null

  return (
    <section className="rounded-2xl bg-gradient-to-br from-blue-50 via-white to-white border border-blue-100 p-6 md:p-8">
      <div className="flex items-end justify-between gap-3 mb-5 flex-wrap">
        <div>
          <div className="inline-flex items-center gap-1.5 mb-2">
            <GraduationCap className="h-3.5 w-3.5 text-blue-700" />
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-blue-700">From the School Zone</span>
          </div>
          <h2 className="text-xl md:text-2xl font-bold text-foreground leading-tight">
            What&apos;s happening in River Region schools
          </h2>
        </div>
        <Link
          href="/school-zone"
          className="text-xs font-bold text-blue-700 hover:underline inline-flex items-center gap-1 whitespace-nowrap"
        >
          Visit School Zone <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
        {articles.map(a => {
          const img = a.hero_image_url || getFallback('school_zone', a.id)
          const col = a.column_slug ? columnLabel(a.column_slug) : null
          return (
            <Link
              key={a.id}
              href={`/articles/${a.slug}`}
              className="group flex flex-col bg-white rounded-xl overflow-hidden border border-blue-100/60 hover:border-blue-300 hover:shadow-sm transition-all"
            >
              <div className="relative aspect-[4/3] overflow-hidden bg-blue-50/50">
                <Image
                  src={img}
                  alt={a.title}
                  fill
                  sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, 33vw"
                  style={{ objectFit: 'cover' }}
                  className="group-hover:scale-105 transition-transform duration-500"
                  unoptimized
                />
                {col && col !== '—' && (
                  <span className="absolute top-2 left-2 text-[9px] font-bold uppercase tracking-widest bg-white/90 text-blue-700 px-1.5 py-0.5 rounded backdrop-blur-sm">
                    {col}
                  </span>
                )}
              </div>
              <div className="p-3.5 flex flex-col flex-1">
                <h3 className="font-bold text-sm leading-snug text-foreground group-hover:text-blue-700 transition-colors line-clamp-2 mb-1.5">
                  {a.title}
                </h3>
                {a.excerpt && (
                  <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2 mb-2">
                    {a.excerpt}
                  </p>
                )}
                <div className="flex items-center justify-between gap-2 pt-2 mt-auto border-t border-blue-100/60">
                  <span className="text-[11px] text-muted-foreground truncate">
                    {a.author_name ?? 'School Zone'}
                  </span>
                  <span className="text-[11px] text-muted-foreground shrink-0">{fmtDate(a.published_at)}</span>
                </div>
              </div>
            </Link>
          )
        })}
      </div>
    </section>
  )
}
