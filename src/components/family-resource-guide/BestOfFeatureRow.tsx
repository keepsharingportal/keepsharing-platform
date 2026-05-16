// BestOfFeatureRow — Best-Of editorial articles for the FRG home.
// One lead article gets the big alternating-feature treatment (image
// half, copy half). The rest sit in a compact 2-up grid below so the
// section stays scannable instead of becoming a wall of full-width
// rows. Falls back to subtitle when excerpt is empty — most authors
// put their lead text in the Subtitle/Lead Paragraph field, not the
// shorter Excerpt field.

import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight, Star } from 'lucide-react'
import { getFallback } from '@/lib/image-fallbacks'

interface BestOfArticle {
  id:             string
  slug:           string
  title:          string
  subtitle?:      string | null
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

function teaser(a: BestOfArticle): string | null {
  return (a.excerpt && a.excerpt.trim()) || (a.subtitle && a.subtitle.trim()) || null
}

export function BestOfFeatureRow({
  articles,
  title    = 'Best of the Region',
  subtitle = "The lists you'll text to your friends.",
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

  const [lead, ...rest] = articles
  const leadTeaser = teaser(lead)
  const leadImg    = lead.hero_image_url || getFallback('parenting', lead.id)

  return (
    <section id="best-of" className="scroll-mt-24">
      <div className="flex items-end justify-between gap-3 mb-5 flex-wrap">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary mb-1">Curated · Best Of</p>
          <h2 className="text-2xl md:text-3xl font-bold text-foreground" style={{ fontFamily: 'var(--font-fraunces, Georgia, serif)' }}>
            {title}
          </h2>
          <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
        </div>
      </div>

      {/* ── Lead feature — wider image, fuller content side ── */}
      <Link
        href={`/articles/${lead.slug}`}
        className="group block bg-card border border-border/40 rounded-2xl overflow-hidden hover:border-primary/30 hover:shadow-md transition-all"
      >
        <div className="flex flex-col md:flex-row">
          <div className="relative md:w-3/5 aspect-[16/9] md:aspect-auto md:min-h-[260px] overflow-hidden bg-primary/5">
            <Image
              src={leadImg}
              alt={lead.title}
              fill
              sizes="(max-width: 768px) 100vw, 60vw"
              style={{ objectFit: 'cover' }}
              className="group-hover:scale-105 transition-transform duration-500"
              unoptimized
            />
            <span className="absolute top-3 left-3 inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest bg-white/90 text-gray-700 px-2 py-1 rounded backdrop-blur-sm">
              <Star className="h-2.5 w-2.5 fill-amber-400 text-amber-500" />
              Best Of
            </span>
          </div>
          <div className="md:w-2/5 p-6 md:p-7 flex flex-col justify-center">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary mb-2 inline-flex items-center gap-1.5">
              <Star className="h-2.5 w-2.5 fill-amber-400 text-amber-500" />
              From the Editors
            </p>
            <h3
              className="text-xl md:text-2xl font-bold text-foreground leading-snug mb-2 group-hover:text-primary transition-colors"
              style={{ fontFamily: 'var(--font-fraunces, Georgia, serif)' }}
            >
              {lead.title}
            </h3>
            {leadTeaser && (
              <p className="text-sm md:text-base text-muted-foreground leading-relaxed mb-4 line-clamp-4">
                {leadTeaser}
              </p>
            )}
            <span className="inline-flex items-center gap-1.5 text-sm font-bold text-primary group-hover:gap-2 transition-all">
              Read the list <ArrowRight className="h-4 w-4" />
            </span>
          </div>
        </div>
      </Link>

      {/* ── Remaining Best Of in a compact 2-up grid ── */}
      {rest.length > 0 && (
        <div className="mt-6 grid sm:grid-cols-2 gap-4">
          {rest.map(a => {
            const t   = teaser(a)
            const img = a.hero_image_url || getFallback('parenting', a.id)
            return (
              <Link
                key={a.id}
                href={`/articles/${a.slug}`}
                className="group flex bg-card border border-border/40 rounded-xl overflow-hidden hover:border-primary/30 hover:shadow-sm transition-all"
              >
                <div className="relative w-2/5 shrink-0 aspect-square sm:aspect-auto sm:min-h-[180px] overflow-hidden bg-primary/5">
                  <Image
                    src={img}
                    alt={a.title}
                    fill
                    sizes="(max-width: 640px) 40vw, 260px"
                    style={{ objectFit: 'cover' }}
                    className="group-hover:scale-105 transition-transform duration-500"
                    unoptimized
                  />
                </div>
                <div className="flex-1 min-w-0 p-4 flex flex-col justify-center">
                  <h3
                    className="text-base md:text-lg font-bold text-foreground leading-snug mb-1.5 group-hover:text-primary transition-colors line-clamp-2"
                    style={{ fontFamily: 'var(--font-fraunces, Georgia, serif)' }}
                  >
                    {a.title}
                  </h3>
                  {t && (
                    <p className="text-xs md:text-sm text-muted-foreground leading-relaxed line-clamp-2 mb-2">{t}</p>
                  )}
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-primary group-hover:gap-1.5 transition-all">
                    Read the list <ArrowRight className="h-3 w-3" />
                  </span>
                </div>
              </Link>
            )
          })}

          {/* Fill the empty cell when the grid count is odd so the
              section never ends with a blank space. Doubles as a
              discovery CTA. */}
          {rest.length % 2 === 1 && (
            <Link
              href="/columns/frg-best-of"
              className="group flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-primary/5 via-primary/10 to-secondary/5 border-2 border-dashed border-primary/25 rounded-xl p-6 hover:border-primary/50 hover:bg-primary/10 transition-all min-h-[180px]"
            >
              <Star className="h-6 w-6 text-primary/70 fill-amber-300/60" />
              <p className="text-sm font-bold text-foreground leading-snug text-center">
                See all Best Of lists
              </p>
              <p className="text-xs text-muted-foreground text-center leading-relaxed max-w-[200px]">
                Parks, day trips, sweet treats, sports leagues, and more.
              </p>
              <span className="inline-flex items-center gap-1 text-xs font-bold text-primary group-hover:gap-1.5 transition-all mt-1">
                Browse the list <ArrowRight className="h-3 w-3" />
              </span>
            </Link>
          )}
        </div>
      )}

      {/* ── See all Best Of lists (only shown when the grid count is
            even — when it's odd, the CTA tile above already covers this) ── */}
      {articles.length >= 3 && rest.length % 2 === 0 && (
        <div className="mt-5 flex justify-center">
          <Link
            href="/columns/frg-best-of"
            className="inline-flex items-center gap-1.5 text-sm font-bold text-primary hover:gap-2 transition-all"
          >
            See all Best Of lists <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      )}
    </section>
  )
}
