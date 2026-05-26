// BestOfFeatureRow — Best-Of editorial articles for the FRG home.
// One lead article gets the big alternating-feature treatment (image
// half, copy half). The rest sit in a compact 2-up grid below so the
// section stays scannable instead of becoming a wall of full-width
// rows. Card teaser comes from excerpt only — subtitle is the article
// page's lead paragraph, not a fallback for card hooks.

import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight, Star, Sparkles } from 'lucide-react'
import { getFallback } from '@/lib/image-fallbacks'
import { articleHref } from '@/lib/articles/slug'

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
  /** Override the tagline shown under the masthead. */
  subtitle?: string
}

function teaser(a: BestOfArticle): string | null {
  return (a.excerpt && a.excerpt.trim()) || null
}

export function BestOfFeatureRow({
  articles,
  subtitle = 'New lists added throughout the year — keep checking back.',
}: Props) {
  if (articles.length === 0) {
    return (
      <section id="best-of" className="scroll-mt-24">
        <BestOfMasthead subtitle={subtitle} />
        <div className="rounded-2xl border-2 border-dashed border-border/50 bg-muted/20 p-10 text-center">
          <Star className="h-7 w-7 text-primary/40 mx-auto mb-2" />
          <p className="text-sm font-bold text-foreground mb-1">More lists are coming</p>
          <p className="text-xs text-muted-foreground max-w-md mx-auto">
            Best Parks. Best Day Trips. Sweet Treats. The first lists drop with launch.
          </p>
        </div>
        <SuggestBestOfFooter />
      </section>
    )
  }

  const [lead, ...rest] = articles
  const leadTeaser = teaser(lead)
  const leadImg    = lead.hero_image_url || getFallback('parenting', lead.id)

  return (
    <section id="best-of" className="scroll-mt-24">
      <BestOfMasthead subtitle={subtitle} />

      {/* ── Lead feature — wider image, fuller content side ── */}
      <Link
        href={articleHref(lead)}
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
                href={articleHref(a)}
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
        </div>
      )}

      {/* ── See all Best Of lists ── */}
      {articles.length >= 3 && (
        <div className="mt-5 flex justify-center">
          <Link
            href="/columns/frg-best-of"
            className="inline-flex items-center gap-1.5 text-sm font-bold text-primary hover:gap-2 transition-all"
          >
            See all Best Of lists <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      )}

      {/* ── Reader suggestion CTA ── */}
      <SuggestBestOfFooter />
    </section>
  )
}

// ── Masthead ──────────────────────────────────────────────────────────────
// Magazine-style lockup for the top of the Best Of section. Three-line
// stamp: tiny "The" eyebrow, huge serif "BEST OF" wordmark, italic
// "for River Region [Families]" tagline with the last word in coral.
// Action row sits to the right on wide screens — "View All Lists" + the
// "Suggest a Best Of" CTA that opens the submission form.
//
// Uses the system serif font for the wordmark (font-serif). Stays single
// component-level so the layout is consistent on the empty + populated states.

function BestOfMasthead({ subtitle }: { subtitle: string }) {
  return (
    <div className="mb-6 flex items-end justify-between gap-4 flex-wrap border-b border-border/50 pb-5">
      <div className="min-w-0">
        <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-muted-foreground mb-1">
          The
        </p>
        <h2 className="font-serif font-black leading-[0.9] tracking-tight text-foreground text-5xl sm:text-6xl md:text-7xl mb-1">
          BEST <span className="font-light italic text-muted-foreground text-3xl sm:text-4xl md:text-5xl align-baseline">of</span>
        </h2>
        <p className="text-base md:text-lg font-bold tracking-wide italic mt-0.5">
          <span className="text-foreground">for River Region </span>
          <span className="text-primary not-italic">Families</span>
        </p>
        <p className="text-sm text-muted-foreground mt-3 max-w-md">
          {subtitle}
        </p>
      </div>

      {/* Right-aligned action — View All Lists. Suggest CTA lives at the
           bottom of the section so it reads as a "now that you've seen
           these, what would YOU pick?" prompt instead of competing with
           the masthead. */}
      <Link
        href="/columns/frg-best-of"
        className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:text-primary/80 transition-colors shrink-0"
      >
        View All Lists <ArrowRight className="h-4 w-4" />
      </Link>
    </div>
  )
}

// ── Suggest a Best Of footer CTA ──────────────────────────────────────────
// Sits below the article list — reader has just scanned the published
// lists, this prompts them to nominate their own pick for the next one.

function SuggestBestOfFooter() {
  return (
    <div className="mt-8 rounded-2xl border border-amber-200 bg-amber-50/60 p-5 md:p-6 flex items-center justify-between gap-4 flex-wrap">
      <div className="min-w-0">
        <p className="text-sm md:text-base font-bold text-foreground mb-0.5">
          Got a favorite that should make the next list?
        </p>
        <p className="text-xs md:text-sm text-muted-foreground leading-relaxed">
          Tell us your Best Of — your nomination lands with our editors.
        </p>
      </div>
      <Link
        href="/best-of/suggest"
        className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-bold rounded-full bg-amber-400 text-amber-950 hover:bg-amber-500 transition-colors shadow-sm shrink-0"
      >
        <Sparkles className="h-4 w-4" />
        Suggest a Best Of
      </Link>
    </div>
  )
}
