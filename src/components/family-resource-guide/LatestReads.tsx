// LatestReads — surfaces articles tagged to the Family Resource Guide
// that AREN'T already featured in Best Of or Mom Knows Best. Without
// this section, anything an editor tagged guide_slug='family-resource-guide'
// just sat in the DB invisible to the public page.
//
// Compact 3-up grid of image-top cards. Each shows hero photo, title,
// subtitle/excerpt teaser, and author byline + date.

import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight, BookOpen } from 'lucide-react'
import { getFallback } from '@/lib/image-fallbacks'

interface LatestRead {
  id:             string
  slug:           string
  title:          string
  subtitle:       string | null
  excerpt:        string | null
  hero_image_url: string | null
  author_name:    string | null
  published_at:   string | null
  column_slug:    string | null
}

interface Props {
  articles: LatestRead[]
}

function teaser(a: LatestRead): string | null {
  return (a.excerpt && a.excerpt.trim()) || (a.subtitle && a.subtitle.trim()) || null
}

function fmtDate(iso: string | null) {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function LatestReads({ articles }: Props) {
  if (articles.length === 0) return null

  return (
    <section className="scroll-mt-24">
      <div className="flex items-end justify-between gap-3 mb-5 flex-wrap">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary mb-1 inline-flex items-center gap-1.5">
            <BookOpen className="h-3 w-3" /> From the Pages
          </p>
          <h2 className="text-2xl md:text-3xl font-bold text-foreground" style={{ fontFamily: 'var(--font-fraunces, Georgia, serif)' }}>
            Latest Reads
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Fresh articles, columns, and stories from the Family Resource Guide.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {articles.map(a => {
          const t   = teaser(a)
          const img = a.hero_image_url || getFallback('parenting', a.id)
          return (
            <Link
              key={a.id}
              href={`/articles/${a.slug}`}
              className="group flex flex-col bg-card border border-border/40 rounded-2xl overflow-hidden hover:border-primary/30 hover:shadow-sm transition-all"
            >
              <div className="relative aspect-[16/10] overflow-hidden bg-primary/5">
                <Image
                  src={img}
                  alt={a.title}
                  fill
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  style={{ objectFit: 'cover' }}
                  className="group-hover:scale-105 transition-transform duration-500"
                  unoptimized
                />
              </div>
              <div className="flex flex-col flex-1 p-4">
                <h3
                  className="text-base md:text-lg font-bold text-foreground leading-snug mb-2 group-hover:text-primary transition-colors line-clamp-2"
                  style={{ fontFamily: 'var(--font-fraunces, Georgia, serif)' }}
                >
                  {a.title}
                </h3>
                {t && (
                  <p className="text-xs md:text-sm text-muted-foreground leading-relaxed line-clamp-3 mb-3 flex-1">
                    {t}
                  </p>
                )}
                <div className="flex items-center justify-between gap-2 pt-3 mt-auto border-t border-border/30">
                  <span className="text-[11px] text-muted-foreground truncate">
                    {a.author_name ?? 'Editorial'}
                  </span>
                  <span className="text-[11px] text-muted-foreground shrink-0">
                    {fmtDate(a.published_at)}
                  </span>
                </div>
              </div>
            </Link>
          )
        })}
      </div>

      <div className="mt-5 flex justify-center">
        <Link
          href="/articles"
          className="inline-flex items-center gap-1.5 text-sm font-bold text-primary hover:gap-2 transition-all"
        >
          Browse all articles <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </section>
  )
}
