// MomKnowsBestRow — 3 latest Mom Knows Best posts. The "real moms know"
// trust layer that connects the FRG to your actual local voices.

import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight, Heart } from 'lucide-react'
import { getFallback } from '@/lib/image-fallbacks'

interface MKBPost {
  id:                string
  slug:              string
  title:             string
  excerpt:           string | null
  hero_image_url:    string | null
  profile_image_url: string | null
  author_name:       string | null
  published_at:      string | null
}

interface Props {
  posts: MKBPost[]
}

function fmtDate(iso: string | null) {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function MomKnowsBestRow({ posts }: Props) {
  if (posts.length === 0) return null

  return (
    <section className="rounded-2xl bg-gradient-to-br from-rose-50 via-white to-white border border-rose-100 p-6 md:p-8">
      <div className="flex items-end justify-between gap-3 mb-5 flex-wrap">
        <div>
          <div className="inline-flex items-center gap-1.5 mb-2">
            <Heart className="h-3.5 w-3.5 fill-rose-500 text-rose-500" />
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-rose-700">From Mom Knows Best</span>
          </div>
          <h2 className="text-xl md:text-2xl font-bold text-foreground leading-tight" style={{ fontFamily: 'var(--font-fraunces, Georgia, serif)' }}>
            Real River Region moms, real recommendations.
          </h2>
        </div>
        <Link
          href="/mom-knows-best"
          className="text-xs font-bold text-rose-700 hover:underline inline-flex items-center gap-1 whitespace-nowrap"
        >
          All Mom Knows Best <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
        {posts.map(p => {
          const img = p.hero_image_url || getFallback('parenting', p.id)
          return (
            <Link
              key={p.id}
              href={`/articles/${p.slug}`}
              className="group flex flex-col bg-white rounded-xl overflow-hidden border border-rose-100/60 hover:border-rose-300 hover:shadow-sm transition-all"
            >
              <div className="relative aspect-[4/3] overflow-hidden bg-rose-50/50">
                <Image
                  src={img}
                  alt={p.title}
                  fill
                  sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, 33vw"
                  style={{ objectFit: 'cover' }}
                  className="group-hover:scale-105 transition-transform duration-500"
                  unoptimized
                />
              </div>
              <div className="p-3.5 flex flex-col flex-1">
                <h3 className="font-bold text-sm leading-snug text-foreground group-hover:text-rose-700 transition-colors line-clamp-2 mb-1.5">
                  {p.title}
                </h3>
                {p.excerpt && (
                  <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2 mb-2">
                    {p.excerpt}
                  </p>
                )}
                <div className="flex items-center justify-between gap-2 pt-2 mt-auto border-t border-rose-100/60">
                  <span className="text-[11px] text-muted-foreground truncate">
                    {p.author_name ?? 'Mom Knows Best'}
                  </span>
                  <span className="text-[11px] text-muted-foreground shrink-0">{fmtDate(p.published_at)}</span>
                </div>
              </div>
            </Link>
          )
        })}
      </div>
    </section>
  )
}
