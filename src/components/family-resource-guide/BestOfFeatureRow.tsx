// BestOfFeatureRow — 3-4 Best-Of articles displayed as alternating
// image-left/image-right editorial cards. Each one is a real article,
// not a tile. Treats the lists as content, not content-farm tiles.

import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight, Star } from 'lucide-react'
import { getFallback } from '@/lib/image-fallbacks'

interface BestOfArticle {
  id:             string
  slug:           string
  title:          string
  excerpt:        string | null
  hero_image_url: string | null
  published_at:   string | null
}

interface Props {
  articles: BestOfArticle[]
  /** Override the section heading copy. */
  title?:    string
  subtitle?: string
}

export function BestOfFeatureRow({
  articles,
  title    = 'Best of the Region',
  subtitle = 'The lists you\'ll text to your friends.',
}: Props) {
  if (articles.length === 0) {
    return (
      <section id="best-of" className="scroll-mt-24">
        <div className="rounded-2xl border-2 border-dashed border-border/50 bg-muted/20 p-10 text-center">
          <Star className="h-7 w-7 text-primary/40 mx-auto mb-2" />
          <p className="text-sm font-bold text-foreground mb-1">More lists are coming</p>
          <p className="text-xs text-muted-foreground max-w-md mx-auto">
            Best Parks. Best Day Trips. Sweet Treats. The first lists drop with launch.
          </p>
        </div>
      </section>
    )
  }

  return (
    <section id="best-of" className="scroll-mt-24">
      <div className="flex items-end justify-between gap-3 mb-6 flex-wrap">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary mb-1">Curated · Best Of</p>
          <h2 className="text-2xl md:text-3xl font-bold text-foreground" style={{ fontFamily: 'var(--font-fraunces, Georgia, serif)' }}>
            {title}
          </h2>
          <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
        </div>
      </div>

      <div className="space-y-6">
        {articles.map((a, i) => {
          const reverse = i % 2 === 1
          const img     = a.hero_image_url || getFallback('parenting', a.id)
          return (
            <Link
              key={a.id}
              href={`/articles/${a.slug}`}
              className={`group flex flex-col md:flex-row ${reverse ? 'md:flex-row-reverse' : ''} bg-card border border-border/40 rounded-2xl overflow-hidden hover:border-primary/30 hover:shadow-md transition-all`}
            >
              <div className="relative md:w-1/2 aspect-[16/10] md:aspect-auto md:min-h-[280px] overflow-hidden bg-primary/5">
                <Image
                  src={img}
                  alt={a.title}
                  fill
                  sizes="(max-width: 768px) 100vw, 50vw"
                  style={{ objectFit: 'cover' }}
                  className="group-hover:scale-105 transition-transform duration-500"
                  unoptimized
                />
                <span className="absolute top-3 left-3 inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest bg-white/90 text-gray-700 px-2 py-1 rounded backdrop-blur-sm">
                  <Star className="h-2.5 w-2.5 fill-amber-400 text-amber-500" />
                  Best Of
                </span>
              </div>

              <div className="md:w-1/2 p-6 md:p-8 flex flex-col justify-center">
                <h3 className="text-xl md:text-2xl font-bold text-foreground leading-snug mb-3 group-hover:text-primary transition-colors" style={{ fontFamily: 'var(--font-fraunces, Georgia, serif)' }}>
                  {a.title}
                </h3>
                {a.excerpt && (
                  <p className="text-sm md:text-base text-muted-foreground leading-relaxed mb-4 line-clamp-3">
                    {a.excerpt}
                  </p>
                )}
                <span className="inline-flex items-center gap-1.5 text-sm font-bold text-primary group-hover:gap-2 transition-all">
                  Read the list <ArrowRight className="h-4 w-4" />
                </span>
              </div>
            </Link>
          )
        })}
      </div>
    </section>
  )
}
